import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Beer } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { fetchSessionInfo, homeForRole } from "@/hooks/useAuth";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Entrar — ChopFlow" },
      { name: "description", content: "Acesse o sistema de ordens de serviço de chopeiras e refrigeração." },
      { property: "og:title", content: "Entrar — ChopFlow" },
      { property: "og:description", content: "Área de acesso de gestores e técnicos do ChopFlow." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [loading, setLoading] = useState(false);

  const { data: hasSuperAdmin } = useQuery({
    queryKey: ["super-admin-exists"],
    queryFn: async () => {
      const { data } = await supabase.rpc("super_admin_exists");
      return Boolean(data);
    },
  });

  useEffect(() => {
    fetchSessionInfo().then((session) => {
      if (session) navigate({ to: homeForRole(session.role) });
    });
  }, [navigate]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
            data: { full_name: fullName },
          },
        });
        if (error) throw error;
        toast.success("Conta de administrador criada.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
      const session = await fetchSessionInfo();
      await queryClient.invalidateQueries();
      if (session) navigate({ to: homeForRole(session.role) });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível entrar.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-5 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <div className="gradient-brand flex h-14 w-14 items-center justify-center rounded-2xl">
            <Beer className="h-7 w-7 text-primary-foreground" />
          </div>
          <h1 className="font-display text-3xl font-bold uppercase tracking-widest">ChopFlow</h1>
          <p className="text-sm text-muted-foreground">
            {mode === "login" ? "Acesse com seu login e senha" : "Cadastro do primeiro administrador"}
          </p>
        </div>

        <form onSubmit={submit} className="surface space-y-4 p-5">
          {mode === "signup" && (
            <div className="space-y-2">
              <Label htmlFor="fullName">Nome completo</Label>
              <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="email">E-mail</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Senha</Label>
            <Input
              id="password"
              type="password"
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
            />
          </div>
          <Button type="submit" className="w-full" size="lg" disabled={loading}>
            {loading ? "Aguarde..." : mode === "login" ? "Entrar" : "Criar administrador"}
          </Button>

          {!hasSuperAdmin && (
            <button
              type="button"
              onClick={() => setMode(mode === "login" ? "signup" : "login")}
              className="w-full text-center text-xs text-muted-foreground underline-offset-4 hover:underline"
            >
              {mode === "login"
                ? "Primeiro acesso? Criar conta de super admin"
                : "Já tenho conta, quero entrar"}
            </button>
          )}
        </form>

        <p className="mt-4 text-center text-xs text-muted-foreground">
          Técnicos e gestores recebem o login do responsável pela empresa.
        </p>
      </div>
    </div>
  );
}
