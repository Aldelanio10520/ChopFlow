import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Activity, CheckCircle2, Clock, Timer } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { STATUS_LABEL, KIND_LABEL, dateTimeBR, minutesLabel, todayISO } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/gestor/")({
  component: Painel,
});

function Painel() {
  const { data: session } = useAuth();
  const companyId = session?.companyId ?? null;
  const queryClient = useQueryClient();

  const { data: orders } = useQuery({
    queryKey: ["gestor-orders", companyId],
    enabled: !!companyId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("work_orders")
        .select("*, customers(name), profiles!technician_id(full_name)")
        .order("scheduled_date", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data ?? [];
    },
  });

  useEffect(() => {
    if (!companyId) return;
    const channel = supabase
      .channel("gestor-wo")
      .on("postgres_changes", { event: "*", schema: "public", table: "work_orders" }, (payload) => {
        queryClient.invalidateQueries({ queryKey: ["gestor-orders"] });
        const next = payload.new as { status?: string; company_id?: string } | null;
        if (payload.eventType === "UPDATE" && next?.status) {
          toast.message(`Técnico atualizou uma OS: ${STATUS_LABEL[next.status] ?? next.status}`);
        }
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [companyId, queryClient]);

  const today = todayISO();
  const list = orders ?? [];
  const todays = list.filter((o) => o.scheduled_date === today);
  const done = list.filter((o) => o.status === "concluido");
  const avg =
    done.length > 0
      ? Math.round(done.reduce((sum, o) => sum + (o.duration_minutes ?? 0), 0) / done.length)
      : null;

  const cards = [
    { label: "OS de hoje", value: todays.length, icon: Activity },
    { label: "Pendentes", value: list.filter((o) => o.status !== "concluido").length, icon: Clock },
    { label: "Concluídas", value: done.length, icon: CheckCircle2 },
    { label: "Tempo médio", value: minutesLabel(avg), icon: Timer },
  ];

  return (
    <div className="space-y-6">
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {cards.map((card) => (
          <div key={card.label} className="surface p-4">
            <card.icon className="h-5 w-5 text-primary" />
            <p className="mt-3 font-display text-2xl font-bold">{card.value}</p>
            <p className="text-xs text-muted-foreground">{card.label}</p>
          </div>
        ))}
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg uppercase">Atendimentos recentes</h2>
          <Link to="/gestor/rotas" className="text-xs text-primary underline-offset-4 hover:underline">
            Gerenciar rotas
          </Link>
        </div>
        {list.length === 0 && (
          <p className="surface p-4 text-sm text-muted-foreground">
            Nenhuma ordem de serviço ainda. Em Rotas, crie a rota e clique em “Adicionar atendimento”
            para ela aparecer aqui e no app do técnico.
          </p>
        )}
        <div className="space-y-2">
          {list.slice(0, 15).map((order) => (
            <div key={order.id} className="surface flex flex-wrap items-center justify-between gap-2 p-4">
              <div className="min-w-0">
                <p className="truncate font-semibold">
                  {(order.customers as { name: string } | null)?.name ?? "Cliente"}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {KIND_LABEL[order.kind]} ·{" "}
                  {(order.profiles as { full_name: string } | null)?.full_name ?? "Sem técnico"} ·{" "}
                  {dateTimeBR(order.completed_at ?? order.checkin_at ?? order.created_at)}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {order.duration_minutes !== null && (
                  <span className="text-xs text-muted-foreground">
                    {minutesLabel(order.duration_minutes)}
                  </span>
                )}
                <Badge variant={order.status === "concluido" ? "default" : "secondary"}>
                  {STATUS_LABEL[order.status]}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
