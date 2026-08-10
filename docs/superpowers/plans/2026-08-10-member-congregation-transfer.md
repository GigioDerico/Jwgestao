# Member Congregation Transfer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an atomic, reversible member-transfer workflow that inactivates the member, removes future assignments, blocks congregation access, preserves history, and removes the member from every activity selector.

**Architecture:** Supabase Postgres owns the invariant through audited tables, private `SECURITY DEFINER` functions, narrow public RPC wrappers, restrictive active-profile RLS policies, and assignment eligibility triggers. React calls the RPCs through a focused client module, handles inactive sessions centrally in `AuthContext`, and renders a dedicated transfer dialog from `MembersList`. Existing assignment history is merged with transfer audit rows, while the shared eligibility helper remains the single frontend rule for selectors.

**Tech Stack:** React 18, TypeScript 5, Vite 6, Vitest 3, Testing Library, Supabase JS 2.97, Supabase CLI, PostgreSQL, pgTAP, Radix/shadcn Dialog, Sonner.

---

## File map

**Create**

- `vitest.config.ts` — application test configuration.
- `src/test/setup.ts` — jest-dom setup and browser API cleanup.
- `src/app/lib/member-transfer.ts` — transfer DTOs, online guard, RPC calls, and error mapping.
- `src/app/lib/member-transfer.test.ts` — client contract tests with a mocked Supabase fluent API.
- `src/app/lib/member-transfer-history.ts` — pure conversion of transfer audit rows into existing history entries.
- `src/app/lib/member-transfer-history.test.ts` — role-key normalization and audit history tests.
- `src/app/components/MemberTransferDialog.tsx` — transfer/cancel confirmation UI.
- `src/app/components/MemberTransferDialog.test.tsx` — dialog behavior and accessibility tests.
- `src/app/hooks/useOnlineStatus.ts` — reactive browser connectivity state for destructive actions.
- `src/app/context/AuthContext.test.tsx` — inactive-profile session tests.
- `supabase/tests/database/member_congregation_transfer.test.sql` — pgTAP coverage for schema, transaction, rollback, RLS, and assignment rejection.
- `supabase/migrations/*_member_congregation_transfer.sql` — CLI-generated migration containing schema, private functions, public RPC wrappers, restrictive policies, and triggers.

**Modify**

- `package.json` and lockfile — add test dependencies and scripts.
- `src/app/types.ts` — expose active transfer metadata on `Member`.
- `src/app/lib/supabase-types.ts` and `src/app/types/supabase.ts` — regenerate database types after migration.
- `src/app/lib/api.ts` — join active transfer metadata into members and merge transfer audit into designation history.
- `src/app/lib/offline-cache.ts` — expose an explicit read-cache purge.
- `src/app/context/AuthContext.tsx` — reject inactive profiles online and purge local state.
- `src/app/components/MembersList.tsx` — render status metadata, transfer/cancel actions, and refresh after success.
- `src/app/lib/assignment-member-eligibility.ts` — make the shared eligibility predicate accept snake/camel case consistently.
- `src/app/components/AssignmentHistory.tsx` — replace its local restricted-status checks with the shared helper.
- `src/app/components/AssignmentTypePages.tsx` — filter history member inputs.
- `src/app/components/AssignmentsPage.tsx`, `AudioVideoAssignments.tsx`, `CartAssignments.tsx`, and `FieldServiceAssignments.tsx` — verify and retain shared-filter usage at every selector entry point.

## Assignment clearing matrix

The database operation must clear only the transferred member's slot; it must not delete a meeting or another member's assignment.

| Source | Date rule | Slots |
|---|---|---|
| `midweek_meetings` | `date >= current_date` | `president_id`, `opening_prayer_id`, `closing_prayer_id`, `treasure_talk_speaker_id`, `treasure_gems_speaker_id`, `treasure_reading_student_id`, `cbs_conductor_id`, `cbs_reader_id` |
| `midweek_ministry_parts` joined to meeting | meeting `date >= current_date` | `student_id`, `assistant_id` |
| `midweek_christian_life_parts` joined to meeting | meeting `date >= current_date` | `speaker_id` |
| `weekend_meetings` | `date >= current_date` | `president_id`, `closing_prayer_id`, `watchtower_conductor_id`, `watchtower_reader_id` |
| `audio_video_assignments` | `date >= current_date` | five scalar ID/name pairs plus aligned `attendants_member_ids`/`attendants` arrays |
| `field_service_assignments` | `(year, month) >= current year/month` | `responsible_member_id` and `responsible` |
| `cart_assignments` | `make_date(year, month, day) >= current_date` | two publisher ID/name pairs |

For each cleared slot, insert one `member_transfer_assignment_audit` row before updating the source. Revoke matching future `member_assignment_notifications` rows by `member_id`, `source_type`, `source_id`, and `slot_key`.

### Task 1: Install the test harness

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Create: `vitest.config.ts`
- Create: `src/test/setup.ts`
- Test: `src/app/lib/assignment-member-eligibility.test.ts`

- [ ] **Step 1: Add a failing smoke test for the shared eligibility rule**

Create `src/app/lib/assignment-member-eligibility.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { filterMembersEligibleForAssignments } from './assignment-member-eligibility';

describe('filterMembersEligibleForAssignments', () => {
  it('removes inactive and disassociated members', () => {
    const result = filterMembersEligibleForAssignments([
      { id: 'active', spiritual_status: 'publicador' },
      { id: 'inactive', spiritual_status: 'inativo' },
      { id: 'removed', spiritual_status: 'desassociado' },
    ]);

    expect(result.map(member => member.id)).toEqual(['active']);
  });
});
```

- [ ] **Step 2: Run the missing test command and record the expected failure**

Run: `npm test -- --run src/app/lib/assignment-member-eligibility.test.ts`

Expected: npm reports `Missing script: "test"`.

- [ ] **Step 3: Install pinned, Vite-6-compatible test dependencies**

Run:

```bash
npm install --save-dev vitest@3.2.4 jsdom@26.1.0 @testing-library/react@16.3.0 @testing-library/user-event@14.6.1 @testing-library/jest-dom@6.6.3
```

Add these scripts to `package.json`:

```json
{
  "scripts": {
    "test": "vitest",
    "test:run": "vitest run",
    "test:db": "supabase test db"
  }
}
```

Create `vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    clearMocks: true,
    restoreMocks: true,
  },
});
```

Create `src/test/setup.ts`:

```ts
import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

afterEach(() => cleanup());
```

- [ ] **Step 4: Run the smoke test**

Run: `npm run test:run -- src/app/lib/assignment-member-eligibility.test.ts`

Expected: `1 passed`.

- [ ] **Step 5: Commit the harness**

```bash
git add package.json package-lock.json vitest.config.ts src/test/setup.ts src/app/lib/assignment-member-eligibility.test.ts
git commit -m "test: add application test harness"
```

### Task 2: Add transfer schema and active-profile authorization

**Files:**
- Create through CLI: `supabase/migrations/*_member_congregation_transfer.sql`
- Create: `supabase/tests/database/member_congregation_transfer.test.sql`

- [ ] **Step 1: Create a failing pgTAP structure test**

Create `supabase/tests/database/member_congregation_transfer.test.sql` with the initial assertions:

```sql
begin;
create extension if not exists pgtap with schema extensions;
select no_plan();

select has_table('public', 'member_transfers', 'member_transfers exists');
select has_table('public', 'member_transfer_assignment_audit', 'assignment audit exists');
select has_column('public', 'user_profiles', 'is_active', 'profiles expose active state');
select col_default_is(
  'public', 'user_profiles', 'is_active', 'true',
  'profiles are active by default'
);
select has_function('public', 'get_my_access_status', array[]::text[], 'access RPC exists');
select has_function('public', 'preview_member_transfer', array['uuid']::text[], 'preview RPC exists');
select has_function('public', 'transfer_member', array['uuid', 'date', 'text']::text[], 'transfer RPC exists');
select has_function('public', 'cancel_member_transfer', array['uuid']::text[], 'cancel RPC exists');

select * from finish();
rollback;
```

- [ ] **Step 2: Verify the structure test fails before the migration**

Run: `supabase start`, then `supabase test db supabase/tests/database/member_congregation_transfer.test.sql`.

Expected: failures report missing tables, column, and functions.

- [ ] **Step 3: Create the migration with the Supabase CLI**

Run: `supabase migration new member_congregation_transfer`.

Use the exact generated filename printed by the command for every remaining SQL step in Tasks 2–4. Do not create a timestamp manually.

- [ ] **Step 4: Add the schema and indexes**

Add this SQL to the generated migration:

