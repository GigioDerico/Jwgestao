-- Meeting response state is independent of notification visibility.
alter table public.member_assignment_notifications
  add column hidden_at timestamptz,
  add column decline_reason text,
  add column responded_at timestamptz,
  add column assignment_revision uuid,
  add column assignment_snapshot jsonb;

-- Internal normalized contract. Slot keys are accepted only from these explicit lists.
create or replace function private.resolve_meeting_assignment(
  p_source_type text, p_source_id uuid, p_slot_key text
) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  m jsonb;
  p jsonb;
  member_id uuid;
  partner_id uuid;
  partner_name text;
  meeting_kind text := 'midweek';
  role_label text;
  part_title text;
  part_number integer;
  part_time text;
  duration integer;
  location text;
  start_time text;
begin
  case p_source_type
    when 'midweek_meeting_role' then
      if p_slot_key is null or p_slot_key not in ('president_id', 'opening_prayer_id', 'closing_prayer_id',
        'treasure_talk_speaker_id', 'treasure_gems_speaker_id', 'treasure_reading_student_id', 'cbs_conductor_id', 'cbs_reader_id') then return null; end if;
      select to_jsonb(x) into m from public.midweek_meetings x where x.id = p_source_id;
      case p_slot_key
        when 'president_id' then role_label := 'Presidente'; part_time := m->>'opening_comments_time'; duration := (m->>'opening_comments_duration')::integer;
        when 'opening_prayer_id' then role_label := 'Oração inicial'; part_time := m->>'opening_song_time';
        when 'closing_prayer_id' then role_label := 'Oração final'; part_time := m->>'closing_song_time';
        when 'treasure_talk_speaker_id' then role_label := 'Tesouros da Palavra de Deus'; part_title := m->>'treasure_talk_title'; part_time := m->>'treasure_talk_time'; duration := (m->>'treasure_talk_duration')::integer;
        when 'treasure_gems_speaker_id' then role_label := 'Joias espirituais'; part_time := m->>'treasure_gems_time'; duration := (m->>'treasure_gems_duration')::integer;
        when 'treasure_reading_student_id' then role_label := 'Leitura da Bíblia'; part_title := m->>'bible_reading'; part_time := m->>'treasure_reading_time'; duration := (m->>'treasure_reading_duration')::integer; location := m->>'treasure_reading_room';
        when 'cbs_conductor_id' then role_label := 'Dirigente do estudo bíblico'; part_time := m->>'cbs_time'; duration := (m->>'cbs_duration')::integer; partner_id := (m->>'cbs_reader_id')::uuid;
        when 'cbs_reader_id' then role_label := 'Leitor do estudo bíblico'; part_time := m->>'cbs_time'; duration := (m->>'cbs_duration')::integer; partner_id := (m->>'cbs_conductor_id')::uuid;
      end case;
      member_id := (m->>p_slot_key)::uuid;
    when 'midweek_ministry_part' then
      if p_slot_key is null or p_slot_key not in ('student_id', 'assistant_id') then return null; end if;
      select to_jsonb(x) into p from public.midweek_ministry_parts x where x.id = p_source_id;
      select to_jsonb(x) into m from public.midweek_meetings x where x.id = (p->>'meeting_id')::uuid;
      member_id := (p->>p_slot_key)::uuid;
      role_label := case p_slot_key when 'student_id' then 'Estudante' else 'Ajudante' end;
      partner_id := (p->>case p_slot_key when 'student_id' then 'assistant_id' else 'student_id' end)::uuid;
      part_title := p->>'title'; part_number := (p->>'part_number')::integer;
      part_time := p->>'scheduled_time'; duration := (p->>'duration')::integer; location := p->>'room';
    when 'midweek_christian_life_part' then
      if p_slot_key is distinct from 'speaker_id' then return null; end if;
      select to_jsonb(x) into p from public.midweek_christian_life_parts x where x.id = p_source_id;
      select to_jsonb(x) into m from public.midweek_meetings x where x.id = (p->>'meeting_id')::uuid;
      member_id := (p->>'speaker_id')::uuid; role_label := 'Nossa Vida Cristã';
      part_title := p->>'title'; part_number := (p->>'part_number')::integer;
      part_time := p->>'scheduled_time'; duration := (p->>'duration')::integer;
    when 'weekend_meeting_role' then
      if p_slot_key is null or p_slot_key not in ('president_id', 'watchtower_conductor_id', 'watchtower_reader_id', 'closing_prayer_id') then return null; end if;
      select to_jsonb(x) into m from public.weekend_meetings x where x.id = p_source_id;
      meeting_kind := 'weekend';
      if coalesce((m->>'superintendent_visit')::boolean, false) and p_slot_key <> 'president_id' then return null; end if;
      member_id := (m->>p_slot_key)::uuid;
      case p_slot_key
        when 'president_id' then role_label := 'Presidente'; part_time := m->>'start_time';
        when 'watchtower_conductor_id' then role_label := 'Dirigente da Sentinela'; partner_id := (m->>'watchtower_reader_id')::uuid;
        when 'watchtower_reader_id' then role_label := 'Leitor da Sentinela'; partner_id := (m->>'watchtower_conductor_id')::uuid;
        when 'closing_prayer_id' then role_label := 'Oração final'; part_time := m->>'end_time';
      end case;
    else return null;
  end case;
  if m is null or member_id is null then return null; end if;
  -- Start configuration applies to the meeting start, never to an unknown part offset.
  select nullif(btrim(s.value), '') into start_time from public.app_settings s
    where s.key = meeting_kind || '_meeting_time';
  if start_time is not null and start_time !~ '^([01]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$' then start_time := null; end if;
  start_time := coalesce(case when meeting_kind = 'midweek' then m->>'opening_song_time' else m->>'start_time' end, start_time);
  if p_slot_key in ('president_id', 'opening_prayer_id') then part_time := coalesce(part_time, start_time); end if;
  select x.full_name into partner_name from public.members x where x.id = partner_id;
  return jsonb_build_object(
    'source_type', p_source_type, 'source_id', p_source_id, 'slot_key', p_slot_key,
    'member_id', member_id, 'meeting_id', m->>'id', 'meeting_kind', meeting_kind,
    'date', m->>'date', 'start_time', start_time, 'role_label', role_label,
    'title', coalesce(nullif(part_title, ''), role_label), 'part_number', part_number,
    'time', part_time, 'duration', duration, 'location', location,
    'partner_id', partner_id, 'partner_name', partner_name
  );
