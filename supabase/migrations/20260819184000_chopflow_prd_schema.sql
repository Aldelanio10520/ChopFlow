-- ChopFlow PRD schema for project yuxxtucrgxnyeatozlok
-- Tenant isolation, RBAC, server-side OS timestamps, checkout immutability.

CREATE TYPE public.app_role AS ENUM ('super_admin', 'gestor', 'tecnico');
CREATE TYPE public.company_status AS ENUM ('ativa', 'bloqueada');
CREATE TYPE public.wo_status AS ENUM ('pendente', 'recebido', 'em_deslocamento', 'em_atendimento', 'concluido');
CREATE TYPE public.wo_kind AS ENUM ('emergencial', 'preventiva', 'sanitizacao', 'instalacao');
CREATE TYPE public.payment_status AS ENUM ('pendente', 'pago');

CREATE TABLE public.companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  document text,
  email text,
  phone text,
  status public.company_status NOT NULL DEFAULT 'ativa',
  monthly_fee numeric(10,2) NOT NULL DEFAULT 0,
  due_day int NOT NULL DEFAULT 10,
  next_due_date date NOT NULL DEFAULT (current_date + 30),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE,
  full_name text NOT NULL DEFAULT '',
  phone text,
  email text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  UNIQUE (user_id, role)
);

CREATE TABLE public.app_settings (
  id boolean PRIMARY KEY DEFAULT true CHECK (id),
  pix_key text NOT NULL DEFAULT '02520340312',
  pix_name text NOT NULL DEFAULT 'ChopFlow',
  pix_city text NOT NULL DEFAULT 'SAO PAULO'
);
INSERT INTO public.app_settings (id) VALUES (true);

CREATE TABLE public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  amount numeric(10,2) NOT NULL DEFAULT 0,
  due_date date NOT NULL,
  paid_at timestamptz,
  status public.payment_status NOT NULL DEFAULT 'pendente',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  contact_name text,
  phone text,
  address text,
  district text,
  city text,
  state text,
  zip text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  kind public.wo_kind NOT NULL DEFAULT 'preventiva',
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.parts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  unit text NOT NULL DEFAULT 'un',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.equipments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  type text NOT NULL,
  brand text,
  model text,
  serial_number text,
  voltage text,
  refrigerant text,
  taps int,
  extractor_type text,
  notes text,
  qr_token uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.routes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  technician_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  route_date date NOT NULL DEFAULT current_date,
  title text NOT NULL DEFAULT 'Rota',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.work_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  route_id uuid REFERENCES public.routes(id) ON DELETE SET NULL,
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  technician_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  service_id uuid REFERENCES public.services(id) ON DELETE SET NULL,
  equipment_id uuid REFERENCES public.equipments(id) ON DELETE SET NULL,
  kind public.wo_kind NOT NULL DEFAULT 'preventiva',
  description text,
  position int NOT NULL DEFAULT 1,
  scheduled_date date NOT NULL DEFAULT current_date,
  status public.wo_status NOT NULL DEFAULT 'pendente',
  received_at timestamptz,
  travel_started_at timestamptz,
  checkin_at timestamptz,
  completed_at timestamptz,
  duration_minutes int,
  technician_notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.work_order_parts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  work_order_id uuid NOT NULL REFERENCES public.work_orders(id) ON DELETE CASCADE,
  part_id uuid NOT NULL REFERENCES public.parts(id) ON DELETE CASCADE,
  quantity numeric(10,2) NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.status_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  work_order_id uuid NOT NULL REFERENCES public.work_orders(id) ON DELETE CASCADE,
  status public.wo_status NOT NULL,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX parts_company_name_uidx ON public.parts (company_id, lower(name));
