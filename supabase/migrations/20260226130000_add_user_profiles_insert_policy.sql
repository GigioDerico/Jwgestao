-- Allow insert into user_profiles and member_privileges for MVP (needed when creating members)
DROP POLICY IF EXISTS "Allow insert on user_profiles" ON public.user_profiles;
CREATE POLICY "Allow insert on user_profiles" ON public.user_profiles
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow insert on member_privileges" ON public.member_privileges;
CREATE POLICY "Allow insert on member_privileges" ON public.member_privileges
  FOR INSERT WITH CHECK (true);

