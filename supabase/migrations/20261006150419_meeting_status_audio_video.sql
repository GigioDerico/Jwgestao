-- Personal meeting status and audio/video integration.
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
    when 'audio_video_role' then
      select to_jsonb(x) into p from public.audio_video_assignments x where x.id=p_source_id;
      if p is null then return null; end if;
      if p_slot_key in ('sound','image','stage','roving_mic_1','roving_mic_2') then
        member_id := (p->>(p_slot_key||'_member_id'))::uuid;
        role_label := case p_slot_key when 'sound' then 'Som' when 'image' then 'Imagem'
          when 'stage' then 'Palco' when 'roving_mic_1' then 'Microfone volante 1' else 'Microfone volante 2' end;
      elsif p_slot_key ~ '^attendant:(0|[1-9][0-9]{0,5})$' then
        member_id := (p->'attendants_member_ids'->>(split_part(p_slot_key,':',2)::integer))::uuid;
        role_label := 'Entradas / Auditório';
      else return null; end if;
      -- Deterministic matching: one meeting per kind/date, midweek takes precedence if both exist.
      select x.kind,x.meeting into meeting_kind,m from (
        select 'midweek'::text kind,to_jsonb(y) meeting from public.midweek_meetings y where y.date=(p->>'date')::date
        union all select 'weekend',to_jsonb(y) from public.weekend_meetings y where y.date=(p->>'date')::date
      ) x order by x.kind,x.meeting->>'id' limit 1;
      part_title := 'Áudio e vídeo · '||role_label;
    else return null;
  end case;
  if m is null or member_id is null then return null; end if;
  -- Start configuration applies to the meeting start, never to an unknown part offset.
  select nullif(btrim(s.value), '') into start_time from public.app_settings s
    where s.key = meeting_kind || '_meeting_time';
  if start_time is not null and start_time !~ '^([01]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$' then start_time := null; end if;
  start_time := coalesce(case when meeting_kind = 'midweek' then m->>'opening_song_time' else m->>'start_time' end, start_time);
  if p_source_type='audio_video_role' then part_time:=start_time; end if;
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

create or replace function private.meeting_audio_video_slots(p_kind text,p_meeting_id uuid)
returns table(source_type text,source_id uuid,slot_key text)
language sql stable security definer set search_path='' as $$
  select 'audio_video_role',a.id,s.slot_key from public.audio_video_assignments a
  cross join lateral (
    select unnest(array['sound','image','stage','roving_mic_1','roving_mic_2']) slot_key
    union all select 'attendant:'||(i-1)::text from generate_series(1,cardinality(a.attendants_member_ids)) i
  ) s
  where a.date=case p_kind when 'midweek' then (select date from public.midweek_meetings where id=p_meeting_id)
    when 'weekend' then (select date from public.weekend_meetings where id=p_meeting_id) end
  and private.resolve_meeting_assignment('audio_video_role',a.id,s.slot_key)->>'meeting_id'=p_meeting_id::text;