end;
$$;
revoke all on function private.resolve_meeting_assignment(text, uuid, text) from public, anon, authenticated, service_role;

-- Idempotent migration helper, also exercised by the legacy-row regression fixtures.
-- Recover only recorded evidence; current response state and version are preserved on reruns.
create or replace function private.backfill_meeting_assignment_responses()
returns void language plpgsql security definer set search_path = '' as $$
begin
  update public.member_assignment_notifications
  set hidden_at = coalesce(hidden_at, updated_at),
      status = case when revoked_at is not null then 'revoked'
                    when confirmed_at is not null then 'confirmed' else 'pending_confirmation' end
  where status = 'hidden';
  update public.member_assignment_notifications
  set responded_at = coalesce(responded_at, confirmed_at)
  where confirmed_at is not null and responded_at is null;

  -- Attach existing current records; creation and ongoing reconciliation belong to sync migration.
  with resolved as (
    select n.id, private.resolve_meeting_assignment(n.source_type, n.source_id, n.slot_key) as assignment
    from public.member_assignment_notifications n
    where n.source_type in ('midweek_meeting_role', 'midweek_ministry_part', 'midweek_christian_life_part', 'weekend_meeting_role')
  )
  update public.member_assignment_notifications n
  set assignment_revision = coalesce(n.assignment_revision, gen_random_uuid()),
      assignment_snapshot = coalesce(n.assignment_snapshot,
        case when r.assignment->>'member_id' = n.member_id::text then r.assignment else null end),
      status = case
        when r.assignment is null or r.assignment->>'member_id' <> n.member_id::text or n.revoked_at is not null or n.status = 'revoked' then 'revoked'
        when n.confirmed_at is not null then 'confirmed'
        when n.status = 'declined' then 'declined'
        else 'pending_confirmation' end,
      revoked_at = case
        when r.assignment is null or r.assignment->>'member_id' <> n.member_id::text or n.status = 'revoked'
          then coalesce(n.revoked_at, now()) else n.revoked_at end
  from resolved r where n.id = r.id;
end;
$$;
revoke all on function private.backfill_meeting_assignment_responses() from public, anon, authenticated, service_role;
select private.backfill_meeting_assignment_responses();

alter table public.member_assignment_notifications
  add constraint meeting_assignment_status_check check (
    source_type not in ('midweek_meeting_role', 'midweek_ministry_part', 'midweek_christian_life_part', 'weekend_meeting_role')
    or (status in ('pending_confirmation', 'confirmed', 'declined', 'revoked')
      and assignment_revision is not null
      and (status = 'revoked' or assignment_snapshot is not null)
      and (status <> 'pending_confirmation' or (responded_at is null and confirmed_at is null and decline_reason is null and revoked_at is null))
      and (status <> 'confirmed' or (confirmed_at is not null and responded_at is not null and responded_at = confirmed_at and decline_reason is null and revoked_at is null))
      and (status <> 'declined' or (responded_at is not null and confirmed_at is null and revoked_at is null and decline_reason is not null))
      and (status <> 'revoked' or revoked_at is not null))
  ),
  add constraint meeting_assignment_reason_check check (
    decline_reason is null or (char_length(decline_reason) between 1 and 500 and decline_reason ~ '[^[:space:]]')
  );

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
  if n.status <> 'pending_confirmation' then
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
revoke all on function private.respond_to_meeting_assignment(uuid, uuid, text, text) from public, anon, authenticated, service_role;
-- Required for the invoker wrapper; private schema is not exposed by the Data API.
-- This entry point verifies identity and permission even when invoked directly.
grant execute on function private.respond_to_meeting_assignment(uuid, uuid, text, text) to authenticated;
create or replace function public.respond_to_meeting_assignment(
  p_notification_id uuid, p_revision uuid, p_decision text, p_reason text default null
) returns jsonb language sql security invoker set search_path = '' as $$
  select private.respond_to_meeting_assignment(p_notification_id, p_revision, p_decision, p_reason);
