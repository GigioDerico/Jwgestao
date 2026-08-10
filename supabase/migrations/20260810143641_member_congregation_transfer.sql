create schema if not exists private;

revoke all on schema private from public, anon;
grant usage on schema private to authenticated;

alter table public.user_profiles
  add column if not exists is_active boolean not null default true;

do $$
declare
  duplicate_profiles text;
begin
  select string_agg(
    duplicate.member_id::text || ' (' || duplicate.profile_count::text || ' perfis)',
    ', '
    order by duplicate.member_id::text
  )
  into duplicate_profiles
  from (
    select up.member_id, count(*) as profile_count
    from public.user_profiles up
    where up.member_id is not null
    group by up.member_id
    having count(*) > 1
  ) duplicate;

  if duplicate_profiles is not null then
    raise exception
      'Não foi possível garantir um perfil por membro. Corrija os perfis duplicados: %',
      duplicate_profiles;
  end if;
end;
$$;

create unique index user_profiles_one_profile_per_member
  on public.user_profiles(member_id)
  where member_id is not null;

create or replace function private.normalize_audio_video_attendants(
  p_attendants text[],
  p_attendants_member_ids uuid[]
)
returns table (attendants text[], attendants_member_ids uuid[])
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  normalized_names text[];
  normalized_ids uuid[];
  has_unmatched_ids boolean;
begin
  p_attendants := coalesce(p_attendants, '{}'::text[]);
  p_attendants_member_ids := coalesce(
    p_attendants_member_ids,
    '{}'::uuid[]
  );

  if cardinality(p_attendants) = cardinality(p_attendants_member_ids) then
    select
      coalesce(array_agg(
        case
          when member.id is null then names.member_name
          else member.full_name
        end
        order by names.ordinality
      ), '{}'::text[]),
      coalesce(array_agg(
        case
          when member.id is null then null
          else ids.member_id
        end
        order by names.ordinality
      ), '{}'::uuid[])
    into normalized_names, normalized_ids
    from unnest(p_attendants)
      with ordinality names(member_name, ordinality)
    left join lateral unnest(p_attendants_member_ids)
      with ordinality ids(member_id, ordinality)
      on ids.ordinality = names.ordinality
    left join public.members member on member.id = ids.member_id;

  else
    with name_positions as (
      select
        names.member_name,
        names.ordinality,
        row_number() over (
          partition by btrim(names.member_name)
          order by names.ordinality
        ) as name_occurrence,
        count(*) over (
          partition by btrim(names.member_name)
        ) as name_count
      from unnest(p_attendants)
        with ordinality names(member_name, ordinality)
    ),
    id_positions as (
      select
        ids.member_id,
        ids.ordinality as source_ordinality,
        member.full_name,
        row_number() over (
          partition by btrim(member.full_name)
          order by ids.ordinality
        ) as id_occurrence,
        count(*) over (
          partition by btrim(member.full_name)
        ) as id_name_count
      from unnest(p_attendants_member_ids)
        with ordinality ids(member_id, ordinality)
      join public.members member on member.id = ids.member_id
      where ids.member_id is not null
    ),
    aligned_names as (
      select
        names.ordinality as output_ordinality,
        names.member_name,
        ids.member_id,
        ids.source_ordinality
      from name_positions names
      left join id_positions ids
        on btrim(ids.full_name) = btrim(names.member_name)
        and ids.id_occurrence = names.name_occurrence
        and ids.id_name_count = 1
        and names.name_count = 1
    ),
    unmatched_ids as (
      select
        ids.source_ordinality
      from id_positions ids
      where not exists (
        select 1
        from aligned_names aligned
        where aligned.source_ordinality = ids.source_ordinality
      )
    )
    select
      coalesce(
        array_agg(
          aligned.member_name
          order by aligned.output_ordinality
        ),
        '{}'::text[]
      ),
      coalesce(
        array_agg(
          aligned.member_id
          order by aligned.output_ordinality
        ),
        '{}'::uuid[]
      ),
      exists (select 1 from unmatched_ids)
    into normalized_names, normalized_ids, has_unmatched_ids
    from aligned_names aligned;

    if has_unmatched_ids then
      raise exception
        'Não foi possível alinhar indicadores ambíguos. Corrija manualmente enviando NULLs posicionais.';
    end if;
  end if;

  return query select normalized_names, normalized_ids;
end;
$$;

revoke all on function private.normalize_audio_video_attendants(text[], uuid[])
  from public, anon, authenticated, service_role;

