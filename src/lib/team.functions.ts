import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  fullName: z.string().min(1),
  phone: z.string().optional(),
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

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: {
        full_name: data.fullName,
        phone: data.phone ?? "",
        role: data.role,
        company_id: data.companyId,
      },
    });
    if (error) throw new Error(error.message);

    const newId = created.user?.id;
    if (newId) {
      await supabaseAdmin
        .from("profiles")
        .update({
          company_id: data.companyId,
          full_name: data.fullName,
          phone: data.phone ?? null,
          email: data.email,
        })
        .eq("id", newId);
      await supabaseAdmin
        .from("user_roles")
        .upsert({ user_id: newId, role: data.role }, { onConflict: "user_id,role" });
    }

    return { id: newId ?? null };
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

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.updateUserById(data.userId, {
      password: data.password,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const createCompanySchema = z.object({
  name: z.string().min(1),
  document: z.string().optional(),
  email: z.string().email(),
  phone: z.string().optional(),
  monthlyFee: z.number().min(0),
  dueDay: z.number().min(1).max(28),
  managerName: z.string().min(1),
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

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const due = new Date();
    due.setMonth(due.getMonth() + 1);
    due.setDate(data.dueDay);

    const { data: company, error: companyError } = await supabaseAdmin
      .from("companies")
      .insert({
        name: data.name,
        document: data.document ?? null,
        email: data.email,
        phone: data.phone ?? null,
        monthly_fee: data.monthlyFee,
        due_day: data.dueDay,
        next_due_date: due.toISOString().slice(0, 10),
      })
      .select("id")
      .single();
    if (companyError) throw new Error(companyError.message);

    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.managerPassword,
      email_confirm: true,
      user_metadata: {
        full_name: data.managerName,
        role: "gestor",
        company_id: company.id,
      },
    });
    if (error) {
      await supabaseAdmin.from("companies").delete().eq("id", company.id);
      throw new Error(error.message);
    }

    if (created.user?.id) {
      await supabaseAdmin
        .from("profiles")
        .update({ company_id: company.id, full_name: data.managerName, email: data.email })
        .eq("id", created.user.id);
      await supabaseAdmin
        .from("user_roles")
        .upsert({ user_id: created.user.id, role: "gestor" }, { onConflict: "user_id,role" });
    }

    await supabaseAdmin.from("payments").insert({
      company_id: company.id,
      amount: data.monthlyFee,
      due_date: due.toISOString().slice(0, 10),
    });

    return { companyId: company.id };
  });
