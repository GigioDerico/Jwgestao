ALTER TABLE role_permissions
ADD COLUMN IF NOT EXISTS can_create_assignments BOOLEAN NOT NULL DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS can_download_assignment_image BOOLEAN NOT NULL DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS can_download_assignment_pdf BOOLEAN NOT NULL DEFAULT FALSE;

UPDATE role_permissions
SET
  can_create_assignments = CASE
    WHEN role IN ('coordenador', 'designador') THEN TRUE
    ELSE can_create_assignments
  END,
  can_download_assignment_image = CASE
    WHEN role IN ('coordenador', 'designador') THEN TRUE
    ELSE can_download_assignment_image
  END,
  can_download_assignment_pdf = CASE
    WHEN role IN ('coordenador', 'designador') THEN TRUE
    ELSE can_download_assignment_pdf
  END,
  updated_at = NOW();
