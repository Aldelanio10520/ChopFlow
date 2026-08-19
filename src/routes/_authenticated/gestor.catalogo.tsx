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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { KIND_LABEL } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/gestor/catalogo")({
  component: Catalogo,
});

type Kind = "emergencial" | "preventiva" | "sanitizacao" | "instalacao";

function Catalogo() {
  const { data: session } = useAuth();
  const companyId = session?.companyId ?? null;
  const queryClient = useQueryClient();

  const [serviceName, setServiceName] = useState("");
  const [serviceKind, setServiceKind] = useState<Kind>("preventiva");
  const [partName, setPartName] = useState("");
  const [partUnit, setPartUnit] = useState("un");

  const { data: services } = useQuery({
    queryKey: ["services", companyId],
    enabled: !!companyId,
    queryFn: async () => (await supabase.from("services").select("*").order("name")).data ?? [],
  });

  const { data: parts } = useQuery({
    queryKey: ["parts", companyId],
    enabled: !!companyId,
    queryFn: async () => (await supabase.from("parts").select("*").order("name")).data ?? [],
  });

  const addService = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!companyId) return;
    const { error } = await supabase
      .from("services")
      .insert({ company_id: companyId, name: serviceName, kind: serviceKind });
    if (error) {
      toast.error(error.message);
      return;
    }
    setServiceName("");
    toast.success("Serviço adicionado.");
    queryClient.invalidateQueries({ queryKey: ["services"] });
  };

  const addPart = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!companyId) return;
    const { error } = await supabase
      .from("parts")
      .insert({ company_id: companyId, name: partName, unit: partUnit });
    if (error) {
      toast.error(error.message);
      return;
    }
    setPartName("");
    toast.success("Peça adicionada.");
    queryClient.invalidateQueries({ queryKey: ["parts"] });
  };

  const removeRow = async (table: "services" | "parts", id: string) => {
    const { error } = await supabase.from(table).delete().eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    queryClient.invalidateQueries({ queryKey: [table] });
  };

  return (
    <Tabs defaultValue="servicos">
      <TabsList className="w-full">
        <TabsTrigger value="servicos" className="flex-1">
          Serviços
        </TabsTrigger>
        <TabsTrigger value="pecas" className="flex-1">
          Peças e insumos
        </TabsTrigger>
      </TabsList>

      <TabsContent value="servicos" className="space-y-4 pt-4">
        <form onSubmit={addService} className="surface space-y-3 p-4">
          <div className="space-y-2">
            <Label htmlFor="servico">Novo serviço</Label>
            <Input
              id="servico"
              placeholder="Ex.: Sanitização de chopeira"
              value={serviceName}
              onChange={(e) => setServiceName(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label>Tipo</Label>
            <Select value={serviceKind} onValueChange={(v) => setServiceKind(v as Kind)}>
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
          <Button type="submit" className="w-full">
            <Plus className="mr-1 h-4 w-4" /> Adicionar serviço
          </Button>
        </form>

        <div className="space-y-2">
          {(services ?? []).map((service) => (
            <div key={service.id} className="surface flex items-center justify-between gap-2 p-3">
              <div>
                <p className="font-medium">{service.name}</p>
                <p className="text-xs text-muted-foreground">{KIND_LABEL[service.kind]}</p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => removeRow("services", service.id)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      </TabsContent>

      <TabsContent value="pecas" className="space-y-4 pt-4">
        <form onSubmit={addPart} className="surface space-y-3 p-4">
          <div className="space-y-2">
            <Label htmlFor="peca">Nova peça ou insumo</Label>
            <Input
              id="peca"
              placeholder="Ex.: Mangueira atóxica"
              value={partName}
              onChange={(e) => setPartName(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="unidade">Unidade</Label>
            <Input id="unidade" value={partUnit} onChange={(e) => setPartUnit(e.target.value)} />
          </div>
          <Button type="submit" className="w-full">
            <Plus className="mr-1 h-4 w-4" /> Adicionar peça
          </Button>
        </form>

        <div className="space-y-2">
          {(parts ?? []).map((part) => (
            <div key={part.id} className="surface flex items-center justify-between gap-2 p-3">
              <p className="font-medium">
                {part.name} <span className="text-xs text-muted-foreground">({part.unit})</span>
              </p>
              <Button variant="ghost" size="icon" onClick={() => removeRow("parts", part.id)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      </TabsContent>
    </Tabs>
  );
}
