-- Personal reads are served through small RPCs so no meeting/member table reads are
-- needed by the publisher client. These helpers only return the caller's assignments.
create or replace function private.personal_assignment_actor()
returns uuid language plpgsql stable security definer set search_path = '' as $$
declare actor uuid;
begin
  if auth.uid() is null or not private.is_active_user()
     or not private.has_role_permission('can_view_assignments') then
    raise exception using errcode = '42501', message = 'personal_meeting_access_denied';
  end if;
  select up.member_id into actor from public.user_profiles up
  join public.members m on m.id = up.member_id
  where up.id = auth.uid() and up.is_active;
  if actor is null or exists(select 1 from public.member_transfers t
      where t.member_id = actor and t.cancelled_at is null) then
    raise exception using errcode = '42501', message = 'personal_meeting_access_denied';
  end if;
  return actor;
end;
$$;
revoke all on function private.personal_assignment_actor() from public, anon, service_role;
grant execute on function private.personal_assignment_actor() to authenticated;

create or replace function private.get_personal_meetings(p_period text)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare actor uuid; result jsonb; today date := (now() at time zone 'America/Sao_Paulo')::date;
begin
  actor := private.personal_assignment_actor();
  if p_period is null or p_period not in ('upcoming','past') then
    raise exception using errcode = '22023', message = 'personal_meeting_period_invalid';
  end if;
  with meetings as (
    select m.id, 'midweek'::text kind, m.date,
      coalesce(m.opening_song_time, nullif((select s.value from public.app_settings s where s.key='midweek_meeting_time'),'')) start_time
    from public.midweek_meetings m where (p_period='upcoming' and m.date >= today) or (p_period='past' and m.date < today)
    union all
    select m.id, 'weekend', m.date,
      coalesce(m.start_time, nullif((select s.value from public.app_settings s where s.key='weekend_meeting_time'),''))
    from public.weekend_meetings m where (p_period='upcoming' and m.date >= today) or (p_period='past' and m.date < today)
  ), rows as (
    select m.id,m.kind,m.date,m.start_time,counts.assignment_count,counts.pending_count
    from meetings m
    cross join lateral (
      select count(*)::integer assignment_count,
        count(*) filter(where coalesce((a.assignment->>'can_respond')::boolean,false))::integer pending_count
      from jsonb_array_elements(private.get_personal_meeting_assignments(m.kind,m.id)) as a(assignment)
    ) counts
  )
  select coalesce(jsonb_agg(jsonb_build_object('id',id,'kind',kind,'date',date,'start_time',start_time,
    'assignment_count',assignment_count,'pending_count',pending_count)
    order by case when p_period='past' then -extract(epoch from date::timestamp) else extract(epoch from date::timestamp) end), '[]'::jsonb)
  into result from rows;
  return result;
end;
$$;
revoke all on function private.get_personal_meetings(text) from public, anon, service_role;
grant execute on function private.get_personal_meetings(text) to authenticated;

