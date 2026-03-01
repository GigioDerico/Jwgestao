-- Allow authenticated users to view only their own field service group.
-- This keeps the full list restricted to roles with can_view_members,
-- while letting regular publishers see their assigned group name in the profile.

DROP POLICY IF EXISTS "Users with permission can view field service groups" ON public.field_service_groups;

CREATE POLICY "Users can view their own field service group or if permitted"
  ON public.field_service_groups FOR SELECT TO authenticated
  USING (
    public.has_role_permission('can_view_members')
    OR EXISTS (
      SELECT 1
      FROM public.user_profiles up
      JOIN public.members m ON m.id = up.member_id
      WHERE up.id = auth.uid()
        AND m.group_id = field_service_groups.id
    )
  );
