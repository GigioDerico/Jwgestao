create schema if not exists private;

revoke all on schema private from public, anon;
grant usage on schema private to authenticated;

alter table public.user_profiles
  add column if not exists is_active boolean not null default true;

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
  check ((cancelled_at is null) = (cancelled_by is null))
);

create unique index member_transfers_one_active_per_member
  on public.member_transfers(member_id)
  where cancelled_at is null;

create index member_transfers_member_created_idx
  on public.member_transfers(member_id, created_at desc);

create table public.member_transfer_assignment_audit (
  id uuid primary key default gen_random_uuid(),
  transfer_id uuid not null references public.member_transfers(id) on delete cascade,
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
  unique (transfer_id, source_type, source_id, slot_key, assignment_date)
);

create index member_transfer_audit_history_idx
  on public.member_transfer_assignment_audit(assignment_date desc, member_id);

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
grant execute on function private.is_active_user() to authenticated;

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
      'create policy %I on %I.%I as restrictive for all to authenticated using ((select private.is_active_user())) with check ((select private.is_active_user()))',
      'Active profiles only',
      rls_table.schema_name,
      rls_table.table_name
    );
  end loop;
end;
$$;
