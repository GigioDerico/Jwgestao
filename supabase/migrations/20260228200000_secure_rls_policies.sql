-- Migration: Drop wide open RLS and implement secure RBAC policies
-- Fixes Critical Vulnerability: "Broken Access Control"

-- 1. Drop overly permissive MVP policies
DROP POLICY IF EXISTS "Allow public read access on members" ON public.members;
DROP POLICY IF EXISTS "Allow public insert access on members" ON public.members;
DROP POLICY IF EXISTS "Allow public update access on members" ON public.members;
DROP POLICY IF EXISTS "Allow public delete access on members" ON public.members;

DROP POLICY IF EXISTS "Allow public read access on field_service_groups" ON public.field_service_groups;
DROP POLICY IF EXISTS "Allow public read access on member_privileges" ON public.member_privileges;
DROP POLICY IF EXISTS "Allow public read access on user_profiles" ON public.user_profiles;

DROP POLICY IF EXISTS "Allow public read access on midweek_meetings" ON public.midweek_meetings;
DROP POLICY IF EXISTS "Allow public read access on midweek_ministry_parts" ON public.midweek_ministry_parts;
DROP POLICY IF EXISTS "Allow public read access on midweek_christian_life_parts" ON public.midweek_christian_life_parts;
DROP POLICY IF EXISTS "Allow public read access on weekend_meetings" ON public.weekend_meetings;

-- 2. Create Security Definer Helper Function to avoid infinite RLS loops
-- When user_profiles RLS queries user_profiles to know the role, it would loop forever.
-- A SECURITY DEFINER function runs as the table owner and bypasses RLS natively.
CREATE OR REPLACE FUNCTION public.has_role_permission(required_permission text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_role public.system_role_enum;
  v_has_perm boolean;
BEGIN
  -- Get the system_role of the current authenticated user directly
  SELECT system_role INTO v_user_role
  FROM public.user_profiles
  WHERE id = auth.uid();
  
  IF v_user_role IS NULL THEN
    RETURN false;
  END IF;

  -- Check if the role has the requested permission
  EXECUTE format('SELECT %I FROM public.role_permissions WHERE role = $1', required_permission)
  INTO v_has_perm
  USING v_user_role;
  
  RETURN COALESCE(v_has_perm, false);
END;
$$;

GRANT EXECUTE ON FUNCTION public.has_role_permission(text) TO authenticated;

-- 3. Replace Policies for Members
CREATE POLICY "Users can view their own member record or if they have permission"
  ON public.members FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND member_id = members.id) OR
    public.has_role_permission('can_view_members')
  );

CREATE POLICY "Users with permission can insert members"
  ON public.members FOR INSERT TO authenticated
  WITH CHECK (public.has_role_permission('can_create_members'));

CREATE POLICY "Users with permission can update members, users can update themselves partially"
  ON public.members FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND member_id = members.id) OR
    public.has_role_permission('can_edit_members')
  );

CREATE POLICY "Users with permission can delete members"
  ON public.members FOR DELETE TO authenticated
  USING (public.has_role_permission('can_edit_members'));

-- 4. Replace Policies for Field Service Groups
CREATE POLICY "Users with permission can view field service groups"
  ON public.field_service_groups FOR SELECT TO authenticated
  USING (public.has_role_permission('can_view_members'));

-- 5. Replace Policies for Member Privileges
CREATE POLICY "Users can view their own privileges or if they have view_members permission"
  ON public.member_privileges FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND member_id = member_privileges.member_id) OR
    public.has_role_permission('can_view_members')
  );

-- 6. Replace Policies for User Profiles
CREATE POLICY "Users can view their own profile or if they have permissions"
  ON public.user_profiles FOR SELECT TO authenticated
  USING (
    id = auth.uid() OR
    public.has_role_permission('can_view_members')
  );

-- 7. Replace Policies for Meetings
CREATE POLICY "Users can view midweek meetings if permitted"
  ON public.midweek_meetings FOR SELECT TO authenticated
  USING (public.has_role_permission('can_view_meetings'));

CREATE POLICY "Users can edit midweek meetings if permitted"
  ON public.midweek_meetings FOR ALL TO authenticated
  USING (public.has_role_permission('can_edit_assignments'))
  WITH CHECK (public.has_role_permission('can_edit_assignments'));

-- Midweek Ministry Parts
CREATE POLICY "Users can view midweek ministry parts if permitted"
  ON public.midweek_ministry_parts FOR SELECT TO authenticated
  USING (public.has_role_permission('can_view_meetings'));

CREATE POLICY "Users can edit midweek ministry parts if permitted"
  ON public.midweek_ministry_parts FOR ALL TO authenticated
  USING (public.has_role_permission('can_edit_assignments'))
  WITH CHECK (public.has_role_permission('can_edit_assignments'));

-- Midweek Christian Life Parts
CREATE POLICY "Users can view midweek christian life parts if permitted"
  ON public.midweek_christian_life_parts FOR SELECT TO authenticated
  USING (public.has_role_permission('can_view_meetings'));

CREATE POLICY "Users can edit midweek christian life parts if permitted"
  ON public.midweek_christian_life_parts FOR ALL TO authenticated
  USING (public.has_role_permission('can_edit_assignments'))
  WITH CHECK (public.has_role_permission('can_edit_assignments'));
  
-- Weekend Meetings
CREATE POLICY "Users can view weekend meetings if permitted"
  ON public.weekend_meetings FOR SELECT TO authenticated
  USING (public.has_role_permission('can_view_meetings'));

CREATE POLICY "Users can edit weekend meetings if permitted"
  ON public.weekend_meetings FOR ALL TO authenticated
  USING (public.has_role_permission('can_edit_assignments'))
  WITH CHECK (public.has_role_permission('can_edit_assignments'));