$$;
revoke all on function public.respond_to_meeting_assignment(uuid, uuid, text, text) from public, anon, service_role;
grant execute on function public.respond_to_meeting_assignment(uuid, uuid, text, text) to authenticated;

-- Invoker trigger distinguishes direct client writes from trusted definer operations.
-- No client-settable GUC or JWT metadata is used as an authorization bypass.
create or replace function private.guard_meeting_notification_write() returns trigger
language plpgsql security invoker set search_path = '' as $$
declare
  meeting_row boolean;
begin
  if current_user not in ('authenticated', 'anon') then
    if tg_op = 'DELETE' then return old; end if;
    return new;
  end if;
  if tg_op = 'INSERT' then
    meeting_row := new.source_type in ('midweek_meeting_role', 'midweek_ministry_part', 'midweek_christian_life_part', 'weekend_meeting_role');
  elsif tg_op = 'DELETE' then
    meeting_row := old.source_type in ('midweek_meeting_role', 'midweek_ministry_part', 'midweek_christian_life_part', 'weekend_meeting_role');
  else
    meeting_row := old.source_type in ('midweek_meeting_role', 'midweek_ministry_part', 'midweek_christian_life_part', 'weekend_meeting_role')
      or new.source_type in ('midweek_meeting_role', 'midweek_ministry_part', 'midweek_christian_life_part', 'weekend_meeting_role');
  end if;
  if meeting_row then
    if tg_op <> 'UPDATE' then raise exception using errcode = '42501', message = 'meeting_assignment_direct_write_forbidden'; end if;
    if (to_jsonb(old) - array['is_read','read_at','hidden_at','updated_at']) is distinct from
       (to_jsonb(new) - array['is_read','read_at','hidden_at','updated_at']) then
      raise exception using errcode = '42501', message = 'meeting_assignment_direct_write_forbidden';
    end if;
  end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;
revoke all on function private.guard_meeting_notification_write() from public, anon, authenticated, service_role;
create trigger guard_meeting_notification_write before insert or update or delete
on public.member_assignment_notifications for each row execute function private.guard_meeting_notification_write();

-- Replace the permissive legacy policies, keeping their behavior for other categories.
drop policy "Allow own or admin read notifications" on public.member_assignment_notifications;
drop policy "Allow own or admin update notifications" on public.member_assignment_notifications;
drop policy "Allow own or admin insert notifications" on public.member_assignment_notifications;
create policy "Allow own or admin read notifications" on public.member_assignment_notifications
for select to authenticated using (
  exists (select 1 from public.user_profiles up where up.id = auth.uid() and up.is_active and (
    case when source_type in ('midweek_meeting_role', 'midweek_ministry_part', 'midweek_christian_life_part', 'weekend_meeting_role')
      then public.has_role_permission('can_view_assignments') and (up.member_id = member_assignment_notifications.member_id or up.system_role in ('coordenador','designador'))
      else up.member_id = member_assignment_notifications.member_id or up.system_role in ('coordenador','secretario','designador') end
  ))
);
create policy "Allow own or admin update notifications" on public.member_assignment_notifications
for update to authenticated using (
  exists (select 1 from public.user_profiles up where up.id = auth.uid() and up.is_active and (
    case when source_type in ('midweek_meeting_role', 'midweek_ministry_part', 'midweek_christian_life_part', 'weekend_meeting_role')
      then up.member_id = member_assignment_notifications.member_id and public.has_role_permission('can_view_assignments')
      else up.member_id = member_assignment_notifications.member_id or up.system_role in ('coordenador','secretario','designador') end
  ))
) with check (
  exists (select 1 from public.user_profiles up where up.id = auth.uid() and up.is_active and (
    case when source_type in ('midweek_meeting_role', 'midweek_ministry_part', 'midweek_christian_life_part', 'weekend_meeting_role')
      then up.member_id = member_assignment_notifications.member_id and public.has_role_permission('can_view_assignments')
      else up.member_id = member_assignment_notifications.member_id or up.system_role in ('coordenador','secretario','designador') end
  ))
);
create policy "Allow own or admin insert notifications" on public.member_assignment_notifications
for insert to authenticated with check (
  source_type not in ('midweek_meeting_role', 'midweek_ministry_part', 'midweek_christian_life_part', 'weekend_meeting_role')
  and exists (select 1 from public.user_profiles up where up.id = auth.uid() and up.is_active
    and (up.member_id = member_assignment_notifications.member_id or up.system_role in ('coordenador','secretario','designador')))
);
