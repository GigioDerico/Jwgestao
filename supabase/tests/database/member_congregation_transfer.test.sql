begin;

create extension if not exists pgtap with schema extensions;

select plan(163);

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
  'public',
  'member_transfer_assignment_audit',
  array['transfer_id', 'member_id']::name[],
  'public',
  'member_transfers',
  array['id', 'member_id']::name[],
  'assignment audit references the matching member transfer'
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
        ('public.member_transfer_assignment_audit', 'member_transfer_assignment_audit_transfer_member_fkey', 'c'::"char"),
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

select col_is_unique(
  'public',
  'member_transfers',
  array['id', 'member_id']::name[],
  'member transfers exposes a composite key for audit integrity'
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
  'anon cannot execute any other authorization functions'
);

select ok(
  has_function_privilege(
    'anon',
    'private.is_active_user()',
    'execute'
  ),
  'anon can evaluate the private active-profile helper through RLS'
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
      and table_relation.relname = 'user_profiles'
      and index_relation.relname = 'user_profiles_one_profile_per_member'
      and index_definition.indisunique
      and pg_catalog.pg_get_indexdef(index_relation.oid, 1, true) = 'member_id'
      and pg_catalog.pg_get_expr(
        index_definition.indpred,
        index_definition.indrelid
      ) = '(member_id IS NOT NULL)'
  ),
  'one profile per linked member is enforced by a unique partial index'
);

select ok(
  exists (
    select 1
    from pg_catalog.pg_constraint constraint_definition
    where constraint_definition.conrelid =
      'public.audio_video_assignments'::regclass
      and constraint_definition.conname =
        'audio_video_attendants_alignment_check'
      and constraint_definition.contype = 'c'
  ),
  'audio-video attendant names and IDs have a cardinality constraint'
);

select is_empty(
  $test$
    select id
    from public.audio_video_assignments
    where cardinality(attendants) <> cardinality(attendants_member_ids)
  $test$,
  'existing audio-video attendant arrays are normalized without drift'
);

select lives_ok(
  $test$
    insert into public.audio_video_assignments (
      id, date, weekday, sound, image, stage, roving_mic_1, roving_mic_2,
      attendants, attendants_member_ids
    )
    values (
      '57000000-0000-0000-0000-000000000001', current_date + 40,
      'desalinhado', '', '', '', '', '',
      array['Nome sem ID'], '{}'::uuid[]
    )
  $test$,
  'legacy frontend payloads with compressed IDs are accepted and normalized'
);

select results_eq(
  $$select attendants, attendants_member_ids
    from public.audio_video_assignments
    where id = '57000000-0000-0000-0000-000000000001'$$,
  $$values (array['Nome sem ID']::text[], array[null::uuid])$$,
  'future writes preserve unresolved names with explicit positional nulls'
);

delete from public.audio_video_assignments
where id = '57000000-0000-0000-0000-000000000001';

select ok(
  exists (
    select 1
    from pg_catalog.pg_indexes index_definition
    where index_definition.schemaname = 'public'
      and index_definition.tablename = 'member_transfer_assignment_audit'
      and index_definition.indexname = 'member_transfer_audit_history_idx'
      and index_definition.indexdef =
        'CREATE INDEX member_transfer_audit_history_idx ON public.member_transfer_assignment_audit USING btree (member_id, assignment_date DESC)'
  ),
  'audit history index leads with member and preserves descending date order'
);

insert into auth.users (id, email)
values
  ('12000000-0000-0000-0000-000000000001', 'null-profile-1@example.invalid'),
  ('12000000-0000-0000-0000-000000000002', 'null-profile-2@example.invalid'),
  ('12000000-0000-0000-0000-000000000003', 'linked-profile-1@example.invalid'),
  ('12000000-0000-0000-0000-000000000004', 'linked-profile-2@example.invalid');

insert into public.members (id, full_name, gender)
values (
  '22000000-0000-0000-0000-000000000001',
  'Perfil único Teste',
  'M'
);

select lives_ok(
  $test$
    insert into public.user_profiles (id, member_id, system_role)
    values
      ('12000000-0000-0000-0000-000000000001', null, 'publicador'),
      ('12000000-0000-0000-0000-000000000002', null, 'publicador')
  $test$,
  'multiple unlinked profiles remain allowed'
);

insert into public.user_profiles (id, member_id, system_role)
values (
  '12000000-0000-0000-0000-000000000003',
  '22000000-0000-0000-0000-000000000001',
  'publicador'
);

select throws_ok(
  $test$
    insert into public.user_profiles (id, member_id, system_role)
    values (
      '12000000-0000-0000-0000-000000000004',
      '22000000-0000-0000-0000-000000000001',
      'publicador'
    )
  $test$,
  '23505',
  'duplicate key value violates unique constraint "user_profiles_one_profile_per_member"',
  'a member cannot be linked to multiple profiles'
);

