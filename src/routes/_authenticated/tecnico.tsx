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
      <Outlet />
    </AppShell>
  );
}
