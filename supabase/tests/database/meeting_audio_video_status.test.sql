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
-- Legacy audio row starts without a parent meeting and keeps its recorded confirmation when one is registered.
insert into public.audio_video_assignments(id,date,weekday,sound,image,stage,roving_mic_1,roving_mic_2,attendants,
  stage_member_id) values (pg_temp.av_id(32),(now() at time zone 'America/Sao_Paulo')::date+10001,
  'Domingo','','','AV regression 1','','',array[]::varchar[],pg_temp.av_id(11));
insert into public.member_assignment_notifications(id,member_id,source_type,source_id,slot_key,category,assignment_date,title,message,status,confirmed_at)
values(pg_temp.av_id(42),pg_temp.av_id(11),'audio_video_role',pg_temp.av_id(32),'stage','audio_video',
  (now() at time zone 'America/Sao_Paulo')::date+10001,'Legacy','Legacy','confirmed','2026-10-01 12:00:00+00') on conflict(member_id,source_type,source_id,slot_key) do update set id=excluded.id,status=excluded.status,confirmed_at=excluded.confirmed_at;
insert into public.weekend_meetings(id,date,talk_speaker_name) values(pg_temp.av_id(22),(now() at time zone 'America/Sao_Paulo')::date+10001,'External speaker');
select pg_temp.av_assert((select status='confirmed' and confirmed_at='2026-10-01 12:00:00+00' and responded_at=confirmed_at and assignment_revision is not null
  from public.member_assignment_notifications where id=pg_temp.av_id(42)),'legacy confirmation preserved and versioned on meeting creation');
select pg_temp.av_assert(private.resolve_meeting_assignment('audio_video_role',pg_temp.av_id(32),'stage')->>'meeting_kind'='weekend','weekend audio slot resolves');
insert into public.midweek_meetings(id,date) values(pg_temp.av_id(21),(now() at time zone 'America/Sao_Paulo')::date+10000);
insert into public.audio_video_assignments(id,date,weekday,sound,image,stage,roving_mic_1,roving_mic_2,attendants,
  sound_member_id,image_member_id,attendants_member_ids) values
  (pg_temp.av_id(31),(now() at time zone 'America/Sao_Paulo')::date+10000,'quinta-feira','AV regression 1','AV regression 2','','','',
   array['AV regression 1'],pg_temp.av_id(11),pg_temp.av_id(12),array[pg_temp.av_id(11)]);
select pg_temp.av_assert(private.resolve_meeting_assignment('audio_video_role',pg_temp.av_id(31),'sound')->>'meeting_id'=pg_temp.av_id(21)::text,'audio slot resolves into dated meeting');
select pg_temp.av_assert(private.resolve_meeting_assignment('audio_video_role',pg_temp.av_id(31),'attendant:0')->>'member_id'=pg_temp.av_id(11)::text,'attendant membership resolves');
select pg_temp.av_assert(private.resolve_meeting_assignment('audio_video_role',pg_temp.av_id(31),'unknown') is null,'unknown slot rejected');
set local role authenticated;
select set_config('request.jwt.claim.sub',pg_temp.av_id(1)::text,true);
do $$ declare details jsonb; summary jsonb; n jsonb; saved jsonb; begin
  details:=public.get_personal_meeting_assignments('midweek',pg_temp.av_id(21));
  perform pg_temp.av_assert(jsonb_array_length(details)=2,'only own sound and attendant assignments returned');
  select a->'notification' into n from jsonb_array_elements(details) a where a->'notification'->>'slot_key'='sound';
  saved:=public.respond_to_meeting_assignment((n->>'id')::uuid,(n->>'assignment_revision')::uuid,'declined','Viagem');
  perform pg_temp.av_assert(saved->>'status'='declined','audio refusal saves');
  select a into summary from jsonb_array_elements(public.get_personal_meetings('upcoming')) a where a->>'id'=pg_temp.av_id(21)::text;
  perform pg_temp.av_assert((summary->>'declined_count')::int=1 and (summary->>'pending_count')::int=1,'summary tracks refusal and pending independently');
  saved:=public.respond_to_meeting_assignment((n->>'id')::uuid,(n->>'assignment_revision')::uuid,'confirmed');
  perform pg_temp.av_assert(saved->>'status'='confirmed' and saved->>'decline_reason' is null,'audio refusal can be reconsidered');
  perform set_config('request.jwt.claim.sub',pg_temp.av_id(2)::text,true);
  begin perform public.respond_to_meeting_assignment((n->>'id')::uuid,(n->>'assignment_revision')::uuid,'confirmed');
    raise exception 'other participant unexpectedly responded';
  exception when insufficient_privilege then null; end;
  perform set_config('request.jwt.claim.sub',pg_temp.av_id(1)::text,true);
  perform pg_temp.av_assert(public.resolve_personal_assignment((n->>'id')::uuid,(n->>'assignment_revision')::uuid)->>'kind'='current','audio notification deep link resolves');
  begin update public.member_assignment_notifications set status='pending_confirmation' where id=(n->>'id')::uuid;
    raise exception 'direct response write unexpectedly allowed';
  exception when insufficient_privilege then null; end;
