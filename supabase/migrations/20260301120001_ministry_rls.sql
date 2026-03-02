-- RLS for Personal Ministry tables
-- Each user can only access their own data (auth.uid() = user_id)

ALTER TABLE public.personal_field_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.personal_monthly_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.personal_return_visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.personal_territory_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.personal_spiritual_journal ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own field records"
  ON public.personal_field_records FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can manage own monthly goals"
  ON public.personal_monthly_goals FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can manage own return visits"
  ON public.personal_return_visits FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can manage own territory logs"
  ON public.personal_territory_logs FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can manage own spiritual journal"
  ON public.personal_spiritual_journal FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
