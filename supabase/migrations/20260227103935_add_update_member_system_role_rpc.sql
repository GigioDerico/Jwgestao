-- Migration: Add RPC function to update a member's system_role
-- Uses SECURITY DEFINER so it runs with elevated privileges, bypassing RLS.
-- Only allows users with role 'coordenador' or 'secretario' to call it.

CREATE OR REPLACE FUNCTION update_member_system_role(
  p_member_id UUID,
  p_role TEXT
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_role TEXT;
BEGIN
  -- Get the calling user's system_role
  SELECT system_role INTO caller_role
  FROM user_profiles
  WHERE id = auth.uid();

  -- Only coordenador or secretario can change permissions
  IF caller_role NOT IN ('coordenador', 'secretario') THEN
    RAISE EXCEPTION 'Permissão negada: apenas Coordenadores e Secretários podem alterar permissões de acesso.';
  END IF;

  -- Execute the update bypassing RLS (SECURITY DEFINER)
  UPDATE user_profiles
  SET system_role = p_role::system_role_enum
  WHERE member_id = p_member_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Membro não encontrado ou sem perfil de acesso criado.';
  END IF;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION update_member_system_role(UUID, TEXT) TO authenticated;
