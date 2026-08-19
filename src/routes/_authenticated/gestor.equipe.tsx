import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { KeyRound, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { createTeamUser, resetTeamPassword } from "@/lib/team.functions";

export const Route = createFileRoute("/_authenticated/gestor/equipe")({
  component: Equipe,
});

function Equipe() {
  const { data: session } = useAuth();
  const companyId = session?.companyId ?? null;
  const queryClient = useQueryClient();
  const createUser = useServerFn(createTeamUser);
  const resetPassword = useServerFn(resetTeamPassword);

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ fullName: "", email: "", phone: "", password: "" });
  const [saving, setSaving] = useState(false);

  const { data: team } = useQuery({
    queryKey: ["team", companyId],
    enabled: !!companyId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("company_id", companyId!)
        .order("full_name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!companyId) return;
    setSaving(true);
    try {
      await createUser({
        data: {
          email: form.email,
          password: form.password,
          fullName: form.fullName,
          phone: form.phone,
          role: "tecnico",
          companyId,
        },
      });
      toast.success("Técnico cadastrado com acesso ao aplicativo.");
      setForm({ fullName: "", email: "", phone: "", password: "" });
      setOpen(false);
      queryClient.invalidateQueries({ queryKey: ["team"] });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao cadastrar técnico.");
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (id: string, active: boolean) => {
    await supabase.from("profiles").update({ active }).eq("id", id);
    queryClient.invalidateQueries({ queryKey: ["team"] });
  };

  const changePassword = async (userId: string) => {
    const password = window.prompt("Nova senha (mínimo 6 caracteres)");
    if (!password) return;
    try {
      await resetPassword({ data: { userId, password } });
      toast.success("Senha atualizada.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao redefinir senha.");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-lg uppercase">Equipe de técnicos</h2>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="mr-1 h-4 w-4" /> Novo técnico
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Cadastrar técnico</DialogTitle>
            </DialogHeader>
            <form onSubmit={submit} className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="nome">Nome</Label>
                <Input
                  id="nome"
                  value={form.fullName}
                  onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tel">Telefone</Label>
                <Input id="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="mail">E-mail (login)</Label>
                <Input
                  id="mail"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="senha">Senha de acesso</Label>
                <Input
                  id="senha"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  minLength={6}
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={saving}>
                {saving ? "Salvando..." : "Cadastrar"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-2">
        {(team ?? []).map((member) => (
          <div key={member.id} className="surface flex flex-wrap items-center justify-between gap-3 p-4">
            <div className="min-w-0">
              <p className="truncate font-semibold">{member.full_name}</p>
              <p className="truncate text-xs text-muted-foreground">
                {member.email} {member.phone ? `· ${member.phone}` : ""}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={() => changePassword(member.id)} aria-label="Redefinir senha">
                <KeyRound className="h-4 w-4" />
              </Button>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                Ativo
                <Switch
                  checked={member.active}
                  onCheckedChange={(checked) => toggleActive(member.id, checked)}
                />
              </div>
            </div>
          </div>
        ))}
        {(team ?? []).length === 0 && (
          <p className="surface p-4 text-sm text-muted-foreground">Nenhum técnico cadastrado ainda.</p>
        )}
      </div>
    </div>
  );
}
