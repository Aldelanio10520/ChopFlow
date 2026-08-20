-- Soft-delete customers so OS history and indicators remain.
-- Equipment is unique by serial within the tenant and can move between customers with its history.

ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS active boolean NOT NULL DEFAULT true;

CREATE INDEX IF NOT EXISTS customers_company_active_idx
  ON public.customers (company_id)
  WHERE active;

ALTER TABLE public.work_orders DROP CONSTRAINT IF EXISTS work_orders_customer_id_fkey;
ALTER TABLE public.work_orders
  ADD CONSTRAINT work_orders_customer_id_fkey
  FOREIGN KEY (customer_id) REFERENCES public.customers(id) ON DELETE RESTRICT;

ALTER TABLE public.equipments DROP CONSTRAINT IF EXISTS equipments_customer_id_fkey;
ALTER TABLE public.equipments
  ADD CONSTRAINT equipments_customer_id_fkey
  FOREIGN KEY (customer_id) REFERENCES public.customers(id) ON DELETE RESTRICT;

ALTER TABLE public.work_orders DROP CONSTRAINT IF EXISTS work_orders_equipment_id_fkey;
ALTER TABLE public.work_orders
  ADD CONSTRAINT work_orders_equipment_id_fkey
  FOREIGN KEY (equipment_id) REFERENCES public.equipments(id) ON DELETE RESTRICT;

CREATE OR REPLACE FUNCTION public.normalize_equipment_serial()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.serial_number IS NOT NULL THEN
    NEW.serial_number := nullif(btrim(NEW.serial_number), '');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS equipments_normalize_serial ON public.equipments;
CREATE TRIGGER equipments_normalize_serial
BEFORE INSERT OR UPDATE ON public.equipments
FOR EACH ROW EXECUTE FUNCTION public.normalize_equipment_serial();

CREATE UNIQUE INDEX IF NOT EXISTS equipments_company_serial_uidx
  ON public.equipments (company_id, lower(serial_number))
  WHERE serial_number IS NOT NULL;

CREATE OR REPLACE FUNCTION public.prevent_wo_inactive_customer()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.customers c
    WHERE c.id = NEW.customer_id AND c.active = false
  ) THEN
    RAISE EXCEPTION 'Cliente inativo não pode receber novo atendimento';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS work_orders_active_customer ON public.work_orders;
CREATE TRIGGER work_orders_active_customer
BEFORE INSERT ON public.work_orders
FOR EACH ROW EXECUTE FUNCTION public.prevent_wo_inactive_customer();
