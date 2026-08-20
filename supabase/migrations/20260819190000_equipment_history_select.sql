DROP POLICY IF EXISTS "read work orders" ON public.work_orders;
CREATE POLICY "read work orders" ON public.work_orders FOR SELECT TO authenticated
USING (
  company_id = public.current_company_id()
  AND (
    public.is_gestor()
    OR technician_id = (SELECT auth.uid())
    OR (
      equipment_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM public.work_orders mine
        WHERE mine.technician_id = (SELECT auth.uid())
          AND mine.equipment_id = work_orders.equipment_id
      )
    )
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
      WHERE wo.id = work_order_id AND wo.technician_id = (SELECT auth.uid())
    )
    OR EXISTS (
      SELECT 1
      FROM public.work_orders wo
      JOIN public.work_orders mine ON mine.equipment_id = wo.equipment_id
      WHERE wo.id = work_order_id
        AND mine.technician_id = (SELECT auth.uid())
        AND mine.equipment_id IS NOT NULL
    )
  )
);