end $$;
reset role;
create temporary table av_original_response as select * from public.member_assignment_notifications where source_id=pg_temp.av_id(31) and slot_key='sound';
grant select on av_original_response to authenticated;
-- Cosmetic source edits preserve the saved response/version.
update public.audio_video_assignments set sound='Cosmetic name' where id=pg_temp.av_id(31);
select pg_temp.av_assert((select n.status='confirmed' and n.assignment_revision=b.assignment_revision from public.member_assignment_notifications n join av_original_response b on b.id=n.id),'cosmetic edits preserve confirmation');
-- Reassignment revokes the former member and resets the new member only.
update public.audio_video_assignments set sound_member_id=pg_temp.av_id(12) where id=pg_temp.av_id(31);
select pg_temp.av_assert((select status='revoked' from public.member_assignment_notifications where source_id=pg_temp.av_id(31) and slot_key='sound' and member_id=pg_temp.av_id(11)),'old participant revoked on replacement');
select pg_temp.av_assert((select status='pending_confirmation' from public.member_assignment_notifications where source_id=pg_temp.av_id(31) and slot_key='sound' and member_id=pg_temp.av_id(12)),'new participant awaits confirmation');
set local role authenticated;
select set_config('request.jwt.claim.sub',pg_temp.av_id(1)::text,true);
do $$ declare n av_original_response%rowtype; begin
 select * into n from av_original_response;
 begin perform public.respond_to_meeting_assignment(n.id,n.assignment_revision,'confirmed'); raise exception 'revoked assignment unexpectedly confirmed';
 exception when insufficient_privilege then null; end;
end $$;
reset role;
-- Removing the preferred same-date parent must immediately attach to the remaining meeting.
insert into public.weekend_meetings(id,date,talk_speaker_name) values(pg_temp.av_id(23),(now() at time zone 'America/Sao_Paulo')::date+10000,'External speaker');
delete from public.midweek_meetings where id=pg_temp.av_id(21);
select pg_temp.av_assert((select status='pending_confirmation' and assignment_snapshot->>'meeting_kind'='weekend'
  from public.member_assignment_notifications where source_id=pg_temp.av_id(31) and slot_key='sound' and member_id=pg_temp.av_id(12)), 'audio immediately attaches to surviving same-date meeting');
-- Moving to an orphan date restores usable legacy notifications rather than leaving revoked versions.
update public.audio_video_assignments set date=(now() at time zone 'America/Sao_Paulo')::date+10002 where id=pg_temp.av_id(31);
select pg_temp.av_assert((select status='pending_confirmation' and assignment_revision is null and assignment_date=(now() at time zone 'America/Sao_Paulo')::date+10002
  from public.member_assignment_notifications where source_id=pg_temp.av_id(31) and slot_key='sound' and member_id=pg_temp.av_id(12)), 'moved orphan scale retains usable notification');
-- Registering its meeting upgrades those notifications again.
insert into public.midweek_meetings(id,date) values(pg_temp.av_id(24),(now() at time zone 'America/Sao_Paulo')::date+10002);
select pg_temp.av_assert((select status='pending_confirmation' and assignment_revision is not null and assignment_snapshot->>'meeting_id'=pg_temp.av_id(24)::text
  from public.member_assignment_notifications where source_id=pg_temp.av_id(31) and slot_key='sound' and member_id=pg_temp.av_id(12)), 'new parent versions previous orphan notification');
delete from public.audio_video_assignments where id=pg_temp.av_id(31);
select pg_temp.av_assert(not exists(select 1 from public.member_assignment_notifications where source_id=pg_temp.av_id(31) and status<>'revoked'),'deleted audio scale revokes active notifications');
-- A replaced orphan participant must reconfirm when assigned again.
insert into public.audio_video_assignments(id,date,weekday,sound,image,stage,roving_mic_1,roving_mic_2,attendants,sound_member_id)
values(pg_temp.av_id(33),(now() at time zone 'America/Sao_Paulo')::date+10003,'Quinta','AV regression 1','','','','',array[]::varchar[],pg_temp.av_id(11));
update public.member_assignment_notifications set status='confirmed',confirmed_at=clock_timestamp()
where source_id=pg_temp.av_id(33) and slot_key='sound' and member_id=pg_temp.av_id(11);
update public.audio_video_assignments set sound_member_id=pg_temp.av_id(12) where id=pg_temp.av_id(33);
update public.audio_video_assignments set sound_member_id=pg_temp.av_id(11) where id=pg_temp.av_id(33);
select pg_temp.av_assert((select status='pending_confirmation' and confirmed_at is null from public.member_assignment_notifications
where source_id=pg_temp.av_id(33) and slot_key='sound' and member_id=pg_temp.av_id(11)), 'reassigned orphan participant must reconfirm');
rollback;
select 'Audio/video status regression passed (rolled back)' as result;
