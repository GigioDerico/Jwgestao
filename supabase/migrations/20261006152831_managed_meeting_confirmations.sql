create or replace function private.get_meeting_assignment_responses(p_kind text, p_meeting_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare result jsonb;
begin
  if p_kind is null or p_kind not in ('midweek', 'weekend') or p_meeting_id is null
     or auth.uid() is null or not private.is_active_user()
     or not public.has_role_permission('can_view_assignments')
     or not exists (
       select 1 from public.user_profiles up
       where up.id = auth.uid() and up.is_active and up.system_role in ('coordenador', 'designador')
     ) then
    raise exception using errcode = '42501', message = 'meeting_assignment_responses_forbidden';
  end if;

  if (p_kind = 'midweek' and not exists (select 1 from public.midweek_meetings m where m.id = p_meeting_id))
     or (p_kind = 'weekend' and not exists (select 1 from public.weekend_meetings m where m.id = p_meeting_id)) then
    return '[]'::jsonb;
  end if;

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'notification', to_jsonb(n),
      'member_name', member.full_name,
      'role_label', coalesce(n.assignment_snapshot->>'role_label', n.title),
      'assignment_title', coalesce(n.assignment_snapshot->>'title', n.title),
      'part_number', n.assignment_snapshot->'part_number'
    ) order by coalesce((n.assignment_snapshot->>'part_number')::integer, 0), n.slot_key, member.full_name
  ), '[]'::jsonb)
  into result
  from public.member_assignment_notifications n
  join public.members member on member.id = n.member_id
  cross join lateral (
    select private.resolve_meeting_assignment(n.source_type, n.source_id, n.slot_key) as current_assignment
  ) resolved
  where n.source_type in ('midweek_meeting_role', 'midweek_ministry_part', 'midweek_christian_life_part', 'weekend_meeting_role','audio_video_role')
    and n.status <> 'revoked'
    and resolved.current_assignment->>'member_id' = n.member_id::text
    and resolved.current_assignment->>'meeting_id' = p_meeting_id::text
    and resolved.current_assignment->>'meeting_kind'=p_kind;

  return result;
end;
$$;


revoke all on function private.get_meeting_assignment_responses(text,uuid) from public,anon,service_role;
grant execute on function private.get_meeting_assignment_responses(text,uuid) to authenticated;
create or replace function public.get_meeting_assignment_responses(p_kind text,p_meeting_id uuid) returns jsonb
language sql stable security invoker set search_path='' as $$
  select private.get_meeting_assignment_responses(p_kind,p_meeting_id);
$$;
revoke all on function public.get_meeting_assignment_responses(text,uuid) from public,anon,service_role;
grant execute on function public.get_meeting_assignment_responses(text,uuid) to authenticated;

create or replace function private.get_managed_meeting_confirmations(p_month date) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare result jsonb;
begin
  if auth.uid() is null or not private.is_active_user() or not private.has_role_permission('can_view_assignments')
    or not exists(select 1 from public.user_profiles where id=auth.uid() and is_active and system_role in ('coordenador','designador')) then
    raise exception using errcode='42501',message='meeting_assignment_responses_forbidden';
  end if;
  if p_month is null or extract(day from p_month)<>1 then
    raise exception using errcode='22023',message='meeting_confirmations_month_invalid';
  end if;
  with meetings as (
    select id,'midweek'::text kind,date from public.midweek_meetings where date>=p_month and date<(p_month+interval '1 month')::date
    union all select id,'weekend',date from public.weekend_meetings where date>=p_month and date<(p_month+interval '1 month')::date
  )
  select coalesce(jsonb_agg(jsonb_build_object('id',id,'kind',kind,'date',date,
    'responses',private.get_meeting_assignment_responses(kind,id)) order by date,kind,id),'[]'::jsonb)
  into result from meetings;
  return result;
end $$;
revoke all on function private.get_managed_meeting_confirmations(date) from public,anon,service_role;
grant execute on function private.get_managed_meeting_confirmations(date) to authenticated;
create or replace function public.get_managed_meeting_confirmations(p_month date) returns jsonb
language sql stable security invoker set search_path='' as $$ select private.get_managed_meeting_confirmations(p_month); $$;
revoke all on function public.get_managed_meeting_confirmations(date) from public,anon,service_role;
grant execute on function public.get_managed_meeting_confirmations(date) to authenticated;
