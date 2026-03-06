CREATE TABLE IF NOT EXISTS public.field_service_presence (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  member_id UUID REFERENCES public.members(id) ON DELETE SET NULL,
  display_name TEXT NOT NULL,
  avatar_url TEXT,
  group_id UUID REFERENCES public.field_service_groups(id) ON DELETE SET NULL,
  is_active BOOLEAN NOT NULL DEFAULT FALSE,
  started_at TIMESTAMPTZ,
  last_lat NUMERIC(10, 7),
  last_lng NUMERIC(10, 7),
  last_accuracy_m NUMERIC(8, 2),
  source TEXT NOT NULL DEFAULT 'field_service_live',
  last_seen_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_field_service_presence_active_last_seen
  ON public.field_service_presence (is_active, last_seen_at DESC);

CREATE OR REPLACE FUNCTION public.touch_field_service_presence_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_field_service_presence_touch_updated_at ON public.field_service_presence;
CREATE TRIGGER trg_field_service_presence_touch_updated_at
BEFORE UPDATE ON public.field_service_presence
FOR EACH ROW
EXECUTE FUNCTION public.touch_field_service_presence_updated_at();

ALTER TABLE public.field_service_presence ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can read field service presence" ON public.field_service_presence;
DROP POLICY IF EXISTS "Users can insert own field service presence" ON public.field_service_presence;
DROP POLICY IF EXISTS "Users can update own field service presence" ON public.field_service_presence;
DROP POLICY IF EXISTS "Users can delete own field service presence" ON public.field_service_presence;

CREATE POLICY "Authenticated users can read field service presence"
  ON public.field_service_presence FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Users can insert own field service presence"
  ON public.field_service_presence FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own field service presence"
  ON public.field_service_presence FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own field service presence"
  ON public.field_service_presence FOR DELETE TO authenticated
  USING (user_id = auth.uid());
