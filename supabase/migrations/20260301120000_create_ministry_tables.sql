-- Personal Ministry Module Tables
-- Data is isolated per user (auth.users.id), not shared with congregation.

CREATE TABLE public.personal_field_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  hours NUMERIC(5,2) NOT NULL DEFAULT 0,
  publications INTEGER NOT NULL DEFAULT 0,
  videos INTEGER NOT NULL DEFAULT 0,
  return_visits INTEGER NOT NULL DEFAULT 0,
  bible_studies INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.personal_monthly_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  month INTEGER NOT NULL,
  hours_goal NUMERIC(6,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, year, month)
);

CREATE TYPE public.return_visit_status_enum AS ENUM ('ativa', 'estudo_iniciado', 'encerrada');

CREATE TABLE public.personal_return_visits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name_or_initials TEXT,
  phone TEXT,
  address TEXT,
  topic TEXT,
  bible_text TEXT,
  next_step TEXT,
  return_date DATE,
  status return_visit_status_enum NOT NULL DEFAULT 'ativa',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TYPE public.territory_type_enum AS ENUM ('residencial', 'comercial', 'rural', 'publico');

CREATE TABLE public.personal_territory_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT,
  street_area TEXT,
  lat NUMERIC(12,8),
  lng NUMERIC(12,8),
  approximate_address TEXT,
  territory_type territory_type_enum NOT NULL DEFAULT 'residencial',
  date_worked DATE NOT NULL,
  time_spent_minutes INTEGER DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.personal_spiritual_journal (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  entry_type TEXT NOT NULL DEFAULT 'reflexao',
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_personal_field_records_user_date ON public.personal_field_records (user_id, date DESC);
CREATE INDEX idx_personal_monthly_goals_user ON public.personal_monthly_goals (user_id, year, month);
CREATE INDEX idx_personal_return_visits_user_status ON public.personal_return_visits (user_id, status);
CREATE INDEX idx_personal_territory_logs_user_date ON public.personal_territory_logs (user_id, date_worked DESC);
CREATE INDEX idx_personal_spiritual_journal_user ON public.personal_spiritual_journal (user_id, created_at DESC);
