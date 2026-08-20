-- Audit trail of equipment moving between customers (PDVs).

CREATE TABLE public.equipment_transfers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  equipment_id uuid NOT NULL REFERENCES public.equipments(id) ON DELETE CASCADE,
  from_customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE RESTRICT,
  to_customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE RESTRICT,
  transferred_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX equipment_transfers_equipment_id_idx ON public.equipment_transfers (equipment_id);
CREATE INDEX equipment_transfers_company_id_idx ON public.equipment_transfers (company_id);

GRANT SELECT, INSERT ON public.equipment_transfers TO authenticated;
GRANT ALL ON public.equipment_transfers TO service_role;

ALTER TABLE public.equipment_transfers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "read equipment transfers"
ON public.equipment_transfers FOR SELECT TO authenticated
USING (company_id = public.current_company_id());

CREATE POLICY "insert equipment transfers"
ON public.equipment_transfers FOR INSERT TO authenticated
WITH CHECK (
  company_id = public.current_company_id()
  AND public.company_is_active()
);

CREATE OR REPLACE FUNCTION public.log_equipment_transfer()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.customer_id IS DISTINCT FROM OLD.customer_id THEN
    INSERT INTO public.equipment_transfers (
      company_id, equipment_id, from_customer_id, to_customer_id, transferred_by
    ) VALUES (
      NEW.company_id, NEW.id, OLD.customer_id, NEW.customer_id, auth.uid()
    );
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.log_equipment_transfer() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER equipments_log_transfer
AFTER UPDATE OF customer_id ON public.equipments
FOR EACH ROW EXECUTE FUNCTION public.log_equipment_transfer();