CREATE UNIQUE INDEX equipments_qr_token_uidx ON public.equipments (qr_token);
CREATE INDEX profiles_company_id_idx ON public.profiles (company_id);
CREATE INDEX customers_company_id_idx ON public.customers (company_id);
CREATE INDEX services_company_id_idx ON public.services (company_id);
CREATE INDEX parts_company_id_idx ON public.parts (company_id);
CREATE INDEX equipments_company_id_idx ON public.equipments (company_id);
CREATE INDEX equipments_customer_id_idx ON public.equipments (customer_id);
CREATE INDEX routes_company_id_idx ON public.routes (company_id);
CREATE INDEX routes_tech_date_idx ON public.routes (technician_id, route_date);
CREATE INDEX work_orders_company_id_idx ON public.work_orders (company_id);
CREATE INDEX work_orders_tech_date_idx ON public.work_orders (technician_id, scheduled_date);
CREATE INDEX work_orders_route_id_idx ON public.work_orders (route_id);
CREATE INDEX work_orders_equipment_id_idx ON public.work_orders (equipment_id);
CREATE INDEX work_order_parts_wo_id_idx ON public.work_order_parts (work_order_id);
CREATE INDEX status_events_wo_id_idx ON public.status_events (work_order_id);
CREATE INDEX payments_company_id_idx ON public.payments (company_id);
CREATE INDEX user_roles_user_id_idx ON public.user_roles (user_id);

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  );
$$;

CREATE OR REPLACE FUNCTION public.current_company_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT company_id FROM public.profiles WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.is_gestor()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(auth.uid(), 'gestor');
$$;

CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(auth.uid(), 'super_admin');
$$;

CREATE OR REPLACE FUNCTION public.is_manager()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_gestor();
$$;

CREATE OR REPLACE FUNCTION public.company_is_active()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT status = 'ativa' FROM public.companies WHERE id = public.current_company_id()),
    false
  );
$$;

CREATE OR REPLACE FUNCTION public.super_admin_exists()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'super_admin');
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _role public.app_role;
  _company uuid;
  _provisioned boolean;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'super_admin') THEN
    INSERT INTO public.profiles (id, full_name, email)
    VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data ->> 'full_name', ''), NEW.email)
    ON CONFLICT (id) DO NOTHING;
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'super_admin')
    ON CONFLICT DO NOTHING;
    RETURN NEW;
  END IF;

  _provisioned := COALESCE((NEW.raw_app_meta_data ->> 'provisioned_by_admin')::boolean, false);
  IF NOT _provisioned THEN
    INSERT INTO public.profiles (id, full_name, email)
    VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data ->> 'full_name', ''), NEW.email)
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
  END IF;

  _company := NULLIF(NEW.raw_app_meta_data ->> 'company_id', '')::uuid;
  _role := COALESCE(NULLIF(NEW.raw_app_meta_data ->> 'role', '')::public.app_role, 'tecnico');
  IF _role = 'super_admin' THEN
    _role := 'tecnico';
  END IF;

  INSERT INTO public.profiles (id, company_id, full_name, email, phone)
  VALUES (
    NEW.id,
    _company,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', ''),
    NEW.email,
    NEW.raw_user_meta_data ->> 'phone'
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, _role)
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE FUNCTION public.wo_status_side_effects()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _gestor boolean := public.has_role(auth.uid(), 'gestor');
BEGIN
  IF NOT _gestor AND TG_OP = 'UPDATE' THEN
    NEW.received_at := OLD.received_at;
    NEW.travel_started_at := OLD.travel_started_at;
    NEW.checkin_at := OLD.checkin_at;
    NEW.completed_at := OLD.completed_at;
    NEW.duration_minutes := OLD.duration_minutes;
    NEW.company_id := OLD.company_id;
    NEW.technician_id := OLD.technician_id;
    NEW.customer_id := OLD.customer_id;
    NEW.route_id := OLD.route_id;
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.status = 'concluido' AND NOT _gestor THEN
    IF NEW.status IS DISTINCT FROM OLD.status
       OR NEW.technician_notes IS DISTINCT FROM OLD.technician_notes
       OR NEW.equipment_id IS DISTINCT FROM OLD.equipment_id THEN
      RAISE EXCEPTION 'Ordem de serviço concluída não pode ser alterada pelo técnico';
    END IF;
  END IF;

  IF TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status THEN
    IF OLD.status = 'concluido' AND NOT _gestor THEN
      RAISE EXCEPTION 'Ordem de serviço concluída não pode mudar de status';
    END IF;
    IF NEW.status = 'recebido' AND NEW.received_at IS NULL THEN
      NEW.received_at := now();
    END IF;
    IF NEW.status = 'em_deslocamento' AND NEW.travel_started_at IS NULL THEN
      NEW.travel_started_at := now();
    END IF;
    IF NEW.status = 'em_atendimento' AND NEW.checkin_at IS NULL THEN
      NEW.checkin_at := now();
    END IF;
    IF NEW.status = 'concluido' THEN
      NEW.completed_at := COALESCE(NEW.completed_at, now());
      NEW.duration_minutes := GREATEST(
        0,
        EXTRACT(EPOCH FROM (
          NEW.completed_at - COALESCE(NEW.checkin_at, NEW.travel_started_at, NEW.created_at)
        )) / 60
      )::int;
    END IF;
    INSERT INTO public.status_events (company_id, work_order_id, status, created_by)
    VALUES (NEW.company_id, NEW.id, NEW.status, auth.uid());
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER wo_status_trigger
BEFORE UPDATE ON public.work_orders
FOR EACH ROW EXECUTE FUNCTION public.wo_status_side_effects();

