-- Migration: Fix Vertical Privilege Escalation on user_profiles
-- Prevents new users from assigning themselves administrative roles during signup

-- 1. Drop the insecure MVP policy
DROP POLICY IF EXISTS "Allow insert on user_profiles" ON public.user_profiles;

-- 2. Create the Secure Policy
-- A new user can only insert a profile with the 'publicador' role.
-- Only an existing admin (someone who has 'can_edit_members' permission) could insert higher roles directly.
CREATE POLICY "Secure insert on user_profiles"
ON public.user_profiles FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = id AND system_role = 'publicador'
  OR 
  public.has_role_permission('can_edit_members')
);

-- Note: 
-- 1. auth.uid() = id ensures a user cannot create a profile for someone else.
-- 2. system_role = 'publicador' ensures they get the lowest privilege by default.
-- 3. The OR clause allows an Admin to bypass if they are creating accounts for others.
