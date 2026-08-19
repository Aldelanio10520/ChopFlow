import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { KIND_LABEL, dateBR, minutesLabel } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/tecnico/historico")({
  component: Historico,
});

function Historico() {
  const { data: session } = useAuth();
  const userId = session?.userId ?? null;

  const { data: orders } = useQuery({
    queryKey: ["tecnico-historico", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("work_orders")
        .select("*, customers(name)")
        .eq("technician_id", userId!)
        .eq("status", "concluido")
        .order("completed_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data ?? [];
    },
  });

  const list = orders ?? [];

  return (
    <div className="space-y-3">
      <h2 className="font-display text-lg uppercase">Atendimentos concluídos</h2>
      {list.length === 0 && (
        <p className="surface p-4 text-sm text-muted-foreground">Nenhum atendimento concluído ainda.</p>
      )}
      {list.map((order) => (
        <Link
          key={order.id}
          to="/tecnico/os/$id"
          params={{ id: order.id }}
          className="surface flex items-center justify-between gap-3 p-3"
        >
          <div className="min-w-0">
            <p className="truncate font-medium">{(order.customers as { name: string } | null)?.name}</p>
            <p className="truncate text-xs text-muted-foreground">
              {dateBR(order.scheduled_date)} · {KIND_LABEL[order.kind]}
            </p>
          </div>
          <span className="shrink-0 text-xs text-muted-foreground">
            {minutesLabel(order.duration_minutes)}
          </span>
        </Link>
      ))}
    </div>
  );
}