CREATE OR REPLACE FUNCTION public.protect_completed_wo_parts()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _status public.wo_status;
  _wo_id uuid;
BEGIN
  IF public.has_role(auth.uid(), 'gestor') THEN
    RETURN COALESCE(NEW, OLD);
  END IF;
  _wo_id := COALESCE(NEW.work_order_id, OLD.work_order_id);
  SELECT status INTO _status FROM public.work_orders WHERE id = _wo_id;
  IF _status = 'concluido' THEN
    RAISE EXCEPTION 'Peças de OS concluída não podem ser alteradas pelo técnico';
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER wo_parts_protect
BEFORE INSERT OR UPDATE OR DELETE ON public.work_order_parts
FOR EACH ROW EXECUTE FUNCTION public.protect_completed_wo_parts();

GRANT SELECT, INSERT, UPDATE, DELETE ON
  public.companies, public.profiles, public.payments, public.customers, public.services,
  public.parts, public.equipments, public.routes, public.work_orders, public.work_order_parts,
  public.status_events
TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.app_settings TO authenticated;
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON
  public.companies, public.profiles, public.user_roles, public.app_settings, public.payments,
  public.customers, public.services, public.parts, public.equipments, public.routes,
  public.work_orders, public.work_order_parts, public.status_events
TO service_role;

ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.equipments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_order_parts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.status_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "super admin manages companies"
ON public.companies FOR ALL TO authenticated
USING (public.is_super_admin())
WITH CHECK (public.is_super_admin());

CREATE POLICY "members read own company"
ON public.companies FOR SELECT TO authenticated
USING (id = public.current_company_id());

CREATE POLICY "read profiles"
ON public.profiles FOR SELECT TO authenticated
USING (
  id = (SELECT auth.uid())
  OR (company_id = public.current_company_id() AND public.is_gestor())
  OR public.is_super_admin()
);

CREATE POLICY "update profiles"
ON public.profiles FOR UPDATE TO authenticated
USING (
  id = (SELECT auth.uid())
  OR (company_id = public.current_company_id() AND public.is_gestor() AND public.company_is_active())
  OR public.is_super_admin()
)
WITH CHECK (
  id = (SELECT auth.uid())
  OR (company_id = public.current_company_id() AND public.is_gestor())
  OR public.is_super_admin()
);

CREATE POLICY "insert profiles"
ON public.profiles FOR INSERT TO authenticated
WITH CHECK (public.is_gestor() OR public.is_super_admin());

CREATE POLICY "delete profiles"
ON public.profiles FOR DELETE TO authenticated
USING (
  (company_id = public.current_company_id() AND public.is_gestor() AND public.company_is_active())
  OR public.is_super_admin()
);

