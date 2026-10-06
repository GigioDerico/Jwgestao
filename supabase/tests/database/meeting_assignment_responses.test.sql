begin;
create extension if not exists pgtap with schema extensions;
select no_plan();

-- Isolated identities, using the same role/JWT simulation as transfer tests.
create function pg_temp.meeting_test_id(p_prefix text, p_n integer) returns uuid
language sql immutable as $$
  select ('ee000000-0000-0000-0000-' || p_prefix || lpad(p_n::text, 10, '0'))::uuid;
$$;
insert into auth.users(id, email)
select pg_temp.meeting_test_id('01', n), 'meeting-response-' || n || '@example.invalid'
from generate_series(1, 5) n;
insert into public.members(id, full_name, gender, spiritual_status)
select pg_temp.meeting_test_id('02', n), 'Meeting response fixture ' || n, 'M', 'publicador'
from generate_series(1, 5) n;
insert into public.user_profiles(id, member_id, system_role, is_active)
select pg_temp.meeting_test_id('01', n), pg_temp.meeting_test_id('02', n),
  (case n when 3 then 'coordenador' when 4 then 'secretario' else 'publicador' end)::public.system_role_enum,
  n <> 5
from generate_series(1, 5) n;
update public.role_permissions set can_view_assignments = true;
insert into public.midweek_meetings(id, date, president_id)
select pg_temp.meeting_test_id('03', n),
  (now() at time zone 'America/Sao_Paulo')::date + case when n = 8 then -1 else 10000 + n end,
  pg_temp.meeting_test_id('02', 1)
from generate_series(1, 8) n;
insert into public.member_assignment_notifications(
  id, member_id, source_type, source_id, slot_key, category, assignment_date,
  title, message, assignment_revision, assignment_snapshot
)
select pg_temp.meeting_test_id('04', n), pg_temp.meeting_test_id('02', 1),
  'midweek_meeting_role', pg_temp.meeting_test_id('03', n), 'president_id', 'midweek', m.date,
  'Fixture', 'Fixture', pg_temp.meeting_test_id('05', n),
  private.resolve_meeting_assignment('midweek_meeting_role', m.id, 'president_id')
from generate_series(1, 8) n join public.midweek_meetings m on m.id = pg_temp.meeting_test_id('03', n)
on conflict (member_id, source_type, source_id, slot_key) do update set
  id = excluded.id, assignment_revision = excluded.assignment_revision,
  assignment_snapshot = excluded.assignment_snapshot;
insert into public.midweek_ministry_parts(id, meeting_id, part_number, title, duration, student_id, assistant_id, room, scheduled_time)
values(pg_temp.meeting_test_id('06', 1), pg_temp.meeting_test_id('03', 1), 4, 'Parte pessoal', 5,
  pg_temp.meeting_test_id('02', 1), pg_temp.meeting_test_id('02', 2), 'Sala B', '19:45');

insert into public.midweek_christian_life_parts(id, meeting_id, part_number, title, duration, speaker_id)
values(pg_temp.meeting_test_id('08', 1), pg_temp.meeting_test_id('03', 1), 7, 'Consideração', 10, pg_temp.meeting_test_id('02', 1));
insert into public.weekend_meetings(id, date, talk_speaker_name, president_id, watchtower_conductor_id, watchtower_reader_id, closing_prayer_id, superintendent_visit)
values(pg_temp.meeting_test_id('09', 1), (now() at time zone 'America/Sao_Paulo')::date + 10001,
  'Orador externo', pg_temp.meeting_test_id('02', 1), pg_temp.meeting_test_id('02', 1),
  pg_temp.meeting_test_id('02', 2), pg_temp.meeting_test_id('02', 1), true);
select is(private.resolve_meeting_assignment('weekend_meeting_role', pg_temp.meeting_test_id('09', 1), 'watchtower_conductor_id'), null::jsonb, 'visit suspends watchtower conductor');
select is(private.resolve_meeting_assignment('weekend_meeting_role', pg_temp.meeting_test_id('09', 1), 'watchtower_reader_id'), null::jsonb, 'visit suspends watchtower reader');
select is(private.resolve_meeting_assignment('weekend_meeting_role', pg_temp.meeting_test_id('09', 1), 'closing_prayer_id'), null::jsonb, 'visit suspends closing prayer');
select is(private.resolve_meeting_assignment('weekend_meeting_role', pg_temp.meeting_test_id('09', 1), 'president_id')->>'member_id', pg_temp.meeting_test_id('02', 1)::text, 'visit preserves president');
select is(private.resolve_meeting_assignment('midweek_christian_life_part', pg_temp.meeting_test_id('08', 1), 'speaker_id')->>'title', 'Consideração', 'Christian life title resolves');
select is(private.resolve_meeting_assignment('midweek_christian_life_part', pg_temp.meeting_test_id('08', 1), 'speaker_id')->>'time', null::text, 'missing part time is not invented from meeting start');

-- Reproduce the pre-migration schema state only within this rolled-back transaction.
-- Save the exact constraint definition rather than maintaining a duplicate in this test.
create temporary table legacy_notification_constraint as
select pg_catalog.pg_get_constraintdef(c.oid) as definition
from pg_catalog.pg_constraint c
where c.conrelid = 'public.member_assignment_notifications'::regclass
  and c.conname = 'meeting_assignment_status_check';
alter table public.member_assignment_notifications drop constraint meeting_assignment_status_check;
update public.midweek_meetings set
  opening_prayer_id = pg_temp.meeting_test_id('02', 1),
  closing_prayer_id = pg_temp.meeting_test_id('02', 1),
  treasure_talk_speaker_id = pg_temp.meeting_test_id('02', 1),
  treasure_gems_speaker_id = pg_temp.meeting_test_id('02', 2)
where id = pg_temp.meeting_test_id('03', 7);
insert into public.member_assignment_notifications(
  id, member_id, source_type, source_id, slot_key, category, title, message,
  status, confirmed_at, revoked_at, updated_at
)
select pg_temp.meeting_test_id('10', x.n), pg_temp.meeting_test_id('02', 1),
  x.source_type,
  case when x.n < 5 then pg_temp.meeting_test_id('03', 7) else pg_temp.meeting_test_id('11', x.n) end,
  x.slot_key, x.category, 'Legacy hidden fixture', 'Legacy hidden fixture', 'hidden',
  case when x.n in (1, 4, 5) then '2026-01-02 12:00:00+00'::timestamptz end,
  case when x.n = 3 then '2026-01-02 13:00:00+00'::timestamptz end,
  '2026-01-02 14:00:00+00'::timestamptz
from (values
  (1, 'midweek_meeting_role', 'opening_prayer_id', 'midweek'),
  (2, 'midweek_meeting_role', 'closing_prayer_id', 'midweek'),
  (3, 'midweek_meeting_role', 'treasure_talk_speaker_id', 'midweek'),
  (4, 'midweek_meeting_role', 'treasure_gems_speaker_id', 'midweek'),
  (5, 'cart_assignment', 'publisher1', 'cart'),
  (6, 'audio_video_assignment', 'sound', 'audio_video')
) x(n, source_type, slot_key, category)
on conflict (member_id, source_type, source_id, slot_key) do update set
  id = excluded.id, status = excluded.status, confirmed_at = excluded.confirmed_at,
  revoked_at = excluded.revoked_at, updated_at = excluded.updated_at,
  assignment_revision = null, assignment_snapshot = null;
