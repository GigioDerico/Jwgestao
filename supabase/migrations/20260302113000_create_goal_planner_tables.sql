CREATE TABLE IF NOT EXISTS public.personal_goal_planner_template (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id UUID NOT NULL UNIQUE,
  weekday SMALLINT NOT NULL CHECK (weekday BETWEEN 1 AND 7),
  start_time TIME NOT NULL,
  duration_minutes INTEGER NOT NULL CHECK (duration_minutes BETWEEN 15 AND 480 AND duration_minutes % 15 = 0),
  activity_type TEXT NOT NULL CHECK (activity_type IN ('dia_de_campo', 'revisita', 'estudo', 'testemunho_informal', 'cartas_mensagens')),
  note TEXT,
  position INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.personal_goal_planner_month_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id UUID NOT NULL UNIQUE,
  year INTEGER NOT NULL,
  month INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
  planned_date DATE NOT NULL,
  start_time TIME NOT NULL,
  duration_minutes INTEGER NOT NULL CHECK (duration_minutes BETWEEN 15 AND 480 AND duration_minutes % 15 = 0),
  activity_type TEXT NOT NULL CHECK (activity_type IN ('dia_de_campo', 'revisita', 'estudo', 'testemunho_informal', 'cartas_mensagens')),
  note TEXT,
  source_type TEXT NOT NULL CHECK (source_type IN ('template', 'manual')),
  template_origin_client_id UUID,
  position INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_goal_planner_template_user_weekday_active
  ON public.personal_goal_planner_template (user_id, weekday, is_active);

CREATE INDEX IF NOT EXISTS idx_goal_planner_month_items_user_month_date_active
  ON public.personal_goal_planner_month_items (user_id, year, month, planned_date, is_active);

ALTER TABLE public.personal_goal_planner_template ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.personal_goal_planner_month_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own goal planner template" ON public.personal_goal_planner_template;
CREATE POLICY "Users can manage own goal planner template"
  ON public.personal_goal_planner_template FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can manage own goal planner month items" ON public.personal_goal_planner_month_items;
CREATE POLICY "Users can manage own goal planner month items"
  ON public.personal_goal_planner_month_items FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