CREATE POLICY "read roles"
ON public.user_roles FOR SELECT TO authenticated
USING (
  user_id = (SELECT auth.uid())
  OR public.is_super_admin()
  OR (
    public.is_gestor()
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = user_roles.user_id AND p.company_id = public.current_company_id()
    )
  )
);

CREATE POLICY "managers read settings"
ON public.app_settings FOR SELECT TO authenticated
USING (public.is_gestor() OR public.is_super_admin());

CREATE POLICY "super admin updates settings"
ON public.app_settings FOR UPDATE TO authenticated
USING (public.is_super_admin())
WITH CHECK (public.is_super_admin());

CREATE POLICY "super admin manages payments"
ON public.payments FOR ALL TO authenticated
USING (public.is_super_admin())
WITH CHECK (public.is_super_admin());

CREATE POLICY "company reads payments"
ON public.payments FOR SELECT TO authenticated
USING (company_id = public.current_company_id() AND public.is_gestor());

CREATE POLICY "company read customers"
ON public.customers FOR SELECT TO authenticated
USING (company_id = public.current_company_id());

CREATE POLICY "manager write customers"
ON public.customers FOR INSERT TO authenticated
WITH CHECK (company_id = public.current_company_id() AND public.is_gestor() AND public.company_is_active());

CREATE POLICY "manager update customers"
ON public.customers FOR UPDATE TO authenticated
USING (company_id = public.current_company_id() AND public.is_gestor() AND public.company_is_active())
WITH CHECK (company_id = public.current_company_id() AND public.is_gestor());

CREATE POLICY "manager delete customers"
ON public.customers FOR DELETE TO authenticated
USING (company_id = public.current_company_id() AND public.is_gestor() AND public.company_is_active());

CREATE POLICY "company read services"
ON public.services FOR SELECT TO authenticated
USING (company_id = public.current_company_id());

CREATE POLICY "manager write services"
ON public.services FOR INSERT TO authenticated
WITH CHECK (company_id = public.current_company_id() AND public.is_gestor() AND public.company_is_active());

CREATE POLICY "manager update services"
ON public.services FOR UPDATE TO authenticated
USING (company_id = public.current_company_id() AND public.is_gestor() AND public.company_is_active())
WITH CHECK (company_id = public.current_company_id() AND public.is_gestor());

CREATE POLICY "manager delete services"
ON public.services FOR DELETE TO authenticated
USING (company_id = public.current_company_id() AND public.is_gestor() AND public.company_is_active());

CREATE POLICY "company read parts"
ON public.parts FOR SELECT TO authenticated
USING (company_id = public.current_company_id());

CREATE POLICY "company insert parts"
ON public.parts FOR INSERT TO authenticated
WITH CHECK (company_id = public.current_company_id() AND public.company_is_active());

CREATE POLICY "manager update parts"
ON public.parts FOR UPDATE TO authenticated
USING (company_id = public.current_company_id() AND public.is_gestor() AND public.company_is_active())
WITH CHECK (company_id = public.current_company_id() AND public.is_gestor());

CREATE POLICY "manager delete parts"
ON public.parts FOR DELETE TO authenticated
USING (company_id = public.current_company_id() AND public.is_gestor() AND public.company_is_active());

CREATE POLICY "company read equipments"
ON public.equipments FOR SELECT TO authenticated
USING (company_id = public.current_company_id());

CREATE POLICY "company insert equipments"
ON public.equipments FOR INSERT TO authenticated
WITH CHECK (company_id = public.current_company_id() AND public.company_is_active());

CREATE POLICY "company update equipments"
ON public.equipments FOR UPDATE TO authenticated
USING (company_id = public.current_company_id() AND public.company_is_active())
WITH CHECK (company_id = public.current_company_id());

CREATE POLICY "manager delete equipments"
ON public.equipments FOR DELETE TO authenticated
USING (company_id = public.current_company_id() AND public.is_gestor() AND public.company_is_active());

CREATE POLICY "read routes"
ON public.routes FOR SELECT TO authenticated
USING (
  company_id = public.current_company_id()
  AND (public.is_gestor() OR technician_id = (SELECT auth.uid()))
);

