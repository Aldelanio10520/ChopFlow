import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function invokeAdmin(body: Record<string, unknown>) {
  const request = getRequest();
  const authHeader = request.headers.get("authorization");
  const url = process.env["SUPABASE_URL"] || process.env["VITE_SUPABASE_URL"];
  const key =
    process.env["SUPABASE_PUBLISHABLE_KEY"] ||
    process.env["SUPABASE_ANON_KEY"] ||
    process.env["VITE_SUPABASE_PUBLISHABLE_KEY"] ||
    process.env["VITE_SUPABASE_ANON_KEY"];
  if (!url || !key || !authHeader) {
    throw new Error("Configuração do Supabase incompleta.");
  }

  const response = await fetch(`${url}/functions/v1/admin-users`, {
    method: "POST",
    headers: {
      Authorization: authHeader,
      apikey: key,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const json = (await response.json().catch(() => ({}))) as { error?: string; id?: string | null; companyId?: string; ok?: boolean };
  if (!response.ok) {
    throw new Error(json.error || "Falha na operação administrativa.");
  }
  return json;
}

const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  fullName: z.string().min(1).max(120),
  phone: z.string().max(30).optional(),
  role: z.enum(["gestor", "tecnico"]),
  companyId: z.string().uuid(),
});

/** Cria um usuário (gestor ou técnico) vinculado a uma empresa. */
export const createTeamUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => createUserSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: isSuperAdmin } = await supabase.rpc("has_role", {
      _user_id: userId,
      _role: "super_admin",
    });
    const { data: isManager } = await supabase.rpc("is_manager");
    const { data: profile } = await supabase
      .from("profiles")
      .select("company_id")
      .eq("id", userId)
      .maybeSingle();

    if (!isSuperAdmin && !(isManager && profile?.company_id === data.companyId)) {
      throw new Error("Sem permissão para criar usuários nesta empresa.");
    }
    if (!isSuperAdmin && data.role === "gestor") {
      throw new Error("Apenas o super admin pode criar gestores.");
    }

    const result = await invokeAdmin({ action: "create-team-user", ...data });
    return { id: result.id ?? null };
  });

const resetPasswordSchema = z.object({
  userId: z.string().uuid(),
  password: z.string().min(6),
});

/** Redefine a senha de um usuário da própria empresa. */
export const resetTeamPassword = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => resetPasswordSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: isSuperAdmin } = await supabase.rpc("has_role", {
      _user_id: userId,
      _role: "super_admin",
    });
    const { data: isManager } = await supabase.rpc("is_manager");
    const { data: target } = await supabase
      .from("profiles")
      .select("company_id")
      .eq("id", data.userId)
      .maybeSingle();

    if (!isSuperAdmin && !(isManager && target)) {
      throw new Error("Sem permissão.");
    }

    await invokeAdmin({ action: "reset-password", ...data });
    return { ok: true };
  });

const createCompanySchema = z.object({
  name: z.string().min(1).max(120),
  document: z.string().max(20).optional(),
  email: z.string().email(),
  phone: z.string().max(30).optional(),
  monthlyFee: z.number().min(0),
  dueDay: z.number().min(1).max(28),
  managerName: z.string().min(1).max(120),
  managerPassword: z.string().min(6),
});

/** Super admin: cria a empresa e o login do gestor. */
export const createCompanyWithManager = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => createCompanySchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: isSuperAdmin } = await supabase.rpc("has_role", {
      _user_id: userId,
      _role: "super_admin",
    });
    if (!isSuperAdmin) throw new Error("Apenas o super admin pode cadastrar empresas.");

    const result = await invokeAdmin({ action: "create-company", ...data });
    return { companyId: result.companyId as string };
  });
