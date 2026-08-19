import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Building2, KeyRound, Plus, QrCode, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, homeForRole } from "@/hooks/useAuth";
import { AppShell } from "@/components/AppShell";
import { PixQr } from "@/components/PixQr";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { createCompanyWithManager } from "@/lib/team.functions";
import { brl, dateBR, addDaysISO } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/admin")({
  component: AdminPanel,
});

const emptyCompany = {
  companyName: "",
  document: "",
  phone: "",
  monthlyFee: "199",
  dueDay: "10",
  managerName: "",
  managerEmail: "",
  managerPassword: "",
};

function AdminPanel() {
  const { data: session, isLoading } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const createCompany = useServerFn(createCompanyWithManager);
  const [form, setForm] = useState(emptyCompany);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [pix, setPix] = useState({ pix_key: "", pix_name: "", pix_city: "" });

  useEffect(() => {
    if (!isLoading && session && session.role !== "super_admin") {
      navigate({ to: homeForRole(session.role) });
    }
  }, [isLoading, session, navigate]);

  const { data: companies } = useQuery({
    queryKey: ["admin-companies"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("companies")
        .select("*, profiles(id, full_name, email)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: settings } = useQuery({
    queryKey: ["app-settings"],
    queryFn: async () => (await supabase.from("app_settings").select("*").maybeSingle()).data,
  });

  useEffect(() => {
    if (settings) {
      setPix({
        pix_key: settings.pix_key ?? "",
        pix_name: settings.pix_name ?? "",
        pix_city: settings.pix_city ?? "",
      });
    }
  }, [settings]);

  const submitCompany = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      await createCompany({
        data: {
          name: form.companyName,
          document: form.document,
          phone: form.phone,
          monthlyFee: Number(form.monthlyFee),
          dueDay: Number(form.dueDay),
          managerName: form.managerName,
          email: form.managerEmail,
          managerPassword: form.managerPassword,
        },
      });
      toast.success("Empresa e gestor criados.");
      setForm(emptyCompany);
      setOpen(false);
      queryClient.invalidateQueries({ queryKey: ["admin-companies"] });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Falha ao criar empresa");
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async (id: string, active: boolean) => {
    const { error } = await supabase
      .from("companies")
      .update({ status: active ? "ativa" : "bloqueada" })
      .eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    queryClient.invalidateQueries({ queryKey: ["admin-companies"] });
  };

  const registerPayment = async (companyId: string, amount: number, nextDue: string) => {
    const { error } = await supabase.from("payments").insert({
      company_id: companyId,
      amount,
      due_date: nextDue,
      status: "pago",
      paid_at: new Date().toISOString(),
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    const next = new Date(`${nextDue}T12:00:00`);
    next.setMonth(next.getMonth() + 1);
    await supabase
      .from("companies")
      .update({ status: "ativa", next_due_date: next.toISOString().slice(0, 10) })
      .eq("id", companyId);
    toast.success("Pagamento registrado e acesso liberado.");
    queryClient.invalidateQueries({ queryKey: ["admin-companies"] });
  };

  const savePix = async () => {
    const { error } = await supabase.from("app_settings").update(pix).eq("id", true);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Chave PIX atualizada.");
    queryClient.invalidateQueries({ queryKey: ["app-settings"] });
  };

  const list = companies ?? [];
  const revenue = list
    .filter((c) => c.status === "ativa")
    .reduce((sum, c) => sum + Number(c.monthly_fee), 0);

  return (
    <AppShell title="Super Admin" subtitle="Gestão da plataforma" nav={[]}>
      <Tabs defaultValue="empresas">
        <TabsList className="w-full">
          <TabsTrigger value="empresas" className="flex-1">
            Empresas
          </TabsTrigger>
          <TabsTrigger value="cobranca" className="flex-1">
            Cobrança PIX
          </TabsTrigger>
        </TabsList>

        <TabsContent value="empresas" className="space-y-4 pt-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="surface p-4">
              <p className="font-display text-2xl font-bold">{list.length}</p>
              <p className="text-xs text-muted-foreground">Empresas cadastradas</p>
            </div>
            <div className="surface p-4">
              <p className="font-display text-2xl font-bold">{brl(revenue)}</p>
              <p className="text-xs text-muted-foreground">Receita mensal ativa</p>
            </div>
          </div>

          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="w-full">
                <Plus className="mr-1 h-4 w-4" /> Nova empresa
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[85vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Cadastrar empresa e gestor</DialogTitle>
              </DialogHeader>
              <form onSubmit={submitCompany} className="space-y-3">
                {[
                  { key: "companyName", label: "Nome da empresa", required: true },
                  { key: "document", label: "CNPJ" },
                  { key: "phone", label: "Telefone" },
                  { key: "monthlyFee", label: "Mensalidade (R$)", type: "number" },
                  { key: "dueDay", label: "Dia de vencimento", type: "number" },
                  { key: "managerName", label: "Nome do gestor", required: true },
                  { key: "managerEmail", label: "E-mail do gestor", type: "email", required: true },
                  { key: "managerPassword", label: "Senha provisória", required: true },
                ].map((field) => (
                  <div key={field.key} className="space-y-2">
                    <Label htmlFor={field.key}>{field.label}</Label>
                    <Input
                      id={field.key}
                      type={field.type ?? "text"}
                      value={form[field.key as keyof typeof emptyCompany]}
                      onChange={(e) => setForm({ ...form, [field.key]: e.target.value })}
                      required={field.required ?? false}
                    />
                  </div>
                ))}
                <Button type="submit" className="w-full" disabled={saving}>
                  {saving ? "Criando..." : "Criar empresa"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>

          <div className="space-y-3">
            {list.map((company) => {
              const managers = (company.profiles as Array<{ full_name: string; email: string | null }>) ?? [];
              return (
                <div key={company.id} className="surface space-y-3 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="flex items-center gap-2 font-display text-lg uppercase">
                        <Building2 className="h-4 w-4" /> {company.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {company.document || "Sem CNPJ"} · {managers.length} usuário(s)
                      </p>
                    </div>
                    <Badge variant={company.status === "ativa" ? "default" : "destructive"}>
                      {company.status === "ativa" ? "Ativa" : "Bloqueada"}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {brl(Number(company.monthly_fee))} · vence {dateBR(company.next_due_date)}
                  </p>
                  <div className="flex flex-wrap items-center gap-3">
                    <label className="flex items-center gap-2 text-sm">
                      <Switch
                        checked={company.status === "ativa"}
                        onCheckedChange={(checked) => toggleStatus(company.id, checked)}
                      />
                      Acesso liberado
                    </label>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() =>
                        registerPayment(company.id, Number(company.monthly_fee), company.next_due_date)
                      }
                    >
                      <ShieldCheck className="mr-1 h-4 w-4" /> Registrar pagamento
                    </Button>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button size="sm" variant="ghost">
                          <QrCode className="mr-1 h-4 w-4" /> QR de cobrança
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Cobrança · {company.name}</DialogTitle>
                        </DialogHeader>
                        <PixQr
                          pixKey={pix.pix_key || "02520340312"}
                          name={pix.pix_name || "ChopFlow"}
                          city={pix.pix_city || "Sao Paulo"}
                          amount={Number(company.monthly_fee)}
                          description={`Mensalidade ${company.name}`}
                        />
                      </DialogContent>
                    </Dialog>
                  </div>
                  {managers.length > 0 && (
                    <p className="text-xs text-muted-foreground">
                      Gestor: {managers[0]?.full_name} ({managers[0]?.email})
                    </p>
                  )}
                </div>
              );
            })}
            {list.length === 0 && (
              <p className="surface p-4 text-sm text-muted-foreground">Nenhuma empresa cadastrada ainda.</p>
            )}
          </div>
        </TabsContent>

        <TabsContent value="cobranca" className="space-y-4 pt-4">
          <div className="surface space-y-3 p-4">
            <p className="flex items-center gap-2 font-display uppercase">
              <KeyRound className="h-4 w-4" /> Chave PIX de recebimento
            </p>
            <div className="space-y-2">
              <Label htmlFor="pix-key">Chave PIX</Label>
              <Input
                id="pix-key"
                value={pix.pix_key}
                onChange={(e) => setPix({ ...pix, pix_key: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pix-name">Nome do recebedor</Label>
              <Input
                id="pix-name"
                value={pix.pix_name}
                onChange={(e) => setPix({ ...pix, pix_name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pix-city">Cidade</Label>
              <Input
                id="pix-city"
                value={pix.pix_city}
                onChange={(e) => setPix({ ...pix, pix_city: e.target.value })}
              />
            </div>
            <Button className="w-full" onClick={savePix}>
              Salvar chave PIX
            </Button>
          </div>

          <div className="surface p-4">
            <p className="mb-3 font-display uppercase">Pré-visualização do QR</p>
            <PixQr
              pixKey={pix.pix_key || "02520340312"}
              name={pix.pix_name || "ChopFlow"}
              city={pix.pix_city || "Sao Paulo"}
              description="Mensalidade ChopFlow"
            />
            <p className="mt-3 text-xs text-muted-foreground">
              Próximo ciclo sugerido: {dateBR(addDaysISO(30))}
            </p>
          </div>
        </TabsContent>
      </Tabs>
    </AppShell>
  );
}