CREATE POLICY "manager write routes"
ON public.routes FOR INSERT TO authenticated
WITH CHECK (company_id = public.current_company_id() AND public.is_gestor() AND public.company_is_active());

CREATE POLICY "manager update routes"
ON public.routes FOR UPDATE TO authenticated
USING (company_id = public.current_company_id() AND public.is_gestor() AND public.company_is_active())
WITH CHECK (company_id = public.current_company_id() AND public.is_gestor());

CREATE POLICY "manager delete routes"
ON public.routes FOR DELETE TO authenticated
USING (company_id = public.current_company_id() AND public.is_gestor() AND public.company_is_active());

CREATE POLICY "read work orders"
ON public.work_orders FOR SELECT TO authenticated
USING (
  company_id = public.current_company_id()
  AND (public.is_gestor() OR technician_id = (SELECT auth.uid()))
);

CREATE POLICY "manager insert work orders"
ON public.work_orders FOR INSERT TO authenticated
WITH CHECK (company_id = public.current_company_id() AND public.is_gestor() AND public.company_is_active());

CREATE POLICY "update work orders"
ON public.work_orders FOR UPDATE TO authenticated
USING (
  company_id = public.current_company_id()
  AND public.company_is_active()
  AND (public.is_gestor() OR technician_id = (SELECT auth.uid()))
)
WITH CHECK (
  company_id = public.current_company_id()
  AND (public.is_gestor() OR technician_id = (SELECT auth.uid()))
);

CREATE POLICY "manager delete work orders"
ON public.work_orders FOR DELETE TO authenticated
USING (company_id = public.current_company_id() AND public.is_gestor() AND public.company_is_active());

CREATE POLICY "read wo parts"
ON public.work_order_parts FOR SELECT TO authenticated
USING (
  company_id = public.current_company_id()
  AND (
    public.is_gestor()
    OR EXISTS (
      SELECT 1 FROM public.work_orders wo
      WHERE wo.id = work_order_id AND wo.technician_id = (SELECT auth.uid())
    )
  )
);

CREATE POLICY "insert wo parts"
ON public.work_order_parts FOR INSERT TO authenticated
WITH CHECK (
  company_id = public.current_company_id()
  AND public.company_is_active()
  AND EXISTS (
    SELECT 1 FROM public.work_orders wo
    WHERE wo.id = work_order_id
      AND wo.company_id = public.current_company_id()
      AND (
        public.is_gestor()
        OR (wo.technician_id = (SELECT auth.uid()) AND wo.status <> 'concluido')
      )
  )
);

CREATE POLICY "delete wo parts"
ON public.work_order_parts FOR DELETE TO authenticated
USING (
  company_id = public.current_company_id()
  AND public.company_is_active()
  AND EXISTS (
    SELECT 1 FROM public.work_orders wo
    WHERE wo.id = work_order_id
      AND (
        public.is_gestor()
        OR (wo.technician_id = (SELECT auth.uid()) AND wo.status <> 'concluido')
      )
  )
);

CREATE POLICY "read status events"
ON public.status_events FOR SELECT TO authenticated
USING (
  company_id = public.current_company_id()
  AND (
    public.is_gestor()
    OR EXISTS (
      SELECT 1 FROM public.work_orders wo
      WHERE wo.id = work_order_id AND wo.technician_id = (SELECT auth.uid())
    )
  )
);

CREATE POLICY "insert status events"
ON public.status_events FOR INSERT TO authenticated
WITH CHECK (company_id = public.current_company_id() AND public.company_is_active());

REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.wo_status_side_effects() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.protect_completed_wo_parts() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.current_company_id() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_manager() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_gestor() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_super_admin() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.company_is_active() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.super_admin_exists() FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_company_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_manager() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_gestor() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_super_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.company_is_active() TO authenticated;
GRANT EXECUTE ON FUNCTION public.super_admin_exists() TO anon, authenticated;

ALTER PUBLICATION supabase_realtime ADD TABLE public.work_orders;
ALTER PUBLICATION supabase_realtime ADD TABLE public.status_events;
