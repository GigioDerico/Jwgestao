-- Reconciliation is owned by the database, including legacy direct part writes.
create or replace function private.meeting_assignment_notification_text(p_assignment jsonb)
returns jsonb language sql immutable set search_path = '' as $$
  select jsonb_build_object(
    'title', case p_assignment->>'meeting_kind'
      when 'weekend' then 'Nova designação na reunião do fim de semana'
      else 'Nova designação na reunião do meio de semana' end,
    'message', 'Você foi designado para ' ||
      case p_assignment->>'source_type'
        when 'midweek_ministry_part' then (p_assignment->>'role_label') || ' em ' || (p_assignment->>'title')
        when 'midweek_christian_life_part' then p_assignment->>'title'
        else case p_assignment->>'slot_key' when 'treasure_talk_speaker_id' then p_assignment->>'title'
          else p_assignment->>'role_label' end end
      || ' em ' || to_char((p_assignment->>'date')::date, 'DD/MM') || '.');
$$;
revoke all on function private.meeting_assignment_notification_text(jsonb) from public, anon, authenticated, service_role;

create or replace function private.sync_meeting_assignment_notifications(p_kind text, p_meeting_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_assignment jsonb;
  v_notification public.member_assignment_notifications%rowtype;
  v_date date;
  v_today date := (clock_timestamp() at time zone 'America/Sao_Paulo')::date;
  v_now timestamptz := clock_timestamp();
  v_slots record;
  v_text jsonb;
begin
  if p_kind = 'midweek' then
    select date into v_date from public.midweek_meetings where id = p_meeting_id for update;
  elsif p_kind = 'weekend' then
    select date into v_date from public.weekend_meetings where id = p_meeting_id for update;
  else
    raise exception using errcode = '22023', message = 'meeting_assignment_kind_invalid';
  end if;

  -- Snapshots keep the parent identity after a part/header is removed. Legacy rows
  -- without snapshots are still found via their surviving source relationships.
  for v_notification in
    select n.* from public.member_assignment_notifications n
    where n.source_type in ('midweek_meeting_role','midweek_ministry_part','midweek_christian_life_part','weekend_meeting_role')
      and ((n.assignment_snapshot->>'meeting_kind' = p_kind and n.assignment_snapshot->>'meeting_id' = p_meeting_id::text)
        or (p_kind = 'midweek' and (
          (n.source_type = 'midweek_meeting_role' and n.source_id = p_meeting_id)
          or (n.source_type = 'midweek_ministry_part' and exists(select 1 from public.midweek_ministry_parts p where p.id = n.source_id and p.meeting_id = p_meeting_id))
          or (n.source_type = 'midweek_christian_life_part' and exists(select 1 from public.midweek_christian_life_parts p where p.id = n.source_id and p.meeting_id = p_meeting_id))))
        or (p_kind = 'weekend' and n.source_type = 'weekend_meeting_role' and n.source_id = p_meeting_id))
    order by n.id for update
  loop
    v_assignment := private.resolve_meeting_assignment(v_notification.source_type, v_notification.source_id, v_notification.slot_key);
    if v_assignment is null or v_assignment->>'member_id' <> v_notification.member_id::text
      or v_assignment->>'meeting_id' <> p_meeting_id::text then
      update public.member_assignment_notifications set status = 'revoked',
        revoked_at = coalesce(revoked_at, v_now), updated_at = v_now
      where id = v_notification.id and status <> 'revoked';
    end if;
  end loop;
  if v_date is null then return; end if;

  for v_slots in
    select 'midweek_meeting_role'::text as source_type, p_meeting_id as source_id, s.slot_key
    from unnest(array['president_id','opening_prayer_id','closing_prayer_id','treasure_talk_speaker_id',
      'treasure_gems_speaker_id','treasure_reading_student_id','cbs_conductor_id','cbs_reader_id']) s(slot_key)
    where p_kind = 'midweek'
    union all
    select 'midweek_ministry_part', p.id, s.slot_key from public.midweek_ministry_parts p
      cross join unnest(array['student_id','assistant_id']) s(slot_key)
      where p_kind = 'midweek' and p.meeting_id = p_meeting_id
    union all
    select 'midweek_christian_life_part', p.id, 'speaker_id' from public.midweek_christian_life_parts p
      where p_kind = 'midweek' and p.meeting_id = p_meeting_id
    union all
    select 'weekend_meeting_role', p_meeting_id, s.slot_key
      from unnest(array['president_id','watchtower_conductor_id','watchtower_reader_id','closing_prayer_id']) s(slot_key)
      where p_kind = 'weekend'
    order by source_type, source_id, slot_key
  loop
    v_assignment := private.resolve_meeting_assignment(v_slots.source_type, v_slots.source_id, v_slots.slot_key);
    if v_assignment is null then continue; end if;
    v_text := private.meeting_assignment_notification_text(v_assignment);
    select * into v_notification from public.member_assignment_notifications n
      where n.member_id = (v_assignment->>'member_id')::uuid and n.source_type = v_slots.source_type
        and n.source_id = v_slots.source_id and n.slot_key = v_slots.slot_key for update;
    if not found then
      -- Historical assignments without evidence stay without a notification.
      if v_date < v_today then continue; end if;
      insert into public.member_assignment_notifications(member_id, source_type, source_id, slot_key,
        category, assignment_date, title, message, assignment_revision, assignment_snapshot)
      values((v_assignment->>'member_id')::uuid, v_slots.source_type, v_slots.source_id, v_slots.slot_key,
        p_kind, v_date, v_text->>'title', v_text->>'message', gen_random_uuid(), v_assignment);
    elsif v_date >= v_today and (v_notification.status = 'revoked'
      or (v_notification.assignment_snapshot - 'partner_name') is distinct from (v_assignment - 'partner_name')) then
      update public.member_assignment_notifications set assignment_snapshot = v_assignment,
        assignment_revision = gen_random_uuid(), assignment_date = v_date,
        title = v_text->>'title', message = v_text->>'message', status = 'pending_confirmation',
        confirmed_at = null, responded_at = null, decline_reason = null, revoked_at = null,
        hidden_at = null, is_read = false, read_at = null, updated_at = v_now
      where id = v_notification.id;
    end if;
    -- A historical snapshot/response is retained even if the live program changes.
    -- Display-name-only changes do not touch response, visibility or revision.
  end loop;
end;
$$;
revoke all on function private.sync_meeting_assignment_notifications(text, uuid) from public, anon, authenticated, service_role;

-- A BEFORE ROW trigger is too late for UPDATE/DELETE: the child tuple is already
-- locked. Lock parents before the statement instead, including header writes so
-- the old header-then-parts frontend path never starts with a higher UUID lock.
-- Conservative installation-wide locking is intentional until all edits use RPCs.
create or replace function private.lock_meeting_assignment_scope() returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform id from public.midweek_meetings order by id for update;
  perform id from public.weekend_meetings order by id for update;
end;
$$;
revoke all on function private.lock_meeting_assignment_scope() from public, anon, authenticated, service_role;

create or replace function private.lock_meeting_assignment_parents() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  perform private.lock_meeting_assignment_scope();
  return null;
end;
$$;
revoke all on function private.lock_meeting_assignment_parents() from public, anon, authenticated, service_role;

create or replace function private.sync_meeting_assignment_source() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_kind text := case when tg_table_name = 'weekend_meetings' then 'weekend' else 'midweek' end;
  v_old_id uuid;
  v_new_id uuid;
begin
  if tg_op <> 'INSERT' then
    v_old_id := (to_jsonb(old)->>case when tg_table_name in ('midweek_meetings','weekend_meetings') then 'id' else 'meeting_id' end)::uuid;
  end if;
  if tg_op <> 'DELETE' then
    v_new_id := (to_jsonb(new)->>case when tg_table_name in ('midweek_meetings','weekend_meetings') then 'id' else 'meeting_id' end)::uuid;
  end if;
  if v_old_id is not null then perform private.sync_meeting_assignment_notifications(v_kind, v_old_id); end if;
  if v_new_id is not null and v_new_id is distinct from v_old_id then
    perform private.sync_meeting_assignment_notifications(v_kind, v_new_id);
  end if;
  return null;
end;
$$;
revoke all on function private.sync_meeting_assignment_source() from public, anon, authenticated, service_role;

create or replace function private.sync_meeting_assignment_settings() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_midweek boolean := false;
  v_weekend boolean := false;
  v_id uuid;
begin
  if tg_op <> 'INSERT' then
    v_midweek := old.key = 'midweek_meeting_time'; v_weekend := old.key = 'weekend_meeting_time';
  end if;
  if tg_op <> 'DELETE' then
    v_midweek := v_midweek or new.key = 'midweek_meeting_time';
    v_weekend := v_weekend or new.key = 'weekend_meeting_time';
  end if;
  if v_midweek then
    for v_id in select id from public.midweek_meetings order by id loop
      perform private.sync_meeting_assignment_notifications('midweek', v_id);
    end loop;
  end if;
  if v_weekend then
    for v_id in select id from public.weekend_meetings order by id loop
      perform private.sync_meeting_assignment_notifications('weekend', v_id);
    end loop;
  end if;
  return null;
end;
$$;
revoke all on function private.sync_meeting_assignment_settings() from public, anon, authenticated, service_role;

create trigger lock_meeting_assignment_parents before insert or update or delete on public.midweek_meetings
for each statement execute function private.lock_meeting_assignment_parents();
create trigger lock_meeting_assignment_parents before insert or update or delete on public.weekend_meetings
for each statement execute function private.lock_meeting_assignment_parents();
create trigger lock_meeting_assignment_parents before insert or update or delete on public.midweek_ministry_parts
for each statement execute function private.lock_meeting_assignment_parents();
create trigger lock_meeting_assignment_parents before insert or update or delete on public.midweek_christian_life_parts
for each statement execute function private.lock_meeting_assignment_parents();
create trigger lock_meeting_assignment_parents before insert or update or delete on public.app_settings
for each statement execute function private.lock_meeting_assignment_parents();

create trigger sync_meeting_assignment_source after insert or update or delete on public.midweek_meetings
for each row execute function private.sync_meeting_assignment_source();
create trigger sync_meeting_assignment_source after insert or update or delete on public.weekend_meetings
for each row execute function private.sync_meeting_assignment_source();
create trigger sync_meeting_assignment_source after insert or update or delete on public.midweek_ministry_parts
for each row execute function private.sync_meeting_assignment_source();
create trigger sync_meeting_assignment_source after insert or update or delete on public.midweek_christian_life_parts
for each row execute function private.sync_meeting_assignment_source();
create trigger sync_meeting_assignment_settings after insert or update or delete on public.app_settings
for each row execute function private.sync_meeting_assignment_settings();

-- Existing versions/evidence were attached by Task 1. Fill missing upcoming rows
-- and revoke only assignments whose recipient/source no longer matches.
create or replace function private.backfill_meeting_assignment_notifications() returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_ref record;
  v_assignment jsonb;
  v_text jsonb;
begin
  perform private.lock_meeting_assignment_scope();
  -- Evidence normalization/attachment is idempotent and does not reactivate
  -- proven revocations. Backfill must not simulate a live re-assignment event.
  perform private.backfill_meeting_assignment_responses();
  for v_ref in
    select 'midweek_meeting_role'::text as source_type, m.id as source_id, s.slot_key
      from public.midweek_meetings m cross join unnest(array['president_id','opening_prayer_id','closing_prayer_id',
        'treasure_talk_speaker_id','treasure_gems_speaker_id','treasure_reading_student_id','cbs_conductor_id','cbs_reader_id']) s(slot_key)
    union all
    select 'midweek_ministry_part', p.id, s.slot_key from public.midweek_ministry_parts p
      cross join unnest(array['student_id','assistant_id']) s(slot_key)
    union all
    select 'midweek_christian_life_part', p.id, 'speaker_id' from public.midweek_christian_life_parts p
    union all
    select 'weekend_meeting_role', m.id, s.slot_key from public.weekend_meetings m
      cross join unnest(array['president_id','watchtower_conductor_id','watchtower_reader_id','closing_prayer_id']) s(slot_key)
    order by source_type, source_id, slot_key
  loop
    v_assignment := private.resolve_meeting_assignment(v_ref.source_type, v_ref.source_id, v_ref.slot_key);
    if v_assignment is null or (v_assignment->>'date')::date < (clock_timestamp() at time zone 'America/Sao_Paulo')::date then continue; end if;
    v_text := private.meeting_assignment_notification_text(v_assignment);
    insert into public.member_assignment_notifications(member_id, source_type, source_id, slot_key,
      category, assignment_date, title, message, assignment_revision, assignment_snapshot)
    values((v_assignment->>'member_id')::uuid, v_ref.source_type, v_ref.source_id, v_ref.slot_key,
      v_assignment->>'meeting_kind', (v_assignment->>'date')::date,
      v_text->>'title', v_text->>'message', gen_random_uuid(), v_assignment)
    on conflict (member_id, source_type, source_id, slot_key) do nothing;
  end loop;
end;
$$;
revoke all on function private.backfill_meeting_assignment_notifications() from public, anon, authenticated, service_role;
select private.backfill_meeting_assignment_notifications();