```sql
create schema if not exists private;
grant usage on schema private to authenticated;

alter table public.user_profiles
  add column if not exists is_active boolean not null default true;

create table public.member_transfers (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.members(id) on delete restrict,
  transferred_at date not null check (transferred_at <= current_date),
  destination_congregation text null check (
    destination_congregation is null or length(btrim(destination_congregation)) between 1 and 150
  ),
  previous_spiritual_status public.spiritual_status_enum null,
  previous_group_id uuid null references public.field_service_groups(id) on delete set null,
  previous_profile_is_active boolean not null,
  transferred_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  cancelled_at timestamptz null,
  cancelled_by uuid null references auth.users(id) on delete restrict,
  check ((cancelled_at is null) = (cancelled_by is null))
);

create unique index member_transfers_one_active_per_member
  on public.member_transfers(member_id)
  where cancelled_at is null;
create index member_transfers_member_created_idx
  on public.member_transfers(member_id, created_at desc);

create table public.member_transfer_assignment_audit (
  id uuid primary key default gen_random_uuid(),
  transfer_id uuid not null references public.member_transfers(id) on delete cascade,
  source text not null check (source in ('midweek', 'weekend', 'audio_video', 'field_service', 'cart')),
  source_type text not null,
  source_id uuid not null,
  slot_key text not null,
  role_label text not null,
  assignment_date date not null,
  member_id uuid not null references public.members(id) on delete restrict,
  member_name text not null,
  details text null,
  created_at timestamptz not null default now(),
  unique (transfer_id, source_type, source_id, slot_key, assignment_date)
);

create index member_transfer_audit_history_idx
  on public.member_transfer_assignment_audit(assignment_date desc, member_id);

alter table public.member_transfers enable row level security;
alter table public.member_transfer_assignment_audit enable row level security;

create policy "Authorized users can read member transfers"
  on public.member_transfers for select to authenticated
  using ((select public.has_role_permission('can_view_members')));

create policy "Authorized users can read transfer assignment audit"
  on public.member_transfer_assignment_audit for select to authenticated
  using ((select public.has_role_permission('can_view_assignments')));
```

- [ ] **Step 5: Add active-profile helpers and harden role authorization**

Append:

```sql
create or replace function private.is_active_user()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.user_profiles up
    where up.id = (select auth.uid())
      and up.is_active
  );
$$;

revoke all on function private.is_active_user() from public, anon;
grant execute on function private.is_active_user() to authenticated;

create or replace function public.get_my_access_status()
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select private.is_active_user();
$$;

revoke all on function public.get_my_access_status() from public, anon;
grant execute on function public.get_my_access_status() to authenticated;

create or replace function private.has_role_permission(required_permission text)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_user_role public.system_role_enum;
  v_has_permission boolean;
begin
  if not private.is_active_user() then
    return false;
  end if;

  select up.system_role
  into v_user_role
  from public.user_profiles up
  where up.id = (select auth.uid());

  if v_user_role is null then
    return false;
  end if;

  if required_permission not in (
    'can_view_members', 'can_create_members', 'can_edit_members',
    'can_view_meetings', 'can_create_assignments', 'can_edit_assignments',
    'can_view_assignments', 'can_download_assignment_image',
    'can_download_assignment_pdf', 'can_export_members',
    'can_manage_permissions', 'can_view_reports'
  ) then
    return false;
  end if;

  execute format(
    'select %I from public.role_permissions where role = $1',
    required_permission
  ) into v_has_permission using v_user_role;

  return coalesce(v_has_permission, false);
end;
$$;

create or replace function public.has_role_permission(required_permission text)
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select private.has_role_permission(required_permission);
$$;

revoke all on function private.has_role_permission(text) from public, anon;
revoke all on function public.has_role_permission(text) from public, anon;
grant execute on function private.has_role_permission(text) to authenticated;
grant execute on function public.has_role_permission(text) to authenticated;
```

- [ ] **Step 6: Add one restrictive active-profile policy to every exposed RLS table**

Append the following block. It covers current and future public tables without replacing their existing business policies:

```sql
do $policy$
declare
  table_name text;
begin
  for table_name in
    select c.relname
    from pg_catalog.pg_class c
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relkind in ('r', 'p')
      and c.relrowsecurity
  loop
    execute format(
      'drop policy if exists %I on public.%I',
      'Active profiles only', table_name
    );
    execute format(
      'create policy %I on public.%I as restrictive for all to authenticated using ((select private.is_active_user())) with check ((select private.is_active_user()))',
      'Active profiles only', table_name
    );
  end loop;
end
$policy$;
```

- [ ] **Step 7: Reset the local database and run the structure test**

Run: `supabase db reset`, then `supabase test db supabase/tests/database/member_congregation_transfer.test.sql`.

Expected: all 8 structural assertions pass.

- [ ] **Step 8: Commit schema and structure tests**

```bash
git add supabase/migrations supabase/tests/database/member_congregation_transfer.test.sql
git commit -m "feat: add audited member transfer schema"
```

### Task 3: Implement and test atomic transfer RPCs

**Files:**
- Modify: the CLI-generated `supabase/migrations/*_member_congregation_transfer.sql`
- Modify: `supabase/tests/database/member_congregation_transfer.test.sql`

- [ ] **Step 1: Expand pgTAP setup with realistic users and records**

Replace the structure-only test with a transactional suite that keeps the eight structure assertions and adds fixtures with stable UUIDs:

```sql
insert into auth.users (id, instance_id, aud, role, email, encrypted_password)
values
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'admin@test.local', ''),
  ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'member@test.local', '');

insert into public.members (id, full_name, gender, spiritual_status)
values
  ('20000000-0000-0000-0000-000000000001', 'Administrador Teste', 'M', 'publicador_batizado'),
  ('20000000-0000-0000-0000-000000000002', 'Membro Transferido', 'F', 'publicador');

insert into public.user_profiles (id, member_id, system_role, is_active)
values
  ('10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'coordenador', true),
  ('10000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000002', 'publicador', true);

set local role authenticated;
set local "request.jwt.claims" = '{"sub":"10000000-0000-0000-0000-000000000001","role":"authenticated"}';
```

Add failing assertions for these behaviors:

```sql
select is(
  (public.preview_member_transfer('20000000-0000-0000-0000-000000000002')).future_assignment_count,
  2::bigint,
  'preview counts future slots'
);

select lives_ok(
  $$select public.transfer_member('20000000-0000-0000-0000-000000000002', current_date, 'Congregação Destino')$$,
  'authorized transfer succeeds'
);

select results_eq(
  $$select spiritual_status::text, group_id is null from public.members where id = '20000000-0000-0000-0000-000000000002'$$,
  $$values ('inativo'::text, true)$$,
  'member is inactive and ungrouped'
);

select is(
  (select is_active from public.user_profiles where member_id = '20000000-0000-0000-0000-000000000002'),
  false,
  'member access is blocked'
);

select throws_ok(
  $$select public.transfer_member('20000000-0000-0000-0000-000000000002', current_date, null)$$,
  'P0001', 'Membro já possui uma transferência ativa.',
  'duplicate active transfer is rejected'
);

select lives_ok(
  $$select public.cancel_member_transfer((select id from public.member_transfers where member_id = '20000000-0000-0000-0000-000000000002' and cancelled_at is null))$$,
  'transfer cancellation succeeds'
);
```

Create the exact past/future fixtures before the assertions:

```sql
insert into public.weekend_meetings (id, date, talk_speaker_name, president_id)
values
  ('30000000-0000-0000-0000-000000000001', current_date - 7, 'Visitante', '20000000-0000-0000-0000-000000000002'),
  ('30000000-0000-0000-0000-000000000002', current_date + 7, 'Visitante', '20000000-0000-0000-0000-000000000002');

insert into public.cart_assignments (
  id, month, year, day, weekday, time, location,
  publisher1, publisher1_member_id, publisher2, week
)
select
  '30000000-0000-0000-0000-000000000003',
  extract(month from current_date + 8)::int,
  extract(year from current_date + 8)::int,
  extract(day from current_date + 8)::int,
  'Terça-feira', '09:00', 'Praça',
  'Membro Transferido', '20000000-0000-0000-0000-000000000002', '', 2;
```

After transfer, assert the future president and publisher IDs are null and the past president ID is unchanged.

- [ ] **Step 2: Verify the new behavior tests fail**

Run: `supabase db reset`, then `supabase test db supabase/tests/database/member_congregation_transfer.test.sql`.

Expected: missing `preview_member_transfer`, `transfer_member`, and `cancel_member_transfer` functions.

- [ ] **Step 3: Add permission and preview helpers**

Append private functions with empty `search_path` and fully qualified relations:

