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
set local role authenticated;
select set_config('request.jwt.claim.sub',pg_temp.av_id(1)::text,true);
do $$ declare a jsonb; n jsonb; m jsonb; begin
  select value into a from jsonb_array_elements(public.get_personal_meeting_assignments('midweek',pg_temp.av_id(21)))
    where value->'notification'->>'slot_key'='student_id';
  n:=a->'notification';
  perform public.respond_to_meeting_assignment((n->>'id')::uuid,(n->>'assignment_revision')::uuid,'confirmed');
  select value into a from jsonb_array_elements(public.get_personal_meeting_assignments('midweek',pg_temp.av_id(21)))
    where value->'notification'->>'slot_key'='student_id';
  perform pg_temp.av_assert(a->>'can_respond'='true','confirmed assignment can still respond');
  n:=public.respond_to_meeting_assignment((n->>'id')::uuid,(n->>'assignment_revision')::uuid,'pending_confirmation');
  perform pg_temp.av_assert(n->>'status'='pending_confirmation' and n->>'confirmed_at' is null
    and n->>'responded_at' is null and n->>'decline_reason' is null,'returning to pending clears prior response');
  select value into m from jsonb_array_elements(public.get_personal_meetings('upcoming')) where value->>'id'=pg_temp.av_id(21)::text;
  perform pg_temp.av_assert(m->>'pending_count'='2' and m->>'confirmed_count'='0','counts restored to pending');
  n:=public.respond_to_meeting_assignment((n->>'id')::uuid,(n->>'assignment_revision')::uuid,'confirmed');
  begin
    perform public.respond_to_meeting_assignment((n->>'id')::uuid,(n->>'assignment_revision')::uuid,'declined','');
    raise exception 'empty refusal accepted';
  exception when invalid_parameter_value then null;
  end;
  n:=public.respond_to_meeting_assignment((n->>'id')::uuid,(n->>'assignment_revision')::uuid,'declined','Imprevisto familiar');
  perform pg_temp.av_assert(n->>'status'='declined' and n->>'confirmed_at' is null
    and n->>'decline_reason'='Imprevisto familiar','confirmed participant may refuse with reason');
  select value into m from jsonb_array_elements(public.get_personal_meetings('upcoming')) where value->>'id'=pg_temp.av_id(21)::text;
  perform pg_temp.av_assert(m->>'declined_count'='1' and m->>'confirmed_count'='0','refusal counts replace confirmation');
  n:=public.respond_to_meeting_assignment((n->>'id')::uuid,(n->>'assignment_revision')::uuid,'confirmed');
  perform pg_temp.av_assert(n->>'status'='confirmed' and n->>'decline_reason' is null,'participant can confirm again');
end $$;
reset role;
rollback;
select 'confirmed assignment reconsideration regression passed' as result;