do $$
declare
  assignment record;
  problematic_ids uuid[] := '{}'::uuid[];
begin
  for assignment in
    select a.id, a.attendants, a.attendants_member_ids
    from public.audio_video_assignments a
    where cardinality(coalesce(a.attendants, '{}'::text[])) <>
      cardinality(coalesce(a.attendants_member_ids, '{}'::uuid[]))
  loop
    begin
      perform private.normalize_audio_video_attendants(
        assignment.attendants,
        assignment.attendants_member_ids
      );
    exception
      when raise_exception then
        problematic_ids := array_append(problematic_ids, assignment.id);
    end;
  end loop;

  if cardinality(problematic_ids) > 0 then
    raise exception
      'Não foi possível alinhar indicadores nas designações: %. Corrija manualmente enviando NULLs posicionais.',
      array_to_string(problematic_ids, ', ');
  end if;
end;
$$;

-- Existing rows predate member IDs. Rebuild attendant arrays without guessing:
-- unresolved names receive an explicit NULL and authoritative IDs are retained.
with normalized as (
  select assignment.id, result.attendants, result.attendants_member_ids
  from public.audio_video_assignments assignment
  cross join lateral private.normalize_audio_video_attendants(
    assignment.attendants,
    assignment.attendants_member_ids
  ) result
)
update public.audio_video_assignments assignment
set
  attendants = normalized.attendants,
  attendants_member_ids = normalized.attendants_member_ids
from normalized
where normalized.id = assignment.id
  and (
    assignment.attendants is distinct from normalized.attendants
    or assignment.attendants_member_ids is distinct from
      normalized.attendants_member_ids
  );

alter table public.audio_video_assignments
  add constraint audio_video_attendants_alignment_check
  check (cardinality(attendants) = cardinality(attendants_member_ids))
  not valid;

alter table public.audio_video_assignments
  validate constraint audio_video_attendants_alignment_check;

create or replace function private.align_audio_video_attendants()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  normalized record;
begin
  select result.attendants, result.attendants_member_ids
  into strict normalized
  from private.normalize_audio_video_attendants(
    new.attendants,
    new.attendants_member_ids
  ) result;

  new.attendants := normalized.attendants;
  new.attendants_member_ids := normalized.attendants_member_ids;
  return new;
end;
$$;

revoke all on function private.align_audio_video_attendants()
  from public, anon, authenticated, service_role;

create trigger align_audio_video_attendants
before insert or update of attendants, attendants_member_ids
on public.audio_video_assignments
for each row execute function private.align_audio_video_attendants();

create table public.member_transfers (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.members(id) on delete restrict,
  transferred_at date not null check (transferred_at <= current_date),
  destination_congregation text null check (
    destination_congregation is null
    or length(btrim(destination_congregation)) between 1 and 150
  ),
  previous_spiritual_status public.spiritual_status_enum null,
  previous_group_id uuid null references public.field_service_groups(id) on delete set null,
  previous_profile_is_active boolean not null,
  transferred_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  cancelled_at timestamptz null,
  cancelled_by uuid null references auth.users(id) on delete restrict,
  check ((cancelled_at is null) = (cancelled_by is null)),
  unique (id, member_id)
);

create unique index member_transfers_one_active_per_member
  on public.member_transfers(member_id)
  where cancelled_at is null;

create index member_transfers_member_created_idx
  on public.member_transfers(member_id, created_at desc);

create table public.member_transfer_assignment_audit (
  id uuid primary key default gen_random_uuid(),
  transfer_id uuid not null,
  source text not null check (
    source in ('midweek', 'weekend', 'audio_video', 'field_service', 'cart')
  ),
  source_type text not null,
  source_id uuid not null,
  slot_key text not null,
  role_label text not null,
  assignment_date date not null,
  member_id uuid not null references public.members(id) on delete restrict,
  member_name text not null,
  details text null,
  created_at timestamptz not null default now(),
  constraint member_transfer_assignment_audit_transfer_member_fkey
    foreign key (transfer_id, member_id)
    references public.member_transfers(id, member_id)
    on delete cascade,
  unique (transfer_id, source_type, source_id, slot_key, assignment_date)
);

create index member_transfer_audit_history_idx
  on public.member_transfer_assignment_audit(member_id, assignment_date desc);

alter table public.member_transfers enable row level security;
alter table public.member_transfer_assignment_audit enable row level security;