```sql
create or replace function private.assert_can_transfer_member(p_member_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_member_id uuid;
begin
  if not (select public.has_role_permission('can_edit_members')) then
    raise exception 'Permissão negada para transferir membros.';
  end if;

  select up.member_id into caller_member_id
  from public.user_profiles up
  where up.id = (select auth.uid()) and up.is_active;

  if caller_member_id = p_member_id then
    raise exception 'Você não pode transferir a si próprio.';
  end if;

  if not exists (select 1 from public.members m where m.id = p_member_id) then
    raise exception 'Membro não encontrado.';
  end if;
end;
$$;

create type public.member_transfer_impact as (
  future_assignment_count bigint
);

create or replace function private.preview_member_transfer(p_member_id uuid)
returns public.member_transfer_impact
language sql
stable
security definer
set search_path = ''
as $$
  select row(count(*))::public.member_transfer_impact
  from (
    select 1 from public.midweek_meetings m,
      lateral unnest(array[m.president_id, m.opening_prayer_id, m.closing_prayer_id, m.treasure_talk_speaker_id, m.treasure_gems_speaker_id, m.treasure_reading_student_id, m.cbs_conductor_id, m.cbs_reader_id]) slot(member_id)
      where m.date >= current_date and slot.member_id = p_member_id
    union all
    select 1 from public.midweek_ministry_parts p join public.midweek_meetings m on m.id = p.meeting_id,
      lateral unnest(array[p.student_id, p.assistant_id]) slot(member_id)
      where m.date >= current_date and slot.member_id = p_member_id
    union all
    select 1 from public.midweek_christian_life_parts p join public.midweek_meetings m on m.id = p.meeting_id
      where m.date >= current_date and p.speaker_id = p_member_id
    union all
    select 1 from public.weekend_meetings m,
      lateral unnest(array[m.president_id, m.closing_prayer_id, m.watchtower_conductor_id, m.watchtower_reader_id]) slot(member_id)
      where m.date >= current_date and slot.member_id = p_member_id
    union all
    select 1 from public.audio_video_assignments a,
      lateral unnest(array[a.sound_member_id, a.image_member_id, a.stage_member_id, a.roving_mic_1_member_id, a.roving_mic_2_member_id] || coalesce(a.attendants_member_ids, '{}')) slot(member_id)
      where a.date >= current_date and slot.member_id = p_member_id
    union all
    select 1 from public.field_service_assignments f
      where make_date(f.year, f.month, 1) >= date_trunc('month', current_date)::date and f.responsible_member_id = p_member_id
    union all
    select 1 from public.cart_assignments c,
      lateral unnest(array[c.publisher1_member_id, c.publisher2_member_id]) slot(member_id)
      where make_date(c.year, c.month, c.day) >= current_date and slot.member_id = p_member_id
  ) future_slots;
$$;

create or replace function public.preview_member_transfer(p_member_id uuid)
returns public.member_transfer_impact
language plpgsql
security invoker
set search_path = ''
as $$
begin
  perform private.assert_can_transfer_member(p_member_id);
  return private.preview_member_transfer(p_member_id);
end;
$$;
```

Apply these privileges; the private schema remains outside the Data API's exposed schemas, so browser clients reach the implementations only through the public wrapper:

```sql
revoke all on function private.assert_can_transfer_member(uuid) from public, anon;
revoke all on function private.preview_member_transfer(uuid) from public, anon;
revoke all on function public.preview_member_transfer(uuid) from public, anon;
grant execute on function private.assert_can_transfer_member(uuid) to authenticated;
grant execute on function private.preview_member_transfer(uuid) to authenticated;
grant execute on function public.preview_member_transfer(uuid) to authenticated;
```

- [ ] **Step 4: Add one private assignment-clearing function**

Append the complete audit-before-clear function below. It covers every slot in the clearing matrix, keeps legacy names aligned with IDs, preserves past exact-date rows, and revokes notifications by the audited source identity (including field-service notifications whose `assignment_date` is null).

```sql
create or replace function private.clear_future_member_assignments(
  p_transfer_id uuid,
  p_member_id uuid,
  p_member_name text
)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.member_transfer_assignment_audit (
    transfer_id, source, source_type, source_id, slot_key, role_label,
    assignment_date, member_id, member_name, details
  )
  select p_transfer_id, slots.source, slots.source_type, slots.source_id,
    slots.slot_key, slots.role_label, slots.assignment_date,
    p_member_id, p_member_name, slots.details
  from (
    select 'midweek'::text source, 'midweek_meeting_role'::text source_type,
      m.id source_id, s.slot_key, s.role_label, m.date assignment_date,
      null::text details, s.member_id
    from public.midweek_meetings m
    cross join lateral (values
      ('president_id', 'Presidente', m.president_id),
      ('opening_prayer_id', 'Oração Inicial', m.opening_prayer_id),
      ('closing_prayer_id', 'Oração Final', m.closing_prayer_id),
      ('treasure_talk_speaker_id', 'Tesouros da Palavra', m.treasure_talk_speaker_id),
      ('treasure_gems_speaker_id', 'Joias Espirituais', m.treasure_gems_speaker_id),
      ('treasure_reading_student_id', 'Leitura da Bíblia', m.treasure_reading_student_id),
      ('cbs_conductor_id', 'Dirigente do Estudo', m.cbs_conductor_id),
      ('cbs_reader_id', 'Leitor do Estudo', m.cbs_reader_id)
    ) s(slot_key, role_label, member_id)
    where m.date >= current_date

    union all
    select 'midweek', 'midweek_ministry_part', p.id, s.slot_key,
      case when s.slot_key = 'student_id' then p.title else p.title || ' - Ajudante' end,
      m.date, null::text, s.member_id
    from public.midweek_ministry_parts p
    join public.midweek_meetings m on m.id = p.meeting_id
    cross join lateral (values ('student_id', p.student_id), ('assistant_id', p.assistant_id)) s(slot_key, member_id)
    where m.date >= current_date

    union all
    select 'midweek', 'midweek_christian_life_part', p.id, 'speaker_id',
      'Parte de Vida Cristã', m.date, p.title, p.speaker_id
    from public.midweek_christian_life_parts p
    join public.midweek_meetings m on m.id = p.meeting_id
    where m.date >= current_date

    union all
    select 'weekend', 'weekend_meeting_role', w.id, s.slot_key, s.role_label,
      w.date, null::text, s.member_id
    from public.weekend_meetings w
    cross join lateral (values
      ('president_id', 'Presidente', w.president_id),
      ('closing_prayer_id', 'Oração Final', w.closing_prayer_id),
      ('watchtower_conductor_id', 'Dirigente da Sentinela', w.watchtower_conductor_id),
      ('watchtower_reader_id', 'Leitor da Sentinela', w.watchtower_reader_id)
    ) s(slot_key, role_label, member_id)
    where w.date >= current_date

    union all
    select 'audio_video', 'audio_video_role', a.id, s.slot_key, s.role_label,
      a.date, a.weekday, s.member_id
    from public.audio_video_assignments a
    cross join lateral (values
      ('sound', 'Som', a.sound_member_id),
      ('image', 'Imagem', a.image_member_id),
      ('stage', 'Palco', a.stage_member_id),
      ('roving_mic_1', 'Microfone Volante 1', a.roving_mic_1_member_id),
      ('roving_mic_2', 'Microfone Volante 2', a.roving_mic_2_member_id)
    ) s(slot_key, role_label, member_id)
    where a.date >= current_date

    union all
    select 'audio_video', 'audio_video_role', a.id,
      'attendant:' || (u.ordinality - 1)::text, 'Indicador', a.date,
      a.weekday, u.member_id
    from public.audio_video_assignments a
    cross join lateral unnest(a.attendants_member_ids) with ordinality u(member_id, ordinality)
    where a.date >= current_date

    union all
    select 'field_service', 'field_service_assignment', f.id, 'responsible',
      'Responsável', make_date(f.year, f.month, 1),
      f.category || ' - ' || f.weekday, f.responsible_member_id
    from public.field_service_assignments f
    where make_date(f.year, f.month, 1) >= date_trunc('month', current_date)::date

    union all
    select 'cart', 'cart_assignment', c.id, s.slot_key, s.role_label,
      make_date(c.year, c.month, c.day), c.location, s.member_id
    from public.cart_assignments c
    cross join lateral (values
      ('publisher1', 'Publicador 1', c.publisher1_member_id),
      ('publisher2', 'Publicador 2', c.publisher2_member_id)
    ) s(slot_key, role_label, member_id)
    where make_date(c.year, c.month, c.day) >= current_date
  ) slots
  where slots.member_id = p_member_id;

  update public.midweek_meetings m set
    president_id = case when m.president_id = p_member_id then null else m.president_id end,
    opening_prayer_id = case when m.opening_prayer_id = p_member_id then null else m.opening_prayer_id end,
    closing_prayer_id = case when m.closing_prayer_id = p_member_id then null else m.closing_prayer_id end,
    treasure_talk_speaker_id = case when m.treasure_talk_speaker_id = p_member_id then null else m.treasure_talk_speaker_id end,
    treasure_gems_speaker_id = case when m.treasure_gems_speaker_id = p_member_id then null else m.treasure_gems_speaker_id end,
    treasure_reading_student_id = case when m.treasure_reading_student_id = p_member_id then null else m.treasure_reading_student_id end,
    cbs_conductor_id = case when m.cbs_conductor_id = p_member_id then null else m.cbs_conductor_id end,
    cbs_reader_id = case when m.cbs_reader_id = p_member_id then null else m.cbs_reader_id end
  where m.date >= current_date and p_member_id in (
    m.president_id, m.opening_prayer_id, m.closing_prayer_id,
    m.treasure_talk_speaker_id, m.treasure_gems_speaker_id,
    m.treasure_reading_student_id, m.cbs_conductor_id, m.cbs_reader_id
  );

  update public.midweek_ministry_parts p set
    student_id = case when p.student_id = p_member_id then null else p.student_id end,
    assistant_id = case when p.assistant_id = p_member_id then null else p.assistant_id end
  from public.midweek_meetings m
  where m.id = p.meeting_id and m.date >= current_date
    and p_member_id in (p.student_id, p.assistant_id);

  update public.midweek_christian_life_parts p set speaker_id = null
  from public.midweek_meetings m
  where m.id = p.meeting_id and m.date >= current_date and p.speaker_id = p_member_id;

  update public.weekend_meetings w set
    president_id = case when w.president_id = p_member_id then null else w.president_id end,
    closing_prayer_id = case when w.closing_prayer_id = p_member_id then null else w.closing_prayer_id end,
    closing_prayer_name = case when w.closing_prayer_id = p_member_id then null else w.closing_prayer_name end,
    watchtower_conductor_id = case when w.watchtower_conductor_id = p_member_id then null else w.watchtower_conductor_id end,
    watchtower_reader_id = case when w.watchtower_reader_id = p_member_id then null else w.watchtower_reader_id end
  where w.date >= current_date and p_member_id in (
    w.president_id, w.closing_prayer_id, w.watchtower_conductor_id, w.watchtower_reader_id
  );

  update public.audio_video_assignments a set
    sound = case when a.sound_member_id = p_member_id then '' else a.sound end,
    sound_member_id = case when a.sound_member_id = p_member_id then null else a.sound_member_id end,
    image = case when a.image_member_id = p_member_id then '' else a.image end,
    image_member_id = case when a.image_member_id = p_member_id then null else a.image_member_id end,
    stage = case when a.stage_member_id = p_member_id then '' else a.stage end,
    stage_member_id = case when a.stage_member_id = p_member_id then null else a.stage_member_id end,
    roving_mic_1 = case when a.roving_mic_1_member_id = p_member_id then '' else a.roving_mic_1 end,
    roving_mic_1_member_id = case when a.roving_mic_1_member_id = p_member_id then null else a.roving_mic_1_member_id end,
    roving_mic_2 = case when a.roving_mic_2_member_id = p_member_id then '' else a.roving_mic_2 end,
    roving_mic_2_member_id = case when a.roving_mic_2_member_id = p_member_id then null else a.roving_mic_2_member_id end,
    attendants = case when p_member_id = any(a.attendants_member_ids) then coalesce((
      select array_agg(names.member_name order by names.ordinality)
      from unnest(a.attendants) with ordinality names(member_name, ordinality)
      where names.ordinality not in (
        select ids.ordinality from unnest(a.attendants_member_ids) with ordinality ids(member_id, ordinality)
        where ids.member_id = p_member_id
      )
    ), '{}') else a.attendants end,
    attendants_member_ids = case when p_member_id = any(a.attendants_member_ids) then coalesce((
      select array_agg(ids.member_id order by ids.ordinality)
      from unnest(a.attendants_member_ids) with ordinality ids(member_id, ordinality)
      where ids.member_id <> p_member_id
    ), '{}') else a.attendants_member_ids end
  where a.date >= current_date and (
    p_member_id in (a.sound_member_id, a.image_member_id, a.stage_member_id, a.roving_mic_1_member_id, a.roving_mic_2_member_id)
    or p_member_id = any(a.attendants_member_ids)
  );

  update public.field_service_assignments f
  set responsible = '', responsible_member_id = null
  where make_date(f.year, f.month, 1) >= date_trunc('month', current_date)::date
    and f.responsible_member_id = p_member_id;

  update public.cart_assignments c set
    publisher1 = case when c.publisher1_member_id = p_member_id then '' else c.publisher1 end,
    publisher1_member_id = case when c.publisher1_member_id = p_member_id then null else c.publisher1_member_id end,
    publisher2 = case when c.publisher2_member_id = p_member_id then '' else c.publisher2 end,
    publisher2_member_id = case when c.publisher2_member_id = p_member_id then null else c.publisher2_member_id end
  where make_date(c.year, c.month, c.day) >= current_date
    and p_member_id in (c.publisher1_member_id, c.publisher2_member_id);

  update public.member_assignment_notifications n
  set status = 'revoked', revoked_at = now(), updated_at = now()
  where n.member_id = p_member_id and n.status <> 'revoked'
    and exists (
      select 1 from public.member_transfer_assignment_audit a
      where a.transfer_id = p_transfer_id
        and a.source_type = n.source_type
        and a.source_id = n.source_id
        and a.slot_key = n.slot_key
    );

  return (
    select count(*) from public.member_transfer_assignment_audit a
    where a.transfer_id = p_transfer_id
  );
end;
$$;
```