create or replace function private.get_personal_meeting_assignments(p_kind text, p_meeting_id uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare actor uuid; today date := (now() at time zone 'America/Sao_Paulo')::date; result jsonb;
begin
  actor := private.personal_assignment_actor();
  if p_kind is null or p_kind not in ('midweek','weekend') then
    raise exception using errcode = '22023', message = 'personal_meeting_kind_invalid';
  end if;
  if (p_kind='midweek' and not exists(select 1 from public.midweek_meetings m where m.id=p_meeting_id))
    or (p_kind='weekend' and not exists(select 1 from public.weekend_meetings m where m.id=p_meeting_id)) then
    return '[]'::jsonb;
  end if;
  with slots(source_type,source_id,slot_key) as (
    select 'midweek_meeting_role',m.id,v.slot_key from public.midweek_meetings m
      cross join lateral (values ('president_id'),('opening_prayer_id'),('closing_prayer_id'),('treasure_talk_speaker_id'),
        ('treasure_gems_speaker_id'),('treasure_reading_student_id'),('cbs_conductor_id'),('cbs_reader_id')) v(slot_key)
      where p_kind='midweek' and m.id=p_meeting_id
    union all
    select 'midweek_ministry_part',p.id,v.slot_key from public.midweek_ministry_parts p
      cross join lateral (values ('student_id'),('assistant_id')) v(slot_key)
      where p_kind='midweek' and p.meeting_id=p_meeting_id
    union all
    select 'midweek_christian_life_part',p.id,'speaker_id' from public.midweek_christian_life_parts p
      where p_kind='midweek' and p.meeting_id=p_meeting_id
    union all
    select 'weekend_meeting_role',m.id,v.slot_key from public.weekend_meetings m
      cross join lateral (values ('president_id'),('watchtower_conductor_id'),('watchtower_reader_id'),('closing_prayer_id')) v(slot_key)
      where p_kind='weekend' and m.id=p_meeting_id
  ), resolved as (
    select s.source_type,s.source_id,s.slot_key,
      private.resolve_meeting_assignment(s.source_type,s.source_id,s.slot_key) assignment
    from slots s
  ), personal as (
    select r.source_type,r.source_id,r.slot_key,r.assignment,n.id notification_id,
      case when n.id is not null and (r.assignment->>'date')::date < today and n.assignment_snapshot is not null
        then n.assignment_snapshot else r.assignment end display_assignment,
      n.member_id,n.category,n.title notification_title,n.message,n.assignment_date,(r.assignment->>'date')::date source_date,n.status notification_status,
      n.is_read,n.created_at,n.confirmed_at,n.hidden_at,n.decline_reason,n.responded_at,n.assignment_revision revision
    from resolved r
    left join public.member_assignment_notifications n on n.source_type=r.source_type and n.source_id=r.source_id
      and n.slot_key=r.slot_key and n.member_id=actor
    where r.assignment->>'member_id'=actor::text
  ), historical as (
    select n.source_type,n.source_id,n.slot_key,n.assignment_snapshot assignment,
      n.id notification_id,n.assignment_snapshot display_assignment,
      n.member_id,n.category,n.title notification_title,n.message,n.assignment_date,(n.assignment_snapshot->>'date')::date source_date,n.status notification_status,
      n.is_read,n.created_at,n.confirmed_at,n.hidden_at,n.decline_reason,n.responded_at,n.assignment_revision revision
    from public.member_assignment_notifications n
    where n.member_id=actor and n.source_type in ('midweek_meeting_role','midweek_ministry_part','midweek_christian_life_part','weekend_meeting_role')
      and n.assignment_snapshot->>'meeting_kind'=p_kind
      and n.assignment_snapshot->>'meeting_id'=p_meeting_id::text
      and (n.assignment_snapshot->>'date')::date < today
      and not exists(select 1 from personal p where p.notification_id=n.id)
  ), legacy_history as (
    -- Preserve only evidence already recorded for this member when an old row
    -- has no safe snapshot. Do not resolve today's assignee into their history.
    select n.source_type,n.source_id,n.slot_key,null::jsonb assignment,n.id notification_id,
      jsonb_build_object('meeting_id',p_meeting_id,'meeting_kind',p_kind,'date',n.assignment_date,
        'role_label','Designação anterior','title',n.message,'part_number',null,'time',null,
        'duration',null,'location',null,'partner_name',null) display_assignment,
      n.member_id,n.category,n.title notification_title,n.message,n.assignment_date,n.assignment_date source_date,n.status notification_status,
      n.is_read,n.created_at,n.confirmed_at,n.hidden_at,n.decline_reason,n.responded_at,n.assignment_revision revision
    from public.member_assignment_notifications n
    where n.member_id=actor and n.source_type in ('midweek_meeting_role','midweek_ministry_part','midweek_christian_life_part','weekend_meeting_role')
      and n.assignment_snapshot is null and n.assignment_date < today
      and ((p_kind='midweek' and n.source_type='midweek_meeting_role' and n.source_id=p_meeting_id)
        or (p_kind='weekend' and n.source_type='weekend_meeting_role' and n.source_id=p_meeting_id)
        or (p_kind='midweek' and n.source_type='midweek_ministry_part' and exists(select 1 from public.midweek_ministry_parts p where p.id=n.source_id and p.meeting_id=p_meeting_id))
        or (p_kind='midweek' and n.source_type='midweek_christian_life_part' and exists(select 1 from public.midweek_christian_life_parts p where p.id=n.source_id and p.meeting_id=p_meeting_id)))
      and not exists(select 1 from personal p where p.notification_id=n.id)
  ), all_personal as (
    select * from personal union all select * from historical union all select * from legacy_history
  ), formatted as (
    select a.source_type,a.source_id,a.slot_key,a.notification_id,
      jsonb_build_object(
        'id',a.notification_id,'member_id',a.member_id,'category',a.category,'source_type',a.source_type,'source_id',a.source_id,
        'slot_key',a.slot_key,'title',a.notification_title,'message',a.message,'assignment_date',a.assignment_date,'status',a.notification_status,
        'is_read',a.is_read,'created_at',a.created_at,'confirmed_at',a.confirmed_at,'hidden_at',a.hidden_at,
        'decline_reason',a.decline_reason,'responded_at',a.responded_at,'assignment_revision',a.revision
      ) notification_json,
      a.display_assignment assignment_json,a.notification_status,a.revision,a.assignment_date,a.source_date
    from all_personal a
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'notification',case when f.notification_id is null then null else f.notification_json end,
    'revision',case when f.notification_id is null then null else f.revision end,
    'meeting_id',f.assignment_json->>'meeting_id','meeting_kind',f.assignment_json->>'meeting_kind',
    'date',f.assignment_json->>'date','role_label',f.assignment_json->>'role_label','title',f.assignment_json->>'title',
    'part_number',nullif(f.assignment_json->>'part_number','')::integer,'time',f.assignment_json->>'time',
    'duration',nullif(f.assignment_json->>'duration','')::integer,'location',f.assignment_json->>'location',
    'partner_name',f.assignment_json->>'partner_name',
    'can_respond',f.notification_id is not null and f.revision is not null and f.notification_status='pending_confirmation'
      and f.source_date>=today
  ) order by nullif(f.assignment_json->>'part_number','')::integer nulls first,
      f.assignment_json->>'time' nulls first, f.assignment_json->>'role_label'), '[]'::jsonb)
  into result from formatted f;
  return result;
