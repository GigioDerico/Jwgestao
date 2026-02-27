-- Migration: create role_permissions table for configurable RBAC
-- Stores which actions each system_role is allowed to perform

CREATE TABLE IF NOT EXISTS role_permissions (
  role        system_role_enum PRIMARY KEY,
  can_view_members    BOOLEAN NOT NULL DEFAULT TRUE,
  can_create_members  BOOLEAN NOT NULL DEFAULT FALSE,
  can_edit_members    BOOLEAN NOT NULL DEFAULT FALSE,
  can_view_meetings   BOOLEAN NOT NULL DEFAULT TRUE,
  can_edit_assignments BOOLEAN NOT NULL DEFAULT FALSE,
  can_view_assignments BOOLEAN NOT NULL DEFAULT TRUE,
  can_manage_permissions BOOLEAN NOT NULL DEFAULT FALSE,
  can_view_reports    BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed default permissions per role
INSERT INTO role_permissions VALUES
  ('coordenador', TRUE, TRUE, TRUE, TRUE, TRUE, TRUE, TRUE, TRUE, NOW()),
  ('secretario',  TRUE, TRUE, TRUE, TRUE, FALSE, TRUE, FALSE, TRUE, NOW()),
  ('designador',  TRUE, FALSE, FALSE, TRUE, TRUE, TRUE, FALSE, FALSE, NOW()),
  ('publicador',  FALSE, FALSE, FALSE, TRUE, FALSE, TRUE, FALSE, FALSE, NOW())
ON CONFLICT (role) DO NOTHING;

-- RLS
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;

-- Any authenticated user can read permissions
CREATE POLICY "Anyone can read role_permissions"
  ON role_permissions FOR SELECT
  TO authenticated
  USING (TRUE);

-- Only coordinators can update (via RPC below)
CREATE POLICY "Only coordenador can update role_permissions"
  ON role_permissions FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND system_role = 'coordenador'
    )
  );

-- RPC to update a specific permission cell (SECURITY DEFINER for safety)
CREATE OR REPLACE FUNCTION update_role_permission(
  p_role    TEXT,
  p_perm    TEXT,
  p_value   BOOLEAN
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_role TEXT;
BEGIN
  SELECT system_role INTO caller_role FROM user_profiles WHERE id = auth.uid();
  IF caller_role != 'coordenador' THEN
    RAISE EXCEPTION 'Apenas Coordenadores podem alterar permissões do sistema.';
  END IF;

  -- Coordenador always keeps all permissions
  IF p_role = 'coordenador' THEN
    RAISE EXCEPTION 'As permissões do Coordenador não podem ser alteradas.';
  END IF;

  EXECUTE format(
    'UPDATE role_permissions SET %I = $1, updated_at = NOW() WHERE role = $2',
    'can_' || p_perm
  ) USING p_value, p_role::system_role_enum;
END;
$$;

GRANT EXECUTE ON FUNCTION update_role_permission(TEXT, TEXT, BOOLEAN) TO authenticated;
