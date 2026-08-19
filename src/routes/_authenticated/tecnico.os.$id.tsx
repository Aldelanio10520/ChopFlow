import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, MapPin, Navigation, Phone, Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { KIND_LABEL, STATUS_LABEL, dateTimeBR, minutesLabel } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/tecnico/os/$id")({
  component: OsDetalhe,
});

const FLOW = ["pendente", "recebido", "em_deslocamento", "em_atendimento", "concluido"] as const;
type Status = (typeof FLOW)[number];

const NEXT_LABEL: Record<string, string> = {
  pendente: "Receber ordem",
  recebido: "Iniciar deslocamento",
  em_deslocamento: "Check-in no cliente",
  em_atendimento: "Check-out e concluir",
};

const emptyEquip = {
  type: "Chopeira",
  brand: "",
  model: "",
  serial_number: "",
  taps: "",
  refrigerant: "",
  voltage: "",
  extractor_type: "",
  notes: "",
};

function OsDetalhe() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: session } = useAuth();
  const [notes, setNotes] = useState("");
  const [partId, setPartId] = useState("");
  const [qty, setQty] = useState("1");
  const [equipOpen, setEquipOpen] = useState(false);
  const [equipForm, setEquipForm] = useState(emptyEquip);

  const { data: order, isLoading } = useQuery({
    queryKey: ["os", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("work_orders")
        .select(
          "*, customers(*), services(name), equipments(*), work_order_parts(id, quantity, parts(name, unit)), status_events(status, created_at)",
        )
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: parts } = useQuery({
    queryKey: ["parts", session?.companyId],
    enabled: !!session?.companyId,
    queryFn: async () => (await supabase.from("parts").select("id,name,unit").order("name")).data ?? [],
  });

  const customer = (order?.customers ?? null) as Record<string, string | null> | null;

  const { data: customerEquipments } = useQuery({
    queryKey: ["equipments", customer?.["id"]],
    enabled: !!customer?.["id"],
    queryFn: async () =>
      (await supabase.from("equipments").select("*").eq("customer_id", customer!["id"]!)).data ?? [],
  });

  useEffect(() => {
    if (order?.technician_notes) setNotes(order.technician_notes);
  }, [order?.technician_notes]);

  if (isLoading) return <p className="text-sm text-muted-foreground">Carregando ordem...</p>;
  if (!order) return <p className="text-sm text-muted-foreground">Ordem não encontrada.</p>;

  const status = order.status as Status;
  const address = [customer?.["address"], customer?.["district"], customer?.["city"], customer?.["state"]]
    .filter(Boolean)
    .join(", ");

  const advance = async () => {
    const index = FLOW.indexOf(status);
    const next = FLOW[index + 1];
    if (!next) return;
    if (next === "concluido" && !window.confirm("Confirmar check-out? Esta ação não pode ser desfeita."))
      return;
    const { error } = await supabase
      .from("work_orders")
      .update({ status: next, technician_notes: notes })
      .eq("id", order.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(`Status atualizado: ${STATUS_LABEL[next]}`);
    queryClient.invalidateQueries({ queryKey: ["os", id] });
    queryClient.invalidateQueries({ queryKey: ["tecnico-hoje"] });
  };

  const saveNotes = async () => {
    const { error } = await supabase
      .from("work_orders")
      .update({ technician_notes: notes })
      .eq("id", order.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Relato salvo.");
  };

  const addPart = async () => {
    if (!partId || !session?.companyId) return;
    const { error } = await supabase.from("work_order_parts").insert({
      work_order_id: order.id,
      part_id: partId,
      quantity: Number(qty) || 1,
      company_id: session.companyId,
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    setPartId("");
    setQty("1");
    queryClient.invalidateQueries({ queryKey: ["os", id] });
  };

  const removePart = async (rowId: string) => {
    await supabase.from("work_order_parts").delete().eq("id", rowId);
    queryClient.invalidateQueries({ queryKey: ["os", id] });
  };

  const linkEquipment = async (equipmentId: string) => {
    const { error } = await supabase
      .from("work_orders")
      .update({ equipment_id: equipmentId })
      .eq("id", order.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    queryClient.invalidateQueries({ queryKey: ["os", id] });
  };

  const createEquipment = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!session?.companyId || !customer?.["id"]) return;
    const { data, error } = await supabase
      .from("equipments")
      .insert({
        company_id: session.companyId,
        customer_id: customer["id"]!,
        type: equipForm.type,
        brand: equipForm.brand,
        model: equipForm.model,
        serial_number: equipForm.serial_number,
        taps: equipForm.taps ? Number(equipForm.taps) : null,
        refrigerant: equipForm.refrigerant,
        voltage: equipForm.voltage,
        extractor_type: equipForm.extractor_type,
        notes: equipForm.notes,
      })
      .select("id")
      .maybeSingle();
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Equipamento cadastrado.");
    setEquipForm(emptyEquip);
    setEquipOpen(false);
    if (data?.id) await linkEquipment(data.id);
    queryClient.invalidateQueries({ queryKey: ["equipments"] });
  };

  const usedParts =
    (order.work_order_parts as Array<{
      id: string;
      quantity: number;
      parts: { name: string; unit: string } | null;
    }>) ?? [];
  const equipment = order.equipments as Record<string, string | number | null> | null;

  return (
    <div className="space-y-4 pb-6">
      <Button variant="ghost" size="sm" onClick={() => navigate({ to: "/tecnico" })}>
        <ArrowLeft className="mr-1 h-4 w-4" /> Voltar
      </Button>

      <div className="surface space-y-3 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-display text-xl uppercase">{customer?.["name"]}</h2>
          <Badge variant={order.kind === "emergencial" ? "destructive" : "secondary"}>
            {KIND_LABEL[order.kind]}
          </Badge>
        </div>
        {address && (
          <p className="flex items-start gap-1.5 text-sm text-muted-foreground">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0" /> {address}
          </p>
        )}
        {customer?.["contact_name"] && (
          <p className="text-sm text-muted-foreground">Responsável: {customer["contact_name"]}</p>
        )}
        {order.description && <p className="text-sm">{order.description}</p>}
        {(order.services as { name: string } | null)?.name && (
          <p className="text-sm text-muted-foreground">
            Serviço: {(order.services as { name: string }).name}
          </p>
        )}

        <div className="flex flex-wrap gap-2">
          {address && (
            <>
              <Button variant="secondary" size="sm" asChild>
                <a
                  href={`https://waze.com/ul?q=${encodeURIComponent(address)}&navigate=yes`}
                  target="_blank"
                  rel="noreferrer"
                >
                  <Navigation className="mr-1 h-4 w-4" /> Waze
                </a>
              </Button>
              <Button variant="secondary" size="sm" asChild>
                <a
                  href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  <MapPin className="mr-1 h-4 w-4" /> Maps
                </a>
              </Button>
            </>
          )}
          {customer?.["phone"] && (
            <Button variant="secondary" size="sm" asChild>
              <a href={`tel:${customer["phone"]}`}>
                <Phone className="mr-1 h-4 w-4" /> Ligar
              </a>
            </Button>
          )}
        </div>
      </div>

      <div className="surface space-y-3 p-4">
        <div className="flex items-center justify-between">
          <p className="font-display uppercase">Status</p>
          <Badge>{STATUS_LABEL[status]}</Badge>
        </div>
        <div className="space-y-1 text-xs text-muted-foreground">
          <p>Recebido: {dateTimeBR(order.received_at)}</p>
          <p>Deslocamento: {dateTimeBR(order.travel_started_at)}</p>
          <p>Check-in: {dateTimeBR(order.checkin_at)}</p>
          <p>Check-out: {dateTimeBR(order.completed_at)}</p>
          {order.duration_minutes !== null && (
            <p className="font-medium text-foreground">
              Tempo em atendimento: {minutesLabel(order.duration_minutes)}
            </p>
          )}
        </div>
        {status !== "concluido" ? (
          <Button className="w-full" size="lg" onClick={advance}>
            {NEXT_LABEL[status]}
          </Button>
        ) : (
          <p className="text-sm font-medium text-success">Atendimento concluído.</p>
        )}
      </div>

      <div className="surface space-y-3 p-4">
        <p className="font-display uppercase">Equipamento atendido</p>
        {equipment ? (
          <div className="rounded-lg bg-muted p-3 text-sm">
            <p className="font-medium">
              {equipment["type"]} {equipment["brand"]} {equipment["model"]}
            </p>
            <p className="text-xs text-muted-foreground">
              Série {equipment["serial_number"] || "—"} · {equipment["taps"] ?? "—"} torneira(s) ·{" "}
              {equipment["refrigerant"] || "gás n/d"} · {equipment["voltage"] || "tensão n/d"} ·{" "}
              {equipment["extractor_type"] || "extrator n/d"}
            </p>
          </div>
        ) : (
          <Select onValueChange={linkEquipment}>
            <SelectTrigger>
              <SelectValue placeholder="Selecionar equipamento do cliente" />
            </SelectTrigger>
            <SelectContent>
              {(customerEquipments ?? []).map((eq) => (
                <SelectItem key={eq.id} value={eq.id}>
                  {eq.type} {eq.brand} {eq.model} {eq.serial_number ? `· ${eq.serial_number}` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        <Dialog open={equipOpen} onOpenChange={setEquipOpen}>
          <DialogTrigger asChild>
            <Button variant="secondary" size="sm" className="w-full">
              <Plus className="mr-1 h-4 w-4" /> Cadastrar novo equipamento
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Novo equipamento</DialogTitle>
            </DialogHeader>
            <form onSubmit={createEquipment} className="space-y-3">
              {[
                { key: "type", label: "Tipo (chopeira, freezer, câmara)" },
                { key: "brand", label: "Marca" },
                { key: "model", label: "Modelo" },
                { key: "serial_number", label: "Número de série" },
                { key: "taps", label: "Quantidade de torneiras" },
                { key: "refrigerant", label: "Tipo de gás refrigerante" },
                { key: "voltage", label: "Tensão (110V / 220V)" },
                { key: "extractor_type", label: "Tipo de extrator" },
              ].map((field) => (
                <div key={field.key} className="space-y-2">
                  <Label htmlFor={field.key}>{field.label}</Label>
                  <Input
                    id={field.key}
                    value={equipForm[field.key as keyof typeof emptyEquip]}
                    onChange={(e) => setEquipForm({ ...equipForm, [field.key]: e.target.value })}
                  />
                </div>
              ))}
              <div className="space-y-2">
                <Label htmlFor="eq-notes">Observações</Label>
                <Textarea
                  id="eq-notes"
                  value={equipForm.notes}
                  onChange={(e) => setEquipForm({ ...equipForm, notes: e.target.value })}
                />
              </div>
              <Button type="submit" className="w-full">
                Cadastrar equipamento
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="surface space-y-3 p-4">
        <p className="font-display uppercase">Peças e insumos usados</p>
        {usedParts.map((row) => (
          <div key={row.id} className="flex items-center justify-between rounded-lg bg-muted px-3 py-2 text-sm">
            <span>
              {row.parts?.name} · {row.quantity} {row.parts?.unit}
            </span>
            <Button variant="ghost" size="icon" onClick={() => removePart(row.id)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
        <div className="flex gap-2">
          <Select value={partId} onValueChange={setPartId}>
            <SelectTrigger className="flex-1">
              <SelectValue placeholder="Peça" />
            </SelectTrigger>
            <SelectContent>
              {(parts ?? []).map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            type="number"
            min="1"
            className="w-20"
            value={qty}
            onChange={(e) => setQty(e.target.value)}
            aria-label="Quantidade"
          />
          <Button onClick={addPart} disabled={!partId}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="surface space-y-3 p-4">
        <Label htmlFor="relato" className="font-display uppercase">
          Relato do serviço executado
        </Label>
        <Textarea
          id="relato"
          rows={5}
          placeholder="Descreva o que foi feito, peças trocadas e recomendações."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
        <Button variant="secondary" className="w-full" onClick={saveNotes}>
          Salvar relato
        </Button>
      </div>
    </div>
  );
}
