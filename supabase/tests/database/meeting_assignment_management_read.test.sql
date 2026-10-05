begin;
create extension if not exists pgtap with schema extensions;
select no_plan();

create function pg_temp.management_test_id(p_group text, p_n integer) returns uuid
language sql immutable as $$ select ('ef000000-0000-0000-0000-' || p_group || lpad(p_n::text, 10, '0'))::uuid $$;
insert into auth.users(id, email) values
  (pg_temp.management_test_id('01', 1), 'meeting-manager@example.invalid'),
  (pg_temp.management_test_id('01', 2), 'meeting-secretary@example.invalid');
insert into public.members(id, full_name, gender, spiritual_status) values
  (pg_temp.management_test_id('02', 1), 'Response Manager Test', 'M', 'publicador'),
  (pg_temp.management_test_id('02', 2), 'Response Secretary Test', 'M', 'publicador');
insert into public.user_profiles(id, member_id, system_role, is_active) values
  (pg_temp.management_test_id('01', 1), pg_temp.management_test_id('02', 1), 'coordenador', true),
  (pg_temp.management_test_id('01', 2), pg_temp.management_test_id('02', 2), 'secretario', true);
update public.role_permissions set can_view_assignments = true
where role in ('coordenador', 'secretario');
insert into public.midweek_meetings(id, date, president_id)
values (pg_temp.management_test_id('03', 1), (now() at time zone 'America/Sao_Paulo')::date + 30, pg_temp.management_test_id('02', 1));

set local role authenticated;
select set_config('request.jwt.claim.sub', pg_temp.management_test_id('01', 1)::text, true);
select is(jsonb_array_length(public.get_meeting_assignment_responses('midweek', pg_temp.management_test_id('03', 1))), 1,
  'active coordinator with assignment permission can read meeting responses');
select is(public.get_meeting_assignment_responses('midweek', pg_temp.management_test_id('03', 1))->0->>'member_name',
  'Response Manager Test', 'response read includes the assigned member name');
select is(public.get_meeting_assignment_responses('midweek', pg_temp.management_test_id('03', 1))->0->'notification'->>'decline_reason',
  null::text, 'pending response has no decline reason');
select public.respond_to_meeting_assignment(
  (select id from public.member_assignment_notifications where source_id = pg_temp.management_test_id('03', 1)),
  (select assignment_revision from public.member_assignment_notifications where source_id = pg_temp.management_test_id('03', 1)),
  'declined', 'Not available on that date');
select is(public.get_meeting_assignment_responses('midweek', pg_temp.management_test_id('03', 1))->0->'notification'->>'decline_reason',
  'Not available on that date', 'authorized coordinator can read the recorded refusal reason');

select set_config('request.jwt.claim.sub', pg_temp.management_test_id('01', 2)::text, true);
select throws_ok(
  $$select public.get_meeting_assignment_responses('midweek', 'ef000000-0000-0000-0000-0300000001'::uuid)$$,
  '42501', 'meeting_assignment_responses_forbidden', 'secretary without manager role cannot read responses or reasons');
select is((select count(*) from public.member_assignment_notifications), 0::bigint,
  'secretary RLS cannot read another members meeting response or reason');

select * from finish();
rollback;
