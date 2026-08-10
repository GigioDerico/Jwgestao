begin;

create extension if not exists pgtap with schema extensions;

select plan(85);

select has_table('public', 'member_transfers', 'member_transfers exists');
select has_table('public', 'member_transfer_assignment_audit', 'assignment audit exists');
select col_is_pk(
  'public',
  'member_transfers',
  'id',
  'member transfers uses id as its primary key'
);
select col_is_pk(
  'public',
  'member_transfer_assignment_audit',
  'id',
  'assignment audit uses id as its primary key'
);
select has_column('public', 'user_profiles', 'is_active', 'profiles expose active state');
select col_default_is('public', 'user_profiles', 'is_active', 'true', 'profiles are active by default');
select has_function('public', 'get_my_access_status', array[]::text[], 'access RPC exists');

select is_empty(
  $test$
    with expected(column_name, is_not_null) as (
      values
        ('id', true),
        ('member_id', true),
        ('transferred_at', true),
        ('destination_congregation', false),
        ('previous_spiritual_status', false),
        ('previous_group_id', false),
        ('previous_profile_is_active', true),
        ('transferred_by', true),
        ('created_at', true),
        ('cancelled_at', false),
        ('cancelled_by', false)
    )
    select expected.column_name
    from expected
    left join pg_catalog.pg_attribute attribute
      on attribute.attrelid = 'public.member_transfers'::regclass
      and attribute.attname = expected.column_name
      and not attribute.attisdropped
    where attribute.attnotnull is distinct from expected.is_not_null
  $test$,
  'member transfer columns preserve required nullability'
);

select is_empty(
  $test$
    with expected(column_name, is_not_null) as (
      values
        ('id', true),
        ('transfer_id', true),
        ('source', true),
        ('source_type', true),
        ('source_id', true),
        ('slot_key', true),
        ('role_label', true),
        ('assignment_date', true),
        ('member_id', true),
        ('member_name', true),
        ('details', false),
        ('created_at', true)
    )
    select expected.column_name
    from expected
    left join pg_catalog.pg_attribute attribute
      on attribute.attrelid = 'public.member_transfer_assignment_audit'::regclass
      and attribute.attname = expected.column_name
      and not attribute.attisdropped
    where attribute.attnotnull is distinct from expected.is_not_null
  $test$,
  'assignment audit columns preserve required nullability'
);

select col_type_is(
  'public',
  'member_transfers',
  'previous_spiritual_status',
  'public',
  'spiritual_status_enum',
  'previous spiritual status uses the domain enum'
);

select fk_ok(
  'public', 'member_transfers', 'member_id',
  'public', 'members', 'id',
  'member transfers reference members'
);

select fk_ok(
  'public', 'member_transfers', 'previous_group_id',
  'public', 'field_service_groups', 'id',
  'member transfers reference previous field service groups'
);

select fk_ok(
  'public', 'member_transfers', 'transferred_by',
  'auth', 'users', 'id',
  'member transfers reference the transferring auth user'
);

select fk_ok(
  'public', 'member_transfers', 'cancelled_by',
  'auth', 'users', 'id',
  'member transfers reference the cancelling auth user'
);

select fk_ok(
  'public', 'member_transfer_assignment_audit', 'transfer_id',
  'public', 'member_transfers', 'id',
  'assignment audit references its transfer'
);

select fk_ok(
  'public', 'member_transfer_assignment_audit', 'member_id',
  'public', 'members', 'id',
  'assignment audit references its member'
);