$$;
revoke all on function private.meeting_audio_video_slots(text,uuid) from public,anon,authenticated,service_role;


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
  if not found or n.member_id <> actor_member_id or n.source_type not in ('midweek_meeting_role', 'midweek_ministry_part', 'midweek_christian_life_part', 'weekend_meeting_role', 'audio_video_role') then
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
    meeting_row := (new.source_type='audio_video_role' and new.assignment_revision is not null) or new.source_type in ('midweek_meeting_role', 'midweek_ministry_part', 'midweek_christian_life_part', 'weekend_meeting_role');
  elsif tg_op = 'DELETE' then
    meeting_row := (old.source_type='audio_video_role' and old.assignment_revision is not null) or old.source_type in ('midweek_meeting_role', 'midweek_ministry_part', 'midweek_christian_life_part', 'weekend_meeting_role');
  else
    meeting_row := (old.source_type='audio_video_role' and old.assignment_revision is not null) or old.source_type in ('midweek_meeting_role', 'midweek_ministry_part', 'midweek_christian_life_part', 'weekend_meeting_role')
      or (new.source_type='audio_video_role' and new.assignment_revision is not null) or new.source_type in ('midweek_meeting_role', 'midweek_ministry_part', 'midweek_christian_life_part', 'weekend_meeting_role');
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
    union all select * from private.meeting_audio_video_slots(p_kind,p_meeting_id)
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
    where n.member_id=actor and n.source_type in ('midweek_meeting_role','midweek_ministry_part','midweek_christian_life_part','weekend_meeting_role', 'audio_video_role')
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
    where n.member_id=actor and n.source_type in ('midweek_meeting_role','midweek_ministry_part','midweek_christian_life_part','weekend_meeting_role', 'audio_video_role')
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
    select m.id,m.kind,m.date,m.start_time,counts.assignment_count,counts.pending_count,counts.confirmed_count,counts.declined_count,counts.unconfirmed_count
    from meetings m
    cross join lateral (
      select count(*)::integer assignment_count,
        count(*) filter(where coalesce((a.assignment->>'can_respond')::boolean,false) and a.assignment->'notification'->>'status'='pending_confirmation')::integer pending_count,
        count(*) filter(where a.assignment->'notification'->>'status'='confirmed')::integer confirmed_count,
        count(*) filter(where a.assignment->'notification'->>'status'='declined')::integer declined_count,
        count(*) filter(where a.assignment->'notification'->>'status'='pending_confirmation' or a.assignment->'notification'='null'::jsonb)::integer unconfirmed_count
      from jsonb_array_elements(private.get_personal_meeting_assignments(m.kind,m.id)) as a(assignment)
    ) counts
  )
  select coalesce(jsonb_agg(jsonb_build_object('id',id,'kind',kind,'date',date,'start_time',start_time,
    'assignment_count',assignment_count,'pending_count',pending_count,'confirmed_count',confirmed_count,'declined_count',declined_count,'unconfirmed_count',unconfirmed_count)
    order by case when p_period='past' then -extract(epoch from date::timestamp) else extract(epoch from date::timestamp) end), '[]'::jsonb)
  into result from rows;
  return result;
end;
$$;

