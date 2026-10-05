begin;
create extension if not exists pgtap with schema extensions;
select no_plan();

create function pg_temp.program_id(p_prefix text, p_n integer) returns uuid
language sql immutable as $$
  select ('ef000000-0000-0000-0000-' || p_prefix || lpad(p_n::text, 10, '0'))::uuid;
$$;

insert into auth.users(id, email)
values(pg_temp.program_id('01', 1), 'meeting-program-manager@example.invalid');
insert into public.members(id, full_name, gender, spiritual_status)
values(pg_temp.program_id('02', 1), 'Meeting program manager', 'M', 'publicador');
insert into public.user_profiles(id, member_id, system_role, is_active)
values(pg_temp.program_id('01', 1), pg_temp.program_id('02', 1), 'coordenador', true);
update public.role_permissions set can_edit_assignments = true where role = 'coordenador';
insert into public.midweek_meetings(id, date, bible_reading, president_id)
values(pg_temp.program_id('03', 1), (now() at time zone 'America/Sao_Paulo')::date + 10000, 'Salmos 1', pg_temp.program_id('02', 1)),
      (pg_temp.program_id('03', 2), (now() at time zone 'America/Sao_Paulo')::date + 10001, 'Salmos 2', pg_temp.program_id('02', 1));
insert into public.midweek_ministry_parts(id, meeting_id, part_number, title, duration)
values(pg_temp.program_id('04', 1), pg_temp.program_id('03', 1), 1, 'Parte A', 5),
      (pg_temp.program_id('04', 2), pg_temp.program_id('03', 1), 2, 'Parte B', 6),
      (pg_temp.program_id('04', 3), pg_temp.program_id('03', 2), 1, 'Parte de outra reunião', 5);
update public.midweek_ministry_parts set student_id = pg_temp.program_id('02', 1)
where id in (pg_temp.program_id('04', 1), pg_temp.program_id('04', 2));
insert into public.midweek_christian_life_parts(id, meeting_id, part_number, title, duration)
values(pg_temp.program_id('05', 1), pg_temp.program_id('03', 1), 1, 'Consideração', 10);

select has_function('public', 'update_midweek_program', array['uuid','jsonb'], 'atomic meeting update RPC exists');
select ok(has_function_privilege('authenticated', 'public.update_midweek_program(uuid,jsonb)', 'execute'), 'authenticated can invoke the authorized RPC');
select ok(not has_function_privilege('anon', 'public.update_midweek_program(uuid,jsonb)', 'execute'), 'anonymous cannot invoke the RPC');
select has_function('public', 'reconcile_meeting_assignment_notifications', array['text','uuid'], 'admin reconciliation wrapper exists');
select ok(not has_function_privilege('anon', 'public.reconcile_meeting_assignment_notifications(text,uuid)', 'execute'), 'anonymous cannot reconcile notifications');

create temporary table original_program as
select (select id from public.midweek_ministry_parts where id = pg_temp.program_id('04', 1)) as first_part,
       (select id from public.midweek_ministry_parts where id = pg_temp.program_id('04', 2)) as second_part,
       (select assignment_revision from public.member_assignment_notifications where source_id = pg_temp.program_id('04', 1) and slot_key = 'student_id') as revision;

set local role authenticated;
select set_config('request.jwt.claim.sub', pg_temp.program_id('01', 1)::text, true);

select is(public.update_midweek_program(pg_temp.program_id('03', 1), jsonb_build_object(
  'date', (now() at time zone 'America/Sao_Paulo')::date + 10000,
  'bible_reading', 'Salmos 1',
  'president_id', pg_temp.program_id('02', 1),
  'ministry_parts', jsonb_build_array(
    jsonb_build_object('id', pg_temp.program_id('04', 1), 'title', 'Parte A', 'duration', 5, 'student_id', pg_temp.program_id('02', 1)),
    jsonb_build_object('id', pg_temp.program_id('04', 2), 'title', 'Parte B', 'duration', 6, 'student_id', pg_temp.program_id('02', 1))
  ),
  'christian_life_parts', jsonb_build_array(jsonb_build_object('id', pg_temp.program_id('05', 1), 'title', 'Consideração', 'duration', 10))
)), pg_temp.program_id('03', 1), 'no-op returns the meeting ID');
select is((select id from public.midweek_ministry_parts where part_number = 1 and meeting_id = pg_temp.program_id('03', 1)),
  (select first_part from original_program), 'no-op preserves first part ID');
select is((select assignment_revision from public.member_assignment_notifications where source_id = pg_temp.program_id('04', 1) and slot_key = 'student_id'),
  (select revision from original_program), 'no-op preserves assignment revision');
select ok((select assignment_revision is not null from public.member_assignment_notifications where source_id = pg_temp.program_id('04', 1) and slot_key = 'student_id'), 'assignment revision fixture exists');

