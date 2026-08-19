
ALTER TABLE public.work_orders
  ADD CONSTRAINT work_orders_technician_fkey FOREIGN KEY (technician_id) REFERENCES public.profiles(id) ON DELETE SET NULL;
ALTER TABLE public.routes
  ADD CONSTRAINT routes_technician_fkey FOREIGN KEY (technician_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