select is_empty(
  $test$
    with expected(table_name, constraint_name, delete_action) as (
      values
        ('public.member_transfers', 'member_transfers_member_id_fkey', 'r'::"char"),
        ('public.member_transfers', 'member_transfers_previous_group_id_fkey', 'n'::"char"),
        ('public.member_transfers', 'member_transfers_transferred_by_fkey', 'r'::"char"),
        ('public.member_transfers', 'member_transfers_cancelled_by_fkey', 'r'::"char"),
        ('public.member_transfer_assignment_audit', 'member_transfer_assignment_audit_transfer_id_fkey', 'c'::"char"),
        ('public.member_transfer_assignment_audit', 'member_transfer_assignment_audit_member_id_fkey', 'r'::"char")
    )
    select expected.constraint_name
    from expected
    where not exists (
      select 1
      from pg_catalog.pg_constraint constraint_definition
      where constraint_definition.conname = expected.constraint_name
        and constraint_definition.contype = 'f'
        and constraint_definition.conrelid = expected.table_name::regclass
        and constraint_definition.confdeltype = expected.delete_action
    )
  $test$,
  'transfer foreign keys preserve their delete actions'
);

select is_empty(
  $test$
    with expected(constraint_name) as (
      values
        ('member_transfers_transferred_at_check'),
        ('member_transfers_destination_congregation_check'),
        ('member_transfers_check'),
        ('member_transfer_assignment_audit_source_check')
    )
    select expected.constraint_name
    from expected
    where not exists (
      select 1
      from pg_catalog.pg_constraint constraint_definition
      where constraint_definition.conname = expected.constraint_name
        and constraint_definition.contype = 'c'
    )
  $test$,
  'transfer and assignment audit check constraints exist'
);

select ok(
  exists (
    select 1
    from pg_catalog.pg_constraint constraint_definition
    where constraint_definition.conrelid =
      'public.member_transfer_assignment_audit'::regclass
      and constraint_definition.contype = 'u'
      and pg_catalog.pg_get_constraintdef(constraint_definition.oid) =
        'UNIQUE (transfer_id, source_type, source_id, slot_key, assignment_date)'
  ),
  'assignment audit enforces its composite uniqueness key'
);

select table_privs_are(
  'public',
  'member_transfers',
  'authenticated',
  array['SELECT']::name[],
  'authenticated has only SELECT on member transfers'
);

select table_privs_are(
  'public',
  'member_transfer_assignment_audit',
  'authenticated',
  array['SELECT']::name[],
  'authenticated has only SELECT on assignment audit'
);

select table_privs_are(
  'public',
  'member_transfers',
  'anon',
  array[]::name[],
  'anon has no member transfer privileges'
);

select table_privs_are(
  'public',
  'member_transfer_assignment_audit',
  'anon',
  array[]::name[],
  'anon has no assignment audit privileges'
);

select table_privs_are(
  'public',
  'member_transfers',
  'service_role',
  array[
    'DELETE', 'INSERT', 'REFERENCES', 'SELECT', 'TRIGGER', 'TRUNCATE', 'UPDATE'
  ]::name[],
  'service_role preserves standard full access to member transfers'
);

select table_privs_are(
  'public',
  'member_transfer_assignment_audit',
  'service_role',
  array[
    'DELETE', 'INSERT', 'REFERENCES', 'SELECT', 'TRIGGER', 'TRUNCATE', 'UPDATE'
  ]::name[],
  'service_role preserves standard full access to assignment audit'
);

select is_empty(
  $test$
    select relation.relname, acl.privilege_type
    from pg_catalog.pg_class relation
    join pg_catalog.pg_namespace namespace
      on namespace.oid = relation.relnamespace
    cross join lateral pg_catalog.aclexplode(
      coalesce(
        relation.relacl,
        pg_catalog.acldefault('r', relation.relowner)
      )
    ) acl
    where namespace.nspname = 'public'
      and relation.relname in (
        'member_transfers',
        'member_transfer_assignment_audit'
      )
      and acl.grantee = 0
  $test$,
  'PUBLIC has no privileges on transfer tables'
);

select schema_privs_are(
  'private',
  'authenticated',
  array['USAGE']::name[],
  'authenticated has only USAGE on private schema'
);

select schema_privs_are(
  'private',
  'anon',
  array[]::name[],
  'anon has no private schema privileges'
);

select schema_privs_are(
  'private',
  'service_role',
  array[]::name[],
  'service_role has no private schema privileges'
);