- [ ] **Step 5: Add transfer and cancel operations with narrow public wrappers**

Append:

```sql
create or replace function private.transfer_member(
  p_member_id uuid,
  p_transferred_at date,
  p_destination_congregation text
)
returns table (transfer_id uuid, removed_assignment_count bigint)
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_member public.members%rowtype;
  previous_access boolean;
  new_transfer_id uuid;
begin
  perform private.assert_can_transfer_member(p_member_id);

  if p_transferred_at is null or p_transferred_at > current_date then
    raise exception 'A data da transferência deve ser igual ou anterior a hoje.';
  end if;
  if exists (select 1 from public.member_transfers t where t.member_id = p_member_id and t.cancelled_at is null) then
    raise exception 'Membro já possui uma transferência ativa.';
  end if;

  select * into strict current_member
  from public.members m where m.id = p_member_id for update;
  select coalesce((
    select up.is_active from public.user_profiles up where up.member_id = p_member_id
  ), false) into previous_access;

  insert into public.member_transfers (
    member_id, transferred_at, destination_congregation,
    previous_spiritual_status, previous_group_id, previous_profile_is_active,
    transferred_by
  ) values (
    p_member_id, p_transferred_at, nullif(btrim(p_destination_congregation), ''),
    current_member.spiritual_status, current_member.group_id, previous_access,
    (select auth.uid())
  ) returning id into new_transfer_id;

  update public.members
  set spiritual_status = 'inativo', group_id = null
  where id = p_member_id;
  update public.user_profiles
  set is_active = false
  where member_id = p_member_id;

  return query select new_transfer_id,
    private.clear_future_member_assignments(new_transfer_id, p_member_id, current_member.full_name);
end;
$$;

create or replace function public.transfer_member(
  p_member_id uuid,
  p_transferred_at date,
  p_destination_congregation text default null
)
returns table (transfer_id uuid, removed_assignment_count bigint)
language sql
security invoker
set search_path = ''
as $$
  select * from private.transfer_member(p_member_id, p_transferred_at, p_destination_congregation);
$$;

create or replace function private.cancel_member_transfer(p_transfer_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  transfer_row public.member_transfers%rowtype;
begin
  select * into strict transfer_row
  from public.member_transfers t
  where t.id = p_transfer_id and t.cancelled_at is null
  for update;

  perform private.assert_can_transfer_member(transfer_row.member_id);

  update public.members
  set spiritual_status = transfer_row.previous_spiritual_status,
      group_id = transfer_row.previous_group_id
  where id = transfer_row.member_id;

  update public.user_profiles
  set is_active = transfer_row.previous_profile_is_active
  where member_id = transfer_row.member_id;

  update public.member_transfers
  set cancelled_at = now(), cancelled_by = (select auth.uid())
  where id = p_transfer_id;
end;
$$;

create or replace function public.cancel_member_transfer(p_transfer_id uuid)
returns void
language sql
security invoker
set search_path = ''
as $$
  select private.cancel_member_transfer(p_transfer_id);
$$;
```

Apply explicit privileges and keep `private` absent from the Data API's exposed schemas:

```sql
revoke all on function private.transfer_member(uuid, date, text) from public, anon;
revoke all on function public.transfer_member(uuid, date, text) from public, anon;
revoke all on function private.cancel_member_transfer(uuid) from public, anon;
revoke all on function public.cancel_member_transfer(uuid) from public, anon;
revoke all on function private.clear_future_member_assignments(uuid, uuid, text) from public, anon;
grant execute on function private.transfer_member(uuid, date, text) to authenticated;
grant execute on function public.transfer_member(uuid, date, text) to authenticated;
grant execute on function private.cancel_member_transfer(uuid) to authenticated;
grant execute on function public.cancel_member_transfer(uuid) to authenticated;
```

- [ ] **Step 6: Run transaction tests and fix only migration defects**

Run: `supabase db reset`, then `supabase test db supabase/tests/database/member_congregation_transfer.test.sql`.

Expected: transfer, duplicate rejection, past preservation, notification revocation, and cancel assertions pass; pgTAP rolls all fixtures back.

- [ ] **Step 7: Add an explicit rollback test**

Inside the pgTAP transaction, add a third member/profile and a temporary trigger that raises during assignment clearing:

