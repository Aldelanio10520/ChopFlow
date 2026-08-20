import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronRight, MapPin } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { KIND_LABEL, STATUS_LABEL, addDaysISO, dateBR, todayISO, weekRangeISO } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/tecnico/")({
  component: TecnicoRota,
});

type Period = "hoje" | "amanha" | "semana";

function TecnicoRota() {
  const { data: session } = useAuth();
  const userId = session?.userId ?? null;
  const [period, setPeriod] = useState<Period>("hoje");
  const today = todayISO();
  const tomorrow = addDaysISO(1);
  const week = weekRangeISO();

  const { data: orders } = useQuery({
    queryKey: ["tecnico-rota", userId, period],
    enabled: !!userId,
    refetchInterval: 30_000,
    queryFn: async () => {
      let query = supabase
        .from("work_orders")
        .select("*, customers(name,address,district,city,state)")
        .eq("technician_id", userId!)
        .neq("status", "concluido")
        .order("scheduled_date")
        .order("position");

      if (period === "hoje") query = query.eq("scheduled_date", today);
      if (period === "amanha") query = query.eq("scheduled_date", tomorrow);
      if (period === "semana") query = query.gte("scheduled_date", week.start).lte("scheduled_date", week.end);

      const { data, error } = await query;
      if (error) throw error;
      return data ?? [];
    },
  });

  const list = orders ?? [];
  const title = period === "hoje" ? "Rota de hoje" : period === "amanha" ? "Rota de amanhã" : "Rota da semana";
  const subtitle =
    period === "semana"
      ? `${dateBR(week.start)} a ${dateBR(week.end)}`
      : dateBR(period === "hoje" ? today : tomorrow);

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {(
          [
            ["hoje", "Hoje"],
            ["amanha", "Amanhã"],
            ["semana", "Semana"],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => setPeriod(value)}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold uppercase ${
              period === value ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div>
        <h2 className="font-display text-lg uppercase">{title}</h2>
        <p className="text-sm text-muted-foreground">
          {subtitle} · {list.length} atendimento(s) em aberto
        </p>
      </div>

      {list.length === 0 && (
        <p className="surface p-4 text-sm text-muted-foreground">
          Nenhum atendimento pendente. Aguarde a liberação da rota pelo gestor.
        </p>
      )}

      <ol className="space-y-3">
        {list.map((order) => {
          const customer = order.customers as {
            name: string;
            address: string | null;
            district: string | null;
            city: string | null;
            state: string | null;
          } | null;
          const address = [customer?.address, customer?.district, customer?.city, customer?.state]
            .filter(Boolean)
            .join(", ");
          return (
            <li key={order.id} className="surface p-4">
              <Link
                to="/tecnico/os/$id"
                params={{ id: order.id }}
                className="flex items-start justify-between gap-3"
              >
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-display text-base uppercase">
                      {order.position}. {customer?.name}
                    </span>
                    <Badge variant={order.kind === "emergencial" ? "destructive" : "secondary"}>
                      {KIND_LABEL[order.kind]}
                    </Badge>
                  </div>
                  {address && (
                    <p className="flex items-center gap-1 text-xs text-muted-foreground">
                      <MapPin className="h-3.5 w-3.5" /> {address}
                    </p>
                  )}
                  {order.description && <p className="text-sm">{order.description}</p>}
                  <p className="text-xs font-medium text-primary">{STATUS_LABEL[order.status]}</p>
                </div>
                <ChevronRight className="mt-1 h-5 w-5 shrink-0 text-muted-foreground" />
              </Link>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
