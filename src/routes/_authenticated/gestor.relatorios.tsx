import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { KIND_LABEL, minutesLabel, dateBR } from "@/lib/format";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/_authenticated/gestor/relatorios")({
  component: Relatorios,
});

function periodRange(period: string) {
  const now = new Date();
  if (period === "semana") {
    const start = new Date(now);
    start.setDate(now.getDate() - now.getDay());
    return { start: start.toISOString().slice(0, 10), end: now.toISOString().slice(0, 10) };
  }
  const offset = Number(period.replace("mes-", "")) || 0;
  const start = new Date(now.getFullYear(), now.getMonth() - offset, 1);
  const end = new Date(now.getFullYear(), now.getMonth() - offset + 1, 0);
  return { start: start.toISOString().slice(0, 10), end: end.toISOString().slice(0, 10) };
}

function Relatorios() {
  const { data: session } = useAuth();
  const companyId = session?.companyId ?? null;
  const [period, setPeriod] = useState("mes-0");
  const range = periodRange(period);

  const { data: orders } = useQuery({
    queryKey: ["report-orders", companyId, period],
    enabled: !!companyId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("work_orders")
        .select("*, customers(name), profiles:technician_id(full_name), work_order_parts(quantity, parts(name))")
        .gte("scheduled_date", range.start)
        .lte("scheduled_date", range.end);
      if (error) throw error;
      return data ?? [];
    },
  });

  const list = orders ?? [];

  const stats = useMemo(() => {
    const done = list.filter((o) => o.status === "concluido");
    const byTech = new Map<string, { name: string; total: number; done: number; minutes: number }>();
    const byKind = new Map<string, { total: number; minutes: number; done: number }>();
    const byPart = new Map<string, number>();

    for (const order of list) {
      const techName =
        (order.profiles as { full_name: string } | null)?.full_name ?? "Sem técnico";
      const tech = byTech.get(techName) ?? { name: techName, total: 0, done: 0, minutes: 0 };
      tech.total += 1;
      if (order.status === "concluido") {
        tech.done += 1;
        tech.minutes += order.duration_minutes ?? 0;
      }
      byTech.set(techName, tech);

      const kind = byKind.get(order.kind) ?? { total: 0, minutes: 0, done: 0 };
      kind.total += 1;
      if (order.status === "concluido") {
        kind.done += 1;
        kind.minutes += order.duration_minutes ?? 0;
      }
      byKind.set(order.kind, kind);

      for (const wop of (order.work_order_parts as Array<{ quantity: number; parts: { name: string } | null }>) ??
        []) {
        const name = wop.parts?.name ?? "Peça";
        byPart.set(name, (byPart.get(name) ?? 0) + Number(wop.quantity));
      }
    }

    return {
      total: list.length,
      done: done.length,
      pending: list.length - done.length,
      avg: done.length ? Math.round(done.reduce((s, o) => s + (o.duration_minutes ?? 0), 0) / done.length) : 0,
      techs: [...byTech.values()].map((t) => ({
        ...t,
        avg: t.done ? Math.round(t.minutes / t.done) : 0,
      })),
      kinds: [...byKind.entries()].map(([kind, v]) => ({
        name: KIND_LABEL[kind] ?? kind,
        total: v.total,
        avg: v.done ? Math.round(v.minutes / v.done) : 0,
      })),
      parts: [...byPart.entries()]
        .map(([name, qty]) => ({ name, qty }))
        .sort((a, b) => b.qty - a.qty)
        .slice(0, 8),
    };
  }, [list]);

  const pieData = [
    { name: "Concluídas", value: stats.done, color: "var(--color-success)" },
    { name: "Pendentes", value: stats.pending, color: "var(--color-warning)" },
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-lg uppercase">Relatórios</h2>
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-52">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="semana">Semana atual</SelectItem>
            <SelectItem value="mes-0">Mês atual</SelectItem>
            <SelectItem value="mes-1">Mês passado</SelectItem>
            <SelectItem value="mes-2">Dois meses atrás</SelectItem>
            <SelectItem value="mes-3">Três meses atrás</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <p className="text-xs text-muted-foreground">
        Período: {dateBR(range.start)} a {dateBR(range.end)}
      </p>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Atendimentos", value: stats.total },
          { label: "Concluídos", value: stats.done },
          { label: "Pendentes", value: stats.pending },
          { label: "Tempo médio", value: minutesLabel(stats.avg) },
        ].map((card) => (
          <div key={card.label} className="surface p-4">
            <p className="font-display text-2xl font-bold">{card.value}</p>
            <p className="text-xs text-muted-foreground">{card.label}</p>
          </div>
        ))}
      </div>

      <Tabs defaultValue="volume">
        <TabsList className="w-full">
          <TabsTrigger value="volume" className="flex-1">Volume</TabsTrigger>
          <TabsTrigger value="tecnicos" className="flex-1">Técnicos</TabsTrigger>
          <TabsTrigger value="pecas" className="flex-1">Peças</TabsTrigger>
          <TabsTrigger value="historico" className="flex-1">Histórico</TabsTrigger>
        </TabsList>

        <TabsContent value="volume" className="space-y-4 pt-4">
          <div className="surface p-4">
            <h3 className="mb-3 font-display uppercase">Concluídos vs. pendentes</h3>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={50} outerRadius={85}>
                  {pieData.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <Legend />
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="surface p-4">
            <h3 className="mb-3 font-display uppercase">Tempo médio por tipo de serviço</h3>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={stats.kinds}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="name" stroke="var(--color-muted-foreground)" fontSize={11} />
                <YAxis stroke="var(--color-muted-foreground)" fontSize={11} />
                <Tooltip formatter={(v: number) => `${v} min`} />
                <Bar dataKey="avg" name="Tempo médio (min)" fill="var(--color-primary)" radius={4} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </TabsContent>

        <TabsContent value="tecnicos" className="space-y-4 pt-4">
          <div className="surface p-4">
            <h3 className="mb-3 font-display uppercase">Produtividade por técnico</h3>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={stats.techs}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="name" stroke="var(--color-muted-foreground)" fontSize={11} />
                <YAxis stroke="var(--color-muted-foreground)" fontSize={11} />
                <Tooltip />
                <Legend />
                <Bar dataKey="done" name="Concluídos" fill="var(--color-success)" radius={4} />
                <Bar dataKey="avg" name="Tempo médio (min)" fill="var(--color-primary)" radius={4} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-2">
            {stats.techs.map((tech) => (
              <div key={tech.name} className="surface flex items-center justify-between p-3 text-sm">
                <span className="font-medium">{tech.name}</span>
                <span className="text-muted-foreground">
                  {tech.done}/{tech.total} · média {minutesLabel(tech.avg)}
                </span>
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="pecas" className="pt-4">
          <div className="surface p-4">
            <h3 className="mb-3 font-display uppercase">Peças e insumos mais usados</h3>
            {stats.parts.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma peça registrada no período.</p>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={stats.parts} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis type="number" stroke="var(--color-muted-foreground)" fontSize={11} />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={120}
                    stroke="var(--color-muted-foreground)"
                    fontSize={11}
                  />
                  <Tooltip />
                  <Bar dataKey="qty" name="Quantidade" fill="var(--color-chart-3)" radius={4} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </TabsContent>

        <TabsContent value="historico" className="space-y-2 pt-4">
          {list.map((order) => (
            <div key={order.id} className="surface flex flex-wrap items-center justify-between gap-2 p-3 text-sm">
              <div className="min-w-0">
                <p className="truncate font-medium">
                  {(order.customers as { name: string } | null)?.name}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {dateBR(order.scheduled_date)} · {KIND_LABEL[order.kind]} ·{" "}
                  {(order.profiles as { full_name: string } | null)?.full_name ?? "Sem técnico"}
                </p>
              </div>
              <span className="text-xs text-muted-foreground">
                {minutesLabel(order.duration_minutes)}
              </span>
            </div>
          ))}
          {list.length === 0 && (
            <p className="surface p-4 text-sm text-muted-foreground">Sem atendimentos no período.</p>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
