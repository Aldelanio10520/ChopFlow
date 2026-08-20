import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Unauthorized" }, 401);

    const url = Deno.env.get("SUPABASE_URL");
    const anon = Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_PUBLISHABLE_KEY");
    const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!url || !anon || !service) return json({ error: "Servidor mal configurado." }, 500);

    const userClient = createClient(url, anon, {
      global: { headers: { Authorization: authHeader } },
    });
    const admin = createClient(url, service);

    const { data: userData, error: userError } = await userClient.auth.getUser();
    if (userError || !userData.user) return json({ error: "Unauthorized" }, 401);
    const userId = userData.user.id;

    const { data: isSuperAdmin } = await userClient.rpc("has_role", {
      _user_id: userId,
      _role: "super_admin",
    });
    const { data: isManager } = await userClient.rpc("is_manager");
    const { data: profile } = await userClient
      .from("profiles")
      .select("company_id")
      .eq("id", userId)
      .maybeSingle();

    const body = await req.json();
    const action = body?.action as string;

    if (action === "create-team-user") {
      const companyId = String(body.companyId);
      const role = body.role as "gestor" | "tecnico";
      if (!isSuperAdmin && !(isManager && profile?.company_id === companyId)) {
        return json({ error: "Sem permissão para criar usuários nesta empresa." }, 403);
      }
      if (!isSuperAdmin && role === "gestor") {
        return json({ error: "Apenas o super admin pode criar gestores." }, 403);
      }

      const { data: created, error } = await admin.auth.admin.createUser({
        email: body.email,
        password: body.password,
        email_confirm: true,
        user_metadata: {
          full_name: body.fullName,
          phone: body.phone ?? "",
        },
        app_metadata: {
          provisioned_by_admin: true,
          role,
          company_id: companyId,
        },
      });
      if (error) return json({ error: error.message }, 400);

      const newId = created.user?.id;
      if (newId) {
        await admin
          .from("profiles")
          .update({
            company_id: companyId,
            full_name: body.fullName,
            phone: body.phone ?? null,
            email: body.email,
          })
          .eq("id", newId);
        await admin.from("user_roles").upsert({ user_id: newId, role }, { onConflict: "user_id,role" });
      }
      return json({ id: newId ?? null });
    }

    if (action === "reset-password") {
      const targetId = String(body.userId);
      const { data: target } = await userClient
        .from("profiles")
        .select("company_id")
        .eq("id", targetId)
        .maybeSingle();
      if (!isSuperAdmin && !(isManager && target)) {
        return json({ error: "Sem permissão." }, 403);
      }
      const { error } = await admin.auth.admin.updateUserById(targetId, { password: body.password });
      if (error) return json({ error: error.message }, 400);
      return json({ ok: true });
    }

    if (action === "create-company") {
      if (!isSuperAdmin) return json({ error: "Apenas o super admin pode cadastrar empresas." }, 403);

      const due = new Date();
      due.setMonth(due.getMonth() + 1);
      due.setDate(Number(body.dueDay));
      const nextDue = due.toISOString().slice(0, 10);

      const { data: company, error: companyError } = await admin
        .from("companies")
        .insert({
          name: body.name,
          document: body.document ?? null,
          email: body.email,
          phone: body.phone ?? null,
          monthly_fee: body.monthlyFee,
          due_day: body.dueDay,
          next_due_date: nextDue,
        })
        .select("id")
        .single();
      if (companyError) return json({ error: companyError.message }, 400);

      const { data: created, error } = await admin.auth.admin.createUser({
        email: body.email,
        password: body.managerPassword,
        email_confirm: true,
        user_metadata: { full_name: body.managerName },
        app_metadata: {
          provisioned_by_admin: true,
          role: "gestor",
          company_id: company.id,
        },
      });
      if (error) {
        await admin.from("companies").delete().eq("id", company.id);
        return json({ error: error.message }, 400);
      }

      if (created.user?.id) {
        await admin
          .from("profiles")
          .update({ company_id: company.id, full_name: body.managerName, email: body.email })
          .eq("id", created.user.id);
        await admin
          .from("user_roles")
          .upsert({ user_id: created.user.id, role: "gestor" }, { onConflict: "user_id,role" });
      }

      await admin.from("payments").insert({
        company_id: company.id,
        amount: body.monthlyFee,
        due_date: nextDue,
      });

      return json({ companyId: company.id });
    }

    return json({ error: "Ação inválida." }, 400);
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Erro interno." }, 500);
  }
});