delete from public.user_profiles
where id = '12000000-0000-0000-0000-000000000004';

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
          and policy.roles = array['public']::name[]
      )
  $test$,
  'all current RLS-enabled public tables require an active profile for every role'
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
      and exists (
        select 1
        from information_schema.role_table_grants privilege
        where privilege.table_schema = namespace.nspname
          and privilege.table_name = relation.relname
          and privilege.grantee = 'anon'
          and privilege.privilege_type in (
            'SELECT', 'INSERT', 'UPDATE', 'DELETE'
          )
      )
      and not exists (
        select 1
        from pg_catalog.pg_policies policy
        where policy.schemaname = namespace.nspname
          and policy.tablename = relation.relname
          and policy.policyname = 'Active profiles only'
          and policy.permissive = 'RESTRICTIVE'
          and policy.cmd = 'ALL'
          and policy.roles = array['public']::name[]
      )
  $test$,
  'anon DML grants are always constrained by the active-profile policy'
);

insert into public.audio_video_assignments (
  id,
  date,
  weekday,
  sound,
  image,
  stage,
  roving_mic_1,
  roving_mic_2
)
values (
  '55000000-0000-0000-0000-000000000001',
  current_date,
  'security fixture',
  'security fixture',
  'security fixture',
  'security fixture',
  'security fixture',
  'security fixture'
);

select set_config('request.jwt.claim.sub', '', true);

set local role anon;

select is(
  (
    select count(*)
    from public.audio_video_assignments
    where id = '55000000-0000-0000-0000-000000000001'
  ),
  0::bigint,
  'anon without a JWT cannot read congregational assignments'
);

select throws_ok(
  $test$
    insert into public.audio_video_assignments (
      id,
      date,
      weekday,
      sound,
      image,
      stage,
      roving_mic_1,
      roving_mic_2
    )
    values (
      '55000000-0000-0000-0000-000000000002',
      current_date,
      'anon write',
      'anon write',
      'anon write',
      'anon write',
      'anon write',
      'anon write'
    )
  $test$,
  '42501',
  'new row violates row-level security policy "Active profiles only" for table "audio_video_assignments"',
  'anon without a JWT cannot write congregational assignments'
);

reset role;

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
      'mismatched_member',
      '56000000-0000-0000-0000-000000000001',
      'mismatched_member',
      'Mismatched member',
      current_date,
      '20000000-0000-0000-0000-000000000003',
      'Transfer constraint member'
    )
  $test$,
  '23503',
  'insert or update on table "member_transfer_assignment_audit" violates foreign key constraint "member_transfer_assignment_audit_transfer_member_fkey"',
  'assignment audit rejects a member that does not match its transfer'
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

-- Atomic member transfer RPCs.
reset role;

update public.user_profiles
set is_active = true
where id = '10000000-0000-0000-0000-000000000001';

insert into public.field_service_groups (id, name)
values ('21000000-0000-0000-0000-000000000010', 'Grupo anterior');

insert into public.members (id, full_name, gender, spiritual_status, group_id)
values
  ('21000000-0000-0000-0000-000000000001', 'Administrador RPC', 'M', 'anciao', null),
  ('21000000-0000-0000-0000-000000000002', 'Membro RPC', 'F', 'publicador', '21000000-0000-0000-0000-000000000010'),
  ('21000000-0000-0000-0000-000000000003', 'Outro Membro RPC', 'M', 'publicador_batizado', null),
  ('21000000-0000-0000-0000-000000000004', 'Sem Permissão RPC', 'M', 'publicador', null),
  ('21000000-0000-0000-0000-000000000005', 'Validação RPC', 'F', 'pioneiro_regular', null),
  ('21000000-0000-0000-0000-000000000006', 'Rollback RPC', 'M', 'publicador', null),
  ('21000000-0000-0000-0000-000000000007', 'Nome Ambíguo RPC', 'M', 'publicador', null),
  ('21000000-0000-0000-0000-000000000008', 'Nome Ambíguo RPC', 'F', 'publicador', null);

select results_eq(
  $$select attendants, attendants_member_ids
    from private.normalize_audio_video_attendants(
      array['Nome legado', 'Membro RPC'],
      array['21000000-0000-0000-0000-000000000002'::uuid]
    )$$,
  $$values (
    array['Nome legado', 'Membro RPC']::text[],
    array[null::uuid, '21000000-0000-0000-0000-000000000002'::uuid]
  )$$,
  'normalization moves a mismatched ID to its exact-name position'
);

select results_eq(
  $$select attendants, attendants_member_ids
    from private.normalize_audio_video_attendants(
      array['Nome legado'],
      array['21000000-0000-0000-0000-000000000002'::uuid]
    )$$,
  $$values (
    array['Membro RPC']::text[],
    array['21000000-0000-0000-0000-000000000002'::uuid]
  )$$,
  'equal-cardinality ID-backed entries keep the authoritative member identity'
);

