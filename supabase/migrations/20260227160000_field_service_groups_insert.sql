-- Allow INSERT on field_service_groups for MVP development
DROP POLICY IF EXISTS "Allow public insert access on field_service_groups" ON public.field_service_groups;
CREATE POLICY "Allow public insert access on field_service_groups" ON public.field_service_groups FOR INSERT WITH CHECK (true);
