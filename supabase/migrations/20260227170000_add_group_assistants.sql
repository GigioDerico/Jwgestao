-- Tabela de junção para ajudantes do grupo de serviço de campo
CREATE TABLE public.field_service_group_assistants (
  group_id UUID REFERENCES public.field_service_groups(id) ON DELETE CASCADE,
  member_id UUID REFERENCES public.members(id) ON DELETE CASCADE,
  PRIMARY KEY (group_id, member_id)
);
CREATE INDEX idx_group_assistants_group ON public.field_service_group_assistants(group_id);
ALTER TABLE public.field_service_group_assistants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public select on field_service_group_assistants" ON public.field_service_group_assistants FOR SELECT USING (true);
CREATE POLICY "Allow public insert on field_service_group_assistants" ON public.field_service_group_assistants FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public delete on field_service_group_assistants" ON public.field_service_group_assistants FOR DELETE USING (true);