select lives_ok($$select private.backfill_meeting_assignment_responses()$$, 'migration helper handles legacy hidden records');
select is((select status from public.member_assignment_notifications where id = pg_temp.meeting_test_id('10', 1)), 'confirmed', 'hidden current confirmation is recovered');
select is((select responded_at from public.member_assignment_notifications where id = pg_temp.meeting_test_id('10', 1)), '2026-01-02 12:00:00+00'::timestamptz, 'backfill recovers exact confirmation timestamp');
select is((select hidden_at from public.member_assignment_notifications where id = pg_temp.meeting_test_id('10', 1)), '2026-01-02 14:00:00+00'::timestamptz, 'backfill recovers hiding timestamp independently');
select is((select status from public.member_assignment_notifications where id = pg_temp.meeting_test_id('10', 2)), 'pending_confirmation', 'hidden current assignment without evidence stays pending');
select ok((select responded_at is null and confirmed_at is null from public.member_assignment_notifications where id = pg_temp.meeting_test_id('10', 2)), 'pending backfill does not manufacture a response');
select is((select status from public.member_assignment_notifications where id = pg_temp.meeting_test_id('10', 3)), 'revoked', 'proven revocation is preserved even when slot remains assigned');
select is((select revoked_at from public.member_assignment_notifications where id = pg_temp.meeting_test_id('10', 3)), '2026-01-02 13:00:00+00'::timestamptz, 'known revocation date is preserved');
select is((select status from public.member_assignment_notifications where id = pg_temp.meeting_test_id('10', 4)), 'revoked', 'reassigned hidden confirmation is revoked');
select ok((select assignment_snapshot is null and responded_at = confirmed_at from public.member_assignment_notifications where id = pg_temp.meeting_test_id('10', 4)), 'old recipient retains known response without replacement member snapshot');
select is((select status from public.member_assignment_notifications where id = pg_temp.meeting_test_id('10', 5)), 'confirmed', 'hidden nonmeeting confirmation is recovered');
select is((select responded_at from public.member_assignment_notifications where id = pg_temp.meeting_test_id('10', 5)), '2026-01-02 12:00:00+00'::timestamptz, 'nonmeeting known response timestamp is preserved');
select ok((select assignment_revision is null and hidden_at is not null from public.member_assignment_notifications where id = pg_temp.meeting_test_id('10', 5)), 'legacy source gets hiding metadata without meeting revision');
select ok((select status = 'pending_confirmation' and responded_at is null and hidden_at is not null from public.member_assignment_notifications where id = pg_temp.meeting_test_id('10', 6)), 'hidden nonmeeting record without response evidence stays pending');
create temporary table legacy_backfill_once as
select id, to_jsonb(n) as notification from public.member_assignment_notifications n
where id between pg_temp.meeting_test_id('10', 1) and pg_temp.meeting_test_id('10', 6);
select private.backfill_meeting_assignment_responses();
select is_empty($$select n.id from public.member_assignment_notifications n join legacy_backfill_once b using (id)
  where to_jsonb(n) is distinct from b.notification$$, 'backfill reentry preserves UUIDs, snapshots, visibility and response timestamps');
do $$
begin
  execute 'alter table public.member_assignment_notifications add constraint meeting_assignment_status_check '
    || (select definition from legacy_notification_constraint);
end;
$$;
select ok(not has_function_privilege('authenticated', 'private.backfill_meeting_assignment_responses()', 'execute'), 'legacy migration helper cannot be called by clients');

select has_column('public', 'member_assignment_notifications', 'hidden_at', 'hiding is independent');
select has_column('public', 'member_assignment_notifications', 'responded_at', 'response timestamp exists');
select has_function('public', 'respond_to_meeting_assignment', array['uuid','uuid','text','text'], 'response RPC exists');
select ok(not has_function_privilege('anon', 'public.respond_to_meeting_assignment(uuid,uuid,text,text)', 'execute'), 'anon cannot respond');
select ok(not has_function_privilege('authenticated', 'private.resolve_meeting_assignment(text,uuid,text)', 'execute'), 'resolver stays internal');
select is(private.resolve_meeting_assignment('bogus', pg_temp.meeting_test_id('03', 1), 'president_id'), null::jsonb, 'invalid source is null');
select is(private.resolve_meeting_assignment('midweek_meeting_role', pg_temp.meeting_test_id('03', 1), 'id'), null::jsonb, 'unlisted slot is null');
select is(private.resolve_meeting_assignment('midweek_meeting_role', pg_temp.meeting_test_id('03', 1), 'closing_prayer_id'), null::jsonb, 'unassigned slot is null');
select is(private.resolve_meeting_assignment('midweek_ministry_part', pg_temp.meeting_test_id('06', 1), 'student_id')->>'partner_name', 'Meeting response fixture 2', 'only own part partner is resolved');
select is(private.resolve_meeting_assignment('midweek_ministry_part', pg_temp.meeting_test_id('06', 1), 'assistant_id')->>'member_id', pg_temp.meeting_test_id('02', 2)::text, 'assistant resolves independently');
select is(private.resolve_meeting_assignment('midweek_ministry_part', pg_temp.meeting_test_id('06', 1), 'student_id')->>'time', '19:45:00', 'saved part time is used');
select is(private.resolve_meeting_assignment('midweek_meeting_role', pg_temp.meeting_test_id('03', 1), 'president_id')->>'duration', null::text, 'absent role duration stays null');

