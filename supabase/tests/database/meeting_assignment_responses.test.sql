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
from generate_series(1, 8) n join public.midweek_meetings m on m.id = pg_temp.meeting_test_id('03', n);
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
) x(n, source_type, slot_key, category);
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
select * from finish();
rollback;
