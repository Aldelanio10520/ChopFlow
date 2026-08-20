-- Multiple equipments per work order. Keep work_orders.equipment_id as the first linked unit
-- for legacy history queries and technician RLS.

CREATE TABLE public.work_order_equipments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  work_order_id uuid NOT NULL REFERENCES public.work_orders(id) ON DELETE CASCADE,
  equipment_id uuid NOT NULL REFERENCES public.equipments(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (work_order_id, equipment_id)
);

CREATE INDEX work_order_equipments_wo_id_idx ON public.work_order_equipments (work_order_id);
CREATE INDEX work_order_equipments_equipment_id_idx ON public.work_order_equipments (equipment_id);
CREATE INDEX work_order_equipments_company_id_idx ON public.work_order_equipments (company_id);

INSERT INTO public.work_order_equipments (company_id, work_order_id, equipment_id)
SELECT company_id, id, equipment_id
FROM public.work_orders
WHERE equipment_id IS NOT NULL
ON CONFLICT (work_order_id, equipment_id) DO NOTHING;

GRANT SELECT, INSERT, DELETE ON public.work_order_equipments TO authenticated;
GRANT ALL ON public.work_order_equipments TO service_role;

ALTER TABLE public.work_order_equipments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "read wo equipments"
ON public.work_order_equipments FOR SELECT TO authenticated
USING (
  company_id = public.current_company_id()
  AND (
    public.is_gestor()
    OR EXISTS (
      SELECT 1 FROM public.work_orders wo
      WHERE wo.id = work_order_id
        AND (
          wo.technician_id = (SELECT auth.uid())
          OR wo.equipment_id IN (SELECT public.technician_equipment_ids())
        )
    )
  )
);

CREATE POLICY "insert wo equipments"
ON public.work_order_equipments FOR INSERT TO authenticated
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
  AND EXISTS (
    SELECT 1 FROM public.equipments e
    WHERE e.id = equipment_id AND e.company_id = public.current_company_id()
  )
);

CREATE POLICY "delete wo equipments"
ON public.work_order_equipments FOR DELETE TO authenticated
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

CREATE TRIGGER wo_equipments_protect
BEFORE INSERT OR UPDATE OR DELETE ON public.work_order_equipments
FOR EACH ROW EXECUTE FUNCTION public.protect_completed_wo_parts();

CREATE OR REPLACE FUNCTION public.sync_wo_primary_equipment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _wo uuid := COALESCE(NEW.work_order_id, OLD.work_order_id);
  _eq uuid;
BEGIN
  SELECT equipment_id INTO _eq
  FROM public.work_order_equipments
  WHERE work_order_id = _wo
  ORDER BY created_at
  LIMIT 1;
  UPDATE public.work_orders SET equipment_id = _eq WHERE id = _wo;
  RETURN COALESCE(NEW, OLD);
END;
$$;

REVOKE ALL ON FUNCTION public.sync_wo_primary_equipment() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER wo_equipments_sync_primary
AFTER INSERT OR DELETE ON public.work_order_equipments
FOR EACH ROW EXECUTE FUNCTION public.sync_wo_primary_equipment();

CREATE OR REPLACE FUNCTION public.technician_equipment_ids()
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT DISTINCT equipment_id
  FROM public.work_orders
  WHERE technician_id = auth.uid()
    AND equipment_id IS NOT NULL
  UNION
  SELECT DISTINCT woe.equipment_id
  FROM public.work_order_equipments woe
  JOIN public.work_orders wo ON wo.id = woe.work_order_id
  WHERE wo.technician_id = auth.uid();
$$;