select results_eq(
  $$select attendants, attendants_member_ids
    from private.normalize_audio_video_attendants(
      array['Outro Membro RPC', 'Membro RPC'],
      array[
        '21000000-0000-0000-0000-000000000002'::uuid,
        '21000000-0000-0000-0000-000000000003'::uuid
      ]
    )$$,
  $$values (
    array['Membro RPC', 'Outro Membro RPC']::text[],
    array[
      '21000000-0000-0000-0000-000000000002'::uuid,
      '21000000-0000-0000-0000-000000000003'::uuid
    ]
  )$$,
  'equal-cardinality arrays align displayed names to authoritative ID order'
);

select results_eq(
  $$select attendants, attendants_member_ids
    from private.normalize_audio_video_attendants(null, null)$$,
  $$values ('{}'::text[], '{}'::uuid[])$$,
  'normalization handles null legacy arrays as aligned empty arrays'
);

select results_eq(
  $$select attendants, attendants_member_ids
    from private.normalize_audio_video_attendants(
      array['Nome preservado'],
      array['29999999-0000-0000-0000-000000000999'::uuid]
    )$$,
  $$values (array['Nome preservado']::text[], array[null::uuid])$$,
  'normalization preserves a legacy name and nulls its orphan member ID'
);

select throws_ok(
  $$select * from private.normalize_audio_video_attendants(
    array['Nome Ambíguo RPC', 'Nome Ambíguo RPC'],
    array['21000000-0000-0000-0000-000000000008'::uuid]
  )$$,
  'P0001',
  'Não foi possível alinhar indicadores ambíguos. Corrija manualmente enviando NULLs posicionais.',
  'compressed ID for duplicate names is rejected instead of creating a slot'
);

select results_eq(
  $$select attendants, attendants_member_ids
    from private.normalize_audio_video_attendants(
      array['Nome Ambíguo RPC', 'Nome Ambíguo RPC'],
      array[
        '21000000-0000-0000-0000-000000000007'::uuid,
        '21000000-0000-0000-0000-000000000008'::uuid
      ]
    )$$,
  $$values (
    array['Nome Ambíguo RPC', 'Nome Ambíguo RPC']::text[],
    array[
      '21000000-0000-0000-0000-000000000007'::uuid,
      '21000000-0000-0000-0000-000000000008'::uuid
    ]
  )$$,
  'complete positional arrays preserve explicit duplicate-name associations'
);

update public.user_profiles
set member_id = '21000000-0000-0000-0000-000000000001'
where id = '10000000-0000-0000-0000-000000000001';

