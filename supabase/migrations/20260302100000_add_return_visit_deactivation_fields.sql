ALTER TABLE public.personal_return_visits
ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS deactivation_reason TEXT,
ADD COLUMN IF NOT EXISTS deactivated_at TIMESTAMPTZ;

UPDATE public.personal_return_visits
SET
  is_active = FALSE,
  deactivated_at = COALESCE(deactivated_at, updated_at, created_at)
WHERE status = 'encerrada' AND is_active = TRUE;
