-- Add servo_ministerial and anciao to spiritual_status_enum
ALTER TYPE public.spiritual_status_enum ADD VALUE IF NOT EXISTS 'servo_ministerial';
ALTER TYPE public.spiritual_status_enum ADD VALUE IF NOT EXISTS 'anciao';

-- Add pioneer approval columns to members table
ALTER TABLE public.members ADD COLUMN IF NOT EXISTS approved_pioneiro_auxiliar BOOLEAN DEFAULT FALSE;
ALTER TABLE public.members ADD COLUMN IF NOT EXISTS approved_pioneiro_regular BOOLEAN DEFAULT FALSE;