revoke all on public.member_transfers from anon, authenticated;
revoke all on public.member_transfer_assignment_audit from anon, authenticated;
grant select on public.member_transfers to authenticated;
grant select on public.member_transfer_assignment_audit to authenticated;

create policy "Authorized users can read member transfers"
  on public.member_transfers
  for select
  to authenticated
  using ((select public.has_role_permission('can_view_members')));

create policy "Authorized users can read transfer assignment audit"
  on public.member_transfer_assignment_audit
  for select
  to authenticated
  using ((select public.has_role_permission('can_view_assignments')));

create or replace function private.is_active_user()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.user_profiles up
    where up.id = (select auth.uid())
      and up.is_active
  );
$$;

revoke all on function private.is_active_user() from public, anon, service_role;
grant execute on function private.is_active_user() to authenticated, anon;

create or replace function public.get_my_access_status()
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select private.is_active_user();
$$;

revoke all on function public.get_my_access_status() from public, anon, service_role;
grant execute on function public.get_my_access_status() to authenticated;

create or replace function private.has_role_permission(required_permission text)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_user_role public.system_role_enum;
  v_has_perm boolean;
begin
  if not private.is_active_user() then
    return false;
  end if;

  if required_permission is null or required_permission not in (
    'can_view_members',
    'can_create_members',
    'can_edit_members',
    'can_view_meetings',
    'can_create_assignments',
    'can_edit_assignments',
    'can_view_assignments',
    'can_download_assignment_image',
    'can_download_assignment_pdf',
    'can_export_members',
    'can_manage_permissions',
    'can_view_reports'
  ) then
    return false;
  end if;

  select up.system_role
    into v_user_role
  from public.user_profiles up
  where up.id = (select auth.uid());

  if v_user_role is null then
    return false;
  end if;

  begin
    execute pg_catalog.format(
      'select %I from public.role_permissions where role = $1',
      required_permission
    )
      into v_has_perm
      using v_user_role;
  exception
    when undefined_column then
      return false;
  end;

  return coalesce(v_has_perm, false);
end;
$$;

create type public.member_transfer_impact as (
  future_assignment_count bigint
);

