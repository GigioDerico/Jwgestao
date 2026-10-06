-- Allow participants to reconsider a refusal while retaining ownership, revision and date checks.
create or replace function private.respond_to_meeting_assignment(
  p_notification_id uuid, p_revision uuid, p_decision text, p_reason text default null
) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  n public.member_assignment_notifications%rowtype;
  actor_member_id uuid;
  resolution jsonb;
  locked_meeting_id uuid;
  reason text;
  v_response_time timestamptz;
begin
  if auth.uid() is null or not private.is_active_user() or not private.has_role_permission('can_view_assignments') then
    raise exception using errcode = '42501', message = 'meeting_assignment_access_denied';
  end if;
  select up.member_id into actor_member_id from public.user_profiles up where up.id = auth.uid() and up.is_active;
  if actor_member_id is null or exists(select 1 from public.member_transfers t where t.member_id = actor_member_id and t.cancelled_at is null) then
    raise exception using errcode = '42501', message = 'meeting_assignment_access_denied';
  end if;
  select * into n from public.member_assignment_notifications where id = p_notification_id;
  if not found or n.member_id <> actor_member_id or n.source_type not in ('midweek_meeting_role', 'midweek_ministry_part', 'midweek_christian_life_part', 'weekend_meeting_role') then
    raise exception using errcode = '42501', message = 'meeting_assignment_unavailable';
  end if;
  resolution := private.resolve_meeting_assignment(n.source_type, n.source_id, n.slot_key);
  if resolution is null then raise exception using errcode = '42501', message = 'meeting_assignment_unavailable'; end if;
  locked_meeting_id := (resolution->>'meeting_id')::uuid;
  -- All writers of meeting assignments must acquire this parent lock first.
  if resolution->>'meeting_kind' = 'weekend' then
    perform 1 from public.weekend_meetings where id = locked_meeting_id for update;
  else
    perform 1 from public.midweek_meetings where id = locked_meeting_id for update;
  end if;
  if not found then raise exception using errcode = '42501', message = 'meeting_assignment_unavailable'; end if;
  select * into n from public.member_assignment_notifications where id = p_notification_id for update;
  if not found or n.member_id <> actor_member_id then raise exception using errcode = '42501', message = 'meeting_assignment_unavailable'; end if;
  resolution := private.resolve_meeting_assignment(n.source_type, n.source_id, n.slot_key);
  if resolution is null or resolution->>'member_id' <> actor_member_id::text or resolution->>'meeting_id' <> locked_meeting_id::text or n.status = 'revoked' then
    raise exception using errcode = '42501', message = 'meeting_assignment_unavailable';
  end if;
  if p_revision is null or n.assignment_revision is distinct from p_revision
    or (n.assignment_snapshot - 'partner_name') is distinct from (resolution - 'partner_name') then
    raise exception using errcode = '40001', message = 'meeting_assignment_revision_conflict';
  end if;
  if p_decision is null or p_decision not in ('confirmed', 'declined') then
    raise exception using errcode = '22023', message = 'meeting_assignment_decision_invalid';
  end if;
  if p_decision = 'declined' then
    if p_reason is null or char_length(p_reason) > 500 or p_reason !~ '[^[:space:]]' then
      raise exception using errcode = '22023', message = 'meeting_assignment_reason_invalid';
    end if;
    reason := regexp_replace(p_reason, '^[[:space:]]+|[[:space:]]+$', '', 'g');
  elsif p_reason is not null and p_reason ~ '[^[:space:]]' then
    raise exception using errcode = '22023', message = 'meeting_assignment_reason_invalid';
  end if;
  -- A retry of an already saved response performs no mutation, even after midnight.
  if n.status = p_decision and n.decline_reason is not distinct from reason then return to_jsonb(n); end if;
  if (resolution->>'date')::date < (clock_timestamp() at time zone 'America/Sao_Paulo')::date then
    raise exception using errcode = '22023', message = 'meeting_assignment_past';
  end if;
  if n.status <> 'pending_confirmation' and not (n.status = 'declined' and p_decision = 'confirmed') then
    raise exception using errcode = '40001', message = 'meeting_assignment_response_conflict';
  end if;
  v_response_time := clock_timestamp();
  update public.member_assignment_notifications set
    status = p_decision, decline_reason = reason, responded_at = v_response_time,
    confirmed_at = case when p_decision = 'confirmed' then v_response_time else null end,
    is_read = true, read_at = coalesce(read_at, v_response_time), updated_at = v_response_time
  where id = p_notification_id returning * into n;
  return to_jsonb(n);
end;
$$;

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
      coalesce(m.opening_song_time::text, nullif((select s.value from public.app_settings s where s.key='midweek_meeting_time'),'')) start_time
    from public.midweek_meetings m where (p_period='upcoming' and m.date >= today) or (p_period='past' and m.date < today)
    union all
    select m.id, 'weekend', m.date,
      nullif((select s.value from public.app_settings s where s.key='weekend_meeting_time'),'')
    from public.weekend_meetings m where (p_period='upcoming' and m.date >= today) or (p_period='past' and m.date < today)
  ), rows as (
    select m.id,m.kind,m.date,m.start_time,counts.assignment_count,counts.pending_count
    from meetings m
    cross join lateral (
      select count(*)::integer assignment_count,
        count(*) filter(where coalesce((a.assignment->>'can_respond')::boolean,false) and a.assignment->'notification'->>'status'='pending_confirmation')::integer pending_count
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
    'can_respond',f.notification_id is not null and f.revision is not null and f.notification_status in ('pending_confirmation','declined')
      and f.source_date>=today
  ) order by nullif(f.assignment_json->>'part_number','')::integer nulls first,
      f.assignment_json->>'time' nulls first, f.assignment_json->>'role_label'), '[]'::jsonb)
  into result from formatted f;
  return result;
end;
$$;
revoke all on function private.get_personal_meeting_assignments(text,uuid) from public, anon, service_role;
grant execute on function private.get_personal_meeting_assignments(text,uuid) to authenticated;
