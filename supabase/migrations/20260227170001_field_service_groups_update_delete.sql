-- Políticas UPDATE e DELETE para field_service_groups
CREATE POLICY "Allow public update on field_service_groups" ON public.field_service_groups FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Allow public delete on field_service_groups" ON public.field_service_groups FOR DELETE USING (true);
