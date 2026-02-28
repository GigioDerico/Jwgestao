alter table public.audio_video_assignments
  add column if not exists sound_member_id uuid references public.members(id),
  add column if not exists image_member_id uuid references public.members(id),
  add column if not exists stage_member_id uuid references public.members(id),
  add column if not exists roving_mic_1_member_id uuid references public.members(id),
  add column if not exists roving_mic_2_member_id uuid references public.members(id),
  add column if not exists attendants_member_ids uuid[] not null default '{}';

alter table public.field_service_assignments
  add column if not exists responsible_member_id uuid references public.members(id);

alter table public.cart_assignments
  add column if not exists publisher1_member_id uuid references public.members(id),
  add column if not exists publisher2_member_id uuid references public.members(id);

create table if not exists public.member_assignment_notifications (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.members(id) on delete cascade,
  source_type text not null,
  source_id uuid not null,
  slot_key text not null,
  category text not null,
  assignment_date date null,
  title text not null,
  message text not null,
  status text not null default 'pending_confirmation',
  is_read boolean not null default false,
  read_at timestamptz null,
  confirmed_at timestamptz null,
  revoked_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists member_assignment_notifications_unique_slot_idx
  on public.member_assignment_notifications (member_id, source_type, source_id, slot_key);

create index if not exists member_assignment_notifications_member_status_idx
  on public.member_assignment_notifications (member_id, status, is_read);

create index if not exists member_assignment_notifications_member_date_idx
  on public.member_assignment_notifications (member_id, assignment_date);

create index if not exists member_assignment_notifications_source_idx
  on public.member_assignment_notifications (source_type, source_id);

with unique_member_names as (
  select full_name, (array_agg(id order by id))[1] as id
  from public.members
  group by full_name
  having count(*) = 1
)
update public.audio_video_assignments as ava
set
  sound_member_id = coalesce(
    ava.sound_member_id,
    (select umn.id from unique_member_names umn where umn.full_name = ava.sound)
  ),
  image_member_id = coalesce(
    ava.image_member_id,
    (select umn.id from unique_member_names umn where umn.full_name = ava.image)
  ),
  stage_member_id = coalesce(
    ava.stage_member_id,
    (select umn.id from unique_member_names umn where umn.full_name = ava.stage)
  ),
  roving_mic_1_member_id = coalesce(
    ava.roving_mic_1_member_id,
    (select umn.id from unique_member_names umn where umn.full_name = ava.roving_mic_1)
  ),
  roving_mic_2_member_id = coalesce(
    ava.roving_mic_2_member_id,
    (select umn.id from unique_member_names umn where umn.full_name = ava.roving_mic_2)
  ),
  attendants_member_ids = case
    when coalesce(array_length(ava.attendants_member_ids, 1), 0) > 0 then ava.attendants_member_ids
    else coalesce((
      select array_agg(umn.id order by names.ord)
      from unnest(coalesce(ava.attendants, '{}'::text[])) with ordinality as names(name, ord)
      join unique_member_names umn on umn.full_name = names.name
    ), '{}'::uuid[])
  end
;

with unique_member_names as (
  select full_name, (array_agg(id order by id))[1] as id
  from public.members
  group by full_name
  having count(*) = 1
)
update public.field_service_assignments as fsa
set responsible_member_id = coalesce(fsa.responsible_member_id, umn.id)
from unique_member_names umn
where umn.full_name = fsa.responsible
  and fsa.category <> 'Domingo';

with unique_member_names as (
  select full_name, (array_agg(id order by id))[1] as id
  from public.members
  group by full_name
  having count(*) = 1
)
update public.cart_assignments as ca
set
  publisher1_member_id = coalesce(
    ca.publisher1_member_id,
    (select umn.id from unique_member_names umn where umn.full_name = ca.publisher1)
  ),
  publisher2_member_id = coalesce(
    ca.publisher2_member_id,
    (select umn.id from unique_member_names umn where umn.full_name = ca.publisher2)
  );

alter table public.member_assignment_notifications enable row level security;

drop policy if exists "Allow own or admin read notifications" on public.member_assignment_notifications;
drop policy if exists "Allow own or admin update notifications" on public.member_assignment_notifications;
drop policy if exists "Allow own or admin insert notifications" on public.member_assignment_notifications;

create policy "Allow own or admin read notifications"
  on public.member_assignment_notifications
  for select
  using (
    exists (
      select 1
      from public.user_profiles up
      where up.id = auth.uid()
        and (
          up.member_id = member_assignment_notifications.member_id
          or up.system_role in ('coordenador', 'secretario', 'designador')
        )
    )
  );

create policy "Allow own or admin update notifications"
  on public.member_assignment_notifications
  for update
  using (
    exists (
      select 1
      from public.user_profiles up
      where up.id = auth.uid()
        and (
          up.member_id = member_assignment_notifications.member_id
          or up.system_role in ('coordenador', 'secretario', 'designador')
        )
    )
  )
  with check (
    exists (
      select 1
      from public.user_profiles up
      where up.id = auth.uid()
        and (
          up.member_id = member_assignment_notifications.member_id
          or up.system_role in ('coordenador', 'secretario', 'designador')
        )
    )
  );

create policy "Allow own or admin insert notifications"
  on public.member_assignment_notifications
  for insert
  with check (
    exists (
      select 1
      from public.user_profiles up
      where up.id = auth.uid()
        and (
          up.member_id = member_assignment_notifications.member_id
          or up.system_role in ('coordenador', 'secretario', 'designador')
        )
    )
  );