set local role authenticated;
select set_config('request.jwt.claim.sub', pg_temp.meeting_test_id('01', 1)::text, true);
select is(public.respond_to_meeting_assignment(pg_temp.meeting_test_id('04', 1), pg_temp.meeting_test_id('05', 1), 'confirmed')->>'status', 'confirmed', 'own current assignment confirms');
select ok((select responded_at is not null and responded_at = confirmed_at from public.member_assignment_notifications where id = pg_temp.meeting_test_id('04', 1)), 'confirmation saves the known timestamp');
select lives_ok($$select public.respond_to_meeting_assignment(pg_temp.meeting_test_id('04', 1), pg_temp.meeting_test_id('05', 1), 'confirmed')$$, 'same confirmation is idempotent');
select throws_ok($$select public.respond_to_meeting_assignment(pg_temp.meeting_test_id('04', 1), pg_temp.meeting_test_id('05', 1), 'declined', 'Troca')$$, '40001', 'meeting_assignment_response_conflict', 'opposite response conflicts');
select throws_ok($$select public.respond_to_meeting_assignment(pg_temp.meeting_test_id('04', 2), pg_temp.meeting_test_id('05', 2), 'declined', '')$$, '22023', 'meeting_assignment_reason_invalid', 'empty refusal rejected');
select throws_ok($$select public.respond_to_meeting_assignment(pg_temp.meeting_test_id('04', 2), pg_temp.meeting_test_id('05', 2), 'declined', E' \t\n ')$$, '22023', 'meeting_assignment_reason_invalid', 'whitespace refusal rejected');
select throws_ok($$select public.respond_to_meeting_assignment(pg_temp.meeting_test_id('04', 2), pg_temp.meeting_test_id('05', 2), 'declined', repeat('a', 501))$$, '22023', 'meeting_assignment_reason_invalid', '501 characters rejected');
select is(public.respond_to_meeting_assignment(pg_temp.meeting_test_id('04', 2), pg_temp.meeting_test_id('05', 2), 'declined', repeat('á', 500))->>'status', 'declined', '500 Unicode characters accepted');
select lives_ok($$select public.respond_to_meeting_assignment(pg_temp.meeting_test_id('04', 2), pg_temp.meeting_test_id('05', 2), 'declined', repeat('á', 500))$$, 'identical refusal is idempotent');
select throws_ok($$select public.respond_to_meeting_assignment(pg_temp.meeting_test_id('04', 2), pg_temp.meeting_test_id('05', 2), 'declined', 'Outro motivo')$$, '40001', 'meeting_assignment_response_conflict', 'changed reason conflicts');
reset role;
create temporary table saved_responses_before_backfill as
select id, to_jsonb(n) as notification from public.member_assignment_notifications n
where id in (pg_temp.meeting_test_id('04', 1), pg_temp.meeting_test_id('04', 2));
select private.backfill_meeting_assignment_responses();
select is_empty($$select n.id from public.member_assignment_notifications n join saved_responses_before_backfill b using (id)
  where to_jsonb(n) is distinct from b.notification$$, 'backfill reentry preserves new confirmed and declined responses with their versions');
set local role authenticated;
select throws_ok($$select public.respond_to_meeting_assignment(pg_temp.meeting_test_id('04', 3), pg_temp.meeting_test_id('05', 4), 'confirmed')$$, '40001', 'meeting_assignment_revision_conflict', 'stale version rejected');
select throws_ok($$select public.respond_to_meeting_assignment(pg_temp.meeting_test_id('04', 8), pg_temp.meeting_test_id('05', 8), 'confirmed')$$, '22023', 'meeting_assignment_past', 'past assignment cannot respond');
-- Seed the exact current version as saved just before Sao Paulo midnight.
-- The request below represents a connection-loss retry after that day has passed.
reset role;
update public.member_assignment_notifications
set status = 'confirmed',
    responded_at = ((now() at time zone 'America/Sao_Paulo')::date - 1 + time '23:59:59') at time zone 'America/Sao_Paulo',
    confirmed_at = ((now() at time zone 'America/Sao_Paulo')::date - 1 + time '23:59:59') at time zone 'America/Sao_Paulo'
where id = pg_temp.meeting_test_id('04', 8);
create temporary table midnight_response_before as
select to_jsonb(n) as notification from public.member_assignment_notifications n where id = pg_temp.meeting_test_id('04', 8);
grant select on midnight_response_before to authenticated;
set local role authenticated;
select is(public.respond_to_meeting_assignment(pg_temp.meeting_test_id('04', 8), pg_temp.meeting_test_id('05', 8), 'confirmed'),
  (select notification from midnight_response_before), 'identical saved response remains idempotent after Sao Paulo midnight without timestamp changes');
select throws_ok($$select public.respond_to_meeting_assignment(pg_temp.meeting_test_id('04', 8), pg_temp.meeting_test_id('05', 8), 'declined', 'Nova decisão')$$,
  '22023', 'meeting_assignment_past', 'a new decision after midnight remains rejected');
select throws_ok($$select public.respond_to_meeting_assignment(pg_temp.meeting_test_id('04', 8), pg_temp.meeting_test_id('05', 7), 'confirmed')$$,
  '40001', 'meeting_assignment_revision_conflict', 'midnight retry still requires exact saved revision');
select throws_ok($$update public.member_assignment_notifications set source_id = pg_temp.meeting_test_id('03', 3) where id = pg_temp.meeting_test_id('04', 1)$$, '42501', 'meeting_assignment_direct_write_forbidden', 'owner cannot rewrite source');
select throws_ok($$update public.member_assignment_notifications set decline_reason = 'Forjado' where id = pg_temp.meeting_test_id('04', 2)$$, '42501', 'meeting_assignment_direct_write_forbidden', 'owner cannot rewrite response');
select lives_ok($$update public.member_assignment_notifications set hidden_at = now(), is_read = true, read_at = now() where id = pg_temp.meeting_test_id('04', 1)$$, 'owner can hide/read');
select is((select status from public.member_assignment_notifications where id = pg_temp.meeting_test_id('04', 1)), 'confirmed', 'hiding preserves confirmation');
select set_config('request.jwt.claim.sub', pg_temp.meeting_test_id('01', 2)::text, true);
select is((select count(*) from public.member_assignment_notifications where id = pg_temp.meeting_test_id('04', 2)), 0::bigint, 'other member cannot read refusal');
select throws_ok($$select public.respond_to_meeting_assignment(pg_temp.meeting_test_id('04', 3), pg_temp.meeting_test_id('05', 3), 'confirmed')$$, '42501', 'meeting_assignment_unavailable', 'other member cannot respond');
select set_config('request.jwt.claim.sub', pg_temp.meeting_test_id('01', 4)::text, true);
select is((select count(*) from public.member_assignment_notifications where id = pg_temp.meeting_test_id('04', 2)), 0::bigint, 'secretary legacy role cannot read meeting refusal');
select set_config('request.jwt.claim.sub', pg_temp.meeting_test_id('01', 3)::text, true);
select is((select decline_reason from public.member_assignment_notifications where id = pg_temp.meeting_test_id('04', 2)), repeat('á', 500), 'coordinator can inspect refusal');

set local role authenticated;
select set_config('request.jwt.claim.sub', pg_temp.meeting_test_id('01', 1)::text, true);
select is(public.respond_to_meeting_assignment(pg_temp.meeting_test_id('04', 2), pg_temp.meeting_test_id('05', 2), 'confirmed')->>'status',
  'confirmed', 'participant can reconsider refusal on current assignment');
select is((select decline_reason from public.member_assignment_notifications where id=pg_temp.meeting_test_id('04', 2)),
  null::text, 'reconsidering clears the refusal reason');
select set_config('request.jwt.claim.sub', pg_temp.meeting_test_id('01', 3)::text, true);