create or replace function private.assert_can_transfer_member(p_member_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_member_id uuid;
begin
  if not (select public.has_role_permission('can_edit_members')) then
    raise exception 'Permissão negada para transferir membros.';
  end if;

  select up.member_id
  into caller_member_id
  from public.user_profiles up
  where up.id = (select auth.uid())
    and up.is_active;

  if caller_member_id = p_member_id then
    raise exception 'Você não pode transferir a si próprio.';
  end if;

  if not exists (
    select 1
    from public.members m
    where m.id = p_member_id
  ) then
    raise exception 'Membro não encontrado.';
  end if;
end;
$$;

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

      select f.responsible
      from public.field_service_assignments f
      where f.responsible_member_id is null
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
    where make_date(f.year, f.month, 1) >=
        date_trunc('month', current_date)::date
      and (
        f.responsible_member_id = p_member_id
        or (
          name_is_unique
          and f.responsible_member_id is null
          and btrim(f.responsible) = btrim(target_member_name)
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

create or replace function public.preview_member_transfer(p_member_id uuid)
returns public.member_transfer_impact
language plpgsql
stable
security invoker
set search_path = ''
as $$
begin
  perform private.assert_can_transfer_member(p_member_id);
  return private.preview_member_transfer(p_member_id);
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
      'responsible',
      'Responsável',
      make_date(f.year, f.month, 1),
      f.category || ' - ' || f.weekday,
      f.responsible_member_id
    from public.field_service_assignments f
    where f.responsible_member_id = p_member_id
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
      'responsible',
      'Responsável',
      make_date(f.year, f.month, 1),
      f.category || ' - ' || f.weekday,
      f.responsible
    from public.field_service_assignments f
    where f.responsible_member_id is null
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
    responsible = '',
    responsible_member_id = null
  where (
      f.responsible_member_id = p_member_id
      or (
        name_is_unique
        and f.responsible_member_id is null
        and btrim(f.responsible) = btrim(p_member_name)
      )
    )
    and make_date(f.year, f.month, 1) >= date_trunc('month', current_date)::date;

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

create or replace function private.transfer_member(
  p_member_id uuid,
  p_transferred_at date,
  p_destination_congregation text
)
returns table (transfer_id uuid, removed_assignment_count bigint)
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_member public.members%rowtype;
  previous_access boolean;
  normalized_destination text;
  new_transfer_id uuid;
begin
  perform private.assert_can_transfer_member(p_member_id);

  if p_transferred_at is null or p_transferred_at > current_date then
    raise exception 'A data da transferência deve ser igual ou anterior a hoje.';
  end if;

  normalized_destination := nullif(btrim(p_destination_congregation), '');
  if length(normalized_destination) > 150 then
    raise exception 'A congregação de destino deve ter no máximo 150 caracteres.';
  end if;

  select *
  into strict current_member
  from public.members m
  where m.id = p_member_id
  for update;

  if exists (
    select 1
    from public.member_transfers t
    where t.member_id = p_member_id
      and t.cancelled_at is null
  ) then
    raise exception 'Membro já possui uma transferência ativa.';
  end if;

  select coalesce((
    select up.is_active
    from public.user_profiles up
    where up.member_id = p_member_id
  ), false)
  into previous_access;

  insert into public.member_transfers (
    member_id,
    transferred_at,
    destination_congregation,
    previous_spiritual_status,
    previous_group_id,
    previous_profile_is_active,
    transferred_by
  )
  values (
    p_member_id,
    p_transferred_at,
    normalized_destination,
    current_member.spiritual_status,
    current_member.group_id,
    previous_access,
    (select auth.uid())
  )
  returning id into new_transfer_id;

  update public.members
  set
    spiritual_status = 'inativo',
    group_id = null
  where id = p_member_id;

  update public.user_profiles
  set is_active = false
  where member_id = p_member_id;

  return query
  select
    new_transfer_id,
    private.clear_future_member_assignments(
      new_transfer_id,
      p_member_id,
      current_member.full_name
    );
end;
$$;

create or replace function public.transfer_member(
  p_member_id uuid,
  p_transferred_at date,
  p_destination_congregation text default null
)
returns table (transfer_id uuid, removed_assignment_count bigint)
language sql
security invoker
set search_path = ''
as $$
  select *
  from private.transfer_member(
    p_member_id,
    p_transferred_at,
    p_destination_congregation
  );
$$;

create or replace function private.cancel_member_transfer(p_transfer_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  transfer_row public.member_transfers%rowtype;
begin
  select *
  into transfer_row
  from public.member_transfers t
  where t.id = p_transfer_id
  for update;

  if not found or transfer_row.cancelled_at is not null then
    raise exception 'Transferência ativa não encontrada.';
  end if;

  perform private.assert_can_transfer_member(transfer_row.member_id);

  update public.members
  set
    spiritual_status = transfer_row.previous_spiritual_status,
    group_id = transfer_row.previous_group_id
  where id = transfer_row.member_id;

  update public.user_profiles
  set is_active = transfer_row.previous_profile_is_active
  where member_id = transfer_row.member_id;

  update public.member_transfers
  set
    cancelled_at = now(),
    cancelled_by = (select auth.uid())
  where id = p_transfer_id;
end;
$$;

create or replace function public.cancel_member_transfer(p_transfer_id uuid)
returns void
language sql
security invoker
set search_path = ''
as $$
  select private.cancel_member_transfer(p_transfer_id);
$$;

revoke all on function private.assert_can_transfer_member(uuid)
  from public, anon, service_role;
revoke all on function private.preview_member_transfer(uuid)
  from public, anon, service_role;
revoke all on function public.preview_member_transfer(uuid)
  from public, anon, service_role;
revoke all on function private.clear_future_member_assignments(uuid, uuid, text)
  from public, anon, authenticated, service_role;
revoke all on function private.transfer_member(uuid, date, text)
  from public, anon, service_role;
revoke all on function public.transfer_member(uuid, date, text)
  from public, anon, service_role;
revoke all on function private.cancel_member_transfer(uuid)
  from public, anon, service_role;
revoke all on function public.cancel_member_transfer(uuid)
  from public, anon, service_role;

grant execute on function private.assert_can_transfer_member(uuid)
  to authenticated;
grant execute on function private.preview_member_transfer(uuid)
  to authenticated;
grant execute on function public.preview_member_transfer(uuid)
  to authenticated;
grant execute on function private.transfer_member(uuid, date, text)
  to authenticated;
grant execute on function public.transfer_member(uuid, date, text)
  to authenticated;
grant execute on function private.cancel_member_transfer(uuid)
  to authenticated;
grant execute on function public.cancel_member_transfer(uuid)
  to authenticated;

create or replace function private.reject_ineligible_assignment()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  row_data jsonb := pg_catalog.to_jsonb(new);
  column_name text;
  candidate_id uuid;
  assignment_is_future boolean;
begin
  assignment_is_future := case tg_table_name
    when 'midweek_meetings' then
      ((row_data ->> 'date')::date >= current_date)
    when 'weekend_meetings' then
      ((row_data ->> 'date')::date >= current_date)
    when 'audio_video_assignments' then
      ((row_data ->> 'date')::date >= current_date)
    when 'field_service_assignments' then
      (
        pg_catalog.make_date(
          (row_data ->> 'year')::integer,
          (row_data ->> 'month')::integer,
          1
        ) >= pg_catalog.date_trunc('month', current_date)::date
      )
    when 'cart_assignments' then
      (
        pg_catalog.make_date(
          (row_data ->> 'year')::integer,
          (row_data ->> 'month')::integer,
          (row_data ->> 'day')::integer
        ) >= current_date
      )
    when 'midweek_ministry_parts' then exists (
      select 1
      from public.midweek_meetings meeting
      where meeting.id = (row_data ->> 'meeting_id')::uuid
        and meeting.date >= current_date
    )
    when 'midweek_christian_life_parts' then exists (
      select 1
      from public.midweek_meetings meeting
      where meeting.id = (row_data ->> 'meeting_id')::uuid
        and meeting.date >= current_date
    )
    else true
  end;

  if not assignment_is_future then
    return new;
  end if;

  foreach column_name in array tg_argv loop
    if pg_catalog.jsonb_typeof(row_data -> column_name) = 'array' then
      for candidate_id in
        select nullif(array_value.value, '')::uuid
        from pg_catalog.jsonb_array_elements_text(row_data -> column_name)
          array_value(value)
      loop
        if candidate_id is not null and exists (
          select 1
          from public.members member
          where member.id = candidate_id
            and member.spiritual_status in ('inativo', 'desassociado')
        ) then
          raise exception 'Membro inativo não pode receber designações.';
        end if;
      end loop;
    else
      candidate_id := nullif(row_data ->> column_name, '')::uuid;

      if candidate_id is not null and exists (
        select 1
        from public.members member
        where member.id = candidate_id
          and member.spiritual_status in ('inativo', 'desassociado')
      ) then
        raise exception 'Membro inativo não pode receber designações.';
      end if;
    end if;
  end loop;

  return new;
end;
$$;

revoke all on function private.reject_ineligible_assignment()
  from public, anon, authenticated, service_role;

drop trigger if exists reject_ineligible_midweek_meetings
  on public.midweek_meetings;
create trigger reject_ineligible_midweek_meetings
before insert or update on public.midweek_meetings
for each row execute function private.reject_ineligible_assignment(
  'president_id',
  'opening_prayer_id',
  'closing_prayer_id',
  'treasure_talk_speaker_id',
  'treasure_gems_speaker_id',
  'treasure_reading_student_id',
  'cbs_conductor_id',
  'cbs_reader_id'
);

drop trigger if exists reject_ineligible_midweek_ministry_parts
  on public.midweek_ministry_parts;
create trigger reject_ineligible_midweek_ministry_parts
before insert or update on public.midweek_ministry_parts
for each row execute function private.reject_ineligible_assignment(
  'student_id',
  'assistant_id'
);

drop trigger if exists reject_ineligible_midweek_christian_life_parts
  on public.midweek_christian_life_parts;
create trigger reject_ineligible_midweek_christian_life_parts
before insert or update on public.midweek_christian_life_parts
for each row execute function private.reject_ineligible_assignment(
  'speaker_id'
);

drop trigger if exists reject_ineligible_weekend_meetings
  on public.weekend_meetings;
create trigger reject_ineligible_weekend_meetings
before insert or update on public.weekend_meetings
for each row execute function private.reject_ineligible_assignment(
  'president_id',
  'closing_prayer_id',
  'watchtower_conductor_id',
  'watchtower_reader_id'
);

drop trigger if exists reject_ineligible_audio_video_assignments
  on public.audio_video_assignments;
create trigger reject_ineligible_audio_video_assignments
before insert or update on public.audio_video_assignments
for each row execute function private.reject_ineligible_assignment(
  'sound_member_id',
  'image_member_id',
  'stage_member_id',
  'roving_mic_1_member_id',
  'roving_mic_2_member_id',
  'attendants_member_ids'
);

drop trigger if exists reject_ineligible_field_service_assignments
  on public.field_service_assignments;
create trigger reject_ineligible_field_service_assignments
before insert or update on public.field_service_assignments
for each row execute function private.reject_ineligible_assignment(
  'responsible_member_id'
);

drop trigger if exists reject_ineligible_cart_assignments
  on public.cart_assignments;
create trigger reject_ineligible_cart_assignments
before insert or update on public.cart_assignments
for each row execute function private.reject_ineligible_assignment(
  'publisher1_member_id',
  'publisher2_member_id'
);

revoke all on function private.has_role_permission(text) from public, anon, service_role;
grant execute on function private.has_role_permission(text) to authenticated;

create or replace function public.has_role_permission(required_permission text)
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select private.has_role_permission(required_permission);
$$;

revoke all on function public.has_role_permission(text) from public, anon, service_role;
grant execute on function public.has_role_permission(text) to authenticated;

create or replace function private.update_role_permission(
  p_role text,
  p_perm text,
  p_value boolean
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_role text;
begin
  if not private.is_active_user() then
    raise exception 'Acesso negado: perfil inativo.';
  end if;

  select up.system_role
    into caller_role
  from public.user_profiles up
  where up.id = (select auth.uid());

  if caller_role != 'coordenador' then
    raise exception 'Apenas Coordenadores podem alterar permissões do sistema.';
  end if;

  if p_role = 'coordenador' then
    raise exception 'As permissões do Coordenador não podem ser alteradas.';
  end if;

  execute pg_catalog.format(
    'update public.role_permissions set %I = $1, updated_at = pg_catalog.now() where role = $2',
    'can_' || p_perm
  )
    using p_value, p_role::public.system_role_enum;
end;
$$;

revoke all on function private.update_role_permission(text, text, boolean)
  from public, anon, service_role;
grant execute on function private.update_role_permission(text, text, boolean)
  to authenticated;

create or replace function public.update_role_permission(
  p_role text,
  p_perm text,
  p_value boolean
)
returns void
language sql
security invoker
set search_path = ''
as $$
  select private.update_role_permission(p_role, p_perm, p_value);
$$;

revoke all on function public.update_role_permission(text, text, boolean)
  from public, anon, service_role;
grant execute on function public.update_role_permission(text, text, boolean)
  to authenticated;

create or replace function private.update_member_system_role(
  p_member_id uuid,
  p_role text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_role text;
begin
  if not private.is_active_user() then
    raise exception 'Acesso negado: perfil inativo.';
  end if;

  select up.system_role
    into caller_role
  from public.user_profiles up
  where up.id = (select auth.uid());

  if caller_role not in ('coordenador', 'secretario') then
    raise exception 'Permissão negada: apenas Coordenadores e Secretários podem alterar permissões de acesso.';
  end if;

  update public.user_profiles
  set system_role = p_role::public.system_role_enum
  where member_id = p_member_id;

  if not found then
    raise exception 'Membro não encontrado ou sem perfil de acesso criado.';
  end if;
end;
$$;

revoke all on function private.update_member_system_role(uuid, text)
  from public, anon, service_role;
grant execute on function private.update_member_system_role(uuid, text)
  to authenticated;

create or replace function public.update_member_system_role(
  p_member_id uuid,
  p_role text
)
returns void
language sql
security invoker
set search_path = ''
as $$
  select private.update_member_system_role(p_member_id, p_role);
$$;

revoke all on function public.update_member_system_role(uuid, text)
  from public, anon, service_role;
grant execute on function public.update_member_system_role(uuid, text)
  to authenticated;

do $$
declare
  rls_table record;
begin
  for rls_table in
    select namespace.nspname as schema_name, relation.relname as table_name
    from pg_catalog.pg_class relation
    join pg_catalog.pg_namespace namespace
      on namespace.oid = relation.relnamespace
    where namespace.nspname = 'public'
      and relation.relkind in ('r', 'p')
      and relation.relrowsecurity
  loop
    execute pg_catalog.format(
      'drop policy if exists %I on %I.%I',
      'Active profiles only',
      rls_table.schema_name,
      rls_table.table_name
    );

    execute pg_catalog.format(
      'create policy %I on %I.%I as restrictive for all to public using ((select private.is_active_user())) with check ((select private.is_active_user()))',
      'Active profiles only',
      rls_table.schema_name,
      rls_table.table_name
    );
  end loop;
end;
$$;
