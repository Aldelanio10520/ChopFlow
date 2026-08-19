import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ChevronRight, MapPin } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { KIND_LABEL, STATUS_LABEL, dateBR, todayISO } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/tecnico/")({
  component: TecnicoRota,
});

function TecnicoRota() {
  const { data: session } = useAuth();
  const userId = session?.userId ?? null;

  const { data: orders } = useQuery({
    queryKey: ["tecnico-hoje", userId],
    enabled: !!userId,
    refetchInterval: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("work_orders")
        .select("*, customers(name,address,district,city,state)")
        .eq("technician_id", userId!)
        .gte("scheduled_date", todayISO())
        .neq("status", "concluido")
        .order("scheduled_date")
        .order("position");
      if (error) throw error;
      return data ?? [];
    },
  });

  const list = orders ?? [];

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-display text-lg uppercase">Rota de hoje</h2>
        <p className="text-sm text-muted-foreground">
          {dateBR(todayISO())} · {list.length} atendimento(s) em aberto
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
