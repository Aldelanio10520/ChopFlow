import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { LayoutDashboard, Map, Users, Wrench, BarChart3, UserCog } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { BillingNotice } from "@/components/BillingNotice";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/_authenticated/gestor")({
  component: GestorLayout,
});

const nav = [
  { to: "/gestor", label: "Painel", icon: <LayoutDashboard className="h-5 w-5" /> },
  { to: "/gestor/rotas", label: "Rotas", icon: <Map className="h-5 w-5" /> },
  { to: "/gestor/clientes", label: "Clientes", icon: <Users className="h-5 w-5" /> },
  { to: "/gestor/equipe", label: "Equipe", icon: <UserCog className="h-5 w-5" /> },
  { to: "/gestor/catalogo", label: "Catálogo", icon: <Wrench className="h-5 w-5" /> },
  { to: "/gestor/relatorios", label: "Relatórios", icon: <BarChart3 className="h-5 w-5" /> },
];

function GestorLayout() {
  const { data: session, isLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && session && session.role === "tecnico") navigate({ to: "/tecnico" });
    if (!isLoading && session && session.role === "super_admin") navigate({ to: "/admin" });
  }, [session, isLoading, navigate]);

  if (isLoading || !session) {
    return <div className="p-6 text-sm text-muted-foreground">Carregando...</div>;
  }

  const blocked = session.company?.status === "bloqueada";

  return (
    <AppShell title="Gestão" nav={nav}>
      <BillingNotice session={session} />
      {blocked ? (
        <div className="surface p-6 text-center">
          <h2 className="font-display text-xl uppercase">Acesso suspenso</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            A empresa está bloqueada por pendência financeira. Realize o pagamento via PIX acima para
            liberar o sistema.
          </p>
        </div>
      ) : (
        <Outlet />
      )}
    </AppShell>
  );
}