```sql
insert into auth.users (id, instance_id, aud, role, email, encrypted_password)
values ('10000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'rollback@test.local', '');
insert into public.members (id, full_name, gender, spiritual_status)
values ('20000000-0000-0000-0000-000000000003', 'Membro Rollback', 'M', 'publicador');
insert into public.user_profiles (id, member_id, system_role, is_active)
values ('10000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000003', 'publicador', true);
insert into public.weekend_meetings (id, date, talk_speaker_name, president_id)
values ('30000000-0000-0000-0000-000000000004', current_date + 15, 'Visitante', '20000000-0000-0000-0000-000000000003');

create function pg_temp.fail_member_transfer_clear()
returns trigger language plpgsql as $$
begin
  raise exception 'falha induzida';
end;
$$;
create trigger fail_member_transfer_clear
before update on public.weekend_meetings
for each row execute function pg_temp.fail_member_transfer_clear();

select throws_ok(
  $$select public.transfer_member('20000000-0000-0000-0000-000000000003', current_date, null)$$,
  'P0001', 'falha induzida', 'assignment failure rolls back transfer'
);
drop trigger fail_member_transfer_clear on public.weekend_meetings;

select is(
  (select spiritual_status::text from public.members where id = '20000000-0000-0000-0000-000000000003'),
  'publicador', 'rollback restores member status'
);
select is(
  (select is_active from public.user_profiles where member_id = '20000000-0000-0000-0000-000000000003'),
  true, 'rollback restores profile access'
);
select is(
  (select count(*) from public.member_transfers where member_id = '20000000-0000-0000-0000-000000000003'),
  0::bigint, 'rollback removes transfer row'
);
```

Run: `supabase test db supabase/tests/database/member_congregation_transfer.test.sql`.

Expected: rollback assertion passes.

- [ ] **Step 8: Commit atomic operations**

```bash
git add supabase/migrations supabase/tests/database/member_congregation_transfer.test.sql
git commit -m "feat: add atomic member transfer operations"
```

### Task 4: Reject new assignments for restricted members

**Files:**
- Modify: the CLI-generated `supabase/migrations/*_member_congregation_transfer.sql`
- Modify: `supabase/tests/database/member_congregation_transfer.test.sql`

- [ ] **Step 1: Add failing pgTAP tests for stale-client writes**

After transferring the fixture member, add `throws_ok` assertions for assigning that ID to:

```sql
insert into public.weekend_meetings (date, talk_speaker_name, president_id)
values (current_date + 14, 'Visitante', '20000000-0000-0000-0000-000000000002');

insert into public.audio_video_assignments (
  date, weekday, sound, sound_member_id, image, stage, roving_mic_1, roving_mic_2, attendants
) values (
  current_date + 14, 'Domingo', 'Membro Transferido', '20000000-0000-0000-0000-000000000002', '', '', '', '', '{}'
);
```

Expected SQLSTATE/message: `P0001`, `Membro inativo não pode receber designações.`

- [ ] **Step 2: Verify stale-client tests fail before triggers**

Run: `supabase db reset`, then `supabase test db supabase/tests/database/member_congregation_transfer.test.sql`.

Expected: both inserts live unexpectedly.

- [ ] **Step 3: Add one generic trigger function and table triggers**

Append:

```sql
create or replace function private.reject_ineligible_assignment()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  row_data jsonb := to_jsonb(new);
  column_name text;
  candidate_id uuid;
  assignment_is_future boolean;
begin
  assignment_is_future := case tg_table_name
    when 'midweek_meetings' then ((row_data ->> 'date')::date >= current_date)
    when 'weekend_meetings' then ((row_data ->> 'date')::date >= current_date)
    when 'audio_video_assignments' then ((row_data ->> 'date')::date >= current_date)
    when 'field_service_assignments' then
      (make_date((row_data ->> 'year')::int, (row_data ->> 'month')::int, 1) >= date_trunc('month', current_date)::date)
    when 'cart_assignments' then
      (make_date((row_data ->> 'year')::int, (row_data ->> 'month')::int, (row_data ->> 'day')::int) >= current_date)
    when 'midweek_ministry_parts' then exists (
      select 1 from public.midweek_meetings m
      where m.id = (row_data ->> 'meeting_id')::uuid and m.date >= current_date
    )
    when 'midweek_christian_life_parts' then exists (
      select 1 from public.midweek_meetings m
      where m.id = (row_data ->> 'meeting_id')::uuid and m.date >= current_date
    )
    else true
  end;

  if not assignment_is_future then
    return new;
  end if;

  foreach column_name in array tg_argv loop
    if jsonb_typeof(row_data -> column_name) = 'array' then
      for candidate_id in
        select value::uuid from jsonb_array_elements_text(row_data -> column_name)
      loop
        if exists (
          select 1 from public.members m
          where m.id = candidate_id and m.spiritual_status in ('inativo', 'desassociado')
        ) then
          raise exception 'Membro inativo não pode receber designações.';
        end if;
      end loop;
    else
      candidate_id := nullif(row_data ->> column_name, '')::uuid;
      if candidate_id is not null and exists (
        select 1 from public.members m
        where m.id = candidate_id and m.spiritual_status in ('inativo', 'desassociado')
      ) then
        raise exception 'Membro inativo não pode receber designações.';
      end if;
    end if;
  end loop;
  return new;
end;
$$;
```

Create `before insert or update` triggers with these argument lists:

```sql
-- midweek_meetings:
'president_id','opening_prayer_id','closing_prayer_id','treasure_talk_speaker_id','treasure_gems_speaker_id','treasure_reading_student_id','cbs_conductor_id','cbs_reader_id'
-- midweek_ministry_parts: 'student_id','assistant_id'
-- midweek_christian_life_parts: 'speaker_id'
-- weekend_meetings: 'president_id','closing_prayer_id','watchtower_conductor_id','watchtower_reader_id'
-- audio_video_assignments:
'sound_member_id','image_member_id','stage_member_id','roving_mic_1_member_id','roving_mic_2_member_id','attendants_member_ids'
-- field_service_assignments: 'responsible_member_id'
-- cart_assignments: 'publisher1_member_id','publisher2_member_id'
```

Create the triggers explicitly:

```sql
drop trigger if exists reject_ineligible_midweek_meetings on public.midweek_meetings;
create trigger reject_ineligible_midweek_meetings before insert or update on public.midweek_meetings
for each row execute function private.reject_ineligible_assignment(
  'president_id','opening_prayer_id','closing_prayer_id','treasure_talk_speaker_id',
  'treasure_gems_speaker_id','treasure_reading_student_id','cbs_conductor_id','cbs_reader_id'
);
drop trigger if exists reject_ineligible_midweek_ministry_parts on public.midweek_ministry_parts;
create trigger reject_ineligible_midweek_ministry_parts before insert or update on public.midweek_ministry_parts
for each row execute function private.reject_ineligible_assignment('student_id','assistant_id');
drop trigger if exists reject_ineligible_midweek_christian_life_parts on public.midweek_christian_life_parts;
create trigger reject_ineligible_midweek_christian_life_parts before insert or update on public.midweek_christian_life_parts
for each row execute function private.reject_ineligible_assignment('speaker_id');
drop trigger if exists reject_ineligible_weekend_meetings on public.weekend_meetings;
create trigger reject_ineligible_weekend_meetings before insert or update on public.weekend_meetings
for each row execute function private.reject_ineligible_assignment(
  'president_id','closing_prayer_id','watchtower_conductor_id','watchtower_reader_id'
);
drop trigger if exists reject_ineligible_audio_video_assignments on public.audio_video_assignments;
create trigger reject_ineligible_audio_video_assignments before insert or update on public.audio_video_assignments
for each row execute function private.reject_ineligible_assignment(
  'sound_member_id','image_member_id','stage_member_id','roving_mic_1_member_id',
  'roving_mic_2_member_id','attendants_member_ids'
);
drop trigger if exists reject_ineligible_field_service_assignments on public.field_service_assignments;
create trigger reject_ineligible_field_service_assignments before insert or update on public.field_service_assignments
for each row execute function private.reject_ineligible_assignment('responsible_member_id');
drop trigger if exists reject_ineligible_cart_assignments on public.cart_assignments;
create trigger reject_ineligible_cart_assignments before insert or update on public.cart_assignments
for each row execute function private.reject_ineligible_assignment('publisher1_member_id','publisher2_member_id');
```

- [ ] **Step 4: Run all database tests**

Run: `supabase db reset`, then `npm run test:db`.

Expected: all pgTAP files pass, including stale-client rejection and RLS denial for an inactive JWT.

- [ ] **Step 5: Commit database safeguards**

```bash
git add supabase/migrations supabase/tests/database/member_congregation_transfer.test.sql
git commit -m "feat: reject restricted member assignments"
```

### Task 5: Regenerate types and add the transfer client

