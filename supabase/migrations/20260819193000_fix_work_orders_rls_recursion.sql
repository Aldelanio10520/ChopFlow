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
    AND equipment_id IS NOT NULL;
$$;

REVOKE ALL ON FUNCTION public.technician_equipment_ids() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.technician_equipment_ids() TO authenticated;

DROP POLICY IF EXISTS "read work orders" ON public.work_orders;
CREATE POLICY "read work orders" ON public.work_orders FOR SELECT TO authenticated
USING (
  company_id = public.current_company_id()
  AND (
    public.is_gestor()
    OR technician_id = (SELECT auth.uid())
    OR equipment_id IN (SELECT public.technician_equipment_ids())
  )
);

DROP POLICY IF EXISTS "read wo parts" ON public.work_order_parts;
CREATE POLICY "read wo parts" ON public.work_order_parts FOR SELECT TO authenticated
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
