-- 1) Trigger-only SECURITY DEFINER functions must not be API-callable
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.wo_status_side_effects() FROM PUBLIC, anon, authenticated;
-- Role helpers are only needed by RLS policies for signed-in users, never anonymously
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_manager() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.current_company_id() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_manager() TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_company_id() TO authenticated;
-- Bootstrap check must stay callable on the sign-in screen only
REVOKE ALL ON FUNCTION public.super_admin_exists() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.super_admin_exists() TO anon, authenticated;

-- 2) app_settings: PIX payment routing data only for managers/super admins
DROP POLICY IF EXISTS "read settings" ON public.app_settings;
CREATE POLICY "managers read settings" ON public.app_settings
FOR SELECT TO authenticated
USING (public.is_manager());

-- 3) profiles: self, managers of the same company, super admins
DROP POLICY IF EXISTS "read own profile" ON public.profiles;
CREATE POLICY "read own profile" ON public.profiles
FOR SELECT TO authenticated
USING (
  id = auth.uid()
  OR (company_id = public.current_company_id() AND public.is_manager())
  OR public.has_role(auth.uid(), 'super_admin'::public.app_role)
);