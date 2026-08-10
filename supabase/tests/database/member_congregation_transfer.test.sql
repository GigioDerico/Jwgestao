begin;

create extension if not exists pgtap with schema extensions;

select no_plan();

select has_table('public', 'member_transfers', 'member_transfers exists');
select has_table('public', 'member_transfer_assignment_audit', 'assignment audit exists');
select has_column('public', 'user_profiles', 'is_active', 'profiles expose active state');
select col_default_is('public', 'user_profiles', 'is_active', 'true', 'profiles are active by default');
select has_function('public', 'get_my_access_status', array[]::text[], 'access RPC exists');

select ok(
  has_function_privilege(
    'authenticated',
    'public.get_my_access_status()',
    'execute'
  ),
  'authenticated can execute the access RPC'
);

select is(
  has_function_privilege(
    'service_role',
    'public.get_my_access_status()',
    'execute'
  ),
  false,
  'service_role has no explicit access RPC execution privilege'
);

select is(
  has_function_privilege(
    'service_role',
    'public.has_role_permission(text)',
    'execute'
  ),
  false,
  'service_role has no explicit permission wrapper execution privilege'
);

select has_function(
  'private',
  'update_role_permission',
  array['text', 'text', 'boolean'],
  'private role permission implementation exists'
);

select has_function(
  'private',
  'update_member_system_role',
  array['uuid', 'text'],
  'private member role implementation exists'
);

select ok(
  (
    select implementation.prosecdef
    from pg_catalog.pg_proc implementation
    join pg_catalog.pg_namespace namespace
      on namespace.oid = implementation.pronamespace
    where namespace.nspname = 'private'
      and implementation.proname = 'update_role_permission'
  ),
  'private role permission implementation is security definer'
);

select ok(
  not (
    select wrapper.prosecdef
    from pg_catalog.pg_proc wrapper
    join pg_catalog.pg_namespace namespace
      on namespace.oid = wrapper.pronamespace
    where namespace.nspname = 'public'
      and wrapper.proname = 'update_role_permission'
  ),
  'public role permission wrapper is security invoker'
);

select ok(
  (
    select implementation.prosecdef
    from pg_catalog.pg_proc implementation
    join pg_catalog.pg_namespace namespace
      on namespace.oid = implementation.pronamespace
    where namespace.nspname = 'private'
      and implementation.proname = 'update_member_system_role'
  ),
  'private member role implementation is security definer'
);

select ok(
  not (
    select wrapper.prosecdef
    from pg_catalog.pg_proc wrapper
    join pg_catalog.pg_namespace namespace
      on namespace.oid = wrapper.pronamespace
    where namespace.nspname = 'public'
      and wrapper.proname = 'update_member_system_role'
  ),
  'public member role wrapper is security invoker'
);

select ok(
  has_table_privilege(
    'authenticated',
    'public.member_transfers',
    'select'
  ),
  'authenticated can select member transfers'
);

select is(
  has_table_privilege(
    'authenticated',
    'public.member_transfers',
    'insert'
  ),
  false,
  'authenticated cannot insert member transfers directly'
);

select is(
  has_table_privilege('anon', 'public.member_transfers', 'select'),
  false,
  'anon cannot select member transfers'
);

select ok(
  has_table_privilege(
    'authenticated',
    'public.member_transfer_assignment_audit',
    'select'
  ),
  'authenticated can select transfer assignment audit'
);

select is(
  has_table_privilege(
    'authenticated',
    'public.member_transfer_assignment_audit',
    'insert'
  ),
  false,
  'authenticated cannot insert transfer assignment audit directly'
);

select is(
  has_table_privilege(
    'anon',
    'public.member_transfer_assignment_audit',
    'select'
  ),
  false,
  'anon cannot select transfer assignment audit'
);

select ok(
  (
    select relation.relrowsecurity
    from pg_catalog.pg_class relation
    join pg_catalog.pg_namespace namespace
      on namespace.oid = relation.relnamespace
    where namespace.nspname = 'public'
      and relation.relname = 'member_transfers'
  ),
  'member_transfers has RLS enabled'
);

select ok(
  (
    select relation.relrowsecurity
    from pg_catalog.pg_class relation
    join pg_catalog.pg_namespace namespace
      on namespace.oid = relation.relnamespace
    where namespace.nspname = 'public'
      and relation.relname = 'member_transfer_assignment_audit'
  ),
  'assignment audit has RLS enabled'
);

select ok(
  exists (
    select 1
    from pg_catalog.pg_index index_definition
    join pg_catalog.pg_class index_relation
      on index_relation.oid = index_definition.indexrelid
    join pg_catalog.pg_class table_relation
      on table_relation.oid = index_definition.indrelid
    join pg_catalog.pg_namespace namespace
      on namespace.oid = table_relation.relnamespace
    where namespace.nspname = 'public'
      and table_relation.relname = 'member_transfers'
      and index_relation.relname = 'member_transfers_one_active_per_member'
      and index_definition.indisunique
      and index_definition.indpred is not null
      and lower(pg_catalog.pg_get_expr(
        index_definition.indpred,
        index_definition.indrelid
      )) = '(cancelled_at is null)'
  ),
  'one active transfer per member is enforced by a unique partial index'
);

select is_empty(
  $test$
    select relation.relname
    from pg_catalog.pg_class relation
    join pg_catalog.pg_namespace namespace
      on namespace.oid = relation.relnamespace
    where namespace.nspname = 'public'
      and relation.relkind in ('r', 'p')
      and relation.relrowsecurity
      and not exists (
        select 1
        from pg_catalog.pg_policies policy
        where policy.schemaname = namespace.nspname
          and policy.tablename = relation.relname
          and policy.policyname = 'Active profiles only'
          and policy.permissive = 'RESTRICTIVE'
          and policy.cmd = 'ALL'
          and policy.roles = array['authenticated']::name[]
      )
  $test$,
  'all current RLS-enabled public tables require an active profile'
);

