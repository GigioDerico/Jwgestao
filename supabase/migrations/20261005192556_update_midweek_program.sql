create or replace function public.update_midweek_program(p_meeting_id uuid, p_input jsonb)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_meeting public.midweek_meetings%rowtype;
  v_entry jsonb;
  v_id uuid;
  v_retained_ids uuid[];
  v_index integer;
  v_allowed_keys text[] := array[
    'date','bible_reading','president_id','opening_prayer_id','closing_prayer_id',
    'opening_song','opening_song_time','opening_comments_time','opening_comments_duration',
    'middle_song','middle_song_time','closing_song','closing_song_time','treasure_talk_title',
    'treasure_talk_time','treasure_talk_duration','treasure_talk_speaker_id','treasure_gems_time',
    'treasure_gems_duration','treasure_gems_speaker_id','treasure_reading_time',
    'treasure_reading_duration','treasure_reading_student_id','treasure_reading_room','cbs_time',
    'cbs_duration','cbs_conductor_id','cbs_reader_id','superintendent_visit',
    'superintendent_discourse_theme','superintendent_discourse_speaker','closing_comments_time',
    'closing_comments_duration','ministry_parts','christian_life_parts'
  ];
begin
  if (select auth.uid()) is null or not private.is_active_user()
     or not private.has_role_permission('can_edit_assignments')
     or not exists (
       select 1 from public.user_profiles up
       where up.id = (select auth.uid()) and up.system_role in ('coordenador','designador')
     ) then
    raise exception using errcode = '42501', message = 'meeting_assignment_access_denied';
  end if;

  if p_meeting_id is null or p_input is null or pg_catalog.jsonb_typeof(p_input) <> 'object' then
    raise exception using errcode = '22023', message = 'meeting_program_input_invalid';
  end if;

  if exists (
    select 1 from pg_catalog.jsonb_object_keys(p_input) as fields(field_name)
    where fields.field_name <> all (v_allowed_keys)
  ) then
    raise exception using errcode = '22023', message = 'meeting_program_field_invalid';
  end if;

  if pg_catalog.jsonb_typeof(p_input->'ministry_parts') is distinct from 'array'
     or pg_catalog.jsonb_typeof(p_input->'christian_life_parts') is distinct from 'array' then
    raise exception using errcode = '22023', message = 'meeting_program_parts_invalid';
  end if;

  -- The sync triggers use this same deterministic installation-wide order:
  -- every midweek parent UUID, then every weekend parent UUID.
  perform private.lock_meeting_assignment_scope();
  select * into v_meeting from public.midweek_meetings where id = p_meeting_id for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'meeting_not_found';
  end if;

  update public.midweek_meetings set
    date = (p_input->>'date')::date,
    bible_reading = p_input->>'bible_reading',
    president_id = nullif(p_input->>'president_id','')::uuid,
    opening_prayer_id = nullif(p_input->>'opening_prayer_id','')::uuid,
    closing_prayer_id = nullif(p_input->>'closing_prayer_id','')::uuid,
    opening_song = nullif(p_input->>'opening_song','')::integer,
    opening_song_time = nullif(p_input->>'opening_song_time','')::time,
    opening_comments_time = nullif(p_input->>'opening_comments_time','')::time,
    opening_comments_duration = nullif(p_input->>'opening_comments_duration','')::integer,
    middle_song = nullif(p_input->>'middle_song','')::integer,
    middle_song_time = nullif(p_input->>'middle_song_time','')::time,
    closing_song = nullif(p_input->>'closing_song','')::integer,
    closing_song_time = nullif(p_input->>'closing_song_time','')::time,
    treasure_talk_title = nullif(p_input->>'treasure_talk_title',''),
    treasure_talk_time = nullif(p_input->>'treasure_talk_time','')::time,
    treasure_talk_duration = nullif(p_input->>'treasure_talk_duration','')::integer,
    treasure_talk_speaker_id = nullif(p_input->>'treasure_talk_speaker_id','')::uuid,
    treasure_gems_time = nullif(p_input->>'treasure_gems_time','')::time,
    treasure_gems_duration = nullif(p_input->>'treasure_gems_duration','')::integer,
    treasure_gems_speaker_id = nullif(p_input->>'treasure_gems_speaker_id','')::uuid,
    treasure_reading_time = nullif(p_input->>'treasure_reading_time','')::time,
    treasure_reading_duration = nullif(p_input->>'treasure_reading_duration','')::integer,
    treasure_reading_student_id = nullif(p_input->>'treasure_reading_student_id','')::uuid,
    treasure_reading_room = nullif(p_input->>'treasure_reading_room',''),
    cbs_time = nullif(p_input->>'cbs_time','')::time,
    cbs_duration = nullif(p_input->>'cbs_duration','')::integer,
    cbs_conductor_id = nullif(p_input->>'cbs_conductor_id','')::uuid,
    cbs_reader_id = nullif(p_input->>'cbs_reader_id','')::uuid,
    superintendent_visit = coalesce(nullif(p_input->>'superintendent_visit','')::boolean, false),
    superintendent_discourse_theme = nullif(p_input->>'superintendent_discourse_theme',''),
    superintendent_discourse_speaker = nullif(p_input->>'superintendent_discourse_speaker',''),
    closing_comments_time = nullif(p_input->>'closing_comments_time','')::time,
    closing_comments_duration = nullif(p_input->>'closing_comments_duration','')::integer
  where id = p_meeting_id;

  v_retained_ids := array[]::uuid[];
  v_index := 0;
  for v_entry in select value from pg_catalog.jsonb_array_elements(p_input->'ministry_parts') loop
    if pg_catalog.jsonb_typeof(v_entry) <> 'object' then
      raise exception using errcode = '22023', message = 'meeting_program_part_invalid';
    end if;
    if nullif(pg_catalog.btrim(v_entry->>'title'),'') is null then continue; end if;
    v_index := v_index + 1;
    if nullif(v_entry->>'id','') is not null then
      if (v_entry->>'id') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
        raise exception using errcode = '22023', message = 'meeting_part_id_invalid';
      end if;
      v_id := (v_entry->>'id')::uuid;
      if v_id = any(v_retained_ids) or not exists (
        select 1 from public.midweek_ministry_parts p where p.id = v_id and p.meeting_id = p_meeting_id
      ) then
        raise exception using errcode = '22023', message = 'meeting_part_id_invalid';
      end if;
      update public.midweek_ministry_parts set
        part_number = v_index, title = pg_catalog.btrim(v_entry->>'title'),
        duration = (v_entry->>'duration')::integer,
        student_id = nullif(v_entry->>'student_id','')::uuid,
        assistant_id = nullif(v_entry->>'assistant_id','')::uuid,
        room = nullif(v_entry->>'room',''),
        scheduled_time = nullif(v_entry->>'scheduled_time','')::time
      where id = v_id and meeting_id = p_meeting_id;
    else
      insert into public.midweek_ministry_parts(meeting_id, part_number, title, duration, student_id, assistant_id, room, scheduled_time)
      values(p_meeting_id, v_index, pg_catalog.btrim(v_entry->>'title'), (v_entry->>'duration')::integer,
        nullif(v_entry->>'student_id','')::uuid, nullif(v_entry->>'assistant_id','')::uuid,
        nullif(v_entry->>'room',''), nullif(v_entry->>'scheduled_time','')::time)
      returning id into v_id;
    end if;
    v_retained_ids := array_append(v_retained_ids, v_id);
  end loop;
  delete from public.midweek_ministry_parts p
    where p.meeting_id = p_meeting_id and not (p.id = any(v_retained_ids));

  v_retained_ids := array[]::uuid[];
  v_index := 0;
  for v_entry in select value from pg_catalog.jsonb_array_elements(p_input->'christian_life_parts') loop
    if pg_catalog.jsonb_typeof(v_entry) <> 'object' then
      raise exception using errcode = '22023', message = 'meeting_program_part_invalid';
    end if;
    if nullif(pg_catalog.btrim(v_entry->>'title'),'') is null then continue; end if;
    v_index := v_index + 1;
    if nullif(v_entry->>'id','') is not null then
      if (v_entry->>'id') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
        raise exception using errcode = '22023', message = 'meeting_part_id_invalid';
      end if;
      v_id := (v_entry->>'id')::uuid;
      if v_id = any(v_retained_ids) or not exists (
        select 1 from public.midweek_christian_life_parts p where p.id = v_id and p.meeting_id = p_meeting_id
      ) then
        raise exception using errcode = '22023', message = 'meeting_part_id_invalid';
      end if;
      update public.midweek_christian_life_parts set
        part_number = v_index, title = pg_catalog.btrim(v_entry->>'title'),
        duration = (v_entry->>'duration')::integer,
        speaker_id = nullif(v_entry->>'speaker_id','')::uuid,
        scheduled_time = nullif(v_entry->>'scheduled_time','')::time
      where id = v_id and meeting_id = p_meeting_id;
    else
      insert into public.midweek_christian_life_parts(meeting_id, part_number, title, duration, speaker_id, scheduled_time)
      values(p_meeting_id, v_index, pg_catalog.btrim(v_entry->>'title'), (v_entry->>'duration')::integer,
        nullif(v_entry->>'speaker_id','')::uuid, nullif(v_entry->>'scheduled_time','')::time)
      returning id into v_id;
    end if;
    v_retained_ids := array_append(v_retained_ids, v_id);
  end loop;
  delete from public.midweek_christian_life_parts p
    where p.meeting_id = p_meeting_id and not (p.id = any(v_retained_ids));

  return p_meeting_id;
end;
$$;
revoke all on function public.update_midweek_program(uuid, jsonb) from public, anon;
grant execute on function public.update_midweek_program(uuid, jsonb) to authenticated;

create or replace function public.reconcile_meeting_assignment_notifications(p_kind text, p_meeting_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null or not private.is_active_user()
     or not private.has_role_permission('can_edit_assignments')
     or not exists (
       select 1 from public.user_profiles up
       where up.id = (select auth.uid()) and up.system_role in ('coordenador','designador')
     ) then
    raise exception using errcode = '42501', message = 'meeting_assignment_access_denied';
  end if;
  if p_kind not in ('midweek','weekend') or p_meeting_id is null then
    raise exception using errcode = '22023', message = 'meeting_assignment_kind_invalid';
  end if;
  perform private.lock_meeting_assignment_scope();
  perform private.sync_meeting_assignment_notifications(p_kind, p_meeting_id);
end;
$$;
revoke all on function public.reconcile_meeting_assignment_notifications(text, uuid) from public, anon;
grant execute on function public.reconcile_meeting_assignment_notifications(text, uuid) to authenticated;
