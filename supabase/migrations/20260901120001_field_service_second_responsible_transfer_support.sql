-- Estende o suporte a transferência de congregação para o segundo dirigente
-- da saída de campo (responsible_2/responsible_2_member_id), replicando
-- exatamente o tratamento por slot já usado para publisher1/publisher2 em
-- cart_assignments. Sem isso, um membro transferido continuaria aparecendo
-- (e sendo notificado) como segundo dirigente em designações futuras.

create or replace function private.preview_member_transfer(p_member_id uuid)
returns public.member_transfer_impact
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  target_member_name text;
  name_is_unique boolean;
  impact public.member_transfer_impact;
begin
  select m.full_name
  into strict target_member_name
  from public.members m
  where m.id = p_member_id;

  select count(*) = 1
  into name_is_unique
  from public.members m
  where btrim(m.full_name) = btrim(target_member_name);

  if not name_is_unique and exists (
    select 1
    from (
      select w.closing_prayer_name as legacy_name
      from public.weekend_meetings w
      where w.date >= current_date
        and w.closing_prayer_id is null

      union all

      select slot.legacy_name
      from public.audio_video_assignments a
      cross join lateral (values
        (a.sound, a.sound_member_id),
        (a.image, a.image_member_id),
        (a.stage, a.stage_member_id),
        (a.roving_mic_1, a.roving_mic_1_member_id),
        (a.roving_mic_2, a.roving_mic_2_member_id)
      ) slot(legacy_name, member_id)
      where a.date >= current_date
        and slot.member_id is null

      union all

      select names.member_name
      from public.audio_video_assignments a
      cross join lateral unnest(a.attendants)
        with ordinality names(member_name, ordinality)
      left join lateral unnest(a.attendants_member_ids)
        with ordinality ids(member_id, ordinality)
        on ids.ordinality = names.ordinality
      where a.date >= current_date
        and ids.member_id is null

      union all

      select slot.legacy_name
      from public.field_service_assignments f
      cross join lateral (values
        (f.responsible, f.responsible_member_id),
        (f.responsible_2, f.responsible_2_member_id)
      ) slot(legacy_name, member_id)
      where slot.member_id is null
        and make_date(f.year, f.month, 1) >=
          date_trunc('month', current_date)::date

      union all

      select slot.legacy_name
      from public.cart_assignments c
      cross join lateral (values
        (c.publisher1, c.publisher1_member_id),
        (c.publisher2, c.publisher2_member_id)
      ) slot(legacy_name, member_id)
      where slot.member_id is null
        and make_date(c.year, c.month, c.day) >= current_date
    ) legacy
    where btrim(legacy.legacy_name) = btrim(target_member_name)
  ) then
    raise exception
      'Existem designações legadas ambíguas para este nome. Vincule-as ao membro antes de transferir.';
  end if;

  select count(*)
  into impact.future_assignment_count
  from (
    select 1
    from public.midweek_meetings m
    cross join lateral unnest(array[
      m.president_id,
      m.opening_prayer_id,
      m.closing_prayer_id,
      m.treasure_talk_speaker_id,
      m.treasure_gems_speaker_id,
      m.treasure_reading_student_id,
      m.cbs_conductor_id,
      m.cbs_reader_id
    ]) slot(member_id)
    where m.date >= current_date
      and slot.member_id = p_member_id

    union all

    select 1
    from public.midweek_ministry_parts p
    join public.midweek_meetings m on m.id = p.meeting_id
    cross join lateral unnest(array[p.student_id, p.assistant_id]) slot(member_id)
    where m.date >= current_date
      and slot.member_id = p_member_id

    union all

    select 1
    from public.midweek_christian_life_parts p
    join public.midweek_meetings m on m.id = p.meeting_id
    where m.date >= current_date
      and p.speaker_id = p_member_id

    union all

    select 1
    from public.weekend_meetings w
    cross join lateral (values
      (null::text, w.president_id),
      (w.closing_prayer_name, w.closing_prayer_id),
      (null::text, w.watchtower_conductor_id),
      (null::text, w.watchtower_reader_id)
    ) slot(legacy_name, member_id)
    where w.date >= current_date
      and (
        slot.member_id = p_member_id
        or (
          name_is_unique
          and slot.member_id is null
          and btrim(slot.legacy_name) = btrim(target_member_name)
        )
      )

    union all

    select 1
    from public.audio_video_assignments a
    cross join lateral (values
      (a.sound, a.sound_member_id),
      (a.image, a.image_member_id),
      (a.stage, a.stage_member_id),
      (a.roving_mic_1, a.roving_mic_1_member_id),
      (a.roving_mic_2, a.roving_mic_2_member_id)
    ) slot(legacy_name, member_id)
    where a.date >= current_date
      and (
        slot.member_id = p_member_id
        or (
          name_is_unique
          and slot.member_id is null
          and btrim(slot.legacy_name) = btrim(target_member_name)
        )
      )

    union all

    select 1
    from public.audio_video_assignments a
    cross join lateral unnest(a.attendants)
      with ordinality names(member_name, ordinality)
    left join lateral unnest(a.attendants_member_ids)
      with ordinality ids(member_id, ordinality)
      on ids.ordinality = names.ordinality
    where a.date >= current_date
      and (
        ids.member_id = p_member_id
        or (
          name_is_unique
          and ids.member_id is null
          and btrim(names.member_name) = btrim(target_member_name)
        )
      )

    union all

    select 1
    from public.field_service_assignments f
    cross join lateral (values
      (f.responsible, f.responsible_member_id),
      (f.responsible_2, f.responsible_2_member_id)
    ) slot(legacy_name, member_id)
    where make_date(f.year, f.month, 1) >=
        date_trunc('month', current_date)::date
      and (
        slot.member_id = p_member_id
        or (
          name_is_unique
          and slot.member_id is null
          and btrim(slot.legacy_name) = btrim(target_member_name)
        )
      )

    union all

    select 1
    from public.cart_assignments c
    cross join lateral (values
      (c.publisher1, c.publisher1_member_id),
      (c.publisher2, c.publisher2_member_id)
    ) slot(legacy_name, member_id)
    where make_date(c.year, c.month, c.day) >= current_date
      and (
        slot.member_id = p_member_id
        or (
          name_is_unique
          and slot.member_id is null
          and btrim(slot.legacy_name) = btrim(target_member_name)
        )
      )
  ) future_slots;
  return impact;
