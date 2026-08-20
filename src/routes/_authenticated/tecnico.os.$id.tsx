import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, MapPin, Navigation, Phone, Plus, QrCode, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { KIND_LABEL, STATUS_LABEL, dateBR, dateTimeBR, minutesLabel } from "@/lib/format";
import { equipmentSchema, partSchema } from "@/lib/schemas";
import { findEquipmentBySerial, transferEquipment } from "@/lib/equipment";
import { EQUIPMENT_TYPES, REFRIGERANTS, VOLTAGES } from "@/lib/sanitize";
import { EquipmentQr, ScanEquipmentQr } from "@/components/EquipmentQr";

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
  type: "Chopeira a gelo",
  brand: "",
  model: "",
  serial_number: "",
  taps: "",
  refrigerant: "R134a",
  voltage: "220V",
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
  const [newPartName, setNewPartName] = useState("");
  const [equipOpen, setEquipOpen] = useState(false);
  const [equipForm, setEquipForm] = useState(emptyEquip);

  const { data: order, isLoading } = useQuery({
    queryKey: ["os", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("work_orders")
        .select(
          "*, customers(*), services(name), equipments(*), work_order_equipments(id, equipment_id, equipments(*)), work_order_parts(id, quantity, parts(name, unit)), status_events(status, created_at)",
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

  const linkedEquipmentIds = Array.from(
    new Set(
      [
        ...(((order?.work_order_equipments as Array<{ equipment_id: string }> | null) ?? []).map(
          (row) => row.equipment_id,
        )),
        order?.equipment_id ?? null,
      ].filter((value): value is string => !!value),
    ),
  );

  const { data: equipmentHistory } = useQuery({
    queryKey: ["equipment-history", linkedEquipmentIds.join(",")],
    enabled: linkedEquipmentIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("work_order_equipments")
        .select(
          "equipment_id, work_orders(id, scheduled_date, kind, status, technician_notes, customers(name), work_order_parts(quantity, parts(name)))",
        )
        .in("equipment_id", linkedEquipmentIds);
      if (error) throw error;
      return data ?? [];
    },
  });

  useEffect(() => {
    if (order?.technician_notes) setNotes(order.technician_notes);
  }, [order?.technician_notes]);

  if (isLoading) return <p className="text-sm text-muted-foreground">Carregando ordem...</p>;
  if (!order) return <p className="text-sm text-muted-foreground">Ordem não encontrada.</p>;

  const status = order.status as Status;
  const locked = status === "concluido";
  const address = [customer?.["address"], customer?.["district"], customer?.["city"], customer?.["state"]]
    .filter(Boolean)
    .join(", ");

  const advance = async () => {
    const index = FLOW.indexOf(status);
    const next = FLOW[index + 1];
    if (!next || locked) return;
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
    queryClient.invalidateQueries({ queryKey: ["tecnico-rota"] });
  };

  const saveNotes = async () => {
    if (locked) return;
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

  const addPart = async (chosenPartId: string, quantity = Number(qty) || 1) => {
    if (!chosenPartId || !session?.companyId || locked) return;
    const { error } = await supabase.from("work_order_parts").insert({
      work_order_id: order.id,
      part_id: chosenPartId,
      quantity,
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

  const createPartOnTheFly = async () => {
    if (!session?.companyId || locked) return;
    const parsed = partSchema.safeParse({ name: newPartName, unit: "un" });
    if (!parsed.success) {
      toast.error("Informe o nome da peça.");
      return;
    }
    const { data, error } = await supabase
      .from("parts")
      .insert({ company_id: session.companyId, name: parsed.data.name, unit: parsed.data.unit })
      .select("id")
      .maybeSingle();
    if (error) {
      const existing = await supabase
        .from("parts")
        .select("id")
        .eq("company_id", session.companyId)
        .ilike("name", parsed.data.name)
        .maybeSingle();
      if (existing.data?.id) {
        await addPart(existing.data.id);
        setNewPartName("");
        return;
      }
      toast.error(error.message);
      return;
    }
    if (data?.id) {
      await addPart(data.id);
      setNewPartName("");
      queryClient.invalidateQueries({ queryKey: ["parts"] });
    }
  };

  const removePart = async (rowId: string) => {
    if (locked) return;
    await supabase.from("work_order_parts").delete().eq("id", rowId);
    queryClient.invalidateQueries({ queryKey: ["os", id] });
  };

  const addEquipment = async (equipmentIdToLink: string) => {
    if (locked || !session?.companyId) return;
    const { error } = await supabase.from("work_order_equipments").insert({
      company_id: session.companyId,
      work_order_id: order.id,
      equipment_id: equipmentIdToLink,
    });
    if (error && error.code !== "23505") {
      toast.error(error.message);
      return;
    }
    queryClient.invalidateQueries({ queryKey: ["os", id] });
    queryClient.invalidateQueries({ queryKey: ["equipment-history"] });
  };

  const removeEquipment = async (equipmentIdToUnlink: string) => {
    if (locked) return;
    const { error } = await supabase
      .from("work_order_equipments")
      .delete()
      .eq("work_order_id", order.id)
      .eq("equipment_id", equipmentIdToUnlink);
    if (error) {
      toast.error(error.message);
      return;
    }
    queryClient.invalidateQueries({ queryKey: ["os", id] });
    queryClient.invalidateQueries({ queryKey: ["equipment-history"] });
  };

  const toggleEquipment = async (equipmentIdToToggle: string, selected: boolean) => {
    if (selected) await addEquipment(equipmentIdToToggle);
    else await removeEquipment(equipmentIdToToggle);
  };

  const linkByQr = async (token: string) => {
    const { data, error } = await supabase
      .from("equipments")
      .select("id, customer_id, serial_number, customers(name)")
      .eq("qr_token", token)
      .maybeSingle();
    if (error || !data) {
      toast.error("QR não encontrado.");
      return;
    }
    if (customer?.["id"] && data.customer_id !== customer["id"]) {
      const origin = (data.customers as { name: string } | null)?.name ?? "outro cliente";
      const ok = window.confirm(
        `Este equipamento está em ${origin}. Transferir para este cliente e levar o histórico de manutenção?`,
      );
      if (!ok) return;
      try {
        await transferEquipment(data.id, customer["id"]);
        queryClient.invalidateQueries({ queryKey: ["equipment-life"] });
        queryClient.invalidateQueries({ queryKey: ["customers"] });
      } catch (transferError) {
        toast.error(transferError instanceof Error ? transferError.message : "Falha ao transferir.");
        return;
      }
    }
    await addEquipment(data.id);
    toast.success("Equipamento identificado. Histórico de manutenção mantido.");
  };

  const createEquipment = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!session?.companyId || !customer?.["id"] || locked) return;
    const parsed = equipmentSchema.safeParse(equipForm);
    if (!parsed.success) {
      toast.error("Informe o número de série do equipamento.");
      return;
    }
    try {
      const existing = await findEquipmentBySerial(session.companyId, parsed.data.serial_number);
      if (existing) {
        if (existing.customer_id !== customer["id"]) {
          const origin = existing.customers?.name ?? "outro cliente";
          const ok = window.confirm(
            `A série ${parsed.data.serial_number} já está em ${origin}. Transferir para este cliente e levar o histórico?`,
          );
          if (!ok) return;
          await transferEquipment(existing.id, customer["id"]!);
        }
        toast.success("Equipamento vinculado. Histórico de manutenção mantido.");
        setEquipForm(emptyEquip);
        setEquipOpen(false);
        await addEquipment(existing.id);
        queryClient.invalidateQueries({ queryKey: ["equipments"] });
        queryClient.invalidateQueries({ queryKey: ["equipments-all"] });
        queryClient.invalidateQueries({ queryKey: ["customers"] });
        queryClient.invalidateQueries({ queryKey: ["equipment-life"] });
        return;
      }
    } catch (lookupError) {
      toast.error(lookupError instanceof Error ? lookupError.message : "Falha ao consultar série.");
      return;
    }
    const { data, error } = await supabase
      .from("equipments")
      .insert({
        company_id: session.companyId,
        customer_id: customer["id"]!,
        type: parsed.data.type,
        brand: parsed.data.brand || null,
        model: parsed.data.model || null,
        serial_number: parsed.data.serial_number,
        taps: parsed.data.taps,
        refrigerant: parsed.data.refrigerant || null,
        voltage: parsed.data.voltage || null,
        extractor_type: parsed.data.extractor_type || null,
        notes: parsed.data.notes || null,
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
    if (data?.id) await addEquipment(data.id);
    queryClient.invalidateQueries({ queryKey: ["equipments"] });
    queryClient.invalidateQueries({ queryKey: ["equipments-all"] });
    queryClient.invalidateQueries({ queryKey: ["customers"] });
    queryClient.invalidateQueries({ queryKey: ["equipment-life"] });
  };

  const usedParts =
    (order.work_order_parts as Array<{
      id: string;
      quantity: number;
      parts: { name: string; unit: string } | null;
    }>) ?? [];
  const selectedEquipment = new Set(linkedEquipmentIds);
  const historyByEquipment = new Map<
    string,
    Array<{
      id: string;
      scheduled_date: string;
      kind: string;
      status: string;
      technician_notes: string | null;
      customers: { name: string } | null;
      work_order_parts: Array<{ quantity: number; parts: { name: string } | null }>;
    }>
  >();
  for (const row of equipmentHistory ?? []) {
    const wo = row.work_orders as
      | {
          id: string;
          scheduled_date: string;
          kind: string;
          status: string;
          technician_notes: string | null;
          customers: { name: string } | null;
          work_order_parts: Array<{ quantity: number; parts: { name: string } | null }>;
        }
      | null;
    if (!wo) continue;
    const list = historyByEquipment.get(row.equipment_id) ?? [];
    if (!list.some((item) => item.id === wo.id)) list.push(wo);
    historyByEquipment.set(row.equipment_id, list);
  }

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
          <p className="text-sm font-medium text-success">Atendimento concluído e bloqueado para edição.</p>
        )}
      </div>

      <div className="surface space-y-3 p-4">
        <div>
          <p className="font-display uppercase">Equipamentos atendidos</p>
          <p className="text-xs text-muted-foreground">
            Marque um ou mais equipamentos deste cliente, ou cadastre um novo.
          </p>
        </div>

        {(customerEquipments ?? []).length === 0 && (
          <p className="text-sm text-muted-foreground">Nenhum equipamento cadastrado neste cliente.</p>
        )}

        <div className="space-y-2">
          {(customerEquipments ?? []).map((eq) => {
            const checked = selectedEquipment.has(eq.id);
            const history = (historyByEquipment.get(eq.id) ?? [])
              .slice()
              .sort((a, b) => b.scheduled_date.localeCompare(a.scheduled_date));
            return (
              <div key={eq.id} className="rounded-lg border border-border p-3">
                <label className="flex cursor-pointer items-start gap-3">
                  <Checkbox
                    className="mt-1"
                    checked={checked}
                    disabled={locked}
                    onCheckedChange={(value) => void toggleEquipment(eq.id, value === true)}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">
                      {eq.type} {eq.brand} {eq.model}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Série {eq.serial_number || "—"} · {eq.taps ?? "—"} torneira(s) ·{" "}
                      {eq.refrigerant || "gás n/d"} · {eq.voltage || "tensão n/d"}
                    </p>
                  </div>
                </label>
                {checked && (
                  <div className="mt-3 space-y-2 pl-7">
                    {eq.qr_token && (
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="secondary" size="sm">
                            <QrCode className="mr-1 h-4 w-4" /> Ver QR
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>QR para identificação</DialogTitle>
                          </DialogHeader>
                          <EquipmentQr token={eq.qr_token} />
                        </DialogContent>
                      </Dialog>
                    )}
                    {history.length > 0 && (
                      <div className="space-y-1">
                        <p className="text-xs font-semibold uppercase text-muted-foreground">
                          Ficha de vida útil
                        </p>
                        {history.map((wo) => {
                          const used = wo.work_order_parts ?? [];
                          return (
                            <div key={wo.id} className="rounded-md bg-muted px-3 py-2 text-xs">
                              <p>
                                {dateBR(wo.scheduled_date)} · {KIND_LABEL[wo.kind] ?? wo.kind} ·{" "}
                                {STATUS_LABEL[wo.status] ?? wo.status}
                                {wo.customers?.name ? ` · ${wo.customers.name}` : ""}
                              </p>
                              <p className="text-muted-foreground">{wo.technician_notes || "Sem relato"}</p>
                              {used.length > 0 && (
                                <p className="mt-1 text-muted-foreground">
                                  Peças: {used.map((row) => `${row.parts?.name} (${row.quantity})`).join(", ")}
                                </p>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {!locked && <ScanEquipmentQr disabled={locked} onToken={(token) => void linkByQr(token)} />}

        {!locked && (
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
                <div className="space-y-2">
                  <Label>Tipo</Label>
                  <Select value={equipForm.type} onValueChange={(v) => setEquipForm({ ...equipForm, type: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {EQUIPMENT_TYPES.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {[
                  { key: "brand", label: "Marca" },
                  { key: "model", label: "Modelo" },
                  { key: "serial_number", label: "Número de série", required: true },
                  { key: "taps", label: "Quantidade de torneiras" },
                  { key: "extractor_type", label: "Tipo de extratora" },
                ].map((field) => (
                  <div key={field.key} className="space-y-2">
                    <Label htmlFor={field.key}>{field.label}</Label>
                    <Input
                      id={field.key}
                      value={equipForm[field.key as keyof typeof emptyEquip]}
                      onChange={(e) => setEquipForm({ ...equipForm, [field.key]: e.target.value })}
                      required={"required" in field ? field.required : false}
                    />
                  </div>
                ))}
                <div className="space-y-2">
                  <Label>Voltagem</Label>
                  <Select
                    value={equipForm.voltage}
                    onValueChange={(v) => setEquipForm({ ...equipForm, voltage: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {VOLTAGES.map((voltage) => (
                        <SelectItem key={voltage} value={voltage}>
                          {voltage}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Gás refrigerante</Label>
                  <Select
                    value={equipForm.refrigerant}
                    onValueChange={(v) => setEquipForm({ ...equipForm, refrigerant: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {REFRIGERANTS.map((gas) => (
                        <SelectItem key={gas} value={gas}>
                          {gas}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
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
        )}
      </div>

      <div className="surface space-y-3 p-4">
        <p className="font-display uppercase">Peças e insumos usados</p>
        {usedParts.map((row) => (
          <div key={row.id} className="flex items-center justify-between rounded-lg bg-muted px-3 py-2 text-sm">
            <span>
              {row.parts?.name} · {row.quantity} {row.parts?.unit}
            </span>
            {!locked && (
              <Button variant="ghost" size="icon" onClick={() => removePart(row.id)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        ))}
        {!locked && (
          <>
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
              <Button onClick={() => void addPart(partId)} disabled={!partId}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex gap-2">
              <Input
                placeholder="Peça não listada? cadastre agora"
                value={newPartName}
                onChange={(e) => setNewPartName(e.target.value)}
              />
              <Button variant="secondary" onClick={() => void createPartOnTheFly()} disabled={!newPartName.trim()}>
                Nova
              </Button>
            </div>
          </>
        )}
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
          disabled={locked}
          onChange={(e) => setNotes(e.target.value)}
        />
        {!locked && (
          <Button variant="secondary" className="w-full" onClick={saveNotes}>
            Salvar relato
          </Button>
        )}
      </div>
    </div>
  );
}
