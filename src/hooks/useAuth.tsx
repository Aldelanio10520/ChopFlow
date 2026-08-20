import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = "super_admin" | "gestor" | "tecnico";

export type SessionInfo = {
  userId: string;
  email: string | null;
  fullName: string;
  role: AppRole;
  active: boolean;
  companyId: string | null;
  company: {
    id: string;
    name: string;
    status: "ativa" | "bloqueada";
    monthly_fee: number;
    next_due_date: string;
  } | null;
};

export async function fetchSessionInfo(): Promise<SessionInfo | null> {
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  if (!user) return null;

  const [{ data: profile }, { data: roles }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
    supabase.from("user_roles").select("role").eq("user_id", user.id),
  ]);

  const role = (roles?.[0]?.role ?? "tecnico") as AppRole;
  let company: SessionInfo["company"] = null;
  if (profile?.company_id) {
    const { data } = await supabase
      .from("companies")
      .select("id,name,status,monthly_fee,next_due_date")
      .eq("id", profile.company_id)
      .maybeSingle();
    company = (data as SessionInfo["company"]) ?? null;
  }

  return {
    userId: user.id,
    email: user.email ?? null,
    fullName: profile?.full_name || user.email || "Usuário",
    role,
    active: profile?.active ?? true,
    companyId: profile?.company_id ?? null,
    company,
  };
}

export function useAuth() {
  return useQuery({
    queryKey: ["session-info"],
    queryFn: fetchSessionInfo,
    staleTime: 30_000,
  });
}

export function homeForRole(role?: AppRole) {
  if (role === "super_admin") return "/admin";
  if (role === "gestor") return "/gestor";
  return "/tecnico";
}