select is_empty(
  $test$
    select acl.privilege_type
    from pg_catalog.pg_namespace namespace
    cross join lateral pg_catalog.aclexplode(
      coalesce(
        namespace.nspacl,
        pg_catalog.acldefault('n', namespace.nspowner)
      )
    ) acl
    where namespace.nspname = 'private'
      and acl.grantee = 0
  $test$,
  'PUBLIC has no private schema privileges'
);

select is_empty(
  $test$
    with expected(signature, is_security_definer) as (
      values
        ('private.is_active_user()', true),
        ('public.get_my_access_status()', false),
        ('private.has_role_permission(text)', true),
        ('public.has_role_permission(text)', false),
        ('private.update_role_permission(text,text,boolean)', true),
        ('public.update_role_permission(text,text,boolean)', false),
        ('private.update_member_system_role(uuid,text)', true),
        ('public.update_member_system_role(uuid,text)', false)
    )
    select expected.signature
    from expected
    left join pg_catalog.pg_proc function_definition
      on function_definition.oid =
        pg_catalog.to_regprocedure(expected.signature)
    where function_definition.oid is null
      or function_definition.prosecdef is distinct from
        expected.is_security_definer
      or function_definition.proconfig is distinct from
        array['search_path=""']::text[]
  $test$,
  'authorization functions use the required security mode and empty search path'
);

select is(
  (
    with target(function_oid) as (
      values
        ('private.is_active_user()'::regprocedure::oid),
        ('public.get_my_access_status()'::regprocedure::oid),
        ('private.has_role_permission(text)'::regprocedure::oid),
        ('public.has_role_permission(text)'::regprocedure::oid),
        ('private.update_role_permission(text,text,boolean)'::regprocedure::oid),
        ('public.update_role_permission(text,text,boolean)'::regprocedure::oid),
        ('private.update_member_system_role(uuid,text)'::regprocedure::oid),
        ('public.update_member_system_role(uuid,text)'::regprocedure::oid)
    )
    select count(*)
    from target
    where has_function_privilege(
      'authenticated',
      target.function_oid,
      'execute'
    )
  ),
  8::bigint,
  'authenticated can execute every authorization function'
);

select is(
  (
    with target(function_oid) as (
      values
        ('private.is_active_user()'::regprocedure::oid),
        ('public.get_my_access_status()'::regprocedure::oid),
        ('private.has_role_permission(text)'::regprocedure::oid),
        ('public.has_role_permission(text)'::regprocedure::oid),
        ('private.update_role_permission(text,text,boolean)'::regprocedure::oid),
        ('public.update_role_permission(text,text,boolean)'::regprocedure::oid),
        ('private.update_member_system_role(uuid,text)'::regprocedure::oid),
        ('public.update_member_system_role(uuid,text)'::regprocedure::oid)
    )
    select count(*)
    from target
    where has_function_privilege('anon', target.function_oid, 'execute')
  ),
  0::bigint,
  'anon cannot execute authorization functions'
);

select is(
  (
    with target(function_oid) as (
      values
        ('private.is_active_user()'::regprocedure::oid),
        ('public.get_my_access_status()'::regprocedure::oid),
        ('private.has_role_permission(text)'::regprocedure::oid),
        ('public.has_role_permission(text)'::regprocedure::oid),
        ('private.update_role_permission(text,text,boolean)'::regprocedure::oid),
        ('public.update_role_permission(text,text,boolean)'::regprocedure::oid),
        ('private.update_member_system_role(uuid,text)'::regprocedure::oid),
        ('public.update_member_system_role(uuid,text)'::regprocedure::oid)
    )
    select count(*)
    from target
    where has_function_privilege(
      'service_role',
      target.function_oid,
      'execute'
    )
  ),
  0::bigint,
  'service_role cannot execute authorization functions'
);

