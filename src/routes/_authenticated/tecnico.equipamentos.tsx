import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Input } from "@/components/ui/input";
import { dateBR } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/tecnico/equipamentos")({
  component: Equipamentos,
});

function Equipamentos() {
  const { data: session } = useAuth();
  const [term, setTerm] = useState("");

  const { data: equipments } = useQuery({
    queryKey: ["equipments-all", session?.companyId],
    enabled: !!session?.companyId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("equipments")
        .select("*, customers(name), work_orders(id, scheduled_date, status, technician_notes)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const list = (equipments ?? []).filter((eq) => {
    const haystack = [
      eq.type,
      eq.brand,
      eq.model,
      eq.serial_number,
      (eq.customers as { name: string } | null)?.name,
    ]
      .join(" ")
      .toLowerCase();
    return haystack.includes(term.toLowerCase());
  });

  return (
    <div className="space-y-3">
      <h2 className="font-display text-lg uppercase">Equipamentos</h2>
      <Input
        placeholder="Buscar por cliente, marca, modelo ou série"
        value={term}
        onChange={(e) => setTerm(e.target.value)}
      />
      {list.map((eq) => {
        const history = (eq.work_orders as Array<Record<string, string>>) ?? [];
        return (
          <div key={eq.id} className="surface space-y-2 p-4">
            <p className="font-medium">
              {eq.type} {eq.brand} {eq.model}
            </p>
            <p className="text-xs text-muted-foreground">
              {(eq.customers as { name: string } | null)?.name} · série {eq.serial_number || "—"} ·{" "}
              {eq.taps ?? "—"} torneira(s) · {eq.refrigerant || "gás n/d"} · {eq.voltage || "tensão n/d"}
            </p>
            {history.length > 0 && (
              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase text-muted-foreground">Histórico</p>
                {history.map((wo) => (
                  <p key={wo["id"]} className="rounded-md bg-muted px-3 py-2 text-xs">
                    {dateBR(wo["scheduled_date"])} — {wo["technician_notes"] || "Sem relato"}
                  </p>
                ))}
              </div>
            )}
          </div>
        );
      })}
      {list.length === 0 && (
        <p className="surface p-4 text-sm text-muted-foreground">Nenhum equipamento encontrado.</p>
      )}
    </div>
  );
}