create or replace function private.resolve_personal_assignment(p_notification_id uuid,p_revision uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare actor uuid; n public.member_assignment_notifications%rowtype; assignment jsonb; meeting_id uuid; kind text; fresh_path text; detail jsonb;
begin
  actor := private.personal_assignment_actor();
  select * into n from public.member_assignment_notifications x where x.id=p_notification_id
    and x.source_type in ('midweek_meeting_role','midweek_ministry_part','midweek_christian_life_part','weekend_meeting_role', 'audio_video_role');
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
    where n.source_type in ('midweek_meeting_role','midweek_ministry_part','midweek_christian_life_part','weekend_meeting_role', 'audio_video_role')
      and ((n.assignment_snapshot->>'meeting_kind' = p_kind and n.assignment_snapshot->>'meeting_id' = p_meeting_id::text)
        or (p_kind = 'midweek' and (
          (n.source_type = 'midweek_meeting_role' and n.source_id = p_meeting_id)
          or (n.source_type = 'midweek_ministry_part' and exists(select 1 from public.midweek_ministry_parts p where p.id = n.source_id and p.meeting_id = p_meeting_id))
          or (n.source_type = 'midweek_christian_life_part' and exists(select 1 from public.midweek_christian_life_parts p where p.id = n.source_id and p.meeting_id = p_meeting_id))))
        or (n.source_type='audio_video_role' and exists(select 1 from private.meeting_audio_video_slots(p_kind,p_meeting_id) a where a.source_id=n.source_id and a.slot_key=n.slot_key))
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
    union all select * from private.meeting_audio_video_slots(p_kind,p_meeting_id)
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
        case when v_slots.source_type='audio_video_role' then 'audio_video' else p_kind end, v_date, v_text->>'title', v_text->>'message', gen_random_uuid(), v_assignment);
    elsif v_notification.source_type='audio_video_role' and v_notification.assignment_revision is null then
      -- Attach legacy evidence without resetting a participant's prior confirmation.
      update public.member_assignment_notifications set assignment_snapshot=v_assignment,assignment_revision=gen_random_uuid(),
        hidden_at=case when status='hidden' then coalesce(hidden_at,updated_at) else hidden_at end,
        status=case when revoked_at is not null then 'revoked' when confirmed_at is not null then 'confirmed' else 'pending_confirmation' end,
        responded_at=case when confirmed_at is not null then confirmed_at else null end,
        decline_reason=null,updated_at=v_now where id=v_notification.id;
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

create trigger lock_meeting_assignment_parents before insert or update or delete on public.audio_video_assignments
for each statement execute function private.lock_meeting_assignment_parents();
create or replace function private.sync_audio_video_meeting_source() returns trigger
language plpgsql security definer set search_path='' as $$
begin
  perform private.sync_audio_video_source_id(case when tg_op='DELETE' then old.id else new.id end);
  return null;
end $$;
revoke all on function private.sync_audio_video_meeting_source() from public,anon,authenticated,service_role;
create trigger sync_audio_video_meeting_source after insert or update or delete on public.audio_video_assignments
for each row execute function private.sync_audio_video_meeting_source();

create or replace function private.reconcile_audio_video_meeting_notifications(p_assignment_id uuid) returns boolean
language plpgsql security definer set search_path='' as $$
begin
  if auth.uid() is null or not private.is_active_user() or not private.has_role_permission('can_edit_assignments') then
    raise exception using errcode='42501',message='audio_video_assignment_access_denied';
  end if;
  perform private.lock_meeting_assignment_scope();
  perform private.sync_audio_video_source_id(p_assignment_id);
  return true;
end $$;
revoke all on function private.reconcile_audio_video_meeting_notifications(uuid) from public,anon,service_role;
grant execute on function private.reconcile_audio_video_meeting_notifications(uuid) to authenticated;
create or replace function public.reconcile_audio_video_meeting_notifications(p_assignment_id uuid) returns boolean
language sql security invoker set search_path='' as $$ select private.reconcile_audio_video_meeting_notifications(p_assignment_id); $$;
revoke all on function public.reconcile_audio_video_meeting_notifications(uuid) from public,anon,service_role;
grant execute on function public.reconcile_audio_video_meeting_notifications(uuid) to authenticated;


drop policy "Allow own or admin read notifications" on public.member_assignment_notifications;
drop policy "Allow own or admin update notifications" on public.member_assignment_notifications;
drop policy "Allow own or admin insert notifications" on public.member_assignment_notifications;
create policy "Allow own or admin read notifications" on public.member_assignment_notifications
for select to authenticated using (
  exists (select 1 from public.user_profiles up where up.id = auth.uid() and up.is_active and (
    case when (source_type='audio_video_role' and assignment_revision is not null) or source_type in ('midweek_meeting_role', 'midweek_ministry_part', 'midweek_christian_life_part', 'weekend_meeting_role')
      then public.has_role_permission('can_view_assignments') and (up.member_id = member_assignment_notifications.member_id or up.system_role in ('coordenador','designador'))
      else up.member_id = member_assignment_notifications.member_id or up.system_role in ('coordenador','secretario','designador') end
  ))
);
create policy "Allow own or admin update notifications" on public.member_assignment_notifications
for update to authenticated using (
  exists (select 1 from public.user_profiles up where up.id = auth.uid() and up.is_active and (
    case when (source_type='audio_video_role' and assignment_revision is not null) or source_type in ('midweek_meeting_role', 'midweek_ministry_part', 'midweek_christian_life_part', 'weekend_meeting_role')
      then up.member_id = member_assignment_notifications.member_id and public.has_role_permission('can_view_assignments')
      else up.member_id = member_assignment_notifications.member_id or up.system_role in ('coordenador','secretario','designador') end
  ))
) with check (
  exists (select 1 from public.user_profiles up where up.id = auth.uid() and up.is_active and (
    case when (source_type='audio_video_role' and assignment_revision is not null) or source_type in ('midweek_meeting_role', 'midweek_ministry_part', 'midweek_christian_life_part', 'weekend_meeting_role')
      then up.member_id = member_assignment_notifications.member_id and public.has_role_permission('can_view_assignments')
      else up.member_id = member_assignment_notifications.member_id or up.system_role in ('coordenador','secretario','designador') end
  ))
);
create policy "Allow own or admin insert notifications" on public.member_assignment_notifications
for insert to authenticated with check (
  not (source_type='audio_video_role' and assignment_revision is not null) and source_type not in ('midweek_meeting_role', 'midweek_ministry_part', 'midweek_christian_life_part', 'weekend_meeting_role')
  and exists (select 1 from public.user_profiles up where up.id = auth.uid() and up.is_active
    and (up.member_id = member_assignment_notifications.member_id or up.system_role in ('coordenador','secretario','designador')))
);


do $$ declare r record; begin
  perform private.lock_meeting_assignment_scope();
  for r in select 'midweek'::text kind,m.id from public.midweek_meetings m where exists(select 1 from public.audio_video_assignments a where a.date=m.date)
    union all select 'weekend',m.id from public.weekend_meetings m where exists(select 1 from public.audio_video_assignments a where a.date=m.date)
  loop perform private.sync_meeting_assignment_notifications(r.kind,r.id); end loop;
end $$;


alter table public.member_assignment_notifications drop constraint meeting_assignment_status_check,
  add constraint meeting_assignment_status_check check (
    (source_type not in ('midweek_meeting_role', 'midweek_ministry_part', 'midweek_christian_life_part', 'weekend_meeting_role') and not (source_type='audio_video_role' and assignment_revision is not null))
    or (status in ('pending_confirmation', 'confirmed', 'declined', 'revoked')
      and assignment_revision is not null
      and (status = 'revoked' or assignment_snapshot is not null)
      and (status <> 'pending_confirmation' or (responded_at is null and confirmed_at is null and decline_reason is null and revoked_at is null))
      and (status <> 'confirmed' or (confirmed_at is not null and responded_at is not null and responded_at = confirmed_at and decline_reason is null and revoked_at is null))
      and (status <> 'declined' or (responded_at is not null and confirmed_at is null and revoked_at is null and decline_reason is not null))
      and (status <> 'revoked' or revoked_at is not null))
  );

-- Orphan scales retain the legacy notification workflow until a parent meeting exists.
create or replace function private.sync_unparented_audio_video(p_source_id uuid,p_preserve_ids uuid[] default array[]::uuid[]) returns void
language plpgsql security definer set search_path='' as $$
declare a public.audio_video_assignments%rowtype; slot record; n public.member_assignment_notifications%rowtype; preserve boolean; ts timestamptz:=clock_timestamp();
begin
  select * into a from public.audio_video_assignments where id=p_source_id;
  if not found or exists(select 1 from public.midweek_meetings where date=a.date)
    or exists(select 1 from public.weekend_meetings where date=a.date) then return; end if;
  for slot in
    select v.slot_key,v.member_id,v.role_label from (values
      ('sound',a.sound_member_id,'Som'),('image',a.image_member_id,'Imagem'),('stage',a.stage_member_id,'Palco'),
      ('roving_mic_1',a.roving_mic_1_member_id,'Microfone volante 1'),('roving_mic_2',a.roving_mic_2_member_id,'Microfone volante 2')) v(slot_key,member_id,role_label)
    union all select 'attendant:'||(x.ordinality-1)::text,x.member_id,'Entradas / Auditório'
      from unnest(a.attendants_member_ids) with ordinality x(member_id,ordinality)
  loop
    update public.member_assignment_notifications set status='revoked',revoked_at=coalesce(revoked_at,ts),updated_at=ts
      where source_type='audio_video_role' and source_id=a.id and slot_key=slot.slot_key and member_id is distinct from slot.member_id and status<>'revoked';
    if slot.member_id is null or a.date<(ts at time zone 'America/Sao_Paulo')::date then continue; end if;
    select * into n from public.member_assignment_notifications where source_type='audio_video_role' and source_id=a.id
      and slot_key=slot.slot_key and member_id=slot.member_id for update;
    if not found then
      insert into public.member_assignment_notifications(member_id,source_type,source_id,slot_key,category,assignment_date,title,message)
        values(slot.member_id,'audio_video_role',a.id,slot.slot_key,'audio_video',a.date,'Nova designação de áudio e vídeo',
          'Você foi designado para '||slot.role_label||' em '||to_char(a.date,'DD/MM')||'.');
    elsif n.assignment_revision is not null or n.assignment_date is distinct from a.date or n.status='revoked' then
      preserve:=n.assignment_date=a.date and n.confirmed_at is not null and (n.status='confirmed' or n.id=any(p_preserve_ids));
      update public.member_assignment_notifications set assignment_revision=null,assignment_snapshot=null,assignment_date=a.date,
        status=case when preserve then 'confirmed' else 'pending_confirmation' end,
        confirmed_at=case when preserve then n.confirmed_at else null end,responded_at=case when preserve then n.confirmed_at else null end,
        decline_reason=null,revoked_at=null,hidden_at=case when preserve then n.hidden_at else null end,
        is_read=case when preserve then n.is_read else false end,
        title='Nova designação de áudio e vídeo',message='Você foi designado para '||slot.role_label||' em '||to_char(a.date,'DD/MM')||'.',updated_at=ts
      where id=n.id;
    end if;
  end loop;
  -- Removed attendant array positions are not visited above.
  update public.member_assignment_notifications set status='revoked',revoked_at=coalesce(revoked_at,ts),updated_at=ts
    where source_type='audio_video_role' and source_id=a.id and slot_key ~ '^attendant:[0-9]+$'
      and split_part(slot_key,':',2)::numeric>=coalesce(cardinality(a.attendants_member_ids),0) and status<>'revoked';
end $$;
revoke all on function private.sync_unparented_audio_video(uuid,uuid[]) from public,anon,authenticated,service_role;

create or replace function private.sync_audio_video_source_id(p_source_id uuid) returns void
language plpgsql security definer set search_path='' as $$
declare r record; preserved_ids uuid[];
begin
  if not exists(select 1 from public.audio_video_assignments where id=p_source_id) then
    update public.member_assignment_notifications set status='revoked',revoked_at=coalesce(revoked_at,clock_timestamp()),updated_at=clock_timestamp()
      where source_type='audio_video_role' and source_id=p_source_id and status<>'revoked';
    return;
  end if;
  -- Remember active confirmations belonging to the current slot before a parent detachment revokes them.
  select coalesce(array_agg(n.id),array[]::uuid[]) into preserved_ids
    from public.member_assignment_notifications n join public.audio_video_assignments a on a.id=n.source_id
    where n.source_type='audio_video_role' and n.source_id=p_source_id and n.status='confirmed' and n.assignment_date=a.date
      and n.member_id::text=case when n.slot_key in ('sound','image','stage','roving_mic_1','roving_mic_2')
        then to_jsonb(a)->>(n.slot_key||'_member_id')
        when n.slot_key ~ '^attendant:(0|[1-9][0-9]{0,5})$' then to_jsonb(a)->'attendants_member_ids'->>(split_part(n.slot_key,':',2)::integer) end;
  for r in
    select n.assignment_snapshot->>'meeting_kind' kind,(n.assignment_snapshot->>'meeting_id')::uuid id
      from public.member_assignment_notifications n where n.source_type='audio_video_role' and n.source_id=p_source_id and n.assignment_snapshot is not null
    union select 'midweek',m.id from public.midweek_meetings m join public.audio_video_assignments a on a.date=m.date where a.id=p_source_id
    union select 'weekend',m.id from public.weekend_meetings m join public.audio_video_assignments a on a.date=m.date where a.id=p_source_id
    order by kind,id
  loop perform private.sync_meeting_assignment_notifications(r.kind,r.id); end loop;
  perform private.sync_unparented_audio_video(p_source_id,preserved_ids);
end $$;
revoke all on function private.sync_audio_video_source_id(uuid) from public,anon,authenticated,service_role;



create or replace function private.sync_audio_video_meeting_header() returns trigger
language plpgsql security definer set search_path='' as $$
declare source_id uuid;
begin
  for source_id in select a.id from public.audio_video_assignments a where a.date in
      (case when tg_op<>'INSERT' then old.date end,case when tg_op<>'DELETE' then new.date end)
    union select n.source_id from public.member_assignment_notifications n where n.source_type='audio_video_role'
      and n.assignment_snapshot->>'meeting_id'=case when tg_op='DELETE' then old.id else new.id end::text
  loop perform private.sync_audio_video_source_id(source_id); end loop;
  return null;
end $$;
revoke all on function private.sync_audio_video_meeting_header() from public,anon,authenticated,service_role;
create trigger sync_audio_video_meeting_header after insert or update or delete on public.midweek_meetings
for each row execute function private.sync_audio_video_meeting_header();
create trigger sync_audio_video_meeting_header after insert or update or delete on public.weekend_meetings
for each row execute function private.sync_audio_video_meeting_header();