insert into auth.users (id, instance_id, aud, role, email, encrypted_password)
values
  ('11000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'member-rpc@test.local', ''),
  ('11000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'publisher-rpc@test.local', ''),
  ('11000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'validation-rpc@test.local', ''),
  ('11000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'rollback-rpc@test.local', '');

insert into public.user_profiles (id, member_id, system_role, is_active)
values
  ('11000000-0000-0000-0000-000000000002', '21000000-0000-0000-0000-000000000002', 'publicador', true),
  ('11000000-0000-0000-0000-000000000004', '21000000-0000-0000-0000-000000000004', 'publicador', true),
  ('11000000-0000-0000-0000-000000000005', '21000000-0000-0000-0000-000000000005', 'publicador', true),
  ('11000000-0000-0000-0000-000000000006', '21000000-0000-0000-0000-000000000006', 'publicador', true);

insert into public.midweek_meetings (
  id, date, president_id, opening_prayer_id, closing_prayer_id,
  treasure_talk_speaker_id, treasure_gems_speaker_id,
  treasure_reading_student_id, cbs_conductor_id, cbs_reader_id
)
values
  (
    '31000000-0000-0000-0000-000000000001', current_date,
    '21000000-0000-0000-0000-000000000002', '21000000-0000-0000-0000-000000000002',
    '21000000-0000-0000-0000-000000000002', '21000000-0000-0000-0000-000000000002',
    '21000000-0000-0000-0000-000000000002', '21000000-0000-0000-0000-000000000002',
    '21000000-0000-0000-0000-000000000002', '21000000-0000-0000-0000-000000000002'
  ),
  (
    '31000000-0000-0000-0000-000000000002', current_date - 1,
    '21000000-0000-0000-0000-000000000002', null, null, null, null, null, null, null
  );

insert into public.midweek_ministry_parts (
  id, meeting_id, part_number, title, duration, student_id, assistant_id
)
values (
  '31000000-0000-0000-0000-000000000003',
  '31000000-0000-0000-0000-000000000001', 1, 'Inicie conversas', 3,
  '21000000-0000-0000-0000-000000000002', '21000000-0000-0000-0000-000000000002'
);

insert into public.midweek_christian_life_parts (
  id, meeting_id, part_number, title, duration, speaker_id
)
values (
  '31000000-0000-0000-0000-000000000004',
  '31000000-0000-0000-0000-000000000001', 1, 'Necessidades locais', 15,
  '21000000-0000-0000-0000-000000000002'
);

insert into public.weekend_meetings (
  id, date, talk_speaker_name, president_id, closing_prayer_id,
  closing_prayer_name, watchtower_conductor_id, watchtower_reader_id
)
values
  (
    '32000000-0000-0000-0000-000000000001', current_date, 'Visitante',
    '21000000-0000-0000-0000-000000000002', '21000000-0000-0000-0000-000000000002',
    'Membro RPC', '21000000-0000-0000-0000-000000000002',
    '21000000-0000-0000-0000-000000000002'
  ),
  (
    '32000000-0000-0000-0000-000000000002', current_date - 1, 'Visitante',
    '21000000-0000-0000-0000-000000000002', null, null, null, null
  );

insert into public.audio_video_assignments (
  id, date, weekday, sound, sound_member_id, image, image_member_id,
  stage, stage_member_id, roving_mic_1, roving_mic_1_member_id,
  roving_mic_2, roving_mic_2_member_id, attendants, attendants_member_ids
)
values
  (
    '33000000-0000-0000-0000-000000000001', current_date, 'Hoje',
    'Membro RPC', '21000000-0000-0000-0000-000000000002',
    'Membro RPC', '21000000-0000-0000-0000-000000000002',
    'Membro RPC', '21000000-0000-0000-0000-000000000002',
    'Membro RPC', '21000000-0000-0000-0000-000000000002',
    'Membro RPC', '21000000-0000-0000-0000-000000000002',
    array['Membro RPC', 'Outro Membro RPC', 'Membro RPC'],
    array[
      '21000000-0000-0000-0000-000000000002'::uuid,
      '21000000-0000-0000-0000-000000000003'::uuid,
      '21000000-0000-0000-0000-000000000002'::uuid
    ]
  ),
  (
    '33000000-0000-0000-0000-000000000002', current_date - 1, 'Ontem',
    'Membro RPC', '21000000-0000-0000-0000-000000000002',
    '', null, '', null, '', null, '', null, '{}', '{}'
  );

insert into public.audio_video_assignments (
  id, date, weekday, sound, sound_member_id, image, image_member_id,
  stage, stage_member_id, roving_mic_1, roving_mic_1_member_id,
  roving_mic_2, roving_mic_2_member_id, attendants, attendants_member_ids
)
values (
  '33000000-0000-0000-0000-000000000003', current_date + 2, 'Drift',
  'Nome anterior do membro', '21000000-0000-0000-0000-000000000002',
  'Membro RPC', null, '', null, '', null, '', null,
  array['Nome legado', 'Membro RPC'],
  array[null::uuid, '21000000-0000-0000-0000-000000000002'::uuid]
);

insert into public.field_service_assignments (
  id, month, year, weekday, time, responsible, responsible_member_id,
  location, category
)
values
  (
    '34000000-0000-0000-0000-000000000001',
    extract(month from current_date)::int, extract(year from current_date)::int,
    'Primeiro sábado', '09:00', 'Membro RPC',
    '21000000-0000-0000-0000-000000000002', 'Salão', 'Campo'
  ),
  (
    '34000000-0000-0000-0000-000000000002',
    extract(month from (date_trunc('month', current_date) - interval '1 month'))::int,
    extract(year from (date_trunc('month', current_date) - interval '1 month'))::int,
    'Mês anterior', '09:00', 'Membro RPC',
    '21000000-0000-0000-0000-000000000002', 'Salão', 'Campo'
  );

insert into public.field_service_assignments (
  id, month, year, weekday, time, responsible, responsible_member_id,
  location, category
)
values
  (
    '34000000-0000-0000-0000-000000000003',
    extract(month from current_date)::int, extract(year from current_date)::int,
    'Nome legado', '10:00', 'Membro RPC', null, 'Salão', 'Campo'
  ),
  (
    '34000000-0000-0000-0000-000000000004',
    extract(month from current_date)::int, extract(year from current_date)::int,
    'Nome ambíguo', '11:00', 'Nome Ambíguo RPC', null, 'Salão', 'Campo'
  );

insert into public.cart_assignments (
  id, month, year, day, weekday, time, location,
  publisher1, publisher1_member_id, publisher2, publisher2_member_id, week
)
values
  (
    '35000000-0000-0000-0000-000000000001',
    extract(month from current_date)::int, extract(year from current_date)::int,
    extract(day from current_date)::int, 'Hoje', '09:00', 'Praça',
    'Membro RPC', '21000000-0000-0000-0000-000000000002',
    'Membro RPC', '21000000-0000-0000-0000-000000000002', 1
  ),
  (
    '35000000-0000-0000-0000-000000000002',
    extract(month from (current_date - 1))::int,
    extract(year from (current_date - 1))::int,
    extract(day from (current_date - 1))::int, 'Ontem', '09:00', 'Praça',
    'Membro RPC', '21000000-0000-0000-0000-000000000002', '', null, 1
  );

insert into public.cart_assignments (
  id, month, year, day, weekday, time, location,
  publisher1, publisher1_member_id, publisher2, publisher2_member_id, week
)
values (
  '35000000-0000-0000-0000-000000000003',
  extract(month from (current_date + 4))::int,
  extract(year from (current_date + 4))::int,
  extract(day from (current_date + 4))::int, 'Nome legado', '10:00', 'Praça',
  'Membro RPC', null, '', null, 1
);

insert into public.weekend_meetings (
  id, date, talk_speaker_name, closing_prayer_name, closing_prayer_id
)
values (
  '32000000-0000-0000-0000-000000000003', current_date + 3,
  'Visitante', 'Membro RPC', null
);

insert into public.member_assignment_notifications (
  id, member_id, source_type, source_id, slot_key, category,
  assignment_date, title, message, status
)
values
  (
    '36000000-0000-0000-0000-000000000001',
    '21000000-0000-0000-0000-000000000002', 'weekend_meeting_role',
    '32000000-0000-0000-0000-000000000001', 'president_id',
    'weekend', current_date, 'Presidente', 'Designação', 'confirmed'
  ),
  (
    '36000000-0000-0000-0000-000000000002',
    '21000000-0000-0000-0000-000000000002', 'field_service_assignment',
    '34000000-0000-0000-0000-000000000001', 'responsible',
    'field_service', null, 'Responsável', 'Designação', 'pending_confirmation'
  ),
  (
    '36000000-0000-0000-0000-000000000003',
    '21000000-0000-0000-0000-000000000002', 'weekend_meeting_role',
    '32000000-0000-0000-0000-000000000002', 'president_id',
    'weekend', current_date - 1, 'Presidente passado', 'Designação', 'confirmed'
  );

select is_empty(
  $test$
    with expected(signature, is_security_definer) as (
      values
        ('private.assert_can_transfer_member(uuid)', true),
        ('private.preview_member_transfer(uuid)', true),
        ('public.preview_member_transfer(uuid)', false),
        ('private.clear_future_member_assignments(uuid,uuid,text)', true),
        ('private.transfer_member(uuid,date,text)', true),
        ('public.transfer_member(uuid,date,text)', false),
        ('private.cancel_member_transfer(uuid)', true),
        ('public.cancel_member_transfer(uuid)', false)
    )
    select expected.signature
    from expected
    left join pg_catalog.pg_proc function_definition
      on function_definition.oid = pg_catalog.to_regprocedure(expected.signature)
    where function_definition.oid is null
      or function_definition.prosecdef is distinct from expected.is_security_definer
      or function_definition.proconfig is distinct from array['search_path=""']::text[]
  $test$,
  'transfer functions use private definers, public invokers and empty search paths'
);

select is(
  (
    with target(signature) as (
      values
        ('public.preview_member_transfer(uuid)'),
        ('public.transfer_member(uuid,date,text)'),
        ('public.cancel_member_transfer(uuid)')
    )
    select count(*) from target
    where has_function_privilege('authenticated', signature, 'execute')
  ),
  3::bigint,
  'authenticated can execute only the public transfer entry points'
);

select is(
  (
    with target(signature) as (
      values
        ('private.assert_can_transfer_member(uuid)'),
        ('private.preview_member_transfer(uuid)'),
        ('private.transfer_member(uuid,date,text)'),
        ('private.cancel_member_transfer(uuid)')
    )
    select count(*) from target
    where has_function_privilege('authenticated', signature, 'execute')
  ),
  4::bigint,
  'authenticated has only the private execution needed directly by invoker wrappers'
);

select is(
  has_function_privilege(
    'authenticated',
    'private.clear_future_member_assignments(uuid,uuid,text)',
    'execute'
  ),
  false,
  'authenticated cannot call the internal assignment clearer directly'
);

select ok(
  pg_catalog.strpos(
    pg_catalog.lower(pg_catalog.pg_get_functiondef(
      'private.clear_future_member_assignments(uuid,uuid,text)'::regprocedure
    )),
    'in share row exclusive mode'
  ) > 0,
  'assignment clearing locks its source tables against concurrent writes'
);

select is(
  (
    with target(signature) as (
      values
        ('private.assert_can_transfer_member(uuid)'),
        ('private.preview_member_transfer(uuid)'),
        ('public.preview_member_transfer(uuid)'),
        ('private.clear_future_member_assignments(uuid,uuid,text)'),
        ('private.transfer_member(uuid,date,text)'),
        ('public.transfer_member(uuid,date,text)'),
        ('private.cancel_member_transfer(uuid)'),
        ('public.cancel_member_transfer(uuid)')
    )
    select count(*) from target
    where has_function_privilege('anon', signature, 'execute')
  ),
  0::bigint,
  'anon cannot execute transfer functions'
);

select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000001', true);
set local role authenticated;

select throws_ok(
  $$select public.preview_member_transfer('21000000-0000-0000-0000-000000000007')$$,
  'P0001',
  'Existem designações legadas ambíguas para este nome. Vincule-as ao membro antes de transferir.',
  'ambiguous name-only assignments block transfer preview safely'
);

select throws_ok(
  $$select public.preview_member_transfer('21000000-0000-0000-0000-000000000001')$$,
  'P0001', 'Você não pode transferir a si próprio.',
  'self-transfer is rejected'
);

select throws_ok(
  $$select public.preview_member_transfer('21999999-0000-0000-0000-000000000999')$$,
  'P0001', 'Membro não encontrado.',
  'nonexistent member is rejected'
);

select throws_ok(
  $$select public.transfer_member('21000000-0000-0000-0000-000000000005', null, null)$$,
  'P0001', 'A data da transferência deve ser igual ou anterior a hoje.',
  'null transfer date is rejected'
);

select throws_ok(
  $$select public.transfer_member('21000000-0000-0000-0000-000000000005', current_date + 1, null)$$,
  'P0001', 'A data da transferência deve ser igual ou anterior a hoje.',
  'future transfer date is rejected'
);

select throws_ok(
  $$select public.transfer_member('21000000-0000-0000-0000-000000000005', current_date, repeat('x', 151))$$,
  'P0001', 'A congregação de destino deve ter no máximo 150 caracteres.',
  'destination longer than 150 characters is rejected by the RPC'
);

select lives_ok(
  $$select public.transfer_member('21000000-0000-0000-0000-000000000005', current_date, '  Congregação Destino  ')$$,
  'trimmed destination transfer succeeds'
);

select is(
  (select destination_congregation from public.member_transfers where member_id = '21000000-0000-0000-0000-000000000005' and cancelled_at is null),
  'Congregação Destino',
  'destination is trimmed before storage'
);

select lives_ok(
  $$select public.cancel_member_transfer((select id from public.member_transfers where member_id = '21000000-0000-0000-0000-000000000005' and cancelled_at is null))$$,
  'validation transfer can be cancelled'
);

select lives_ok(
  $$select public.transfer_member('21000000-0000-0000-0000-000000000005', current_date, repeat('x', 150))$$,
  'a 150-character destination is accepted by the RPC'
);

select is(
  (public.preview_member_transfer('21000000-0000-0000-0000-000000000002')).future_assignment_count,
  31::bigint,
  'preview counts ID-backed and uniquely resolved legacy future slots'
);

select results_eq(
  $$select
      (select count(*) from public.member_transfer_assignment_audit where member_id = '21000000-0000-0000-0000-000000000002'),
      (select spiritual_status::text from public.members where id = '21000000-0000-0000-0000-000000000002'),
      (select is_active from public.user_profiles where member_id = '21000000-0000-0000-0000-000000000002')$$,
  $$values (0::bigint, 'publicador'::text, true)$$,
  'preview does not mutate member, access or audit state'
);

create temporary table transfer_rpc_result as
select * from public.transfer_member(
  '21000000-0000-0000-0000-000000000002', current_date, 'Destino Final'
);

select is(
  (select removed_assignment_count from transfer_rpc_result),
  31::bigint,
  'transfer returns the exact number of removed assignment slots'
);

select is(
  (select count(*) from public.member_transfer_assignment_audit a join transfer_rpc_result r on r.transfer_id = a.transfer_id),
  31::bigint,
  'transfer writes one audit row per removed slot'
);

select results_eq(
  $$select spiritual_status::text, group_id from public.members where id = '21000000-0000-0000-0000-000000000002'$$,
  $$values ('inativo'::text, null::uuid)$$,
  'transfer marks the member inactive and removes the group'
);

select is(
  (select is_active from public.user_profiles where member_id = '21000000-0000-0000-0000-000000000002'),
  false,
  'transfer blocks member access'
);

select results_eq(
  $$select previous_spiritual_status::text, previous_group_id, previous_profile_is_active, transferred_by
    from public.member_transfers where id = (select transfer_id from transfer_rpc_result)$$,
  $$values ('publicador'::text, '21000000-0000-0000-0000-000000000010'::uuid, true, '10000000-0000-0000-0000-000000000001'::uuid)$$,
  'transfer snapshots status, group, access and actor'
);

select is_empty(
  $$select 1 from public.midweek_meetings m,
    lateral unnest(array[m.president_id, m.opening_prayer_id, m.closing_prayer_id, m.treasure_talk_speaker_id, m.treasure_gems_speaker_id, m.treasure_reading_student_id, m.cbs_conductor_id, m.cbs_reader_id]) s(member_id)
    where m.id = '31000000-0000-0000-0000-000000000001' and s.member_id = '21000000-0000-0000-0000-000000000002'$$,
  'all current-date midweek meeting slots are cleared'
);

select results_eq(
  $$select student_id, assistant_id from public.midweek_ministry_parts where id = '31000000-0000-0000-0000-000000000003'$$,
  $$values (null::uuid, null::uuid)$$,
  'both ministry part slots in one row are cleared'
);

select is(
  (select speaker_id from public.midweek_christian_life_parts where id = '31000000-0000-0000-0000-000000000004'),
  null::uuid,
  'christian life speaker is cleared'
);

select results_eq(
  $$select president_id, closing_prayer_id, closing_prayer_name, watchtower_conductor_id, watchtower_reader_id
    from public.weekend_meetings where id = '32000000-0000-0000-0000-000000000001'$$,
  $$values (null::uuid, null::uuid, null::varchar, null::uuid, null::uuid)$$,
  'weekend IDs and aligned legacy prayer name are cleared'
);

select results_eq(
  $$select sound, sound_member_id, image, image_member_id, stage, stage_member_id,
      roving_mic_1, roving_mic_1_member_id, roving_mic_2, roving_mic_2_member_id
    from public.audio_video_assignments where id = '33000000-0000-0000-0000-000000000001'$$,
  $$values (''::varchar, null::uuid, ''::varchar, null::uuid, ''::varchar, null::uuid,
      ''::varchar, null::uuid, ''::varchar, null::uuid)$$,
  'audio-video IDs and legacy names are cleared together'
);

select results_eq(
  $$select attendants, attendants_member_ids from public.audio_video_assignments where id = '33000000-0000-0000-0000-000000000001'$$,
  $$values (array['Outro Membro RPC']::text[], array['21000000-0000-0000-0000-000000000003'::uuid])$$,
  'all matching attendants are removed while aligned arrays remain synchronized'
);

select results_eq(
  $$select sound, sound_member_id, image, image_member_id, attendants, attendants_member_ids
    from public.audio_video_assignments where id = '33000000-0000-0000-0000-000000000003'$$,
  $$values (''::varchar, null::uuid, ''::varchar, null::uuid,
    array['Nome legado']::text[], array[null::uuid])$$,
  'ID-only and unique name-only AV slots clear without corrupting aligned legacy attendants'
);

select results_eq(
  $$select responsible, responsible_member_id from public.field_service_assignments where id = '34000000-0000-0000-0000-000000000001'$$,
  $$values (''::varchar, null::uuid)$$,
  'current-month field service assignment is cleared with its legacy name'
);

select results_eq(
  $$select responsible, responsible_member_id from public.field_service_assignments where id = '34000000-0000-0000-0000-000000000003'$$,
  $$values (''::varchar, null::uuid)$$,
  'unique name-only field service assignment is audited and cleared'
);

select results_eq(
  $$select publisher1, publisher1_member_id, publisher2, publisher2_member_id from public.cart_assignments where id = '35000000-0000-0000-0000-000000000001'$$,
  $$values (''::varchar, null::uuid, ''::varchar, null::uuid)$$,
  'both current-date cart slots and legacy names are cleared'
);

select results_eq(
  $$select publisher1, publisher1_member_id from public.cart_assignments where id = '35000000-0000-0000-0000-000000000003'$$,
  $$values (''::varchar, null::uuid)$$,
  'unique name-only cart assignment is audited and cleared'
);

select results_eq(
  $$select closing_prayer_name, closing_prayer_id from public.weekend_meetings where id = '32000000-0000-0000-0000-000000000003'$$,
  $$values (null::varchar, null::uuid)$$,
  'unique name-only weekend prayer assignment is audited and cleared'
);

select is(
  (select president_id from public.midweek_meetings where id = '31000000-0000-0000-0000-000000000002'),
  '21000000-0000-0000-0000-000000000002'::uuid,
  'past midweek assignment is preserved'
);

select is(
  (select president_id from public.weekend_meetings where id = '32000000-0000-0000-0000-000000000002'),
  '21000000-0000-0000-0000-000000000002'::uuid,
  'past weekend assignment is preserved'
);

select is(
  (select sound_member_id from public.audio_video_assignments where id = '33000000-0000-0000-0000-000000000002'),
  '21000000-0000-0000-0000-000000000002'::uuid,
  'past audio-video assignment is preserved'
);

select is(
  (select responsible_member_id from public.field_service_assignments where id = '34000000-0000-0000-0000-000000000002'),
  '21000000-0000-0000-0000-000000000002'::uuid,
  'previous-month field service assignment is preserved'
);

select is(
  (select publisher1_member_id from public.cart_assignments where id = '35000000-0000-0000-0000-000000000002'),
  '21000000-0000-0000-0000-000000000002'::uuid,
  'past cart assignment is preserved'
);

select results_eq(
  $$select source, source_type, source_id, slot_key, role_label, assignment_date, member_name
    from public.member_transfer_assignment_audit
    where transfer_id = (select transfer_id from transfer_rpc_result)
      and source_type = 'midweek_christian_life_part'$$,
  $$values ('midweek'::text, 'midweek_christian_life_part'::text,
    '31000000-0000-0000-0000-000000000004'::uuid, 'speaker_id'::text,
    'Parte de Vida Cristã'::text, current_date, 'Membro RPC'::text)$$,
  'audit preserves assignment identity and member payload before clearing'
);

select results_eq(
  $$select status, revoked_at is not null from public.member_assignment_notifications where id in (
      '36000000-0000-0000-0000-000000000001', '36000000-0000-0000-0000-000000000002') order by id$$,
  $$values ('revoked'::text, true), ('revoked'::text, true)$$,
  'future notifications are revoked by audited identity including null-date field service'
);

select results_eq(
  $$select status, revoked_at from public.member_assignment_notifications where id = '36000000-0000-0000-0000-000000000003'$$,
  $$values ('confirmed'::text, null::timestamptz)$$,
  'past notification remains unchanged'
);

select throws_ok(
  $$select public.transfer_member('21000000-0000-0000-0000-000000000002', current_date, null)$$,
  'P0001', 'Membro já possui uma transferência ativa.',
  'duplicate active transfer is rejected'
);

select set_config('request.jwt.claim.sub', '11000000-0000-0000-0000-000000000004', true);

select throws_ok(
  $$select public.preview_member_transfer('21000000-0000-0000-0000-000000000003')$$,
  'P0001', 'Permissão negada para transferir membros.',
  'member without can_edit_members cannot preview transfer'
);

select throws_ok(
  $$select public.cancel_member_transfer((select transfer_id from transfer_rpc_result))$$,
  'P0001', 'Permissão negada para transferir membros.',
  'member without can_edit_members cannot cancel transfer'
);

reset role;
update public.user_profiles
set is_active = false
where id = '10000000-0000-0000-0000-000000000001';

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000001', true);

select throws_ok(
  $$select public.preview_member_transfer('21000000-0000-0000-0000-000000000003')$$,
  'P0001', 'Permissão negada para transferir membros.',
  'inactive coordinator cannot preview a transfer'
);

reset role;
update public.user_profiles
set is_active = true
where id = '10000000-0000-0000-0000-000000000001';

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000001', true);

select lives_ok(
  $$select public.cancel_member_transfer((select transfer_id from transfer_rpc_result))$$,
  'authorized transfer cancellation succeeds'
);

select results_eq(
  $$select spiritual_status::text, group_id from public.members where id = '21000000-0000-0000-0000-000000000002'$$,
  $$values ('publicador'::text, '21000000-0000-0000-0000-000000000010'::uuid)$$,
  'cancellation restores spiritual status and group snapshot'
);

select is(
  (select is_active from public.user_profiles where member_id = '21000000-0000-0000-0000-000000000002'),
  true,
  'cancellation restores profile access snapshot'
);

select is(
  (select cancelled_by from public.member_transfers where id = (select transfer_id from transfer_rpc_result)),
  '10000000-0000-0000-0000-000000000001'::uuid,
  'cancellation records the actor'
);

select is(
  (select president_id from public.weekend_meetings where id = '32000000-0000-0000-0000-000000000001'),
  null::uuid,
  'cancellation does not restore removed assignments'
);

select throws_ok(
  $$select public.cancel_member_transfer((select transfer_id from transfer_rpc_result))$$,
  'P0001', 'Transferência ativa não encontrada.',
  'repeated cancellation is rejected without changing restored state'
);

select results_eq(
  $$select spiritual_status::text, group_id,
      (select is_active from public.user_profiles where member_id = members.id)
    from public.members where id = '21000000-0000-0000-0000-000000000002'$$,
  $$values ('publicador'::text, '21000000-0000-0000-0000-000000000010'::uuid, true)$$,
  'repeated cancellation leaves the restored snapshot unchanged'
);

reset role;

insert into public.weekend_meetings (id, date, talk_speaker_name, president_id)
values (
  '32000000-0000-0000-0000-000000000006', current_date + 15, 'Visitante',
  '21000000-0000-0000-0000-000000000006'
);

create function pg_temp.fail_member_transfer_clear()
returns trigger language plpgsql as $$
begin
  raise exception 'falha induzida';
end;
$$;

create trigger fail_member_transfer_clear
before update on public.weekend_meetings
for each row execute function pg_temp.fail_member_transfer_clear();

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000001', true);

select throws_ok(
  $$select public.transfer_member('21000000-0000-0000-0000-000000000006', current_date, null)$$,
  'P0001', 'falha induzida',
  'assignment clearing failure rolls back the whole transfer'
);

reset role;
drop trigger fail_member_transfer_clear on public.weekend_meetings;

select results_eq(
  $$select spiritual_status::text,
      (select is_active from public.user_profiles where member_id = members.id),
      (select count(*) from public.member_transfers where member_id = members.id)
    from public.members where id = '21000000-0000-0000-0000-000000000006'$$,
  $$values ('publicador'::text, true, 0::bigint)$$,
  'rollback restores status, access and transfer row state'
);

select is(
  (select president_id from public.weekend_meetings where id = '32000000-0000-0000-0000-000000000006'),
  '21000000-0000-0000-0000-000000000006'::uuid,
  'rollback preserves the assignment that failed to clear'
);

select * from finish();

rollback;
