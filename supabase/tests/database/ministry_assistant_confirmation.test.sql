begin;
create function pg_temp.av_id(n integer) returns uuid language sql immutable as $$
  select ('ef000000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid;
$$;
create function pg_temp.av_assert(ok boolean,label text) returns void language plpgsql as $$
begin if ok is distinct from true then raise exception 'Audio/video regression: %',label; end if; end $$;
insert into auth.users(id,email) values (pg_temp.av_id(1),'av-test-1@example.invalid'),(pg_temp.av_id(2),'av-test-2@example.invalid');
insert into public.members(id,full_name,gender,spiritual_status) values
  (pg_temp.av_id(11),'AV regression 1','M','publicador'),(pg_temp.av_id(12),'AV regression 2','M','publicador');
insert into public.user_profiles(id,member_id,system_role,is_active) values
  (pg_temp.av_id(1),pg_temp.av_id(11),'publicador',true),(pg_temp.av_id(2),pg_temp.av_id(12),'publicador',true);
update public.role_permissions set can_view_assignments=true where role='publicador';
insert into public.midweek_meetings(id,date,president_id) values(pg_temp.av_id(21),current_date+10000,pg_temp.av_id(11));
insert into public.midweek_ministry_parts(id,meeting_id,part_number,title,duration,student_id,assistant_id)
values(pg_temp.av_id(31),pg_temp.av_id(21),4,'Iniciando conversas',3,pg_temp.av_id(11),pg_temp.av_id(12));
select pg_temp.av_assert(not exists(select 1 from public.member_assignment_notifications
  where source_id=pg_temp.av_id(31) and slot_key='assistant_id'),'no assistant request is generated');
-- Simulate a request created before this rule, without deleting response history.
insert into public.member_assignment_notifications(id,member_id,source_type,source_id,slot_key,category,
  assignment_date,title,message,assignment_revision,assignment_snapshot)
values(pg_temp.av_id(41),pg_temp.av_id(12),'midweek_ministry_part',pg_temp.av_id(31),'assistant_id','midweek',
  current_date+10000,'Legacy helper request','Legacy helper request',pg_temp.av_id(42),
  private.resolve_meeting_assignment('midweek_ministry_part',pg_temp.av_id(31),'assistant_id'));
set local role authenticated;
select set_config('request.jwt.claim.sub',pg_temp.av_id(2)::text,true);
do $$ declare a jsonb; m jsonb; begin
  begin
    perform public.respond_to_meeting_assignment(pg_temp.av_id(41),pg_temp.av_id(42),'confirmed');
    raise exception 'assistant response was accepted';
  exception when insufficient_privilege then null;
  end;
  select value into a from jsonb_array_elements(public.get_personal_meeting_assignments('midweek',pg_temp.av_id(21)));
  perform pg_temp.av_assert(a->>'role_label'='Ajudante','assistant remains visible in personal program');
  perform pg_temp.av_assert(a->>'confirmation_required'='false' and a->>'can_respond'='false','assistant cannot respond');
  select value into m from jsonb_array_elements(public.get_personal_meetings('upcoming')) where value->>'id'=pg_temp.av_id(21)::text;
  perform pg_temp.av_assert(m->>'assignment_count'='1','assistant assignment is counted');
  perform pg_temp.av_assert(m->>'pending_count'='0' and m->>'unconfirmed_count'='0','assistant has no pending confirmation');
end $$;
reset role;
update public.midweek_ministry_parts set title=title where id=pg_temp.av_id(31);
select pg_temp.av_assert((select status='revoked' from public.member_assignment_notifications where id=pg_temp.av_id(41)),
  'editing retires a legacy assistant request without deleting its history');
update public.user_profiles set system_role='coordenador' where id=pg_temp.av_id(2);
update public.role_permissions set can_view_assignments=true where role='coordenador';
set local role authenticated;
select set_config('request.jwt.claim.sub',pg_temp.av_id(2)::text,true);
do $$ declare r jsonb; begin
  r:=public.get_meeting_assignment_responses('midweek',pg_temp.av_id(21));
  perform pg_temp.av_assert(jsonb_array_length(r)=2,'manager sees president and student only');
  perform pg_temp.av_assert(not exists(select 1 from jsonb_array_elements(r) a
    where a->'notification'->>'slot_key'='assistant_id'),'manager excludes assistant');
end $$;
reset role;
rollback;
select 'ministry assistant confirmation regression passed' as result;