-- UPDATE policies give managers no meeting rows. Zero changes is also protection.
select is_empty($$update public.member_assignment_notifications set status = 'pending_confirmation' where id = pg_temp.meeting_test_id('04', 2) returning id$$, 'manager cannot directly change another response');
reset role;
-- Give coordinator a personal notification to exercise guard even when own-row UPDATE is allowed.
update public.user_profiles set member_id = pg_temp.meeting_test_id('02', 1) where id = pg_temp.meeting_test_id('01', 3);
set local role authenticated;
select throws_ok($$update public.member_assignment_notifications set status = 'pending_confirmation' where id = pg_temp.meeting_test_id('04', 2)$$, '42501', 'meeting_assignment_direct_write_forbidden', 'administrative client cannot bypass response guard on own row');
reset role;
update public.midweek_meetings set president_id = null where id = pg_temp.meeting_test_id('03', 4);
update public.midweek_meetings set opening_comments_duration = 7 where id = pg_temp.meeting_test_id('03', 6);
select is(private.resolve_meeting_assignment('midweek_meeting_role', pg_temp.meeting_test_id('03', 6), 'president_id')->>'duration', '7', 'president snapshot includes opening comments duration');
set local role authenticated;
select set_config('request.jwt.claim.sub', pg_temp.meeting_test_id('01', 1)::text, true);
select throws_ok($$select public.respond_to_meeting_assignment(pg_temp.meeting_test_id('04', 4), pg_temp.meeting_test_id('05', 4), 'confirmed')$$, '42501', 'meeting_assignment_unavailable', 'removed assignment cannot respond');
select throws_ok($$select public.respond_to_meeting_assignment(pg_temp.meeting_test_id('04', 6), pg_temp.meeting_test_id('05', 6), 'confirmed')$$, '40001', 'meeting_assignment_revision_conflict', 'changed president duration cannot accept old response');
reset role;
update public.role_permissions set can_view_assignments = false where role = 'publicador';
set local role authenticated;
select throws_ok($$select public.respond_to_meeting_assignment(pg_temp.meeting_test_id('04', 3), pg_temp.meeting_test_id('05', 3), 'confirmed')$$, '42501', 'meeting_assignment_access_denied', 'permission is checked by response RPC');
reset role;
update public.role_permissions set can_view_assignments = true where role = 'publicador';
set local role authenticated;
select set_config('request.jwt.claim.sub', pg_temp.meeting_test_id('01', 5)::text, true);
select throws_ok($$select public.respond_to_meeting_assignment(pg_temp.meeting_test_id('04', 3), pg_temp.meeting_test_id('05', 3), 'confirmed')$$, '42501', 'meeting_assignment_access_denied', 'inactive profile cannot respond');
reset role;
update public.user_profiles set is_active = false where id = pg_temp.meeting_test_id('01', 1);
insert into public.member_transfers(member_id, transferred_at, previous_spiritual_status, previous_profile_is_active, transferred_by)
values (pg_temp.meeting_test_id('02', 1), current_date, 'publicador', true, pg_temp.meeting_test_id('01', 3));
set local role authenticated;
select set_config('request.jwt.claim.sub', pg_temp.meeting_test_id('01', 1)::text, true);
select throws_ok($$select public.respond_to_meeting_assignment(pg_temp.meeting_test_id('04', 3), pg_temp.meeting_test_id('05', 3), 'confirmed')$$, '42501', 'meeting_assignment_access_denied', 'transferred member cannot respond');
reset role;
-- Outside meeting sources, the established secretary/admin behavior remains intact.
insert into public.member_assignment_notifications(id, member_id, source_type, source_id, slot_key, category, title, message)
values(pg_temp.meeting_test_id('07', 1), pg_temp.meeting_test_id('02', 2), 'cart_assignment', pg_temp.meeting_test_id('07', 2), 'publisher1', 'cart', 'Legacy fixture', 'Legacy fixture');
set local role authenticated;
select set_config('request.jwt.claim.sub', pg_temp.meeting_test_id('01', 4)::text, true);
select is((select count(*) from public.member_assignment_notifications where id = pg_temp.meeting_test_id('07', 1)), 1::bigint, 'secretary still reads legacy categories');
select lives_ok($$update public.member_assignment_notifications set status = 'confirmed', confirmed_at = now() where id = pg_temp.meeting_test_id('07', 1)$$, 'legacy direct confirmation remains available');

-- Transactional synchronization: fixtures write sources only, never notifications.
reset role;
delete from public.member_transfers where member_id = pg_temp.meeting_test_id('02', 1);
update public.user_profiles set is_active = true where id = pg_temp.meeting_test_id('01', 1);
update public.role_permissions set can_view_assignments = true;
create function pg_temp.synced_notification(p_source uuid, p_slot text, p_member integer default 1)
returns jsonb language sql stable as $$
  select to_jsonb(n) from public.member_assignment_notifications n
  where n.source_id = p_source and n.slot_key = p_slot and n.member_id = pg_temp.meeting_test_id('02', p_member);
$$;
insert into public.midweek_meetings(id, date, president_id)
values(pg_temp.meeting_test_id('12', 1), (now() at time zone 'America/Sao_Paulo')::date + 11001, pg_temp.meeting_test_id('02', 1));
insert into public.midweek_ministry_parts(id, meeting_id, part_number, title, duration, room, scheduled_time, student_id, assistant_id)
values(pg_temp.meeting_test_id('13', 1), pg_temp.meeting_test_id('12', 1), 4, 'Parte sincronizada', 5, 'Sala A', '19:40', pg_temp.meeting_test_id('02', 1), pg_temp.meeting_test_id('02', 2));
insert into public.midweek_christian_life_parts(id, meeting_id, part_number, title, duration, speaker_id)
values(pg_temp.meeting_test_id('14', 1), pg_temp.meeting_test_id('12', 1), 7, 'Consideração', 10, pg_temp.meeting_test_id('02', 1));
select is((select count(*) from public.member_assignment_notifications where source_id in (pg_temp.meeting_test_id('12', 1),pg_temp.meeting_test_id('13', 1),pg_temp.meeting_test_id('14', 1))), 4::bigint, 'source inserts create all four personal notifications without frontend sync');
select is(pg_temp.synced_notification(pg_temp.meeting_test_id('13', 1), 'student_id')->>'title', 'Nova designação na reunião do meio de semana', 'sync preserves existing notification title');
select is(pg_temp.synced_notification(pg_temp.meeting_test_id('13', 1), 'student_id')->>'message',
  'Você foi designado para Estudante em Parte sincronizada em ' || to_char((now() at time zone 'America/Sao_Paulo')::date + 11001, 'DD/MM') || '.', 'sync preserves role/title/date message');
select ok(not has_function_privilege('authenticated', 'private.sync_meeting_assignment_notifications(text,uuid)', 'execute'), 'clients cannot invoke trusted sync');
select ok(not has_function_privilege('authenticated', 'private.backfill_meeting_assignment_notifications()', 'execute'), 'clients cannot invoke backfill');
set local role authenticated;
select set_config('request.jwt.claim.sub', pg_temp.meeting_test_id('01', 1)::text, true);
select is(public.respond_to_meeting_assignment(
  (pg_temp.synced_notification(pg_temp.meeting_test_id('13', 1), 'student_id')->>'id')::uuid,
  (pg_temp.synced_notification(pg_temp.meeting_test_id('13', 1), 'student_id')->>'assignment_revision')::uuid, 'confirmed')->>'status', 'confirmed', 'student confirms own synchronized assignment');
select is(public.respond_to_meeting_assignment(
  (pg_temp.synced_notification(pg_temp.meeting_test_id('14', 1), 'speaker_id')->>'id')::uuid,
  (pg_temp.synced_notification(pg_temp.meeting_test_id('14', 1), 'speaker_id')->>'assignment_revision')::uuid, 'confirmed')->>'status', 'confirmed', 'separate part records its own response before another part changes');
