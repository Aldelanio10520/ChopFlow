import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
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
import { KIND_LABEL, STATUS_LABEL, dateBR, todayISO } from "@/lib/format";
import { routeSchema, workOrderStopSchema } from "@/lib/schemas";

export const Route = createFileRoute("/_authenticated/gestor/rotas")({
  component: Rotas,
});

type Kind = "emergencial" | "preventiva" | "sanitizacao" | "instalacao";

function Rotas() {
  const { data: session } = useAuth();
  const companyId = session?.companyId ?? null;
  const queryClient = useQueryClient();

  const [routeForm, setRouteForm] = useState({
    technician_id: "",
    route_date: todayISO(),
    title: "Rota do dia",
    notes: "",
  });
  const [routeOpen, setRouteOpen] = useState(false);
  const [stopRoute, setStopRoute] = useState<string | null>(null);
  const [stopForm, setStopForm] = useState({
    customer_id: "",
    service_id: "",
    kind: "preventiva" as Kind,
    description: "",
  });
  const [routeDate, setRouteDate] = useState(todayISO());
  const [showCompleted, setShowCompleted] = useState(false);

  const { data: technicians } = useQuery({
    queryKey: ["technicians", companyId],
    enabled: !!companyId,
    queryFn: async () => {
      const [{ data: profiles }, { data: roles }] = await Promise.all([
        supabase.from("profiles").select("id,full_name").eq("company_id", companyId!).eq("active", true).order("full_name"),
        supabase.from("user_roles").select("user_id,role").eq("role", "tecnico"),
      ]);
      const techIds = new Set((roles ?? []).map((r) => r.user_id));
      return (profiles ?? []).filter((p) => techIds.has(p.id));
    },
  });

  const { data: customers } = useQuery({
    queryKey: ["customers-simple", companyId],
    enabled: !!companyId,
    queryFn: async () =>
      (await supabase.from("customers").select("id,name").eq("active", true).order("name")).data ?? [],
  });

  const { data: services } = useQuery({
    queryKey: ["services", companyId],
    enabled: !!companyId,
    queryFn: async () => (await supabase.from("services").select("id,name,kind").order("name")).data ?? [],
  });

  const { data: routes, error: routesError, isLoading: routesLoading } = useQuery({
    queryKey: ["routes", companyId],
    enabled: !!companyId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("routes")
        .select("*, profiles!technician_id(full_name), work_orders(*, customers(name))")
        .order("route_date", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const createRoute = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!companyId) return;
    const parsed = routeSchema.safeParse(routeForm);
    if (!parsed.success) {
      toast.error("Selecione o técnico e uma data válida.");
      return;
    }
    const { error } = await supabase.from("routes").insert({ ...parsed.data, company_id: companyId });
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Rota criada. Agora adicione os atendimentos.");
    setRouteOpen(false);
    await queryClient.invalidateQueries({ queryKey: ["routes"] });
  };

  const addStop = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!companyId || !stopRoute) return;
    const route = (routes ?? []).find((r) => r.id === stopRoute);
    if (!route) return;
    const position = ((route.work_orders as unknown[]) ?? []).length + 1;
    const parsed = workOrderStopSchema.safeParse(stopForm);
    if (!parsed.success) {
      toast.error("Selecione o cliente e descreva o atendimento.");
      return;
    }
    const { error } = await supabase.from("work_orders").insert({
      company_id: companyId,
      route_id: route.id,
      customer_id: parsed.data.customer_id,
      service_id: parsed.data.service_id || null,
      technician_id: route.technician_id,
      kind: parsed.data.kind,
      description: parsed.data.description || null,
      position,
      scheduled_date: route.route_date,
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Atendimento adicionado à rota.");
    setStopForm({ customer_id: "", service_id: "", kind: "preventiva", description: "" });
    setStopRoute(null);
    await queryClient.invalidateQueries({ queryKey: ["routes"] });
    await queryClient.invalidateQueries({ queryKey: ["gestor-orders"] });
    await queryClient.invalidateQueries({ queryKey: ["customers"] });
    await queryClient.invalidateQueries({ queryKey: ["tecnico-rota"] });
  };

  const removeRoute = async (id: string) => {
    if (
      !window.confirm(
        "Excluir a rota e os atendimentos em aberto? Serviços já concluídos ficam no histórico do cliente.",
      )
    )
      return;
    const { error: woError } = await supabase
      .from("work_orders")
      .delete()
      .eq("route_id", id)
      .neq("status", "concluido")
      .select("id");
    if (woError) {
      toast.error(woError.message);
      return;
    }
    const { error } = await supabase.from("routes").delete().eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Rota excluída.");
    await queryClient.invalidateQueries({ queryKey: ["routes"] });
    await queryClient.invalidateQueries({ queryKey: ["gestor-orders"] });
    await queryClient.invalidateQueries({ queryKey: ["customers"] });
    await queryClient.invalidateQueries({ queryKey: ["tecnico-rota"] });
    await queryClient.invalidateQueries({ queryKey: ["report-orders"] });
  };

  const visibleRoutes = (routes ?? []).filter((route) => {
    if (routeDate && route.route_date !== routeDate) return false;
    const stops = (route.work_orders as Array<{ status?: string }> | null) ?? [];
    const finished = stops.length > 0 && stops.every((stop) => stop.status === "concluido");
    if (finished && !showCompleted) return false;
    return true;
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-lg uppercase">Rotas de atendimento</h2>
        <Dialog open={routeOpen} onOpenChange={setRouteOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="mr-1 h-4 w-4" /> Nova rota
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Criar rota</DialogTitle>
            </DialogHeader>
            <form onSubmit={createRoute} className="space-y-3">
              <div className="space-y-2">
                <Label>Técnico</Label>
                <Select
                  value={routeForm.technician_id}
                  onValueChange={(v) => setRouteForm({ ...routeForm, technician_id: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o técnico" />
                  </SelectTrigger>
                  <SelectContent>
                    {(technicians ?? []).map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="data">Data</Label>
                <Input
                  id="data"
                  type="date"
                  value={routeForm.route_date}
                  onChange={(e) => setRouteForm({ ...routeForm, route_date: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="titulo">Título</Label>
                <Input
                  id="titulo"
                  value={routeForm.title}
                  onChange={(e) => setRouteForm({ ...routeForm, title: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="obs">Descrição do que fazer no local</Label>
                <Textarea
                  id="obs"
                  value={routeForm.notes}
                  onChange={(e) => setRouteForm({ ...routeForm, notes: e.target.value })}
                />
              </div>
              <Button type="submit" className="w-full" disabled={!routeForm.technician_id}>
                Criar rota
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1">
          <Label htmlFor="filtro-data">Filtrar por data</Label>
          <Input
            id="filtro-data"
            type="date"
            className="w-44"
            value={routeDate}
            onChange={(e) => setRouteDate(e.target.value)}
          />
        </div>
        <Button type="button" size="sm" variant={routeDate === todayISO() ? "default" : "secondary"} onClick={() => setRouteDate(todayISO())}>
          Hoje
        </Button>
        <Button type="button" size="sm" variant={routeDate === "" ? "default" : "secondary"} onClick={() => setRouteDate("")}>
          Todas
        </Button>
        <label className="flex items-center gap-2 pb-2 text-xs text-muted-foreground">
          <input
            type="checkbox"
            checked={showCompleted}
            onChange={(e) => setShowCompleted(e.target.checked)}
          />
          Mostrar rotas 100% concluídas
        </label>
      </div>

      {routesError && (
        <p className="surface p-4 text-sm text-destructive">
          Não foi possível carregar as rotas: {routesError.message}
        </p>
      )}
      {routesLoading && <p className="text-sm text-muted-foreground">Carregando rotas...</p>}
      {!routesLoading && !routesError && visibleRoutes.length === 0 && (
        <p className="surface p-4 text-sm text-muted-foreground">
          Nenhuma rota neste filtro. Rotas 100% atendidas ficam ocultas, a menos que você marque a opção
          acima.
        </p>
      )}

      {visibleRoutes.map((route) => {
        const stops = ((route.work_orders as Array<Record<string, unknown>>) ?? []).sort(
          (a, b) => Number(a["position"]) - Number(b["position"]),
        );
        return (
          <div key={route.id} className="surface space-y-3 p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="font-display text-lg uppercase">{route.title}</p>
                <p className="text-xs text-muted-foreground">
                  {dateBR(route.route_date)} ·{" "}
                  {(route.profiles as { full_name: string } | null)?.full_name ?? "Técnico"} ·{" "}
                  {stops.length} parada(s)
                </p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => removeRoute(route.id)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
            {route.notes && <p className="text-sm text-muted-foreground">{route.notes}</p>}
            {stops.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Rota sem atendimentos. Adicione os clientes abaixo para ela aparecer no app do técnico e
                no painel.
              </p>
            )}

            <ol className="space-y-2">
              {stops.map((stop) => (
                <li
                  key={String(stop["id"])}
                  className="flex items-center justify-between gap-3 rounded-lg bg-muted px-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {String(stop["position"])}. {(stop["customers"] as { name: string } | null)?.name}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {KIND_LABEL[String(stop["kind"])]}
                      {stop["description"] ? ` · ${String(stop["description"])}` : ""}
                    </p>
                  </div>
                  <Badge variant={stop["status"] === "concluido" ? "default" : "secondary"}>
                    {STATUS_LABEL[String(stop["status"])]}
                  </Badge>
                </li>
              ))}
            </ol>

            <Dialog
              open={stopRoute === route.id}
              onOpenChange={(open) => setStopRoute(open ? route.id : null)}
            >
              <DialogTrigger asChild>
                <Button variant="secondary" size="sm" className="w-full">
                  <Plus className="mr-1 h-4 w-4" /> Adicionar atendimento
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Novo atendimento na rota</DialogTitle>
                </DialogHeader>
                <form onSubmit={addStop} className="space-y-3">
                  <div className="space-y-2">
                    <Label>Cliente</Label>
                    <Select
                      value={stopForm.customer_id}
                      onValueChange={(v) => setStopForm({ ...stopForm, customer_id: v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o cliente" />
                      </SelectTrigger>
                      <SelectContent>
                        {(customers ?? []).map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Serviço</Label>
                    <Select
                      value={stopForm.service_id}
                      onValueChange={(v) => {
                        const service = (services ?? []).find((s) => s.id === v);
                        setStopForm({
                          ...stopForm,
                          service_id: v,
                          kind: (service?.kind as Kind) ?? stopForm.kind,
                        });
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o serviço" />
                      </SelectTrigger>
                      <SelectContent>
                        {(services ?? []).map((s) => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Tipo</Label>
                    <Select
                      value={stopForm.kind}
                      onValueChange={(v) => setStopForm({ ...stopForm, kind: v as Kind })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(KIND_LABEL).map(([value, label]) => (
                          <SelectItem key={value} value={value}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="desc">Descrição do problema / serviço</Label>
                    <Textarea
                      id="desc"
                      placeholder="Ex.: Freezer parou de gelar"
                      value={stopForm.description}
                      onChange={(e) => setStopForm({ ...stopForm, description: e.target.value })}
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={!stopForm.customer_id}>
                    Adicionar
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        );
      })}
    </div>
  );
}
