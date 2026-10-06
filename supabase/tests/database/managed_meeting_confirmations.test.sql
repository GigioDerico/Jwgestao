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
insert into public.audio_video_assignments(id,date,weekday,sound,image,stage,roving_mic_1,roving_mic_2,attendants,sound_member_id)
values(pg_temp.av_id(31),current_date+10000,'quinta-feira','AV regression 1','','','','',array[]::varchar[],pg_temp.av_id(11));
set local role authenticated;
select set_config('request.jwt.claim.sub',pg_temp.av_id(1)::text,true);
do $$ declare n jsonb; begin
 select a->'notification' into n from jsonb_array_elements(public.get_personal_meeting_assignments('midweek',pg_temp.av_id(21))) a where a->'notification'->>'slot_key'='sound';
 perform public.respond_to_meeting_assignment((n->>'id')::uuid,(n->>'assignment_revision')::uuid,'declined','Viagem de trabalho');
 begin perform public.get_managed_meeting_confirmations(date_trunc('month',current_date+10000)::date); raise exception 'publicador accessed management'; exception when insufficient_privilege then null; end;
end $$;
reset role;
update public.user_profiles set system_role='coordenador' where id=pg_temp.av_id(2);
update public.role_permissions set can_view_assignments=true where role='coordenador';
set local role authenticated;
select set_config('request.jwt.claim.sub',pg_temp.av_id(2)::text,true);
do $$ declare g jsonb; r jsonb; begin
 select a into g from jsonb_array_elements(public.get_managed_meeting_confirmations(date_trunc('month',current_date+10000)::date)) a where a->>'id'=pg_temp.av_id(21)::text;
 perform pg_temp.av_assert(g->>'kind'='midweek','grouped meeting returned');
 select a into r from jsonb_array_elements(g->'responses') a where a->'notification'->>'slot_key'='sound';
 perform pg_temp.av_assert(r->'notification'->>'decline_reason'='Viagem de trabalho','audio reason visible to manager');
 perform pg_temp.av_assert(jsonb_array_length(public.get_meeting_assignment_responses('midweek',pg_temp.av_id(21)))=2,'normal and audio assignments included');
 begin perform public.get_managed_meeting_confirmations(date_trunc('month',current_date+10000)::date+1); raise exception 'invalid month accepted'; exception when invalid_parameter_value then null; end;
end $$;
reset role;
update public.user_profiles set is_active=false where id=pg_temp.av_id(2);
set local role authenticated;
do $$ begin begin perform public.get_managed_meeting_confirmations(date_trunc('month',current_date+10000)::date); raise exception 'inactive manager accessed'; exception when insufficient_privilege then null; end; end $$;
reset role;
rollback;
select 'managed meeting confirmations regression passed' as result;