end;
$$;
revoke all on function private.get_personal_meeting_assignments(text,uuid) from public, anon, service_role;
grant execute on function private.get_personal_meeting_assignments(text,uuid) to authenticated;

create or replace function private.resolve_personal_assignment(p_notification_id uuid,p_revision uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare actor uuid; n public.member_assignment_notifications%rowtype; assignment jsonb; meeting_id uuid; kind text; fresh_path text; detail jsonb;
begin
  actor := private.personal_assignment_actor();
  select * into n from public.member_assignment_notifications x where x.id=p_notification_id
    and x.source_type in ('midweek_meeting_role','midweek_ministry_part','midweek_christian_life_part','weekend_meeting_role');
  if not found or n.member_id<>actor then return jsonb_build_object('kind','unavailable'); end if;
  assignment := private.resolve_meeting_assignment(n.source_type,n.source_id,n.slot_key);
  meeting_id := coalesce((assignment->>'meeting_id')::uuid,(n.assignment_snapshot->>'meeting_id')::uuid);
  kind := coalesce(assignment->>'meeting_kind',n.assignment_snapshot->>'meeting_kind');
  if meeting_id is null or kind not in ('midweek','weekend') then return jsonb_build_object('kind','unavailable'); end if;
  if assignment is null or assignment->>'member_id'<>actor::text or n.status='revoked'
     or p_revision is null or n.assignment_revision is distinct from p_revision
     or n.assignment_snapshot is null
     or (n.assignment_snapshot-'partner_name') is distinct from (assignment-'partner_name') then
    if n.status<>'revoked' and assignment->>'member_id'=actor::text and n.assignment_revision is not null then
      fresh_path := '/assignments/meetings?assignment='||n.id::text||'&revision='||n.assignment_revision::text;
    else fresh_path := '/assignments/meetings'; end if;
    return jsonb_build_object('kind','changed','current_path',fresh_path);
  end if;
  select x.value into detail from jsonb_array_elements(private.get_personal_meeting_assignments(kind,meeting_id)) as x(value)
    where x.value->'notification'->>'id'=n.id::text and x.value->>'revision'=p_revision::text limit 1;
  if detail is null then return jsonb_build_object('kind','unavailable'); end if;
  return jsonb_build_object('kind','current','assignment',detail);
end;
$$;
revoke all on function private.resolve_personal_assignment(uuid,uuid) from public, anon, service_role;
grant execute on function private.resolve_personal_assignment(uuid,uuid) to authenticated;

create or replace function public.get_personal_meetings(p_period text)
returns jsonb language sql stable security invoker set search_path = '' as $$ select private.get_personal_meetings(p_period) $$;
create or replace function public.get_personal_meeting_assignments(p_kind text,p_meeting_id uuid)
returns jsonb language sql stable security invoker set search_path = '' as $$ select private.get_personal_meeting_assignments(p_kind,p_meeting_id) $$;
create or replace function public.resolve_personal_assignment(p_notification_id uuid,p_revision uuid)
returns jsonb language sql stable security invoker set search_path = '' as $$ select private.resolve_personal_assignment(p_notification_id,p_revision) $$;
revoke all on function public.get_personal_meetings(text) from public,anon,service_role;
revoke all on function public.get_personal_meeting_assignments(text,uuid) from public,anon,service_role;
revoke all on function public.resolve_personal_assignment(uuid,uuid) from public,anon,service_role;
grant execute on function public.get_personal_meetings(text) to authenticated;
grant execute on function public.get_personal_meeting_assignments(text,uuid) to authenticated;
grant execute on function public.resolve_personal_assignment(uuid,uuid) to authenticated;