select set_config('request.jwt.claim.sub', pg_temp.meeting_test_id('01', 2)::text, true);
select is(public.respond_to_meeting_assignment(
  (pg_temp.synced_notification(pg_temp.meeting_test_id('13', 1), 'assistant_id', 2)->>'id')::uuid,
  (pg_temp.synced_notification(pg_temp.meeting_test_id('13', 1), 'assistant_id', 2)->>'assignment_revision')::uuid, 'declined', 'Viagem')->>'status', 'declined', 'assistant independently declines');
reset role;
update public.member_assignment_notifications set hidden_at = now(), is_read = true where source_id = pg_temp.meeting_test_id('13', 1);
create temporary table sync_saved as select n.id, to_jsonb(n) as notification
from public.member_assignment_notifications n where source_id in (pg_temp.meeting_test_id('12', 1),pg_temp.meeting_test_id('13', 1),pg_temp.meeting_test_id('14', 1));
update public.midweek_meetings set president_id = president_id where id = pg_temp.meeting_test_id('12', 1);
update public.midweek_ministry_parts set title = title, duration = duration where id = pg_temp.meeting_test_id('13', 1);
update public.midweek_christian_life_parts set title = title where id = pg_temp.meeting_test_id('14', 1);
select is_empty($$select n.id from public.member_assignment_notifications n join sync_saved s using(id)
  where to_jsonb(n) is distinct from s.notification$$, 'unchanged header/parts preserve exact response, reason, visibility, timestamp and UUID');
update public.members set full_name = 'New display name' where id = pg_temp.meeting_test_id('02', 2);
update public.midweek_ministry_parts set title = title where id = pg_temp.meeting_test_id('13', 1);
select is_empty($$select n.id from public.member_assignment_notifications n join sync_saved s using(id)
  where to_jsonb(n) is distinct from s.notification$$, 'partner display-name-only change preserves response and revision');
update public.midweek_ministry_parts set duration = 6 where id = pg_temp.meeting_test_id('13', 1);
select is((select count(*) from public.member_assignment_notifications n join sync_saved s using(id)
  where n.source_id = pg_temp.meeting_test_id('13', 1) and n.assignment_revision::text <> s.notification->>'assignment_revision'), 2::bigint, 'duration change renews independent student and assistant versions');
select is((select count(*) from public.member_assignment_notifications where source_id = pg_temp.meeting_test_id('13', 1)
  and status = 'pending_confirmation' and responded_at is null and confirmed_at is null and decline_reason is null and hidden_at is null and not is_read), 2::bigint, 'relevant change clears response and hiding for both participants');
select is_empty($$select n.id from public.member_assignment_notifications n join sync_saved s using(id)
  where n.source_id <> pg_temp.meeting_test_id('13', 1) and to_jsonb(n) is distinct from s.notification$$, 'change in one part preserves unrelated part/header records');
create temporary table sync_duration as select pg_temp.synced_notification(pg_temp.meeting_test_id('13', 1), 'student_id') as notification;
update public.midweek_ministry_parts set room = 'Sala B' where id = pg_temp.meeting_test_id('13', 1);
select isnt(pg_temp.synced_notification(pg_temp.meeting_test_id('13', 1), 'student_id')->>'assignment_revision', (select notification->>'assignment_revision' from sync_duration), 'room change renews revision');
create temporary table sync_room as select pg_temp.synced_notification(pg_temp.meeting_test_id('13', 1), 'student_id') as notification;
update public.midweek_ministry_parts set assistant_id = pg_temp.meeting_test_id('02', 3) where id = pg_temp.meeting_test_id('13', 1);
select isnt(pg_temp.synced_notification(pg_temp.meeting_test_id('13', 1), 'student_id')->>'assignment_revision', (select notification->>'assignment_revision' from sync_room), 'partner ID change renews student version');
select is(pg_temp.synced_notification(pg_temp.meeting_test_id('13', 1), 'assistant_id', 2)->>'status', 'revoked', 'replaced assistant is revoked');
select is(pg_temp.synced_notification(pg_temp.meeting_test_id('13', 1), 'assistant_id', 3)->>'status', 'pending_confirmation', 'replacement assistant gets own current notification');
set local role authenticated;
select set_config('request.jwt.claim.sub', pg_temp.meeting_test_id('01', 1)::text, true);
select public.respond_to_meeting_assignment(
  (pg_temp.synced_notification(pg_temp.meeting_test_id('13', 1), 'student_id')->>'id')::uuid,
  (pg_temp.synced_notification(pg_temp.meeting_test_id('13', 1), 'student_id')->>'assignment_revision')::uuid, 'confirmed');
reset role;
create temporary table sync_original as select pg_temp.synced_notification(pg_temp.meeting_test_id('13', 1), 'student_id') as notification;
grant select on sync_original to authenticated;
update public.midweek_ministry_parts set student_id = pg_temp.meeting_test_id('02', 4) where id = pg_temp.meeting_test_id('13', 1);
select is(pg_temp.synced_notification(pg_temp.meeting_test_id('13', 1), 'student_id')->>'status', 'revoked', 'A to B revokes A');
set local role authenticated;
select set_config('request.jwt.claim.sub', pg_temp.meeting_test_id('01', 1)::text, true);
select throws_ok($$select public.respond_to_meeting_assignment(
  (select (notification->>'id')::uuid from sync_original), (select (notification->>'assignment_revision')::uuid from sync_original), 'confirmed')$$,
  '42501', 'meeting_assignment_unavailable', 'A old version cannot respond while B owns slot');
reset role;
update public.midweek_ministry_parts set student_id = pg_temp.meeting_test_id('02', 1) where id = pg_temp.meeting_test_id('13', 1);
select is(pg_temp.synced_notification(pg_temp.meeting_test_id('13', 1), 'student_id')->>'id', (select notification->>'id' from sync_original), 'A to B to A reuses unique notification ID');
select isnt(pg_temp.synced_notification(pg_temp.meeting_test_id('13', 1), 'student_id')->>'assignment_revision', (select notification->>'assignment_revision' from sync_original), 'A to B to A renews revision even with identical content');
select is(pg_temp.synced_notification(pg_temp.meeting_test_id('13', 1), 'student_id')->'assignment_snapshot', (select notification->'assignment_snapshot' from sync_original), 'returned assignment content is identical');
select ok((select status = 'pending_confirmation' and confirmed_at is null and responded_at is null
  from public.member_assignment_notifications where id = (select (notification->>'id')::uuid from sync_original)), 'A to B to A never resurrects A previous confirmation');
set local role authenticated;
select set_config('request.jwt.claim.sub', pg_temp.meeting_test_id('01', 1)::text, true);
select throws_ok($$select public.respond_to_meeting_assignment(
  (select (notification->>'id')::uuid from sync_original), (select (notification->>'assignment_revision')::uuid from sync_original), 'confirmed')$$,
  '40001', 'meeting_assignment_revision_conflict', 'original A version cannot confirm reattributed A');
