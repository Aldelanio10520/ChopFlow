import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { MapPin, Plus, Trash2 } from "lucide-react";
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

export const Route = createFileRoute("/_authenticated/gestor/clientes")({
  component: Clientes,
});

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

  const { data: customers } = useQuery({
    queryKey: ["customers", companyId],
    enabled: !!companyId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("customers")
        .select("*, equipments(*)")
        .order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!companyId) return;
    const { error } = await supabase.from("customers").insert({ ...form, company_id: companyId });
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Cliente cadastrado.");
    setForm(empty);
    setOpen(false);
    queryClient.invalidateQueries({ queryKey: ["customers"] });
  };

  const remove = async (id: string) => {
    if (!window.confirm("Excluir este cliente e seus equipamentos?")) return;
    const { error } = await supabase.from("customers").delete().eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    queryClient.invalidateQueries({ queryKey: ["customers"] });
  };

  const fullAddress = (c: Record<string, unknown>) =>
    [c["address"], c["district"], c["city"], c["state"], c["zip"]].filter(Boolean).join(", ");

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
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

      <Accordion type="single" collapsible className="space-y-2">
        {(customers ?? []).map((customer) => (
          <AccordionItem key={customer.id} value={customer.id} className="surface border-none px-4">
            <AccordionTrigger className="text-left">
              <div>
                <p className="font-semibold">{customer.name}</p>
                <p className="text-xs font-normal text-muted-foreground">
                  {customer.contact_name || "Sem responsável"} ·{" "}
                  {(customer.equipments as unknown[])?.length ?? 0} equipamento(s)
                </p>
              </div>
            </AccordionTrigger>
            <AccordionContent className="space-y-3 pb-4">
              <p className="text-sm text-muted-foreground">{fullAddress(customer) || "Sem endereço"}</p>
              {customer.phone && <p className="text-sm text-muted-foreground">Tel: {customer.phone}</p>}
              <div className="space-y-1">
                {(customer.equipments as Array<Record<string, string | number | null>>).map((eq) => (
                  <p key={eq["id"]} className="rounded-md bg-muted px-3 py-2 text-xs">
                    {eq["type"]} {eq["brand"]} {eq["model"]} · série {eq["serial_number"] || "—"}
                  </p>
                ))}
              </div>
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
                <Button variant="ghost" size="sm" onClick={() => remove(customer.id)}>
                  <Trash2 className="mr-1 h-4 w-4" /> Excluir
                </Button>
              </div>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
      {(customers ?? []).length === 0 && (
        <p className="surface p-4 text-sm text-muted-foreground">Nenhum cliente cadastrado.</p>
      )}
    </div>
  );
}
