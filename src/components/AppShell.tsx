import type { ReactNode } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

export type NavItem = { to: string; label: string; icon: ReactNode };

export function AppShell({
  title,
  subtitle,
  nav,
  actions,
  children,
}: {
  title: string;
  subtitle?: string | undefined;
  nav: NavItem[];
  actions?: ReactNode | undefined;
  children: ReactNode;
}) {
  const { data: session } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const signOut = async () => {
    await supabase.auth.signOut();
    queryClient.clear();
    navigate({ to: "/auth" });
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3">
          <div className="min-w-0">
            <h1 className="truncate font-display text-xl font-semibold uppercase tracking-wide">
              {title}
            </h1>
            <p className="truncate text-xs text-muted-foreground">
              {subtitle ?? session?.company?.name ?? session?.fullName}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {actions}
            <Button variant="ghost" size="icon" onClick={signOut} aria-label="Sair">
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-5">{children}</main>

      {nav.length > 0 && (
        <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-card/95 backdrop-blur">
          <div className="mx-auto flex max-w-5xl items-stretch justify-between px-1">
            {nav.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                activeOptions={{ exact: item.to.split("/").length <= 2 }}
                activeProps={{ className: "text-primary" }}
                inactiveProps={{ className: "text-muted-foreground" }}
                className="flex flex-1 flex-col items-center gap-1 px-1 py-2.5 text-[11px] font-medium transition-colors"
              >
                {item.icon}
                <span className="truncate">{item.label}</span>
              </Link>
            ))}
          </div>
        </nav>
      )}
    </div>
  );
}