reset role;
-- Removing a filled slot revokes the response; assigning the same person back
-- starts a fresh version and must not revive their earlier confirmation.
set local role authenticated;
select set_config('request.jwt.claim.sub', pg_temp.meeting_test_id('01', 3)::text, true);
select public.respond_to_meeting_assignment(
  (pg_temp.synced_notification(pg_temp.meeting_test_id('13', 1), 'assistant_id', 3)->>'id')::uuid,
  (pg_temp.synced_notification(pg_temp.meeting_test_id('13', 1), 'assistant_id', 3)->>'assignment_revision')::uuid, 'confirmed');
reset role;
create temporary table sync_assistant_confirmed as
select pg_temp.synced_notification(pg_temp.meeting_test_id('13', 1), 'assistant_id', 3) as notification;
grant select on sync_assistant_confirmed to authenticated;
update public.midweek_ministry_parts set assistant_id = null where id = pg_temp.meeting_test_id('13', 1);
select is(pg_temp.synced_notification(pg_temp.meeting_test_id('13', 1), 'assistant_id', 3)->>'status', 'revoked', 'removing a filled slot revokes its prior response');
update public.midweek_ministry_parts set assistant_id = pg_temp.meeting_test_id('02', 3) where id = pg_temp.meeting_test_id('13', 1);
select is(pg_temp.synced_notification(pg_temp.meeting_test_id('13', 1), 'assistant_id', 3)->>'id', (select notification->>'id' from sync_assistant_confirmed), 'reattributing same person reuses unique recipient row');
select isnt(pg_temp.synced_notification(pg_temp.meeting_test_id('13', 1), 'assistant_id', 3)->>'assignment_revision', (select notification->>'assignment_revision' from sync_assistant_confirmed), 'reattributing same person renews the prior version');
select ok((select status = 'pending_confirmation' and confirmed_at is null and responded_at is null
  and decline_reason is null and revoked_at is null and hidden_at is null and not is_read
  from public.member_assignment_notifications where id = (select (notification->>'id')::uuid from sync_assistant_confirmed)), 'reattributed slot starts pending with no resurrected response or visibility state');
set local role authenticated;
select set_config('request.jwt.claim.sub', pg_temp.meeting_test_id('01', 3)::text, true);
select throws_ok($$select public.respond_to_meeting_assignment(
  (select (notification->>'id')::uuid from sync_assistant_confirmed), (select (notification->>'assignment_revision')::uuid from sync_assistant_confirmed), 'confirmed')$$,
  '40001', 'meeting_assignment_revision_conflict', 'removed slot version cannot respond after reassignment');
reset role;
create temporary table sync_before_backfill as select n.id, to_jsonb(n) as notification from public.member_assignment_notifications n;
select private.backfill_meeting_assignment_notifications();
select is_empty($$select n.id from public.member_assignment_notifications n join sync_before_backfill s using(id)
  where to_jsonb(n) is distinct from s.notification$$, 'sync backfill preserves all existing versions, responses and proven revocations');
delete from public.member_assignment_notifications where source_id = pg_temp.meeting_test_id('14', 1);
select private.backfill_meeting_assignment_notifications();
select is(pg_temp.synced_notification(pg_temp.meeting_test_id('14', 1), 'speaker_id')->>'status', 'pending_confirmation', 'backfill creates missing current/future assignment');
delete from public.midweek_ministry_parts where id = pg_temp.meeting_test_id('13', 1);
select is((select count(*) from public.member_assignment_notifications where source_id = pg_temp.meeting_test_id('13', 1) and status <> 'revoked'), 0::bigint, 'deleted part revokes all recipients');
select ok(pg_temp.synced_notification(pg_temp.meeting_test_id('13', 1), 'student_id')->'assignment_snapshot' is not null, 'deleted part retains historical snapshot');
set local role authenticated;
select set_config('request.jwt.claim.sub', pg_temp.meeting_test_id('01', 1)::text, true);
select throws_ok($$select public.respond_to_meeting_assignment(
  (pg_temp.synced_notification(pg_temp.meeting_test_id('13', 1), 'student_id')->>'id')::uuid,
  (pg_temp.synced_notification(pg_temp.meeting_test_id('13', 1), 'student_id')->>'assignment_revision')::uuid, 'confirmed')$$,
  '42501', 'meeting_assignment_unavailable', 'deleted part cannot receive a response');
reset role;
create temporary table sync_deleted as select pg_temp.synced_notification(pg_temp.meeting_test_id('13', 1), 'student_id') as notification;
insert into public.midweek_ministry_parts(id, meeting_id, part_number, title, duration, room, scheduled_time, student_id, assistant_id)
values(pg_temp.meeting_test_id('13', 1), pg_temp.meeting_test_id('12', 1), 4, 'Parte sincronizada', 6, 'Sala B', '19:40', pg_temp.meeting_test_id('02', 1), pg_temp.meeting_test_id('02', 3));
select is(pg_temp.synced_notification(pg_temp.meeting_test_id('13', 1), 'student_id')->>'id', (select notification->>'id' from sync_deleted), 'recreated identical source reuses unique recipient row');
select isnt(pg_temp.synced_notification(pg_temp.meeting_test_id('13', 1), 'student_id')->>'assignment_revision', (select notification->>'assignment_revision' from sync_deleted), 'recreated identical source renews its revoked version');
select is(pg_temp.synced_notification(pg_temp.meeting_test_id('13', 1), 'student_id')->>'status', 'pending_confirmation', 'recreated source starts pending without old response');
delete from public.midweek_ministry_parts where id = pg_temp.meeting_test_id('13', 1);
insert into public.midweek_meetings(id, date, president_id)
values(pg_temp.meeting_test_id('12', 2), (now() at time zone 'America/Sao_Paulo')::date - 10, pg_temp.meeting_test_id('02', 1));
insert into public.midweek_christian_life_parts(id, meeting_id, part_number, title, duration, speaker_id)
values(pg_temp.meeting_test_id('14', 2), pg_temp.meeting_test_id('12', 2), 7, 'Parte histórica', 10, pg_temp.meeting_test_id('02', 1));
select private.backfill_meeting_assignment_notifications();
select is((select count(*) from public.member_assignment_notifications where source_id in (pg_temp.meeting_test_id('12', 2),pg_temp.meeting_test_id('14', 2))), 0::bigint, 'past source inserts/backfill create no historical pending notifications');
create temporary table sync_historical as select to_jsonb(n) as notification from public.member_assignment_notifications n where id = pg_temp.meeting_test_id('04', 8);
update public.midweek_meetings set opening_comments_duration = 8 where id = pg_temp.meeting_test_id('03', 8);
select is((select to_jsonb(n) from public.member_assignment_notifications n where id = pg_temp.meeting_test_id('04', 8)), (select notification from sync_historical), 'historical edit retains known response, snapshot and version without new pending state');
insert into public.weekend_meetings(id, date, president_id, watchtower_conductor_id, watchtower_reader_id)
values(pg_temp.meeting_test_id('15', 1), (now() at time zone 'America/Sao_Paulo')::date + 11002,
  pg_temp.meeting_test_id('02', 1), pg_temp.meeting_test_id('02', 1), pg_temp.meeting_test_id('02', 2));