select is_empty(
  $test$
    with target(function_oid) as (
      values
        ('private.is_active_user()'::regprocedure::oid),
        ('public.get_my_access_status()'::regprocedure::oid),
        ('private.has_role_permission(text)'::regprocedure::oid),
        ('public.has_role_permission(text)'::regprocedure::oid),
        ('private.update_role_permission(text,text,boolean)'::regprocedure::oid),
        ('public.update_role_permission(text,text,boolean)'::regprocedure::oid),
        ('private.update_member_system_role(uuid,text)'::regprocedure::oid),
        ('public.update_member_system_role(uuid,text)'::regprocedure::oid)
    )
    select function_definition.oid::regprocedure::text
    from target
    join pg_catalog.pg_proc function_definition
      on function_definition.oid = target.function_oid
    cross join lateral pg_catalog.aclexplode(
      coalesce(
        function_definition.proacl,
        pg_catalog.acldefault('f', function_definition.proowner)
      )
    ) acl
    where acl.grantee = 0
      and acl.privilege_type = 'EXECUTE'
  $test$,
  'PUBLIC cannot execute authorization functions'
);

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
      and index_definition.indnkeyatts = 1
      and pg_catalog.pg_get_indexdef(index_relation.oid, 1, true) = 'member_id'
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
), (
  '20000000-0000-0000-0000-000000000003',
  'Transfer constraint member',
  'F'
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

select throws_ok(
  $test$
    insert into public.member_transfers (
      member_id,
      transferred_at,
      previous_profile_is_active,
      transferred_by,
      cancelled_at,
      cancelled_by
    )
    values (
      '20000000-0000-0000-0000-000000000003',
      current_date + 1,
      true,
      '10000000-0000-0000-0000-000000000001',
      now(),
      '10000000-0000-0000-0000-000000000001'
    )
  $test$,
  '23514',
  'new row for relation "member_transfers" violates check constraint "member_transfers_transferred_at_check"',
  'future transfers are rejected'
);

select throws_ok(
  $test$
    insert into public.member_transfers (
      member_id,
      transferred_at,
      destination_congregation,
      previous_profile_is_active,
      transferred_by,
      cancelled_at,
      cancelled_by
    )
    values (
      '20000000-0000-0000-0000-000000000003',
      current_date,
      '   ',
      true,
      '10000000-0000-0000-0000-000000000001',
      now(),
      '10000000-0000-0000-0000-000000000001'
    )
  $test$,
  '23514',
  'new row for relation "member_transfers" violates check constraint "member_transfers_destination_congregation_check"',
  'blank destination congregations are rejected'
);

select throws_ok(
  $test$
    insert into public.member_transfers (
      member_id,
      transferred_at,
      destination_congregation,
      previous_profile_is_active,
      transferred_by,
      cancelled_at,
      cancelled_by
    )
    values (
      '20000000-0000-0000-0000-000000000003',
      current_date,
      repeat('a', 151),
      true,
      '10000000-0000-0000-0000-000000000001',
      now(),
      '10000000-0000-0000-0000-000000000001'
    )
  $test$,
  '23514',
  'new row for relation "member_transfers" violates check constraint "member_transfers_destination_congregation_check"',
  'destination congregations longer than 150 characters are rejected'
);

select throws_ok(
  $test$
    insert into public.member_transfers (
      member_id,
      transferred_at,
      previous_profile_is_active,
      transferred_by,
      cancelled_at
    )
    values (
      '20000000-0000-0000-0000-000000000003',
      current_date,
      true,
      '10000000-0000-0000-0000-000000000001',
      now()
    )
  $test$,
  '23514',
  'new row for relation "member_transfers" violates check constraint "member_transfers_check"',
  'cancelled_at requires cancelled_by'
);

select throws_ok(
  $test$
    insert into public.member_transfers (
      member_id,
      transferred_at,
      previous_profile_is_active,
      transferred_by,
      cancelled_by
    )
    values (
      '20000000-0000-0000-0000-000000000003',
      current_date,
      true,
      '10000000-0000-0000-0000-000000000001',
      '10000000-0000-0000-0000-000000000001'
    )
  $test$,
  '23514',
  'new row for relation "member_transfers" violates check constraint "member_transfers_check"',
  'cancelled_by requires cancelled_at'
);

select lives_ok(
  $test$
    insert into public.member_transfers (
      id,
      member_id,
      transferred_at,
      destination_congregation,
      previous_spiritual_status,
      previous_profile_is_active,
      transferred_by,
      cancelled_at,
      cancelled_by
    )
    values (
      '30000000-0000-0000-0000-000000000003',
      '20000000-0000-0000-0000-000000000003',
      current_date,
      repeat('a', 150),
      'pioneiro_regular',
      true,
      '10000000-0000-0000-0000-000000000001',
      now(),
      '10000000-0000-0000-0000-000000000001'
    )
  $test$,
  'a 150-character destination and coherent cancellation are accepted'
);

select lives_ok(
  $test$
    insert into public.member_transfers (
      id,
      member_id,
      transferred_at,
      previous_profile_is_active,
      transferred_by,
      cancelled_at,
      cancelled_by
    )
    values (
      '30000000-0000-0000-0000-000000000005',
      '20000000-0000-0000-0000-000000000003',
      current_date - 1,
      true,
      '10000000-0000-0000-0000-000000000001',
      now(),
      '10000000-0000-0000-0000-000000000001'
    )
  $test$,
  'past transfer dates are accepted'
);

select throws_ok(
  $test$
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
      'invalid_source',
      'midweek_meetings',
      '30000000-0000-0000-0000-000000000004',
      'opening_prayer_id',
      'Oração inicial',
      current_date,
      '20000000-0000-0000-0000-000000000001',
      'Transfer target member'
    )
  $test$,
  '23514',
  'new row for relation "member_transfer_assignment_audit" violates check constraint "member_transfer_assignment_audit_source_check"',
  'assignment audit rejects sources outside the allowlist'
);