end;
$$;

create or replace function private.clear_future_member_assignments(
  p_transfer_id uuid,
  p_member_id uuid,
  p_member_name text
)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  name_is_unique boolean;
begin
  -- Prevent a concurrent assignment write from landing between the audit scan
  -- and the clearing updates. Transfers are rare, and every caller acquires
  -- these locks in the same order for the shortest possible transaction scope.
  lock table
    public.midweek_meetings,
    public.midweek_ministry_parts,
    public.midweek_christian_life_parts,
    public.weekend_meetings,
    public.audio_video_assignments,
    public.field_service_assignments,
    public.cart_assignments,
    public.member_assignment_notifications
  in share row exclusive mode;

  -- Re-check after locking so a concurrent legacy assignment cannot bypass
  -- the ambiguity guard between preview and clearing.
  perform private.preview_member_transfer(p_member_id);

  select count(*) = 1
  into name_is_unique
  from public.members m
  where btrim(m.full_name) = btrim(p_member_name);

  insert into public.member_transfer_assignment_audit (
    transfer_id,
    source,
    source_type,
    source_id,
    slot_key,
    role_label,
    assignment_date,
    member_id,
    member_name,
    details
  )
  select
    p_transfer_id,
    slots.source,
    slots.source_type,
    slots.source_id,
    slots.slot_key,
    slots.role_label,
    slots.assignment_date,
    p_member_id,
    p_member_name,
    slots.details
  from (
    select
      'midweek'::text as source,
      'midweek_meeting_role'::text as source_type,
      m.id as source_id,
      s.slot_key,
      s.role_label,
      m.date as assignment_date,
      null::text as details,
      s.member_id
    from public.midweek_meetings m
    cross join lateral (values
      ('president_id', 'Presidente', m.president_id),
      ('opening_prayer_id', 'Oração Inicial', m.opening_prayer_id),
      ('closing_prayer_id', 'Oração Final', m.closing_prayer_id),
      ('treasure_talk_speaker_id', 'Tesouros da Palavra', m.treasure_talk_speaker_id),
      ('treasure_gems_speaker_id', 'Joias Espirituais', m.treasure_gems_speaker_id),
      ('treasure_reading_student_id', 'Leitura da Bíblia', m.treasure_reading_student_id),
      ('cbs_conductor_id', 'Dirigente do Estudo', m.cbs_conductor_id),
      ('cbs_reader_id', 'Leitor do Estudo', m.cbs_reader_id)
    ) s(slot_key, role_label, member_id)
    where m.date >= current_date

    union all

    select
      'midweek',
      'midweek_ministry_part',
      p.id,
      s.slot_key,
      case
        when s.slot_key = 'student_id' then p.title
        else p.title || ' - Ajudante'
      end,
      m.date,
      null::text,
      s.member_id
    from public.midweek_ministry_parts p
    join public.midweek_meetings m on m.id = p.meeting_id
    cross join lateral (values
      ('student_id', p.student_id),
      ('assistant_id', p.assistant_id)
    ) s(slot_key, member_id)
    where m.date >= current_date

    union all

    select
      'midweek',
      'midweek_christian_life_part',
      p.id,
      'speaker_id',
      'Parte de Vida Cristã',
      m.date,
      p.title,
      p.speaker_id
    from public.midweek_christian_life_parts p
    join public.midweek_meetings m on m.id = p.meeting_id
    where m.date >= current_date

    union all

    select
      'weekend',
      'weekend_meeting_role',
      w.id,
      s.slot_key,
      s.role_label,
      w.date,
      null::text,
      s.member_id
    from public.weekend_meetings w
    cross join lateral (values
      ('president_id', 'Presidente', w.president_id),
      ('closing_prayer_id', 'Oração Final', w.closing_prayer_id),
      ('watchtower_conductor_id', 'Dirigente da Sentinela', w.watchtower_conductor_id),
      ('watchtower_reader_id', 'Leitor da Sentinela', w.watchtower_reader_id)
    ) s(slot_key, role_label, member_id)
    where w.date >= current_date

    union all

    select
      'audio_video',
      'audio_video_role',
      a.id,
      s.slot_key,
      s.role_label,
      a.date,
      a.weekday,
      s.member_id
    from public.audio_video_assignments a
    cross join lateral (values
      ('sound', 'Som', a.sound_member_id),
      ('image', 'Imagem', a.image_member_id),
      ('stage', 'Palco', a.stage_member_id),
      ('roving_mic_1', 'Microfone Volante 1', a.roving_mic_1_member_id),
      ('roving_mic_2', 'Microfone Volante 2', a.roving_mic_2_member_id)
    ) s(slot_key, role_label, member_id)
    where a.date >= current_date

    union all

    select
      'audio_video',
      'audio_video_role',
      a.id,
      'attendant:' || (u.ordinality - 1)::text,
      'Indicador',
      a.date,
      a.weekday,
      u.member_id
    from public.audio_video_assignments a
    cross join lateral unnest(a.attendants_member_ids)
      with ordinality u(member_id, ordinality)
    where a.date >= current_date

    union all

    select
      'field_service',
      'field_service_assignment',
      f.id,
      s.slot_key,
      s.role_label,
      make_date(f.year, f.month, 1),
      f.category || ' - ' || f.weekday,
      s.member_id
    from public.field_service_assignments f
    cross join lateral (values
      ('responsible', 'Responsável', f.responsible_member_id),
      ('responsible_2', 'Responsável', f.responsible_2_member_id)
    ) s(slot_key, role_label, member_id)
    where s.member_id = p_member_id
      and make_date(f.year, f.month, 1) >= date_trunc('month', current_date)::date

    union all

    select
      'cart',
      'cart_assignment',
      c.id,
      s.slot_key,
      s.role_label,
      make_date(c.year, c.month, c.day),
      c.location,
      s.member_id
    from public.cart_assignments c
    cross join lateral (values
      ('publisher1', 'Publicador 1', c.publisher1_member_id),
      ('publisher2', 'Publicador 2', c.publisher2_member_id)
    ) s(slot_key, role_label, member_id)
    where s.member_id = p_member_id
      and make_date(c.year, c.month, c.day) >= current_date
  ) slots
  where slots.member_id = p_member_id;

  insert into public.member_transfer_assignment_audit (
    transfer_id,
    source,
    source_type,
    source_id,
    slot_key,
    role_label,
    assignment_date,
    member_id,
    member_name,
    details
  )
  select
    p_transfer_id,
    legacy.source,
    legacy.source_type,
    legacy.source_id,
    legacy.slot_key,
    legacy.role_label,
    legacy.assignment_date,
    p_member_id,
    p_member_name,
    legacy.details
  from (
    select
      'weekend'::text as source,
      'weekend_meeting_role'::text as source_type,
      w.id as source_id,
      'closing_prayer_id'::text as slot_key,
      'Oração Final'::text as role_label,
      w.date as assignment_date,
      null::text as details,
      w.closing_prayer_name as legacy_name
    from public.weekend_meetings w
    where w.date >= current_date
      and w.closing_prayer_id is null

    union all

    select
      'audio_video',
      'audio_video_role',
      a.id,
      slot.slot_key,
      slot.role_label,
      a.date,
      a.weekday,
      slot.legacy_name
    from public.audio_video_assignments a
    cross join lateral (values
      ('sound', 'Som', a.sound, a.sound_member_id),
      ('image', 'Imagem', a.image, a.image_member_id),
      ('stage', 'Palco', a.stage, a.stage_member_id),
      ('roving_mic_1', 'Microfone Volante 1', a.roving_mic_1, a.roving_mic_1_member_id),
      ('roving_mic_2', 'Microfone Volante 2', a.roving_mic_2, a.roving_mic_2_member_id)
    ) slot(slot_key, role_label, legacy_name, member_id)
    where a.date >= current_date
      and slot.member_id is null

    union all

    select
      'audio_video',
      'audio_video_role',
      a.id,
      'attendant:' || (names.ordinality - 1)::text,
      'Indicador',
      a.date,
      a.weekday,
      names.member_name
    from public.audio_video_assignments a
    cross join lateral unnest(a.attendants)
      with ordinality names(member_name, ordinality)
    left join lateral unnest(a.attendants_member_ids)
      with ordinality ids(member_id, ordinality)
      on ids.ordinality = names.ordinality
    where a.date >= current_date
      and ids.member_id is null

    union all

    select
      'field_service',
      'field_service_assignment',
      f.id,
      slot.slot_key,
      slot.role_label,
      make_date(f.year, f.month, 1),
      f.category || ' - ' || f.weekday,
      slot.legacy_name
    from public.field_service_assignments f
    cross join lateral (values
      ('responsible', 'Responsável', f.responsible, f.responsible_member_id),
      ('responsible_2', 'Responsável', f.responsible_2, f.responsible_2_member_id)
    ) slot(slot_key, role_label, legacy_name, member_id)
    where slot.member_id is null
      and make_date(f.year, f.month, 1) >=
        date_trunc('month', current_date)::date

    union all

    select
      'cart',
      'cart_assignment',
      c.id,
      slot.slot_key,
      slot.role_label,
      make_date(c.year, c.month, c.day),
      c.location,
      slot.legacy_name
    from public.cart_assignments c
    cross join lateral (values
      ('publisher1', 'Publicador 1', c.publisher1, c.publisher1_member_id),
      ('publisher2', 'Publicador 2', c.publisher2, c.publisher2_member_id)
    ) slot(slot_key, role_label, legacy_name, member_id)
    where slot.member_id is null
      and make_date(c.year, c.month, c.day) >= current_date
  ) legacy
  where name_is_unique
    and btrim(legacy.legacy_name) = btrim(p_member_name);

  update public.midweek_meetings m
  set
    president_id = case when m.president_id = p_member_id then null else m.president_id end,
    opening_prayer_id = case when m.opening_prayer_id = p_member_id then null else m.opening_prayer_id end,
    closing_prayer_id = case when m.closing_prayer_id = p_member_id then null else m.closing_prayer_id end,
    treasure_talk_speaker_id = case when m.treasure_talk_speaker_id = p_member_id then null else m.treasure_talk_speaker_id end,
    treasure_gems_speaker_id = case when m.treasure_gems_speaker_id = p_member_id then null else m.treasure_gems_speaker_id end,
    treasure_reading_student_id = case when m.treasure_reading_student_id = p_member_id then null else m.treasure_reading_student_id end,
    cbs_conductor_id = case when m.cbs_conductor_id = p_member_id then null else m.cbs_conductor_id end,
    cbs_reader_id = case when m.cbs_reader_id = p_member_id then null else m.cbs_reader_id end
  where m.date >= current_date
    and p_member_id in (
      m.president_id,
      m.opening_prayer_id,
      m.closing_prayer_id,
      m.treasure_talk_speaker_id,
      m.treasure_gems_speaker_id,
      m.treasure_reading_student_id,
      m.cbs_conductor_id,
      m.cbs_reader_id
    );

  update public.midweek_ministry_parts p
  set
    student_id = case when p.student_id = p_member_id then null else p.student_id end,
    assistant_id = case when p.assistant_id = p_member_id then null else p.assistant_id end
  from public.midweek_meetings m
  where m.id = p.meeting_id
    and m.date >= current_date
    and p_member_id in (p.student_id, p.assistant_id);

  update public.midweek_christian_life_parts p
  set speaker_id = null
  from public.midweek_meetings m
  where m.id = p.meeting_id
    and m.date >= current_date
    and p.speaker_id = p_member_id;

  update public.weekend_meetings w
  set
    president_id = case when w.president_id = p_member_id then null else w.president_id end,
    closing_prayer_name = case
      when w.closing_prayer_id = p_member_id
        or (
          name_is_unique
          and w.closing_prayer_id is null
          and btrim(w.closing_prayer_name) = btrim(p_member_name)
        )
      then null
      else w.closing_prayer_name
    end,
    closing_prayer_id = case
      when w.closing_prayer_id = p_member_id then null
      else w.closing_prayer_id
    end,
    watchtower_conductor_id = case when w.watchtower_conductor_id = p_member_id then null else w.watchtower_conductor_id end,
    watchtower_reader_id = case when w.watchtower_reader_id = p_member_id then null else w.watchtower_reader_id end
  where w.date >= current_date
    and (
      p_member_id in (
        w.president_id,
        w.closing_prayer_id,
        w.watchtower_conductor_id,
        w.watchtower_reader_id
      )
      or (
        name_is_unique
        and w.closing_prayer_id is null
        and btrim(w.closing_prayer_name) = btrim(p_member_name)
      )
    );

  update public.audio_video_assignments a
  set
    sound = case
      when a.sound_member_id = p_member_id
        or (
          name_is_unique and a.sound_member_id is null
          and btrim(a.sound) = btrim(p_member_name)
        )
      then '' else a.sound end,
    sound_member_id = case when a.sound_member_id = p_member_id then null else a.sound_member_id end,
    image = case
      when a.image_member_id = p_member_id
        or (
          name_is_unique and a.image_member_id is null
          and btrim(a.image) = btrim(p_member_name)
        )
      then '' else a.image end,
    image_member_id = case when a.image_member_id = p_member_id then null else a.image_member_id end,
    stage = case
      when a.stage_member_id = p_member_id
        or (
          name_is_unique and a.stage_member_id is null
          and btrim(a.stage) = btrim(p_member_name)
        )
      then '' else a.stage end,
    stage_member_id = case when a.stage_member_id = p_member_id then null else a.stage_member_id end,
    roving_mic_1 = case
      when a.roving_mic_1_member_id = p_member_id
        or (
          name_is_unique and a.roving_mic_1_member_id is null
          and btrim(a.roving_mic_1) = btrim(p_member_name)
        )
      then '' else a.roving_mic_1 end,
    roving_mic_1_member_id = case when a.roving_mic_1_member_id = p_member_id then null else a.roving_mic_1_member_id end,
    roving_mic_2 = case
      when a.roving_mic_2_member_id = p_member_id
        or (
          name_is_unique and a.roving_mic_2_member_id is null
          and btrim(a.roving_mic_2) = btrim(p_member_name)
        )
      then '' else a.roving_mic_2 end,
    roving_mic_2_member_id = case when a.roving_mic_2_member_id = p_member_id then null else a.roving_mic_2_member_id end,
    attendants = case
      when exists (
        select 1
        from unnest(a.attendants) with ordinality names(member_name, ordinality)
        left join lateral unnest(a.attendants_member_ids)
          with ordinality ids(member_id, ordinality)
          on ids.ordinality = names.ordinality
        where ids.member_id = p_member_id
          or (
            name_is_unique
            and ids.member_id is null
            and btrim(names.member_name) = btrim(p_member_name)
          )
      ) then coalesce((
        select array_agg(names.member_name order by names.ordinality)
        from unnest(a.attendants) with ordinality names(member_name, ordinality)
        left join lateral unnest(a.attendants_member_ids)
          with ordinality ids(member_id, ordinality)
          on ids.ordinality = names.ordinality
        where not (
          ids.member_id is not distinct from p_member_id
          or (
            name_is_unique
            and ids.member_id is null
            and btrim(names.member_name) = btrim(p_member_name)
          )
        )
      ), '{}'::text[])
      else a.attendants
    end,
    attendants_member_ids = case
      when exists (
        select 1
        from unnest(a.attendants) with ordinality names(member_name, ordinality)
        left join lateral unnest(a.attendants_member_ids)
          with ordinality ids(member_id, ordinality)
          on ids.ordinality = names.ordinality
        where ids.member_id = p_member_id
          or (
            name_is_unique
            and ids.member_id is null
            and btrim(names.member_name) = btrim(p_member_name)
          )
      ) then coalesce((
        select array_agg(ids.member_id order by ids.ordinality)
        from unnest(a.attendants_member_ids) with ordinality ids(member_id, ordinality)
        left join lateral unnest(a.attendants)
          with ordinality names(member_name, ordinality)
          on names.ordinality = ids.ordinality
        where not (
          ids.member_id is not distinct from p_member_id
          or (
            name_is_unique
            and ids.member_id is null
            and btrim(names.member_name) = btrim(p_member_name)
          )
        )
      ), '{}'::uuid[])
      else a.attendants_member_ids
    end
  where a.date >= current_date
    and (
      p_member_id in (
        a.sound_member_id,
        a.image_member_id,
        a.stage_member_id,
        a.roving_mic_1_member_id,
        a.roving_mic_2_member_id
      )
      or exists (
        select 1
        from unnest(a.attendants) with ordinality names(member_name, ordinality)
        left join lateral unnest(a.attendants_member_ids)
          with ordinality ids(member_id, ordinality)
          on ids.ordinality = names.ordinality
        where ids.member_id = p_member_id
          or (
            name_is_unique
            and ids.member_id is null
            and btrim(names.member_name) = btrim(p_member_name)
          )
      )
      or (
        name_is_unique
        and (
          (a.sound_member_id is null and btrim(a.sound) = btrim(p_member_name))
          or (a.image_member_id is null and btrim(a.image) = btrim(p_member_name))
          or (a.stage_member_id is null and btrim(a.stage) = btrim(p_member_name))
          or (
            a.roving_mic_1_member_id is null
            and btrim(a.roving_mic_1) = btrim(p_member_name)
          )
          or (
            a.roving_mic_2_member_id is null
            and btrim(a.roving_mic_2) = btrim(p_member_name)
          )
        )
      )
    );

  update public.field_service_assignments f
  set
    responsible = case
      when f.responsible_member_id = p_member_id
        or (
          name_is_unique and f.responsible_member_id is null
          and btrim(f.responsible) = btrim(p_member_name)
        )
      then '' else f.responsible end,
    responsible_member_id = case when f.responsible_member_id = p_member_id then null else f.responsible_member_id end,
    responsible_2 = case
      when f.responsible_2_member_id = p_member_id
        or (
          name_is_unique and f.responsible_2_member_id is null
          and btrim(f.responsible_2) = btrim(p_member_name)
        )
      then null else f.responsible_2 end,
    responsible_2_member_id = case when f.responsible_2_member_id = p_member_id then null else f.responsible_2_member_id end
  where make_date(f.year, f.month, 1) >= date_trunc('month', current_date)::date
    and (
      p_member_id in (f.responsible_member_id, f.responsible_2_member_id)
      or (
        name_is_unique
        and (
          (
            f.responsible_member_id is null
            and btrim(f.responsible) = btrim(p_member_name)
          )
          or (
            f.responsible_2_member_id is null
            and btrim(f.responsible_2) = btrim(p_member_name)
          )
        )
      )
    );

  update public.cart_assignments c
  set
    publisher1 = case
      when c.publisher1_member_id = p_member_id
        or (
          name_is_unique and c.publisher1_member_id is null
          and btrim(c.publisher1) = btrim(p_member_name)
        )
      then '' else c.publisher1 end,
    publisher1_member_id = case when c.publisher1_member_id = p_member_id then null else c.publisher1_member_id end,
    publisher2 = case
      when c.publisher2_member_id = p_member_id
        or (
          name_is_unique and c.publisher2_member_id is null
          and btrim(c.publisher2) = btrim(p_member_name)
        )
      then '' else c.publisher2 end,
    publisher2_member_id = case when c.publisher2_member_id = p_member_id then null else c.publisher2_member_id end
  where make_date(c.year, c.month, c.day) >= current_date
    and (
      p_member_id in (c.publisher1_member_id, c.publisher2_member_id)
      or (
        name_is_unique
        and (
          (
            c.publisher1_member_id is null
            and btrim(c.publisher1) = btrim(p_member_name)
          )
          or (
            c.publisher2_member_id is null
            and btrim(c.publisher2) = btrim(p_member_name)
          )
        )
      )
    );

  update public.member_assignment_notifications n
  set
    status = 'revoked',
    revoked_at = now(),
    updated_at = now()
  where n.member_id = p_member_id
    and n.status <> 'revoked'
    and exists (
      select 1
      from public.member_transfer_assignment_audit a
      where a.transfer_id = p_transfer_id
        and a.source_type = n.source_type
        and a.source_id = n.source_id
        and a.slot_key = n.slot_key
    );

  return (
    select count(*)
    from public.member_transfer_assignment_audit a
    where a.transfer_id = p_transfer_id
  );
end;
$$;
