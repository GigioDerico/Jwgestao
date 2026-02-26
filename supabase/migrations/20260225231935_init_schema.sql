-- Init Schema for JW Gestão
-- Defines Enums, Tables, Relations, and basic Indexes for Congregation Management

-- 1. Custom Enums (Types)
CREATE TYPE public.spiritual_status_enum AS ENUM (
  'publicador', 'publicador_batizado', 'pioneiro_auxiliar', 'pioneiro_regular', 'estudante'
);

CREATE TYPE public.gender_enum AS ENUM ('M', 'F');

CREATE TYPE public.system_role_enum AS ENUM (
  'coordenador', 'secretario', 'designador', 'publicador'
);

CREATE TYPE public.member_role_enum AS ENUM (
  'anciao', 'servo_ministerial'
);

-- 2. Tables

-- Field Service Groups
CREATE TABLE public.field_service_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  overseer_id UUID, -- Will add FK later to avoid circular dependency initially
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Members
CREATE TABLE public.members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE,
  phone VARCHAR(30),
  emergency_contact_name VARCHAR(255),
  emergency_contact_phone VARCHAR(30),
  spiritual_status spiritual_status_enum DEFAULT 'publicador',
  gender gender_enum NOT NULL,
  group_id UUID REFERENCES public.field_service_groups(id) ON DELETE SET NULL,
  is_family_head BOOLEAN DEFAULT FALSE,
  family_head_id UUID REFERENCES public.members(id) ON DELETE SET NULL,
  avatar_url TEXT,
  
  -- Privileges
  approved_audio_video BOOLEAN DEFAULT FALSE,
  approved_indicadores BOOLEAN DEFAULT FALSE,
  approved_carrinho BOOLEAN DEFAULT FALSE,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Fix the cyclic FK on field_service_groups now that members exists
ALTER TABLE public.field_service_groups 
ADD CONSTRAINT fk_group_overseer 
FOREIGN KEY (overseer_id) REFERENCES public.members(id) ON DELETE SET NULL;

-- Member Privileges (Congregation Roles)
CREATE TABLE public.member_privileges (
  member_id UUID REFERENCES public.members(id) ON DELETE CASCADE,
  role member_role_enum NOT NULL,
  PRIMARY KEY (member_id, role)
);

-- User Profiles (Linked with Supabase Auth)
CREATE TABLE public.user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  member_id UUID REFERENCES public.members(id) ON DELETE CASCADE,
  system_role system_role_enum NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Midweek Meetings
CREATE TABLE public.midweek_meetings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE UNIQUE NOT NULL,
  bible_reading VARCHAR(150),
  president_id UUID REFERENCES public.members(id) ON DELETE SET NULL,
  opening_prayer_id UUID REFERENCES public.members(id) ON DELETE SET NULL,
  closing_prayer_id UUID REFERENCES public.members(id) ON DELETE SET NULL,
  opening_song INTEGER,
  middle_song INTEGER,
  closing_song INTEGER,
  
  -- Treasures
  treasure_talk_title VARCHAR(255),
  treasure_talk_speaker_id UUID REFERENCES public.members(id) ON DELETE SET NULL,
  treasure_gems_speaker_id UUID REFERENCES public.members(id) ON DELETE SET NULL,
  treasure_reading_student_id UUID REFERENCES public.members(id) ON DELETE SET NULL,
  treasure_reading_room VARCHAR(100),
  
  -- Christian Life - CBS
  cbs_conductor_id UUID REFERENCES public.members(id) ON DELETE SET NULL,
  cbs_reader_id UUID REFERENCES public.members(id) ON DELETE SET NULL,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Midweek Ministry Parts (Make your best)
CREATE TABLE public.midweek_ministry_parts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id UUID REFERENCES public.midweek_meetings(id) ON DELETE CASCADE,
  part_number INTEGER NOT NULL,
  title VARCHAR(255) NOT NULL,
  duration INTEGER NOT NULL,
  student_id UUID REFERENCES public.members(id) ON DELETE SET NULL,
  assistant_id UUID REFERENCES public.members(id) ON DELETE SET NULL,
  room VARCHAR(50),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Midweek Christian Life Parts (Dynamic Parts)
CREATE TABLE public.midweek_christian_life_parts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id UUID REFERENCES public.midweek_meetings(id) ON DELETE CASCADE,
  part_number INTEGER NOT NULL,
  title VARCHAR(255) NOT NULL,
  duration INTEGER NOT NULL,
  speaker_id UUID REFERENCES public.members(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Weekend Meetings
CREATE TABLE public.weekend_meetings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE UNIQUE NOT NULL,
  president_id UUID REFERENCES public.members(id) ON DELETE SET NULL,
  closing_prayer_id UUID REFERENCES public.members(id) ON DELETE SET NULL,
  
  -- Public Talk
  talk_theme VARCHAR(255),
  talk_speaker_name VARCHAR(255) NOT NULL,
  talk_congregation VARCHAR(150),
  
  -- Watchtower
  watchtower_conductor_id UUID REFERENCES public.members(id) ON DELETE SET NULL,
  watchtower_reader_id UUID REFERENCES public.members(id) ON DELETE SET NULL,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Indexes for Query Optimization
CREATE INDEX idx_members_name ON public.members USING btree (full_name);
CREATE INDEX idx_members_group ON public.members (group_id);
CREATE INDEX idx_members_family ON public.members (family_head_id);

CREATE INDEX idx_midweek_date ON public.midweek_meetings (date);
CREATE INDEX idx_weekend_date ON public.weekend_meetings (date);

-- Security: Enable Row Level Security (RLS) as a baseline.
-- Without policies, this restricts all operations entirely, which is good for absolute security starting point.
ALTER TABLE public.field_service_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.member_privileges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.midweek_meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.midweek_ministry_parts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.midweek_christian_life_parts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weekend_meetings ENABLE ROW LEVEL SECURITY;

-- Down Migration / Rollback note
-- To revert these changes, run DROP operations in reverse order.