select lives_ok(
  $test$
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
    values
      (
        '30000000-0000-0000-0000-000000000001',
        'midweek',
        'valid_midweek',
        '40000000-0000-0000-0000-000000000001',
        'valid_slot',
        'Valid midweek role',
        current_date,
        '20000000-0000-0000-0000-000000000001',
        'Transfer target member'
      ),
      (
        '30000000-0000-0000-0000-000000000001',
        'weekend',
        'valid_weekend',
        '40000000-0000-0000-0000-000000000002',
        'valid_slot',
        'Valid weekend role',
        current_date,
        '20000000-0000-0000-0000-000000000001',
        'Transfer target member'
      ),
      (
        '30000000-0000-0000-0000-000000000001',
        'audio_video',
        'valid_audio_video',
        '40000000-0000-0000-0000-000000000003',
        'valid_slot',
        'Valid audio/video role',
        current_date,
        '20000000-0000-0000-0000-000000000001',
        'Transfer target member'
      ),
      (
        '30000000-0000-0000-0000-000000000001',
        'field_service',
        'valid_field_service',
        '40000000-0000-0000-0000-000000000004',
        'valid_slot',
        'Valid field service role',
        current_date,
        '20000000-0000-0000-0000-000000000001',
        'Transfer target member'
      ),
      (
        '30000000-0000-0000-0000-000000000001',
        'cart',
        'valid_cart',
        '40000000-0000-0000-0000-000000000005',
        'valid_slot',
        'Valid cart role',
        current_date,
        '20000000-0000-0000-0000-000000000001',
        'Transfer target member'
      )
  $test$,
  'assignment audit accepts every allowed source'
);

select throws_ok(
  $test$
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
      'Presidente duplicado',
      current_date,
      '20000000-0000-0000-0000-000000000001',
      'Transfer target member'
    )
  $test$,
  '23505',
  'duplicate key value violates unique constraint "member_transfer_assignment_au_transfer_id_source_type_sourc_key"',
  'assignment audit rejects duplicate source slots for a transfer'
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
  3::bigint,
  'active authorized profile can read member transfers'
);

select is(
  (select count(*) from public.member_transfer_assignment_audit),
  6::bigint,
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
