ALTER TABLE public.midweek_meetings
  ADD COLUMN IF NOT EXISTS opening_song_time TIME,
  ADD COLUMN IF NOT EXISTS opening_comments_time TIME,
  ADD COLUMN IF NOT EXISTS opening_comments_duration INTEGER,
  ADD COLUMN IF NOT EXISTS treasure_talk_time TIME,
  ADD COLUMN IF NOT EXISTS treasure_talk_duration INTEGER,
  ADD COLUMN IF NOT EXISTS treasure_gems_time TIME,
  ADD COLUMN IF NOT EXISTS treasure_gems_duration INTEGER,
  ADD COLUMN IF NOT EXISTS treasure_reading_time TIME,
  ADD COLUMN IF NOT EXISTS treasure_reading_duration INTEGER,
  ADD COLUMN IF NOT EXISTS middle_song_time TIME,
  ADD COLUMN IF NOT EXISTS cbs_time TIME,
  ADD COLUMN IF NOT EXISTS cbs_duration INTEGER,
  ADD COLUMN IF NOT EXISTS closing_comments_time TIME,
  ADD COLUMN IF NOT EXISTS closing_comments_duration INTEGER,
  ADD COLUMN IF NOT EXISTS closing_song_time TIME;

ALTER TABLE public.midweek_ministry_parts
  ADD COLUMN IF NOT EXISTS scheduled_time TIME;

ALTER TABLE public.midweek_christian_life_parts
  ADD COLUMN IF NOT EXISTS scheduled_time TIME;

CREATE TABLE IF NOT EXISTS public.app_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read access on app_settings" ON public.app_settings;
DROP POLICY IF EXISTS "Allow public insert on app_settings" ON public.app_settings;
DROP POLICY IF EXISTS "Allow public update on app_settings" ON public.app_settings;

CREATE POLICY "Allow public read access on app_settings" ON public.app_settings FOR SELECT USING (true);
CREATE POLICY "Allow public insert on app_settings" ON public.app_settings FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update on app_settings" ON public.app_settings FOR UPDATE USING (true) WITH CHECK (true);