select is((select count(*) from public.member_assignment_notifications where source_id = pg_temp.meeting_test_id('15', 1)), 3::bigint, 'weekend insertion synchronizes all assigned active slots');
update public.weekend_meetings set superintendent_visit = true where id = pg_temp.meeting_test_id('15', 1);
select is(pg_temp.synced_notification(pg_temp.meeting_test_id('15', 1), 'watchtower_conductor_id')->>'status', 'revoked', 'visit toggle revokes suppressed weekend slot');
select is(pg_temp.synced_notification(pg_temp.meeting_test_id('15', 1), 'president_id')->>'status', 'pending_confirmation', 'visit preserves active weekend president');
create temporary table sync_before_settings as select n.id, to_jsonb(n) as notification from public.member_assignment_notifications n
where source_id in (pg_temp.meeting_test_id('12', 1), pg_temp.meeting_test_id('15', 1));
insert into public.app_settings(key, value) values('midweek_meeting_time', '18:17')
on conflict(key) do update set value = excluded.value;
select is(pg_temp.synced_notification(pg_temp.meeting_test_id('12', 1), 'president_id')->'assignment_snapshot'->>'start_time', '18:17', 'midweek configured start is synchronized');
select is_empty($$select n.id from public.member_assignment_notifications n join sync_before_settings s using(id)
  where n.source_id = pg_temp.meeting_test_id('15', 1) and to_jsonb(n) is distinct from s.notification$$, 'midweek configuration does not renew weekend versions');
create temporary table sync_settings_version as select pg_temp.synced_notification(pg_temp.meeting_test_id('12', 1), 'president_id') as notification;
update public.app_settings set value = '18:18' where key = 'midweek_meeting_time';
select isnt(pg_temp.synced_notification(pg_temp.meeting_test_id('12', 1), 'president_id')->>'assignment_revision', (select notification->>'assignment_revision' from sync_settings_version), 'configured time change renews applicable future version');
create temporary table sync_settings_same as select pg_temp.synced_notification(pg_temp.meeting_test_id('12', 1), 'president_id') as notification;
update public.app_settings set value = value where key = 'midweek_meeting_time';
select is(pg_temp.synced_notification(pg_temp.meeting_test_id('12', 1), 'president_id'), (select notification from sync_settings_same), 'unchanged setting preserves exact assignment row');
insert into public.midweek_meetings(id, date, president_id)
values(pg_temp.meeting_test_id('12', 3), (now() at time zone 'America/Sao_Paulo')::date, pg_temp.meeting_test_id('02', 1));
select is(pg_temp.synced_notification(pg_temp.meeting_test_id('12', 3), 'president_id')->>'status', 'pending_confirmation', 'same-day source creates a respondable pending assignment');
insert into public.midweek_christian_life_parts(id, meeting_id, part_number, title, duration, speaker_id)
values(pg_temp.meeting_test_id('14', 3), pg_temp.meeting_test_id('12', 3), 8, 'Parte movida', 10, pg_temp.meeting_test_id('02', 1));
create temporary table sync_moved as select pg_temp.synced_notification(pg_temp.meeting_test_id('14', 3), 'speaker_id') as notification;
grant select on sync_moved to authenticated;
update public.midweek_christian_life_parts set meeting_id = pg_temp.meeting_test_id('12', 1) where id = pg_temp.meeting_test_id('14', 3);
select is(pg_temp.synced_notification(pg_temp.meeting_test_id('14', 3), 'speaker_id')->>'id', (select notification->>'id' from sync_moved), 'moving part keeps its notification identity');
select is(pg_temp.synced_notification(pg_temp.meeting_test_id('14', 3), 'speaker_id')->'assignment_snapshot'->>'meeting_id', pg_temp.meeting_test_id('12', 1)::text, 'moving part updates its parent snapshot');
select isnt(pg_temp.synced_notification(pg_temp.meeting_test_id('14', 3), 'speaker_id')->>'assignment_revision', (select notification->>'assignment_revision' from sync_moved), 'moving part invalidates previous parent version');
set local role authenticated;
select set_config('request.jwt.claim.sub', pg_temp.meeting_test_id('01', 1)::text, true);
select throws_ok($$select public.respond_to_meeting_assignment(
  (select (notification->>'id')::uuid from sync_moved), (select (notification->>'assignment_revision')::uuid from sync_moved), 'confirmed')$$,
  '40001', 'meeting_assignment_revision_conflict', 'old moved-part request cannot confirm its new parent version');
reset role;
select is((select count(*) from pg_catalog.pg_trigger t
  where t.tgname = 'lock_meeting_assignment_parents' and t.tgtype = 30
    and t.tgrelid in ('public.midweek_meetings'::regclass,'public.weekend_meetings'::regclass,
      'public.midweek_ministry_parts'::regclass,'public.midweek_christian_life_parts'::regclass,'public.app_settings'::regclass)),
  5::bigint, 'all source and setting writes acquire ordered parent locks in BEFORE STATEMENT triggers');
select ok(not has_function_privilege('authenticated', 'private.lock_meeting_assignment_scope()', 'execute'), 'scope lock is internal to trusted writers');
delete from public.midweek_meetings where id = pg_temp.meeting_test_id('12', 1);
select is(pg_temp.synced_notification(pg_temp.meeting_test_id('14', 1), 'speaker_id')->>'status', 'revoked', 'parent deletion revokes cascading child assignment');
delete from public.weekend_meetings where id = pg_temp.meeting_test_id('15', 1);
select is(pg_temp.synced_notification(pg_temp.meeting_test_id('15', 1), 'president_id')->>'status', 'revoked', 'weekend deletion revokes role');

-- Personal read RPCs expose only the authenticated recipient's normalized assignments.
select has_function('public', 'get_personal_meetings', array['text'], 'personal meeting list RPC exists');
select has_function('public', 'get_personal_meeting_assignments', array['text','uuid'], 'personal meeting detail RPC exists');
select has_function('public', 'resolve_personal_assignment', array['uuid','uuid'], 'direct link resolver exists');
select ok(not has_function_privilege('anon', 'public.get_personal_meetings(text)', 'execute'), 'anonymous users cannot list meetings');
select ok(has_function_privilege('authenticated', 'private.get_personal_meeting_assignments(text,uuid)', 'execute')
  and not has_function_privilege('anon', 'private.get_personal_meeting_assignments(text,uuid)', 'execute'),
  'private personal read helper is not available to anonymous callers');
reset role;
update public.member_assignment_notifications set hidden_at='2026-10-05 14:00:00+00', status='confirmed',
  confirmed_at='2026-10-05 13:00:00+00', responded_at='2026-10-05 13:00:00+00', decline_reason=null, revoked_at=null
