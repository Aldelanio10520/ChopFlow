chopeirasimport { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { Beer, Route as RouteIcon, BarChart3, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth, homeForRole } from "@/hooks/useAuth";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ChopFlow — Ordens de serviço para chopeiras e refrigeração" },
      {
        name: "description",
        content:
          "App instalável no celular para gestão de ordens de serviço, rotas de técnicos e manutenção de chopeiras, freezers e visacoolers.",
      },
      { property: "og:title", content: "ChopFlow — Ordens de serviço para chopeiras e refrigeração" },
      {
        property: "og:description",
        content:
          "Rotas, check-in dos técnicos, ficha de vida útil dos equipamentos e relatórios de produtividade.",
      },
    ],
  }),
  component: Index,
});

function Index() {
  const { data: session } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (session) navigate({ to: homeForRole(session.role) });
  }, [session, navigate]);

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto flex max-w-3xl flex-col gap-10 px-5 py-14">
        <header className="flex items-center gap-3">
          <div className="gradient-brand flex h-11 w-11 items-center justify-center rounded-xl">
            <Beer className="h-6 w-6 text-primary-foreground" />
          </div>
          <span className="font-display text-2xl font-bold uppercase tracking-widest">ChopFlow</span>
        </header>

        <section className="space-y-5">
          <h1 className="font-display text-4xl font-bold uppercase leading-tight sm:text-5xl">
            Ordens de serviço para{" "}
            <span className="text-primary">Climatização e refrigeração</span>
          </h1>
          <p className="text-base text-muted-foreground">
            Planeje rotas, acompanhe cada técnico em tempo real, registre equipamentos e peças no
            local e meça a produtividade da equipe. Instale no celular e use como aplicativo.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link to="/auth">Entrar no sistema</Link>
            </Button>
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-3">
          {[
            { icon: RouteIcon, title: "Rotas do dia", text: "Ordem de atendimento e navegação por Waze ou Google Maps." },
            { icon: Smartphone, title: "Campo no celular", text: "Check-in, equipamentos, peças e conclusão com tempo total." },
            { icon: BarChart3, title: "Relatórios", text: "Produtividade por técnico, tipo de serviço e peças mais usadas." },
          ].map((item) => (
            <div key={item.title} className="surface p-4">
              <item.icon className="h-6 w-6 text-primary" />
              <h2 className="mt-3 font-display text-lg font-semibold uppercase">{item.title}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{item.text}</p>
            </div>
          ))}
        </section>
      </div>
    </div>
  );
}