select public.update_midweek_program(pg_temp.program_id('03', 1), jsonb_build_object(
  'date', (now() at time zone 'America/Sao_Paulo')::date + 10000,
  'bible_reading', 'Salmos 1',
  'president_id', pg_temp.program_id('02', 1),
  'ministry_parts', jsonb_build_array(
    jsonb_build_object('id', pg_temp.program_id('04', 2), 'title', 'Parte B revisada', 'duration', 6, 'student_id', pg_temp.program_id('02', 1)),
    jsonb_build_object('id', pg_temp.program_id('04', 1), 'title', 'Parte A', 'duration', 5, 'student_id', pg_temp.program_id('02', 1)),
    jsonb_build_object('title', 'Parte nova', 'duration', 3)
  ),
  'christian_life_parts', jsonb_build_array(jsonb_build_object('id', pg_temp.program_id('05', 1), 'title', 'Consideração', 'duration', 10))
));
select is((select id from public.midweek_ministry_parts where meeting_id = pg_temp.program_id('03', 1) and part_number = 1),
  pg_temp.program_id('04', 2), 'reorder keeps B identity and changes order');
select is((select id from public.midweek_ministry_parts where meeting_id = pg_temp.program_id('03', 1) and part_number = 2),
  pg_temp.program_id('04', 1), 'reorder keeps A identity and changes order');
select is((select count(*)::integer from public.midweek_ministry_parts where meeting_id = pg_temp.program_id('03', 1)), 3, 'insertion adds one part');
select is((select count(*)::integer from public.midweek_ministry_parts where meeting_id = pg_temp.program_id('03', 1) and title = 'Parte nova'), 1, 'new part is persisted');

select public.update_midweek_program(pg_temp.program_id('03', 1), jsonb_build_object(
  'date', (now() at time zone 'America/Sao_Paulo')::date + 10000,
  'bible_reading', 'Salmos 1',
  'president_id', pg_temp.program_id('02', 1),
  'ministry_parts', jsonb_build_array(jsonb_build_object('id', pg_temp.program_id('04', 1), 'title', 'Parte A', 'duration', 5, 'student_id', pg_temp.program_id('02', 1))),
  'christian_life_parts', jsonb_build_array(jsonb_build_object('id', pg_temp.program_id('05', 1), 'title', 'Consideração', 'duration', 10))
));
select is((select count(*)::integer from public.midweek_ministry_parts where meeting_id = pg_temp.program_id('03', 1)), 1, 'only omitted rows are deleted');
select is((select id from public.midweek_ministry_parts where meeting_id = pg_temp.program_id('03', 1)), pg_temp.program_id('04', 1), 'retained row ID survives selective delete');

select throws_ok($$select public.update_midweek_program(pg_temp.program_id('03', 1), jsonb_build_object(
  'date', (now() at time zone 'America/Sao_Paulo')::date + 10000, 'bible_reading', 'Salmos 1',
  'president_id', pg_temp.program_id('02', 1),
  'ministry_parts', jsonb_build_array(jsonb_build_object('id', pg_temp.program_id('04', 3), 'title', 'Foreign', 'duration', 5)),
  'christian_life_parts', '[]'::jsonb
))$$, '22023', 'meeting_part_id_invalid', 'foreign meeting part ID is rejected');
select is((select date from public.midweek_meetings where id = pg_temp.program_id('03', 1)),
  (now() at time zone 'America/Sao_Paulo')::date + 10000, 'foreign ID rejection leaves header unchanged');

select throws_ok($$select public.update_midweek_program(pg_temp.program_id('03', 1), jsonb_build_object(
  'date', (now() at time zone 'America/Sao_Paulo')::date + 10000, 'bible_reading', 'Must roll back',
  'president_id', pg_temp.program_id('02', 1),
  'ministry_parts', jsonb_build_array(jsonb_build_object('id', pg_temp.program_id('04', 1), 'title', 'Will roll back', 'duration', 5, 'student_id', pg_temp.program_id('02', 99))),
  'christian_life_parts', '[]'::jsonb
))$$, '23503', null, 'part foreign key error aborts the entire update');
select is((select bible_reading from public.midweek_meetings where id = pg_temp.program_id('03', 1)), 'Salmos 1', 'failed part write rolls back header update');
select is((select count(*)::integer from public.midweek_ministry_parts where meeting_id = pg_temp.program_id('03', 1)), 1, 'failed update rolls back part deletes/inserts');
select is((select student_id from public.midweek_ministry_parts where id = pg_temp.program_id('04', 1)), pg_temp.program_id('02', 1), 'failed update rolls back part mutations');
reset role;

insert into auth.users(id, email) values(pg_temp.program_id('01', 2), 'meeting-program-publisher@example.invalid');
insert into public.user_profiles(id, member_id, system_role, is_active)
values(pg_temp.program_id('01', 2), pg_temp.program_id('02', 1), 'publicador', true);
set local role authenticated;
select set_config('request.jwt.claim.sub', pg_temp.program_id('01', 2)::text, true);
select throws_ok($$select public.update_midweek_program(pg_temp.program_id('03', 1), '{}'::jsonb)$$, '42501', 'meeting_assignment_access_denied', 'publisher cannot edit meeting program');
reset role;

select * from finish();
rollback;
