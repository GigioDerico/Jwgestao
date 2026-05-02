-- Add superintendent visit fields to weekend_meetings
ALTER TABLE public.weekend_meetings
  ADD COLUMN IF NOT EXISTS superintendent_visit BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS superintendent_discourse_theme VARCHAR(255),
  ADD COLUMN IF NOT EXISTS superintendent_discourse_speaker VARCHAR(255),
  ADD COLUMN IF NOT EXISTS closing_prayer_name VARCHAR(255);
