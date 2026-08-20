import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { ClipboardList, History, Wrench } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { useAuth, homeForRole } from "@/hooks/useAuth";

export const Route = createFileRoute("/_authenticated/tecnico")({
  component: TecnicoLayout,
});

function TecnicoLayout() {
  const { data: session, isLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && session && session.role !== "tecnico") {
      navigate({ to: homeForRole(session.role) });
    }
  }, [isLoading, session, navigate]);

  const blocked = session?.company?.status === "bloqueada";
  const inactive = session?.active === false;

  return (
    <AppShell
      title="Minhas ordens"
      subtitle={session?.fullName}
      nav={[
        { to: "/tecnico", label: "Rota", icon: <ClipboardList className="h-5 w-5" /> },
        { to: "/tecnico/historico", label: "Histórico", icon: <History className="h-5 w-5" /> },
        { to: "/tecnico/equipamentos", label: "Equipamentos", icon: <Wrench className="h-5 w-5" /> },
      ]}
    >
      {blocked ? (
        <div className="surface p-6 text-center">
          <h2 className="font-display text-xl uppercase">Acesso suspenso</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            A empresa está bloqueada por pendência financeira. Peça ao gestor para regularizar o
            pagamento da mensalidade.
          </p>
        </div>
      ) : inactive ? (
        <div className="surface p-6 text-center">
          <h2 className="font-display text-xl uppercase">Conta inativa</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Seu acesso foi desativado pelo gestor. Entre em contato com a empresa.
          </p>
        </div>
      ) : (
        <Outlet />
      )}
    </AppShell>
  );
}
