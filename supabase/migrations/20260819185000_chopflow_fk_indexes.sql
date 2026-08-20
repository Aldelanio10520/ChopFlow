CREATE INDEX IF NOT EXISTS status_events_company_id_idx ON public.status_events (company_id);
CREATE INDEX IF NOT EXISTS status_events_created_by_idx ON public.status_events (created_by);
CREATE INDEX IF NOT EXISTS work_order_parts_company_id_idx ON public.work_order_parts (company_id);
CREATE INDEX IF NOT EXISTS work_order_parts_part_id_idx ON public.work_order_parts (part_id);
CREATE INDEX IF NOT EXISTS work_orders_customer_id_idx ON public.work_orders (customer_id);
CREATE INDEX IF NOT EXISTS work_orders_service_id_idx ON public.work_orders (service_id);