**Files:**
- Modify: `src/app/lib/supabase-types.ts`
- Modify: `src/app/types/supabase.ts`
- Modify: `src/app/types.ts`
- Create: `src/app/lib/member-transfer.ts`
- Create: `src/app/lib/member-transfer.test.ts`
- Modify: `src/app/lib/api.ts`

- [ ] **Step 1: Write failing client tests**

Create `src/app/lib/member-transfer.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { supabase } from './supabase';
import {
  cancelMemberTransfer,
  previewMemberTransfer,
  transferMember,
} from './member-transfer';

vi.mock('./supabase', () => ({ supabase: { rpc: vi.fn() } }));
const rpc = vi.mocked(supabase.rpc) as ReturnType<typeof vi.fn>;

describe('member-transfer client', () => {
  beforeEach(() => {
    rpc.mockReset();
    Object.defineProperty(navigator, 'onLine', { configurable: true, value: true });
  });

  it('previews future assignments', async () => {
    rpc.mockResolvedValue({ data: { future_assignment_count: 3 }, error: null });
    await expect(previewMemberTransfer('member-id')).resolves.toEqual({ futureAssignmentCount: 3 });
    expect(rpc).toHaveBeenCalledWith('preview_member_transfer', { p_member_id: 'member-id' });
  });

  it('transfers a member with a trimmed destination', async () => {
    rpc.mockResolvedValue({ data: [{ transfer_id: 'transfer-id', removed_assignment_count: 3 }], error: null });
    await expect(transferMember({
      memberId: 'member-id', transferredAt: '2026-08-10', destinationCongregation: ' Congregação Centro ',
    })).resolves.toEqual({ transferId: 'transfer-id', removedAssignmentCount: 3 });
    expect(rpc).toHaveBeenCalledWith('transfer_member', {
      p_member_id: 'member-id',
      p_transferred_at: '2026-08-10',
      p_destination_congregation: 'Congregação Centro',
    });
  });

  it('cancels an active transfer', async () => {
    rpc.mockResolvedValue({ data: null, error: null });
    await cancelMemberTransfer('transfer-id');
    expect(rpc).toHaveBeenCalledWith('cancel_member_transfer', { p_transfer_id: 'transfer-id' });
  });

  it('does not call Supabase while offline', async () => {
    Object.defineProperty(navigator, 'onLine', { configurable: true, value: false });
    await expect(transferMember({ memberId: 'member-id', transferredAt: '2026-08-10' }))
      .rejects.toThrow('Você precisa estar online para transferir um membro.');
    expect(rpc).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Verify client tests fail**

Run: `npm run test:run -- src/app/lib/member-transfer.test.ts`.

Expected: module `./member-transfer` is missing.

- [ ] **Step 3: Regenerate Supabase types from the reset local database**

Run:

```bash
supabase gen types typescript --local --schema public > /tmp/jwgestao-supabase-types.ts
```

Use `apply_patch` to replace the generated database sections in both `src/app/lib/supabase-types.ts` and `src/app/types/supabase.ts` with the generated output. Confirm both include `member_transfers`, `member_transfer_assignment_audit`, `is_active`, and the three RPC signatures.

- [ ] **Step 4: Add domain DTOs and RPC methods**

Create `src/app/lib/member-transfer.ts`:

```ts
import { supabase } from './supabase';

export interface ActiveMemberTransfer {
  id: string;
  transferredAt: string;
  destinationCongregation: string | null;
  createdAt: string;
}

export interface MemberTransferImpact {
  futureAssignmentCount: number;
}

export interface TransferMemberInput {
  memberId: string;
  transferredAt: string;
  destinationCongregation?: string;
}

export interface TransferMemberResult {
  transferId: string;
  removedAssignmentCount: number;
}

function requireOnline() {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    throw new Error('Você precisa estar online para transferir um membro.');
  }
}

export async function previewMemberTransfer(memberId: string): Promise<MemberTransferImpact> {
  requireOnline();
  const { data, error } = await supabase.rpc('preview_member_transfer', { p_member_id: memberId });
  if (error) throw new Error(error.message);
  const result = Array.isArray(data) ? data[0] : data;
  return { futureAssignmentCount: Number(result?.future_assignment_count ?? 0) };
}

export async function transferMember(input: TransferMemberInput): Promise<TransferMemberResult> {
  requireOnline();
  const { data, error } = await supabase.rpc('transfer_member', {
    p_member_id: input.memberId,
    p_transferred_at: input.transferredAt,
    p_destination_congregation: input.destinationCongregation?.trim() || null,
  });
  if (error) throw new Error(error.message);
  const result = Array.isArray(data) ? data[0] : data;
  return {
    transferId: result.transfer_id,
    removedAssignmentCount: Number(result.removed_assignment_count),
  };
}

export async function cancelMemberTransfer(transferId: string): Promise<void> {
  requireOnline();
  const { error } = await supabase.rpc('cancel_member_transfer', { p_transfer_id: transferId });
  if (error) throw new Error(error.message);
}
```

Extend `Member` in `src/app/types.ts`:

```ts
activeTransfer?: ActiveMemberTransfer;
```

Import `ActiveMemberTransfer` from `./lib/member-transfer`.

- [ ] **Step 5: Join active transfer metadata in `api.getMembers()`**

Change the select to:

```ts
.select(`
  *,
  user_profiles(system_role, is_active),
  member_privileges(role),
  member_transfers!member_transfers_member_id_fkey(
    id, transferred_at, destination_congregation, created_at, cancelled_at
  )
`)
```

Map only `cancelled_at === null` to:

```ts
active_transfer: activeTransfer ? {
  id: activeTransfer.id,
  transferredAt: activeTransfer.transferred_at,
  destinationCongregation: activeTransfer.destination_congregation,
  createdAt: activeTransfer.created_at,
} : null,
```

Remove the nested `member_transfers` field after flattening.

- [ ] **Step 6: Run client tests and TypeScript build**

Run: `npm run test:run -- src/app/lib/member-transfer.test.ts`, then `npm run build`.

Expected: client tests pass and Vite build completes without type errors.

- [ ] **Step 7: Commit client contracts**

```bash
git add src/app/lib/supabase-types.ts src/app/types/supabase.ts src/app/types.ts src/app/lib/member-transfer.ts src/app/lib/member-transfer.test.ts src/app/lib/api.ts
git commit -m "feat: add member transfer client contracts"
```

### Task 6: Block inactive sessions and purge cached congregation data

**Files:**
- Modify: `src/app/lib/offline-cache.ts`
- Modify: `src/app/context/AuthContext.tsx`
- Create: `src/app/context/AuthContext.test.tsx`

- [ ] **Step 1: Write failing inactive-session tests**

Create `src/app/context/AuthContext.test.tsx`:

```tsx
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { AuthProvider, useAuth } from './AuthContext';
import { supabase } from '../lib/supabase';
import { clearReadCache } from '../lib/offline-cache';

vi.mock('../lib/supabase', () => ({
  supabase: {
    rpc: vi.fn(),
    from: vi.fn(),
    auth: {
      getSession: vi.fn(),
      onAuthStateChange: vi.fn(),
      signOut: vi.fn(),
      signInWithPassword: vi.fn(),
    },
  },
}));
vi.mock('../lib/offline-cache', () => ({ clearReadCache: vi.fn() }));

const auth = supabase.auth as unknown as {
  getSession: ReturnType<typeof vi.fn>;
  onAuthStateChange: ReturnType<typeof vi.fn>;
  signOut: ReturnType<typeof vi.fn>;
};
const rpc = vi.mocked(supabase.rpc) as ReturnType<typeof vi.fn>;
const userId = '10000000-0000-0000-0000-000000000002';
const session = { user: { id: userId, email: '11999999999@jwgestao.app' } };

function Consumer() {
  const { user, loading } = useAuth();
  return <output>{loading ? 'loading' : user?.name ?? 'anonymous'}</output>;
}