where id=pg_temp.meeting_test_id('04',1);
update public.member_assignment_notifications set status='declined', decline_reason='Private reason secret', responded_at=now()
where source_id=pg_temp.meeting_test_id('06',1) and slot_key='assistant_id' and member_id=pg_temp.meeting_test_id('02',2);
update public.member_assignment_notifications set status='declined', decline_reason='Meu motivo pessoal', responded_at=now()
where source_id=pg_temp.meeting_test_id('06',1) and slot_key='student_id' and member_id=pg_temp.meeting_test_id('02',1);
update public.midweek_meetings set president_id=pg_temp.meeting_test_id('02',2) where id=pg_temp.meeting_test_id('03',8);
insert into public.midweek_ministry_parts(id,meeting_id,part_number,title,duration,student_id,assistant_id)
values(pg_temp.meeting_test_id('13',8),pg_temp.meeting_test_id('03',8),5,'Parte histórica',5,
  pg_temp.meeting_test_id('02',2),pg_temp.meeting_test_id('02',3));
insert into public.member_assignment_notifications(id,member_id,source_type,source_id,slot_key,category,assignment_date,
  title,message,status,assignment_revision,revoked_at)
select pg_temp.meeting_test_id('10',8),pg_temp.meeting_test_id('02',1),'midweek_ministry_part',p.id,'student_id','midweek',m.date,
  'Reunião','Estudante na parte histórica', 'revoked',pg_temp.meeting_test_id('05',8),now()
from public.midweek_ministry_parts p join public.midweek_meetings m on m.id=p.meeting_id
where p.id=pg_temp.meeting_test_id('13',8);
update public.midweek_meetings set date=(now() at time zone 'America/Sao_Paulo')::date-2
where id=pg_temp.meeting_test_id('03',1);
set local role authenticated;
select set_config('request.jwt.claim.sub', pg_temp.meeting_test_id('01',1)::text, true);
select ok(jsonb_array_length(public.get_personal_meetings('upcoming')) > 0, 'upcoming list includes registered meetings even when assignments are not pending');
select is(jsonb_array_length(public.get_personal_meeting_assignments('midweek',pg_temp.meeting_test_id('03',1))),3,
  'personal detail includes the member roles, student slot and Christian life slot');
select is((public.get_personal_meeting_assignments('midweek',pg_temp.meeting_test_id('03',1))->0->'notification'->>'status'),
  'confirmed', 'personal assignment preserves recorded response status');
select ok(not exists(select 1 from jsonb_array_elements(public.get_personal_meeting_assignments('midweek',pg_temp.meeting_test_id('03',1))) a(value)
  where (a.value->>'can_respond')::boolean), 'future notification date cannot make a now-past meeting respondable');
select is((select (m->>'pending_count')::integer from jsonb_array_elements(public.get_personal_meetings('past')) m
  where m->>'id'=pg_temp.meeting_test_id('03',1)::text), 0, 'past meeting contributes zero to personal pending count');
select ok(not (public.get_personal_meeting_assignments('midweek',pg_temp.meeting_test_id('03',1))::text ~ 'Private reason secret|555|phone|phone_number'),
  'personal detail excludes unrelated decline reasons and telephone fields');
select is((select a.value->'notification'->>'hidden_at' from jsonb_array_elements(public.get_personal_meeting_assignments('midweek',pg_temp.meeting_test_id('03',1))) as a(value)
  where a.value->'notification'->>'id'=pg_temp.meeting_test_id('04',1)::text), '2026-10-05T14:00:00+00:00',
  'hidden confirmed notification remains available with independent hidden timestamp');
select ok((select a.value->'notification'->>'status'='confirmed' and a.value->'notification'->>'decline_reason' is null
  from jsonb_array_elements(public.get_personal_meeting_assignments('midweek',pg_temp.meeting_test_id('03',1))) as a(value)
  where a.value->'notification'->>'id'=pg_temp.meeting_test_id('04',1)::text),
  'the returned own response has its own correct status and no unrelated decline reason');
select is((select a.value->'notification'->>'decline_reason' from jsonb_array_elements(public.get_personal_meeting_assignments('midweek',pg_temp.meeting_test_id('03',1))) as a(value)
  where a.value->'notification'->>'source_id'=pg_temp.meeting_test_id('06',1)::text
    and a.value->'notification'->>'slot_key'='student_id'),
  'Meu motivo pessoal', 'member sees the refusal reason attached to their own assignment');
select is((select a.value->'notification'->>'status' from jsonb_array_elements(public.get_personal_meeting_assignments('midweek',pg_temp.meeting_test_id('03',8))) as a(value)
  where a.value->'notification'->>'id'=pg_temp.meeting_test_id('04',8)::text),
  'revoked', 'past assignment revoked after its date remains in history with its response state');
select is((select a.value->>'role_label' from jsonb_array_elements(public.get_personal_meeting_assignments('midweek',pg_temp.meeting_test_id('03',8))) as a(value)
  where a.value->'notification'->>'id'=pg_temp.meeting_test_id('04',8)::text),
  'Presidente', 'snapshot preserves the former publisher’s own assignment details');
select ok(not (public.get_personal_meeting_assignments('midweek',pg_temp.meeting_test_id('03',8))::text ~ 'Meeting response fixture 2|phone|Private reason secret'),
  'revoked historical detail does not show the current assignee or their private response');
select is((select a.value->>'role_label' from jsonb_array_elements(public.get_personal_meeting_assignments('midweek',pg_temp.meeting_test_id('03',8))) as a(value)
  where a.value->'notification'->>'id'=pg_temp.meeting_test_id('10',8)::text),
  'Designação anterior', 'past no-snapshot history does not resolve today’s assignee into the former publisher’s details');
select ok(not exists(select 1 from jsonb_array_elements(public.get_personal_meeting_assignments('midweek',pg_temp.meeting_test_id('03',8))) as a(value)
  where (a.value->>'can_respond')::boolean), 'past source without response evidence cannot be answered');
select is(public.resolve_personal_assignment(pg_temp.meeting_test_id('04',1),pg_temp.meeting_test_id('99',1))->>'kind',
  'changed', 'link with stale revision reports changed without silently adapting it');
select is(public.resolve_personal_assignment(pg_temp.meeting_test_id('04',1),pg_temp.meeting_test_id('99',1))->>'current_path',
  '/assignments/meetings?assignment='||pg_temp.meeting_test_id('04',1)::text||'&revision='||
    (select assignment_revision::text from public.member_assignment_notifications where id=pg_temp.meeting_test_id('04',1)),
  'only intended recipient gets current assignment path after revision mismatch');
select is(public.resolve_personal_assignment(
  (select id from public.member_assignment_notifications where source_id=pg_temp.meeting_test_id('06',1) and slot_key='assistant_id'),
  (select assignment_revision from public.member_assignment_notifications where source_id=pg_temp.meeting_test_id('06',1) and slot_key='assistant_id'))->>'kind',
  'unavailable', 'another recipient assignment id returns generic unavailable');
reset role;
delete from public.member_assignment_notifications where id=pg_temp.meeting_test_id('04',8);
set local role authenticated;
select set_config('request.jwt.claim.sub', pg_temp.meeting_test_id('01',2)::text, true);
select is(jsonb_array_length(public.get_personal_meeting_assignments('midweek',pg_temp.meeting_test_id('03',1))),1,
  'assistant sees only the assistant slot assigned to them');
select is((public.get_personal_meeting_assignments('midweek',pg_temp.meeting_test_id('03',1))->0->>'role_label'), 'Ajudante',
  'assistant sees own function label');
select * from finish();
rollback;