insert into auth.users (id, email)
values (
  '10000000-0000-0000-0000-000000000001',
  'active-transfer-test@example.invalid'
);

insert into public.user_profiles (id, system_role, is_active)
values (
  '10000000-0000-0000-0000-000000000001',
  'coordenador',
  true
);

insert into public.members (id, full_name, gender)
values (
  '20000000-0000-0000-0000-000000000001',
  'Transfer target member',
  'M'
);

insert into auth.users (id, email)
values (
  '20000000-0000-0000-0000-000000000002',
  'transfer-target@example.invalid'
);

insert into public.user_profiles (id, member_id, system_role, is_active)
values (
  '20000000-0000-0000-0000-000000000002',
  '20000000-0000-0000-0000-000000000001',
  'publicador',
  true
);

insert into public.member_transfers (
  id,
  member_id,
  transferred_at,
  previous_profile_is_active,
  transferred_by
)
values (
  '30000000-0000-0000-0000-000000000001',
  '20000000-0000-0000-0000-000000000001',
  current_date,
  true,
  '10000000-0000-0000-0000-000000000001'
);

insert into public.member_transfer_assignment_audit (
  transfer_id,
  source,
  source_type,
  source_id,
  slot_key,
  role_label,
  assignment_date,
  member_id,
  member_name
)
values (
  '30000000-0000-0000-0000-000000000001',
  'midweek',
  'midweek_meetings',
  '30000000-0000-0000-0000-000000000002',
  'president_id',
  'Presidente',
  current_date,
  '20000000-0000-0000-0000-000000000001',
  'Transfer target member'
);

select set_config(
  'request.jwt.claim.sub',
  '10000000-0000-0000-0000-000000000001',
  true
);

set local role authenticated;

select ok(
  public.get_my_access_status(),
  'active profile receives access status'
);

select ok(
  public.has_role_permission('can_view_members'),
  'active profile receives an allowed role permission'
);

select is(
  public.has_role_permission('not_an_allowed_permission'),
  false,
  'permission helper rejects columns outside the allowlist'
);

select is(
  public.has_role_permission('can_export_members'),
  false,
  'allowed permissions not present in the current schema fail closed'
);

select is(
  public.has_role_permission(null),
  false,
  'null permission names fail closed'
);

select is(
  (
    select count(*)
    from public.user_profiles
    where id = '10000000-0000-0000-0000-000000000001'
  ),
  1::bigint,
  'active profile can pass the restrictive RLS policy'
);

select lives_ok(
  $test$
    select public.update_role_permission(
      'publicador',
      'view_members',
      true
    )
  $test$,
  'active coordinator can update role permissions'
);

select lives_ok(
  $test$
    select public.update_member_system_role(
      '20000000-0000-0000-0000-000000000001',
      'designador'
    )
  $test$,
  'active coordinator can update a member system role'
);

select is(
  (
    select can_view_members
    from public.role_permissions
    where role = 'publicador'
  ),
  true,
  'active coordinator role permission update takes effect'
);

select is(
  (
    select system_role
    from public.user_profiles
    where member_id = '20000000-0000-0000-0000-000000000001'
  ),
  'designador'::public.system_role_enum,
  'active coordinator member role update takes effect'
);

select is(
  (select count(*) from public.member_transfers),
  1::bigint,
  'active authorized profile can read member transfers'
);

select is(
  (select count(*) from public.member_transfer_assignment_audit),
  1::bigint,
  'active authorized profile can read transfer assignment audit'
);

reset role;

update public.user_profiles
set is_active = false
where id = '10000000-0000-0000-0000-000000000001';

set local role authenticated;

select is(
  public.get_my_access_status(),
  false,
  'inactive profile loses access immediately'
);

select is(
  public.has_role_permission('can_view_members'),
  false,
  'inactive profile cannot receive role permissions'
);

select is(
  (
    select count(*)
    from public.user_profiles
    where id = '10000000-0000-0000-0000-000000000001'
  ),
  0::bigint,
  'inactive profile is blocked by restrictive RLS'
);

select throws_ok(
  $test$
    select public.update_role_permission(
      'publicador',
      'view_members',
      false
    )
  $test$,
  'P0001',
  'Acesso negado: perfil inativo.',
  'inactive coordinator cannot update role permissions'
);

select throws_ok(
  $test$
    select public.update_member_system_role(
      '20000000-0000-0000-0000-000000000001',
      'secretario'
    )
  $test$,
  'P0001',
  'Acesso negado: perfil inativo.',
  'inactive coordinator cannot update a member system role'
);

select is(
  (select count(*) from public.member_transfers),
  0::bigint,
  'inactive profile cannot read member transfers'
);

select is(
  (select count(*) from public.member_transfer_assignment_audit),
  0::bigint,
  'inactive profile cannot read transfer assignment audit'
);

reset role;

select is(
  (
    select can_view_members
    from public.role_permissions
    where role = 'publicador'
  ),
  true,
  'inactive role permission call leaves data unchanged'
);

select is(
  (
    select system_role
    from public.user_profiles
    where member_id = '20000000-0000-0000-0000-000000000001'
  ),
  'designador'::public.system_role_enum,
  'inactive member role call leaves data unchanged'
);

-- Transfer RPC assertions are intentionally deferred to their implementation tasks:
-- public.preview_member_transfer, public.transfer_member, public.cancel_member_transfer.

select * from finish();

rollback;
