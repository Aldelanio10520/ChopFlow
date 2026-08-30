import { createFileRoute } from "@tanstack/react-router";
import { useState, type ComponentProps } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { MapPin, Plus, RotateCcw, Save, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { customerSchema } from "@/lib/schemas";
import { KIND_LABEL, STATUS_LABEL, dateBR, minutesLabel } from "@/lib/format";
import { transferEquipment } from "@/lib/equipment";
import { EquipmentLifeSheet } from "@/components/EquipmentLifeSheet";

export const Route = createFileRoute("/_authenticated/gestor/clientes")({
  component: Clientes,
});

function CustomerHistory({
  orders,
}: {
  orders:
    | Array<{
        id: string;
        scheduled_date: string;
        status: string;
        kind: string;
        description: string | null;
        technician_notes: string | null;
        duration_minutes: number | null;
        profiles: { full_name: string } | null;
        services: { name: string } | null;
        work_order_parts: Array<{ quantity: number; parts: { name: string; unit: string } | null }>;
      }>
    | null
    | undefined;
}) {
  const history = [...(orders ?? [])].sort((a, b) => b.scheduled_date.localeCompare(a.scheduled_date));
  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold uppercase text-muted-foreground">Histórico de atendimentos</p>
      {history.length === 0 && (
        <p className="text-xs text-muted-foreground">Nenhum atendimento registrado neste cliente.</p>
      )}
      {history.map((wo) => {
        const parts = wo.work_order_parts ?? [];
        return (
          <div key={wo.id} className="rounded-md bg-muted px-3 py-2 text-xs">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-medium">
                {dateBR(wo.scheduled_date)} · {KIND_LABEL[wo.kind] ?? wo.kind}
              </span>
              <Badge variant={wo.status === "concluido" ? "default" : "secondary"}>
                {STATUS_LABEL[wo.status] ?? wo.status}
              </Badge>
            </div>
            <p className="mt-1 text-muted-foreground">
              {wo.profiles?.full_name ?? "Sem técnico"}
              {wo.services?.name ? ` · ${wo.services.name}` : ""}
              {wo.duration_minutes != null ? ` · ${minutesLabel(wo.duration_minutes)}` : ""}
            </p>
            {wo.description && <p className="mt-1">{wo.description}</p>}
            {wo.technician_notes && <p className="mt-1 text-muted-foreground">{wo.technician_notes}</p>}
            {parts.length > 0 && (
              <p className="mt-1">
                Materiais:{" "}
                {parts
                  .map((row) => `${row.parts?.name ?? "Peça"} (${row.quantity} ${row.parts?.unit ?? "un"})`)
                  .join(", ")}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}

function CustomerContactEditor({
  customerId,
  companyId,
  contactName,
  phone,
  onSaved,
}: {
  customerId: string;
  companyId: string;
  contactName: string | null;
  phone: string | null;
  onSaved: () => Promise<void>;
}) {
  const [name, setName] = useState(contactName ?? "");
  const [tel, setTel] = useState(phone ?? "");
  const [saving, setSaving] = useState(false);

  const saveContact = async () => {
    const parsed = customerSchema.pick({ contact_name: true, phone: true }).safeParse({
      contact_name: name,
      phone: tel,
    });
    if (!parsed.success) {
      toast.error("Revise o nome do responsável e o telefone.");
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from("customers")
      .update({
        contact_name: parsed.data.contact_name || null,
        phone: parsed.data.phone || null,
      })
      .eq("id", customerId)
      .eq("company_id", companyId);
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Dados de contato atualizados.");
    await onSaved();
  };

  return (
    <div className="space-y-3 rounded-md border border-border p-3">
      <p className="text-xs font-semibold uppercase text-muted-foreground">Responsável e contato</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor={`contact-${customerId}`}>Nome do responsável</Label>
          <Input
            id={`contact-${customerId}`}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Quem atende no local"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor={`phone-${customerId}`}>Telefone / WhatsApp</Label>
          <Input
            id={`phone-${customerId}`}
            value={tel}
            onChange={(e) => setTel(e.target.value)}
            placeholder="(00) 00000-0000"
            inputMode="tel"
          />
        </div>
      </div>
      <Button type="button" size="sm" onClick={() => void saveContact()} disabled={saving}>
        <Save className="mr-1 h-4 w-4" /> {saving ? "Salvando..." : "Salvar contato"}
      </Button>
    </div>
  );
}

const empty = {
  name: "",
  contact_name: "",
  phone: "",
  address: "",
  district: "",
  city: "",
  state: "",
  zip: "",
  notes: "",
};

function Clientes() {
  const { data: session } = useAuth();
  const companyId = session?.companyId ?? null;
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(empty);
  const [showInactive, setShowInactive] = useState(false);

  const refreshCustomers = async () => {
    await queryClient.invalidateQueries({ queryKey: ["customers"] });
    await queryClient.invalidateQueries({ queryKey: ["customers-simple"] });
    await queryClient.invalidateQueries({ queryKey: ["equipments"] });
    await queryClient.invalidateQueries({ queryKey: ["equipments-all"] });
    await queryClient.invalidateQueries({ queryKey: ["equipment-life"] });
  };

  const { data: customers } = useQuery({
    queryKey: ["customers", companyId],
    enabled: !!companyId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("customers")
        .select(
          "*, equipments(*), work_orders(id, scheduled_date, status, kind, description, technician_notes, duration_minutes, profiles!technician_id(full_name), services(name), work_order_parts(quantity, parts(name, unit)))",
        )
        .order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const visibleCustomers = (customers ?? []).filter((customer) => showInactive || customer.active);
  const activeCustomers = (customers ?? []).filter((customer) => customer.active);

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!companyId) return;
    const parsed = customerSchema.safeParse(form);
    if (!parsed.success) {
      toast.error("Revise os dados do cliente.");
      return;
    }
    const { error } = await supabase.from("customers").insert({ ...parsed.data, company_id: companyId });
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Cliente cadastrado.");
    setForm(empty);
    setOpen(false);
    await refreshCustomers();
  };

  const deactivate = async (id: string) => {
    if (
      !window.confirm(
        "Remover este cliente da lista e das rotas? O histórico de atendimentos e os indicadores serão mantidos.",
      )
    )
      return;
    const { error } = await supabase.from("customers").update({ active: false }).eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Cliente ocultado. Histórico preservado.");
    await refreshCustomers();
  };

  const reactivate = async (id: string) => {
    const { error } = await supabase.from("customers").update({ active: true }).eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Cliente reativado.");
    await refreshCustomers();
  };

  const moveEquipment = async (equipmentId: string, nextCustomerId: string) => {
    try {
      await transferEquipment(equipmentId, nextCustomerId);
      toast.success("Equipamento transferido com o histórico de manutenção.");
      await refreshCustomers();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Falha ao transferir equipamento.");
    }
  };

  const fullAddress = (c: Record<string, unknown>) =>
    [c["address"], c["district"], c["city"], c["state"], c["zip"]].filter(Boolean).join(", ");

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-lg uppercase">Clientes</h2>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="mr-1 h-4 w-4" /> Novo cliente
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Cadastrar cliente</DialogTitle>
            </DialogHeader>
            <form onSubmit={save} className="space-y-3">
              {[
                { key: "name", label: "Nome do estabelecimento", required: true },
                { key: "contact_name", label: "Responsável no local" },
                { key: "phone", label: "Telefone" },
                { key: "address", label: "Endereço (rua e número)" },
                { key: "district", label: "Bairro" },
                { key: "city", label: "Cidade" },
                { key: "state", label: "UF" },
                { key: "zip", label: "CEP" },
              ].map((field) => (
                <div key={field.key} className="space-y-2">
                  <Label htmlFor={field.key}>{field.label}</Label>
                  <Input
                    id={field.key}
                    value={form[field.key as keyof typeof empty]}
                    onChange={(e) => setForm({ ...form, [field.key]: e.target.value })}
                    required={field.required}
                  />
                </div>
              ))}
              <div className="space-y-2">
                <Label htmlFor="notes">Observações</Label>
                <Textarea
                  id="notes"
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                />
              </div>
              <Button type="submit" className="w-full">
                Cadastrar
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <label className="flex items-center gap-2 text-xs text-muted-foreground">
        <input type="checkbox" checked={showInactive} onChange={(e) => setShowInactive(e.target.checked)} />
        Mostrar clientes ocultos (histórico)
      </label>

      <Accordion type="single" collapsible className="space-y-2">
        {visibleCustomers.map((customer) => (
          <AccordionItem key={customer.id} value={customer.id} className="surface border-none px-4">
            <AccordionTrigger className="text-left">
              <div>
                <p className="font-semibold">
                  {customer.name}
                  {!customer.active && (
                    <Badge variant="secondary" className="ml-2 align-middle">
                      Oculto
                    </Badge>
                  )}
                </p>
                <p className="text-xs font-normal text-muted-foreground">
                  {customer.contact_name || "Sem responsável"} ·{" "}
                  {(customer.equipments as unknown[])?.length ?? 0} equipamento(s)
                </p>
              </div>
            </AccordionTrigger>
            <AccordionContent className="space-y-3 pb-4">
              <p className="text-sm text-muted-foreground">{fullAddress(customer) || "Sem endereço"}</p>
              {companyId && (
                <CustomerContactEditor
                  customerId={customer.id}
                  companyId={companyId}
                  contactName={customer.contact_name}
                  phone={customer.phone}
                  onSaved={refreshCustomers}
                />
              )}
              <div className="space-y-2">
                {(customer.equipments as Array<Record<string, string | number | null>>).map((eq) => {
                  const destinations = activeCustomers.filter((item) => item.id !== customer.id);
                  return (
                    <div key={String(eq["id"])} className="space-y-2 rounded-md bg-muted px-3 py-2 text-xs">
                      <p>
                        {eq["type"]} {eq["brand"]} {eq["model"]} · série {eq["serial_number"] || "sem série"}
                      </p>
                      {customer.active && destinations.length > 0 && (
                        <Select
                          onValueChange={(nextId) => {
                            const dest = destinations.find((item) => item.id === nextId);
                            if (
                              !window.confirm(
                                `Transferir este equipamento para ${dest?.name}? O histórico de manutenção vai junto.`,
                              )
                            )
                              return;
                            void moveEquipment(String(eq["id"]), nextId);
                          }}
                        >
                          <SelectTrigger className="h-8 w-56 bg-background text-xs">
                            <SelectValue placeholder="Transferir para outro cliente" />
                          </SelectTrigger>
                          <SelectContent>
                            {destinations.map((item) => (
                              <SelectItem key={item.id} value={item.id}>
                                {item.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                      <p className="font-semibold uppercase text-muted-foreground">Histórico do equipamento</p>
                      <EquipmentLifeSheet equipmentId={String(eq["id"])} />
                    </div>
                  );
                })}
              </div>

              <CustomerHistory
                orders={customer.work_orders as ComponentProps<typeof CustomerHistory>["orders"]}
              />

              <div className="flex flex-wrap gap-2">
                <Button variant="secondary" size="sm" asChild>
                  <a
                    href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(fullAddress(customer))}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <MapPin className="mr-1 h-4 w-4" /> Ver no mapa
                  </a>
                </Button>
                {customer.active ? (
                  <Button variant="ghost" size="sm" onClick={() => deactivate(customer.id)}>
                    <Trash2 className="mr-1 h-4 w-4" /> Excluir
                  </Button>
                ) : (
                  <Button variant="secondary" size="sm" onClick={() => reactivate(customer.id)}>
                    <RotateCcw className="mr-1 h-4 w-4" /> Reativar
                  </Button>
                )}
              </div>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
      {visibleCustomers.length === 0 && (
        <p className="surface p-4 text-sm text-muted-foreground">
          {showInactive
            ? "Nenhum cliente cadastrado."
            : "Nenhum cliente ativo. Marque a opção acima para ver os ocultos."}
        </p>
      )}
    </div>
  );
}
