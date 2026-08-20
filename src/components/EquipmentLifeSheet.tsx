import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { KIND_LABEL, STATUS_LABEL, dateBR, dateTimeBR, minutesLabel } from "@/lib/format";
import { Badge } from "@/components/ui/badge";

type ServiceEvent = {
  kind: "atendimento";
  at: string;
  orderId: string;
  customer: string;
  technician: string;
  serviceKind: string;
  status: string;
  notes: string | null;
  duration: number | null;
  parts: string[];
};

type TransferEvent = {
  kind: "transferencia";
  at: string;
  from: string;
  to: string;
  by: string;
};

type LifeEvent = ServiceEvent | TransferEvent;

type WorkOrderEmbed = {
  id: string;
  scheduled_date: string;
  completed_at: string | null;
  created_at: string;
  kind: string;
  status: string;
  technician_notes: string | null;
  duration_minutes: number | null;
  customers: { name: string } | null;
  profiles: { full_name: string } | null;
  work_order_parts: Array<{ quantity: number; parts: { name: string; unit: string } | null }>;
};

function mapOrder(order: WorkOrderEmbed): ServiceEvent {
  return {
    kind: "atendimento",
    at: order.completed_at ?? `${order.scheduled_date}T12:00:00`,
    orderId: order.id,
    customer: order.customers?.name ?? "Cliente",
    technician: order.profiles?.full_name ?? "Sem técnico",
    serviceKind: order.kind,
    status: order.status,
    notes: order.technician_notes,
    duration: order.duration_minutes,
    parts: (order.work_order_parts ?? []).map(
      (row) => `${row.parts?.name ?? "Peça"} (${row.quantity} ${row.parts?.unit ?? "un"})`,
    ),
  };
}

export function EquipmentLifeSheet({ equipmentId }: { equipmentId: string }) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["equipment-life", equipmentId],
    queryFn: async () => {
      const [transfersRes, linkedRes, fkRes] = await Promise.all([
        supabase
          .from("equipment_transfers")
          .select(
            "id, created_at, from_customer:customers!from_customer_id(name), to_customer:customers!to_customer_id(name), profiles!transferred_by(full_name)",
          )
          .eq("equipment_id", equipmentId)
          .order("created_at", { ascending: false }),
        supabase
          .from("work_order_equipments")
          .select(
            "work_orders(id, scheduled_date, completed_at, created_at, kind, status, technician_notes, duration_minutes, customers(name), profiles!technician_id(full_name), work_order_parts(quantity, parts(name, unit)))",
          )
          .eq("equipment_id", equipmentId),
        supabase
          .from("work_orders")
          .select(
            "id, scheduled_date, completed_at, created_at, kind, status, technician_notes, duration_minutes, customers(name), profiles!technician_id(full_name), work_order_parts(quantity, parts(name, unit))",
          )
          .eq("equipment_id", equipmentId),
      ]);
      if (transfersRes.error) throw transfersRes.error;
      if (linkedRes.error) throw linkedRes.error;
      if (fkRes.error) throw fkRes.error;

      const orders = new Map<string, ServiceEvent>();
      for (const row of linkedRes.data ?? []) {
        const order = row.work_orders as WorkOrderEmbed | null;
        if (order?.id) orders.set(order.id, mapOrder(order));
      }
      for (const order of (fkRes.data ?? []) as WorkOrderEmbed[]) {
        if (order?.id) orders.set(order.id, mapOrder(order));
      }

      const transfers: TransferEvent[] = (transfersRes.data ?? []).map((row) => ({
        kind: "transferencia",
        at: row.created_at,
        from: (row.from_customer as { name: string } | null)?.name ?? "Cliente anterior",
        to: (row.to_customer as { name: string } | null)?.name ?? "Novo cliente",
        by: (row.profiles as { full_name: string } | null)?.full_name ?? "Usuário do sistema",
      }));

      const events: LifeEvent[] = [...orders.values(), ...transfers].sort((a, b) => b.at.localeCompare(a.at));
      return events;
    },
  });

  if (isLoading) return <p className="text-xs text-muted-foreground">Carregando histórico do equipamento...</p>;
  if (error) {
    return (
      <p className="text-xs text-destructive">
        Não foi possível carregar o histórico: {error instanceof Error ? error.message : "erro"}
      </p>
    );
  }
  if (!data?.length) {
    return (
      <p className="text-xs text-muted-foreground">
        Ainda não há atendimentos nem transferências registrados neste equipamento.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {data.map((event) =>
        event.kind === "transferencia" ? (
          <div key={`t-${event.at}-${event.from}-${event.to}`} className="rounded-md border border-border bg-background px-3 py-2 text-xs">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-medium">Transferência</span>
              <Badge variant="secondary">Mudança de cliente</Badge>
            </div>
            <p className="mt-1 text-muted-foreground">{dateTimeBR(event.at)}</p>
            <p className="mt-1">
              De <span className="font-medium">{event.from}</span> para{" "}
              <span className="font-medium">{event.to}</span>
            </p>
            <p className="text-muted-foreground">Registrado por {event.by}</p>
          </div>
        ) : (
          <div key={event.orderId} className="rounded-md bg-muted px-3 py-2 text-xs">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-medium">
                {dateBR(event.at.slice(0, 10))} · {KIND_LABEL[event.serviceKind] ?? event.serviceKind}
              </span>
              <Badge variant={event.status === "concluido" ? "default" : "secondary"}>
                {STATUS_LABEL[event.status] ?? event.status}
              </Badge>
            </div>
            <p className="mt-1 text-muted-foreground">
              Técnico: {event.technician} · Cliente: {event.customer}
              {event.duration != null ? ` · ${minutesLabel(event.duration)}` : ""}
            </p>
            {event.notes && <p className="mt-1">{event.notes}</p>}
            {event.parts.length > 0 && <p className="mt-1">Materiais: {event.parts.join(", ")}</p>}
          </div>
        ),
      )}
    </div>
  );
}