describe('AuthProvider inactive access', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    auth.getSession.mockResolvedValue({ data: { session }, error: null });
    auth.onAuthStateChange.mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } });
    auth.signOut.mockResolvedValue({ error: null });
  });

  it('signs out and purges cache when the profile is inactive online', async () => {
    localStorage.setItem(`auth_user_cache:${userId}`, JSON.stringify({ id: userId, name: 'Cache' }));
    rpc.mockResolvedValue({ data: false, error: null });
    render(<AuthProvider><Consumer /></AuthProvider>);
    await waitFor(() => expect(screen.getByText('anonymous')).toBeInTheDocument());
    expect(auth.signOut).toHaveBeenCalled();
    expect(clearReadCache).toHaveBeenCalled();
    expect(localStorage.getItem(`auth_user_cache:${userId}`)).toBeNull();
  });

  it('keeps the cached profile when active status cannot be checked offline', async () => {
    localStorage.setItem(`auth_user_cache:${userId}`, JSON.stringify({
      id: userId, phone: '11999999999', role: 'publicador', name: 'Membro em cache',
    }));
    rpc.mockResolvedValue({ data: null, error: new Error('Failed to fetch') });
    render(<AuthProvider><Consumer /></AuthProvider>);
    await waitFor(() => expect(screen.getByText('Membro em cache')).toBeInTheDocument());
    expect(auth.signOut).not.toHaveBeenCalled();
    expect(clearReadCache).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Verify the auth tests fail**

Run: `npm run test:run -- src/app/context/AuthContext.test.tsx`.

Expected: inactive session is currently accepted.

- [ ] **Step 3: Add explicit read-cache purge**

Export from `src/app/lib/offline-cache.ts`:

```ts
export async function clearReadCache(): Promise<void> {
  await cacheDb.reads.clear();
}
```

- [ ] **Step 4: Add a distinct inactive-access error and online validation**

In `AuthContext.tsx`, add:

```ts
class InactiveMemberAccessError extends Error {
  constructor() {
    super('Seu acesso a esta congregação foi encerrado.');
    this.name = 'InactiveMemberAccessError';
  }
}

async function assertActiveAccess() {
  const { data, error } = await supabase.rpc('get_my_access_status');
  if (error) throw error;
  if (!data) throw new InactiveMemberAccessError();
}
```

Call `assertActiveAccess()` at the beginning of `buildAuthUser`. Its existing outer catch must rethrow this one error before applying the offline fallback:

```ts
} catch (error) {
  if (error instanceof InactiveMemberAccessError) throw error;
  return readCachedAuthUser(supaUser.id) ?? {
    id: supaUser.id,
    phone: phoneDigits,
    role: 'publicador',
    name: 'Usuário',
  };
}
```

In `initSession`, `login`, the auth-state callback, and `refreshUser`, catch only `InactiveMemberAccessError`; remove the auth-user cache, call `clearReadCache()`, sign out, and clear React state. Preserve the existing offline fallback for network errors.

- [ ] **Step 5: Run auth tests**

Run: `npm run test:run -- src/app/context/AuthContext.test.tsx`.

Expected: inactive online sessions are purged; offline cached profiles remain usable until reconnection.

- [ ] **Step 6: Commit session blocking**

```bash
git add src/app/lib/offline-cache.ts src/app/context/AuthContext.tsx src/app/context/AuthContext.test.tsx
git commit -m "feat: block transferred member sessions"
```

### Task 7: Build the transfer and cancellation dialog

**Files:**
- Create: `src/app/components/MemberTransferDialog.tsx`
- Create: `src/app/components/MemberTransferDialog.test.tsx`
- Create: `src/app/hooks/useOnlineStatus.ts`
- Modify: `src/app/components/MembersList.tsx`

- [ ] **Step 1: Write failing dialog tests**

Create the complete test file:

```tsx
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemberTransferDialog } from './MemberTransferDialog';

const member = {
  id: '20000000-0000-0000-0000-000000000002',
  full_name: 'Membro Transferido',
};

const baseProps = {
  member,
  open: true,
  mode: 'transfer' as const,
  loading: false,
  impact: { futureAssignmentCount: 3 },
  onOpenChange: vi.fn(),
  onTransfer: vi.fn().mockResolvedValue(undefined),
  onCancelTransfer: vi.fn().mockResolvedValue(undefined),
};

describe('MemberTransferDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-10T12:00:00'));
    Object.defineProperty(navigator, 'onLine', { configurable: true, value: true });
  });

  afterEach(() => vi.useRealTimers());

  it('shows member, current date, destination and impact count', () => {
    render(<MemberTransferDialog {...baseProps} />);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Membro Transferido')).toBeInTheDocument();
    expect(screen.getByLabelText('Data da transferência')).toHaveValue('2026-08-10');
    expect(screen.getByLabelText('Congregação de destino')).toBeInTheDocument();
    expect(screen.getByText(/3 designações futuras serão removidas/i)).toBeInTheDocument();
  });

  it('disables confirmation while impact is loading', () => {
    render(<MemberTransferDialog {...baseProps} loading impact={null} />);
    expect(screen.getByRole('button', { name: 'Confirmar transferência' })).toBeDisabled();
  });

  it('submits a trimmed destination and selected date', async () => {
    vi.useRealTimers();
    const user = userEvent.setup();
    render(<MemberTransferDialog {...baseProps} />);
    await user.clear(screen.getByLabelText('Congregação de destino'));
    await user.type(screen.getByLabelText('Congregação de destino'), '  Congregação Centro  ');
    await user.click(screen.getByRole('button', { name: 'Confirmar transferência' }));
    expect(baseProps.onTransfer).toHaveBeenCalledWith({
      memberId: member.id,
      transferredAt: '2026-08-10',
      destinationCongregation: 'Congregação Centro',
    });
  });

  it('warns that cancellation does not restore assignments', () => {
    render(<MemberTransferDialog
      {...baseProps}
      member={{
        ...member,
        activeTransfer: {
          id: '40000000-0000-0000-0000-000000000001',
          transferredAt: '2026-08-10',
          destinationCongregation: null,
          createdAt: '2026-08-10T12:00:00Z',
        },
      }}
      mode="cancel"
    />);
    expect(screen.getByText(/designações removidas não serão restauradas/i)).toBeInTheDocument();
  });

  it('disables transfer while offline', () => {
    Object.defineProperty(navigator, 'onLine', { configurable: true, value: false });
    render(<MemberTransferDialog {...baseProps} />);
    expect(screen.getByText(/você precisa estar online/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Confirmar transferência' })).toBeDisabled();
  });
});
```

- [ ] **Step 2: Verify dialog tests fail**

Run: `npm run test:run -- src/app/components/MemberTransferDialog.test.tsx`.

Expected: component module is missing.

- [ ] **Step 3: Implement the focused dialog component**

Use the existing `src/app/components/ui/dialog.tsx`. Define this public contract:

```ts
interface MemberTransferDialogProps {
  member: Pick<Member, 'id' | 'full_name' | 'activeTransfer'> | null;
  open: boolean;
  mode: 'transfer' | 'cancel';
  loading: boolean;
  impact: MemberTransferImpact | null;
  onOpenChange: (open: boolean) => void;
  onTransfer: (input: TransferMemberInput) => Promise<void>;
  onCancelTransfer: (transferId: string) => Promise<void>;
}
```

Create `src/app/hooks/useOnlineStatus.ts` and use it in both the dialog and member list:

```ts
import { useEffect, useState } from 'react';

export function useOnlineStatus() {
  const [online, setOnline] = useState(() =>
    typeof navigator === 'undefined' ? true : navigator.onLine
  );

  useEffect(() => {
    const markOnline = () => setOnline(true);
    const markOffline = () => setOnline(false);
    window.addEventListener('online', markOnline);
    window.addEventListener('offline', markOffline);
    return () => {
      window.removeEventListener('online', markOnline);
      window.removeEventListener('offline', markOffline);
    };
  }, []);

  return online;
}
```

For transfer mode, initialize the date with local `YYYY-MM-DD`, set `max` to the same date, set destination `maxLength={150}`, trim destination, and display `impact.futureAssignmentCount`. For cancellation mode, display that access/status/group return but removed assignments do not. Disable all mutation buttons when loading or offline.

- [ ] **Step 4: Integrate the dialog into `MembersList`**

Add state for selected member, mode, impact, and mutation loading. Map `m.active_transfer` to `Member.activeTransfer` in `fetchMembers()`.

In each expanded member card:

- show a `Transferido` badge plus formatted date/destination when `activeTransfer` exists;
- show **Transferir de congregação** only when `canEdit`, online, no active transfer, and `member.id !== authUser?.member_id`;
- show **Cancelar transferência** only when `canEdit`, online, and an active transfer exists;
- compare against `authUser.member_id`, not the Auth UUID `authUser.id`.

On opening transfer mode, call `previewMemberTransfer(member.id)`. On confirmation, call `transferMember`; on cancellation, call `cancelMemberTransfer`. After success, close the dialog, call `fetchMembers()`, collapse the card, and show a Sonner message containing the removed count.

- [ ] **Step 5: Run dialog tests and build**

Run: `npm run test:run -- src/app/components/MemberTransferDialog.test.tsx`, then `npm run build`.

Expected: dialog tests pass and production build succeeds.

- [ ] **Step 6: Commit the member workflow**

```bash
git add src/app/components/MemberTransferDialog.tsx src/app/components/MemberTransferDialog.test.tsx src/app/hooks/useOnlineStatus.ts src/app/components/MembersList.tsx
git commit -m "feat: add member transfer workflow"
```

### Task 8: Centralize selector eligibility and preserve audited history

**Files:**
- Modify: `src/app/lib/assignment-member-eligibility.ts`
- Modify: `src/app/lib/assignment-member-eligibility.test.ts`
- Create: `src/app/lib/member-transfer-history.ts`
- Create: `src/app/lib/member-transfer-history.test.ts`
- Modify: `src/app/components/AssignmentHistory.tsx`
- Modify: `src/app/components/AssignmentTypePages.tsx`
- Modify: `src/app/lib/api.ts`

- [ ] **Step 1: Add failing eligibility compatibility tests**

Add cases for camelCase and null values:

```ts
expect(isMemberEligibleForAssignments({ spiritualStatus: 'inativo' })).toBe(false);
expect(isMemberEligibleForAssignments({ spiritual_status: 'desassociado' })).toBe(false);
expect(isMemberEligibleForAssignments({ spiritualStatus: 'publicador' })).toBe(true);
expect(isMemberEligibleForAssignments(null)).toBe(true);
```

- [ ] **Step 2: Update the helper with one canonical status resolver**

Use:

```ts
type MemberStatusLike = {
  spiritual_status?: string | null;
  spiritualStatus?: string | null;
};

function resolveMemberStatus(value: MemberStatusLike | string | null | undefined) {
  if (typeof value === 'string') return value;
  return value?.spiritual_status ?? value?.spiritualStatus ?? null;
}
```

Make both exported functions call this resolver.

- [ ] **Step 3: Remove local status filtering from history and page loaders**

Import `filterMembersEligibleForAssignments` and `isMemberEligibleForAssignments` in `AssignmentHistory.tsx` and `AssignmentTypePages.tsx`. Replace every direct comparison to `inativo`/`desassociado` with the shared helper. Keep the already-correct shared-helper usage in `AssignmentsPage`, `AudioVideoAssignments`, `CartAssignments`, and `FieldServiceAssignments`.

- [ ] **Step 4: Add transfer audit rows to designation history**

First write `src/app/lib/member-transfer-history.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { mapTransferAuditHistory, type TransferAuditHistoryRow } from './member-transfer-history';

describe('mapTransferAuditHistory', () => {
  it('normalizes meeting and attendant role keys', () => {
    const base = {
      source_id: 'source-id', assignment_date: '2026-08-01',
      member_id: 'member-id', member_name: 'Membro', details: null,
    };
    const rows: TransferAuditHistoryRow[] = [
      {
        ...base, id: 'audit-1', source: 'midweek',
        source_type: 'midweek_meeting_role', slot_key: 'president_id', role_label: 'Presidente',
      },
      {
        ...base, id: 'audit-2', source: 'audio_video',
        source_type: 'audio_video_role', slot_key: 'attendant:0', role_label: 'Indicador',
      },
    ];

    expect(mapTransferAuditHistory(rows)).toMatchObject([
      { id: 'audit:audit-1', roleKey: 'president', date: '2026-08-01', memberId: 'member-id' },
      { id: 'audit:audit-2', roleKey: 'attendant_1', memberName: 'Membro' },
    ]);
  });
});
```

Create `src/app/lib/member-transfer-history.ts` with this focused interface:

```ts
import type { DesignationHistoryEntry } from './api';

export interface TransferAuditHistoryRow {
  id: string;
  source: DesignationHistoryEntry['source'];
  source_type: string;
  source_id: string;
  slot_key: string;
  role_label: string;
  assignment_date: string;
  member_id: string;
  member_name: string;
  details: string | null;
}

const ROLE_KEY_BY_SLOT: Record<string, string> = {
  president_id: 'president',
  opening_prayer_id: 'opening_prayer',
  closing_prayer_id: 'closing_prayer',
  treasure_talk_speaker_id: 'treasure_talk',
  treasure_gems_speaker_id: 'treasure_gems',
  treasure_reading_student_id: 'treasure_reading',
  cbs_conductor_id: 'cbs_conductor',
  cbs_reader_id: 'cbs_reader',
  student_id: 'ministry_student',
  assistant_id: 'ministry_assistant',
  speaker_id: 'christian_life_speaker',
};

function normalizeAuditRoleKey(row: TransferAuditHistoryRow) {
  if (row.source_type === 'audio_video_role' && row.slot_key.startsWith('attendant:')) {
    return `attendant_${Number(row.slot_key.split(':')[1]) + 1}`;
  }
  return ROLE_KEY_BY_SLOT[row.slot_key] ?? row.slot_key;
}

export function mapTransferAuditHistory(
  rows: TransferAuditHistoryRow[],
): DesignationHistoryEntry[] {
  return rows.map(row => ({
    id: `audit:${row.id}`,
    date: row.assignment_date,
    source: row.source,
    sourceId: row.source_id,
    roleKey: normalizeAuditRoleKey(row),
    roleLabel: row.role_label,
    memberId: row.member_id,
    memberName: row.member_name,
    details: row.details,
  }));
}
```

Run: `npm run test:run -- src/app/lib/member-transfer-history.test.ts`.

Expected before implementation: missing module; expected after implementation: both normalization cases pass.

Then, in `api.getDesignationHistory()`, query:

```ts
const { data: transferAuditRows, error: transferAuditError } = await supabase
  .from('member_transfer_assignment_audit')
  .select('id, source, source_type, source_id, slot_key, role_label, assignment_date, member_id, member_name, details')
  .gte('assignment_date', startDate)
  .lte('assignment_date', endDate);
```

Throw a contextual error when `transferAuditError` is present. Append `mapTransferAuditHistory(transferAuditRows || [])` to `entries`; no source row remains after a successful clear, so no duplicate source entry exists.

- [ ] **Step 5: Run focused tests and build**

Run:

```bash
npm run test:run -- src/app/lib/assignment-member-eligibility.test.ts src/app/lib/member-transfer-history.test.ts
npm run build
```

Expected: eligibility tests pass and TypeScript accepts the audit query/types.

- [ ] **Step 6: Commit eligibility and history integration**

```bash
git add src/app/lib/assignment-member-eligibility.ts src/app/lib/assignment-member-eligibility.test.ts src/app/lib/member-transfer-history.ts src/app/lib/member-transfer-history.test.ts src/app/components/AssignmentHistory.tsx src/app/components/AssignmentTypePages.tsx src/app/lib/api.ts
git commit -m "feat: exclude transferred members from activities"
```

### Task 9: Full verification and operational documentation

**Files:**
- Modify: `docs/superpowers/specs/2026-08-10-member-congregation-transfer-design.md` only if verification reveals a behavior correction

- [ ] **Step 1: Verify formatting and repository state**

Run: `git diff --check` and `git status --short`.

Expected: no whitespace errors; only intentional task files are modified.

- [ ] **Step 2: Run the complete application test suite**

Run: `npm run test:run`.

Expected: all Vitest suites pass.

- [ ] **Step 3: Run the complete database test suite**

Run: `supabase db reset`, then `npm run test:db`.

Expected: all pgTAP files pass with `Result: PASS`.

- [ ] **Step 4: Run production verification**

Run: `npm run build`.

Expected: Vite production build exits with code 0.

- [ ] **Step 5: Run Supabase safety checks**

Discover the installed commands first:

```bash
supabase --version
supabase db --help
```

If supported by the installed version, run `supabase db advisors --local`; otherwise run the project-connected advisors through the available Supabase MCP. Resolve all security findings introduced by this migration, then rerun database tests.

- [ ] **Step 6: Execute the manual acceptance flow locally**

With the local Supabase stack and app running:

1. Create an active member with access and at least one past and two future assignments.
2. Open Membros, expand the member, and confirm the preview count.
3. Transfer with today's date and an optional destination.
4. Confirm the member appears only under **Inativos/Desass.**, bears **Transferido**, cannot log in, and is absent from every assignment selector.
5. Confirm future slots are vacant, notifications revoked, and past history still visible.
6. Cancel the transfer and confirm status, group, and access return while slots remain vacant.
7. Disconnect the network and confirm the transfer action is disabled.

- [ ] **Step 7: Commit verification-only corrections**

If verification required corrections, commit only those files:

Stage only feature files reported as corrected by `git status --short`, using their literal paths, then run:

```bash
git commit -m "fix: complete member transfer verification"
```

If no correction was needed, do not create an empty commit.

## Implementation notes

- Use `supabase migration new member_congregation_transfer`; do not invent a timestamped migration filename.
- Keep every `SECURITY DEFINER` function in `private`, set `search_path = ''`, fully qualify all relations, and expose only narrow `SECURITY INVOKER` wrappers in `public`.
- Revoke default function execution from `public` and `anon`; grant public RPC wrappers only to `authenticated`.
- Use `(select auth.uid())` and `(select private.is_active_user())` in RLS expressions so Postgres can cache stable values per statement.
- Do not use `user_metadata` for authorization.
- Do not delete Auth users or member records; blocking is enforced by profile state, RLS, and application logout.
- Do not restore removed assignments during cancellation.
- Preserve unrelated working-tree changes throughout execution.

## Source references checked during planning

- [Supabase database functions](https://supabase.com/docs/guides/database/functions): security invoker by default, fixed/empty `search_path` for definer functions, and explicit execute grants.
- [Supabase RLS guide](https://supabase.com/docs/guides/database/postgres/row-level-security): indexed policy columns, `select` wrappers for stable authorization calls, and private security-definer helpers.
- [Supabase local testing overview](https://supabase.com/docs/guides/local-development/testing/overview): pgTAP tests in `supabase/tests` executed with `supabase test db` after `supabase start`.
