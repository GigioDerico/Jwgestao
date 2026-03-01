-- Migration: Add Admin Reset Password RPC
-- Description: Creates a Security Definer function allowing authorized admins to reset a user's password to a known temp value to generate Magic Links on-demand.

CREATE OR REPLACE FUNCTION public.admin_reset_user_password(target_auth_id uuid, target_member_id uuid, temp_password text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_has_perm boolean;
BEGIN
  -- 1. Check if the executing user has permission to edit members
  SELECT public.has_role_permission('can_edit_members') INTO v_has_perm;
  
  IF NOT COALESCE(v_has_perm, false) THEN
    RAISE EXCEPTION 'Acesso negado: Você não tem permissão para editar membros.';
  END IF;

  -- 2. Check if the target member actually matches the target auth id to prevent arbitrary overrides
  IF NOT EXISTS (
    SELECT 1 FROM public.user_profiles 
    WHERE id = target_auth_id AND member_id = target_member_id
  ) THEN
    RAISE EXCEPTION 'Membro não encontrado ou vínculo de autenticação inválido.';
  END IF;

  -- 3. Update the password in auth.users (Requires SECURITY DEFINER running as postgres)
  -- Note: Updating auth.users directly is generally discouraged, but in early Supabase instances
  -- where the admin API is not exposed via Edge Functions, this is a common workaround.
  UPDATE auth.users
  SET encrypted_password = crypt(temp_password, gen_salt('bf'))
  WHERE id = target_auth_id;

  RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_reset_user_password(uuid, uuid, text) TO authenticated;
