# Assignment Calendar Events Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Exibir uma ação após a confirmação de uma designação e criar no calendário padrão eventos com duração real e lembrete de três dias.

**Architecture:** Um domínio TypeScript puro resolve datas, horários, recorrências e iCalendar; um serviço carrega e normaliza a fonte da notificação; um adaptador de plataforma grava eventos no calendário nativo ou baixa `.ics`. A interface usa um componente focado de ações confirmadas e um diálogo exclusivo para recorrências de saída de campo.

**Tech Stack:** React 18, TypeScript 5, Vitest, Testing Library, Capacitor 8, `@ebarooni/capacitor-calendar` 8.x, Supabase JS, Radix Dialog, Lucide.

---

## File map

- Create `src/app/lib/assignment-calendar.ts`: value types, time parsing, recurrence calculation, meeting end calculation and ICS generation.
- Create `src/app/lib/assignment-calendar.test.ts`: unit tests for all pure calendar rules.
- Create `src/app/lib/assignment-calendar-source.ts`: load and normalize source records for a notification.
- Create `src/app/lib/assignment-calendar-source.test.ts`: source-type routing and validation tests.
- Create `src/app/lib/calendar-delivery.ts`: native calendar adapter, permission handling and web `.ics` fallback.
- Create `src/app/lib/calendar-delivery.test.ts`: platform and partial-success tests.
- Create `src/app/components/AssignmentCalendarActions.tsx`: confirmed-state button, loading and recurring choice dialog.
- Create `src/app/components/AssignmentCalendarActions.test.tsx`: component behavior and accessibility tests.
- Modify `src/app/lib/api.ts`: focused record lookups used by the source resolver.
- Modify `src/app/components/Dashboard.tsx`: render the new actions only for confirmed notifications.
- Modify `package.json`: add the Capacitor 8 calendar plugin.
- Modify `android/app/src/main/AndroidManifest.xml`: declare calendar permissions.
- Modify `ios/App/App/Info.plist`: add calendar permission descriptions.

### Task 1: Install and configure the native calendar bridge

**Files:**
- Modify: `package.json`
- Modify: `android/app/src/main/AndroidManifest.xml`
- Modify: `ios/App/App/Info.plist`

- [ ] **Step 1: Install the Capacitor 8 plugin**

Run:

```bash
npm install @ebarooni/capacitor-calendar@^8.3.0
```

Expected: `package.json` contains `"@ebarooni/capacitor-calendar": "^8.3.0"` and npm exits 0.

- [ ] **Step 2: Declare Android calendar permissions**

Add next to the existing permission declarations in `android/app/src/main/AndroidManifest.xml`:

```xml
<uses-permission android:name="android.permission.READ_CALENDAR" />
<uses-permission android:name="android.permission.WRITE_CALENDAR" />
```

- [ ] **Step 3: Declare iOS calendar usage descriptions**

Add inside the root `<dict>` in `ios/App/App/Info.plist`:

```xml
<key>NSCalendarsFullAccessUsageDescription</key>
<string>Usamos o calendário para adicionar suas designações confirmadas com lembrete.</string>
<key>NSCalendarsUsageDescription</key>
<string>Usamos o calendário para adicionar suas designações confirmadas com lembrete.</string>
```

- [ ] **Step 4: Sync native projects**

Run:

```bash
npx cap sync
```

Expected: Android and iOS report successful plugin synchronization.

- [ ] **Step 5: Commit platform setup**

Because `android/` and `ios/` are ignored in this repository, stage their explicit files with `-f`:

```bash
git add package.json
git add -f android/app/src/main/AndroidManifest.xml ios/App/App/Info.plist
git commit -m "build: add native calendar integration"
```

### Task 2: Build the pure calendar domain with TDD

**Files:**
- Create: `src/app/lib/assignment-calendar.test.ts`
- Create: `src/app/lib/assignment-calendar.ts`

- [ ] **Step 1: Write failing tests for time ranges and local dates**

Create `src/app/lib/assignment-calendar.test.ts` with these first contracts:

```ts
import { describe, expect, it, vi } from 'vitest';
import {
  combineLocalDateTime,
  parseTimeRange,
  remainingWeekdayDatesInMonth,
} from './assignment-calendar';

describe('parseTimeRange', () => {
  it.each([
    ['09:00 às 11:00', ['09:00', '11:00']],
    ['18:30 ÀS 19:30', ['18:30', '19:30']],
  ])('parses %s', (value, expected) => {
    expect(parseTimeRange(value)).toEqual(expected);
  });

  it('rejects ambiguous field-service times', () => {
    expect(() => parseTimeRange('08:30 / 08:45')).toThrow('Defina um único horário');
  });
});

describe('remainingWeekdayDatesInMonth', () => {
  it('includes today and excludes past Mondays', () => {
    vi.setSystemTime(new Date(2026, 8, 14, 12));
    expect(remainingWeekdayDatesInMonth(2026, 9, 1)).toEqual([
      '2026-09-14', '2026-09-21', '2026-09-28',
    ]);
  });
});

it('combines a date and time in the device local timezone', () => {
  expect(combineLocalDateTime('2026-09-14', '08:45').getHours()).toBe(8);
});
```

- [ ] **Step 2: Run tests and verify RED**

Run:

```bash
npm test -- --run src/app/lib/assignment-calendar.test.ts
```

Expected: FAIL because `assignment-calendar.ts` does not exist.

- [ ] **Step 3: Implement the minimal parsing/date API**

Create `src/app/lib/assignment-calendar.ts` beginning with:

```ts
export const CALENDAR_REMINDER_MINUTES = 3 * 24 * 60;

export interface AssignmentCalendarEvent {
  uid: string;
  title: string;
  description: string;
  location?: string;
  startsAt: Date;
  endsAt: Date;
  reminderMinutesBefore: number;
}

export interface CartCalendarInput {
  notificationId: string; sourceId: string; slotKey: string; roleLabel: string;
  date: string; timeRange: string; location?: string; description: string;
}

export interface FieldServiceCalendarInput {
  notificationId: string; sourceId: string; slotKey: string; roleLabel: string;
  year: number; month: number; weekday: number; startTime: string;
  location?: string; description: string;
}

export interface MeetingCalendarInput {
  notificationId: string; sourceId: string; slotKey: string; roleLabel: string;
  date: string; startTime: string; endTime?: string;
  location?: string; description: string;
}

export function parseTimeRange(value: string): [string, string] {
  if (value.includes('/')) throw new Error('Defina um único horário antes de adicionar ao calendário.');
  const match = value.match(/(\d{1,2}:\d{2})\s+(?:às|as)\s+(\d{1,2}:\d{2})/i);
  if (!match) throw new Error('Informe o período no formato HH:MM às HH:MM.');
  return [match[1].padStart(5, '0'), match[2].padStart(5, '0')];
}

export function combineLocalDateTime(date: string, time: string): Date {
  const result = new Date(`${date}T${time}:00`);
  if (Number.isNaN(result.getTime())) throw new Error('Data ou horário inválido para o calendário.');
  return result;
}

export function remainingWeekdayDatesInMonth(
  year: number,
  month: number,
  weekday: number,
  now = new Date(),
): string[] {
  const dates: string[] = [];
  for (let day = 1; day <= new Date(year, month, 0).getDate(); day += 1) {
    const candidate = new Date(year, month - 1, day, 12);
    if (candidate.getDay() === weekday && candidate >= new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12)) {
      dates.push(`${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`);
    }
  }
  return dates;
}
```

- [ ] **Step 4: Run tests and verify GREEN**

Run the Task 2 test command. Expected: PASS.

- [ ] **Step 5: Add failing event-builder and ICS tests**

Append tests asserting:

```ts
expect(buildCartEvent(input).endsAt.getTime() - buildCartEvent(input).startsAt.getTime()).toBe(60 * 60 * 1000);
expect(buildFieldServiceEvents(input, 'month')).toHaveLength(3);
expect(buildFieldServiceEvents(input, 'next')).toHaveLength(1);
expect(buildMeetingEvent(input).endsAt.getTime() - buildMeetingEvent(input).startsAt.getTime()).toBe(105 * 60 * 1000);

const ics = serializeCalendar([event]);
expect(ics).toContain('BEGIN:VEVENT');
expect(ics).toContain('TRIGGER:-PT72H');
expect(ics).toContain('UID:notification-1:2026-09-14@jwgestao');
expect(ics).toContain('LOCATION:Salão do Reino');
```

Use concrete fixtures with `slotKey`, source ID, title, date, interval and location. Also test CRLF output and escaping of comma, semicolon, backslash and newline.

- [ ] **Step 6: Verify the new tests fail for missing builders**

Run the Task 2 test command. Expected: FAIL naming `buildCartEvent`, `buildFieldServiceEvents`, `buildMeetingEvent` or `serializeCalendar`.

- [ ] **Step 7: Implement event builders and ICS serialization**

Implement these exact exports in `assignment-calendar.ts`:

```ts
export type FieldServiceCalendarScope = 'next' | 'month';
export function buildCartEvent(input: CartCalendarInput): AssignmentCalendarEvent;
export function buildFieldServiceEvents(
  input: FieldServiceCalendarInput,
  scope: FieldServiceCalendarScope,
  now?: Date,
): AssignmentCalendarEvent[];
export function buildMeetingEvent(input: MeetingCalendarInput): AssignmentCalendarEvent;
export function serializeCalendar(events: AssignmentCalendarEvent[]): string;
export function downloadCalendarFile(events: AssignmentCalendarEvent[], filename?: string): void;
```

Builders must always set `reminderMinutesBefore: CALENDAR_REMINDER_MINUTES`; field service ends at start plus 120 minutes; meeting uses a computed end when provided and otherwise 105 minutes. Serialize local values as floating `YYYYMMDDTHHmmss`, use `UID` per occurrence, emit `VALARM` with `ACTION:DISPLAY` and `TRIGGER:-PT72H`, and download via a temporary `Blob` URL.

- [ ] **Step 8: Run tests and commit the domain**

Run:

```bash
npm test -- --run src/app/lib/assignment-calendar.test.ts
git add src/app/lib/assignment-calendar.ts src/app/lib/assignment-calendar.test.ts
git commit -m "feat: build assignment calendar events"
```

Expected: all calendar-domain tests PASS.

### Task 3: Normalize source records for each notification

**Files:**
- Modify: `src/app/lib/api.ts`
- Create: `src/app/lib/assignment-calendar-source.test.ts`
- Create: `src/app/lib/assignment-calendar-source.ts`

- [ ] **Step 1: Write failing source-resolution tests**

Mock a narrow `AssignmentCalendarApi` rather than Supabase. Define it in `assignment-calendar-source.ts` with the five focused lookup methods from Step 3 plus `getMidweekMeetingById`, `getWeekendMeetingById` and `getAppSetting`. Cover every `sourceType`: `midweek_meeting_role`, `midweek_ministry_part`, `midweek_christian_life_part`, `weekend_meeting_role`, `audio_video_role`, `field_service_assignment`, and `cart_assignment`.

```ts
const details = await resolveAssignmentCalendarSource(notification, api, settings);
expect(details.kind).toBe('cart');
expect(details).toMatchObject({ date: '2026-09-15', timeRange: '09:00 às 11:00', location: 'Hospital' });
```

Add negative tests for missing source, missing meeting time and `08:30 / 08:45`.

- [ ] **Step 2: Verify RED**

Run:

```bash
npm test -- --run src/app/lib/assignment-calendar-source.test.ts
```

Expected: FAIL because the resolver is missing.

- [ ] **Step 3: Add focused API lookups**

Add methods to `api` in `src/app/lib/api.ts` using `.select('*').eq('id', id).maybeSingle()`:

```ts
getAudioVideoAssignmentById(id: string)
getFieldServiceAssignmentById(id: string)
getCartAssignmentById(id: string)
getMidweekMinistryPartCalendarSource(id: string)
getMidweekChristianLifePartCalendarSource(id: string)
```

The two part queries must select their parent `midweek_meetings` record, including date and all schedule times/durations required to find the full meeting period. Reuse existing `getMidweekMeetingById` and `getWeekendMeetingById` for meeting-role notifications.

- [ ] **Step 4: Implement the resolver**

Export:

```ts
export async function resolveAssignmentCalendarSource(
  notification: AssignmentNotification,
  calendarApi: AssignmentCalendarApi,
  settings: { midweekTime?: string | null; weekendTime?: string | null },
): Promise<ResolvedAssignmentCalendarSource>;
```

Define the result as a discriminated union:

```ts
export type ResolvedAssignmentCalendarSource =
  | ({ kind: 'cart' } & CartCalendarInput)
  | ({ kind: 'field_service'; recurring: boolean } & FieldServiceCalendarInput)
  | ({ kind: 'meeting' } & MeetingCalendarInput);
```

Map `slotKey` to a human label, derive cart date from year/month/day, map Portuguese weekday names to `Date.getDay()`, preserve field-service month/year, and associate audio/video to midweek or weekend by matching its date. Throw user-facing `Error` objects for missing or ambiguous data.

- [ ] **Step 5: Run tests and commit**

```bash
npm test -- --run src/app/lib/assignment-calendar-source.test.ts
git add src/app/lib/api.ts src/app/lib/assignment-calendar-source.ts src/app/lib/assignment-calendar-source.test.ts
git commit -m "feat: resolve calendar data from assignments"
```

Expected: all source-resolution tests PASS.

### Task 4: Deliver events natively with web fallback

**Files:**
- Create: `src/app/lib/calendar-delivery.test.ts`
- Create: `src/app/lib/calendar-delivery.ts`

- [ ] **Step 1: Write failing adapter tests**

Inject platform and plugin dependencies so tests do not load native code:

```ts
const result = await deliverCalendarEvents([event], {
  platform: 'android',
  calendar: nativeCalendar,
  downloadIcs,
});
expect(nativeCalendar.requestFullCalendarAccess).toHaveBeenCalledOnce();
expect(nativeCalendar.createEvent).toHaveBeenCalledWith(expect.objectContaining({ alerts: [-4320] }));
expect(result).toEqual({ mode: 'native', created: 1, failed: [] });
```

Cover web fallback, permission denial, native exception, and a two-event partial failure.

- [ ] **Step 2: Verify RED**

```bash
npm test -- --run src/app/lib/calendar-delivery.test.ts
```

Expected: FAIL because `deliverCalendarEvents` is missing.

- [ ] **Step 3: Implement delivery**

Export:

```ts
export interface CalendarDeliveryResult {
  mode: 'native' | 'ics';
  created: number;
  failed: Array<{ uid: string; message: string }>;
}

export interface CalendarDeliveryDependencies {
  platform: 'android' | 'ios' | 'web';
  calendar: Pick<typeof CapacitorCalendar,
    'requestFullCalendarAccess' | 'getDefaultCalendar' | 'createEvent'>;
  downloadIcs: (events: AssignmentCalendarEvent[], filename?: string) => void;
}

export async function deliverCalendarEvents(
  events: AssignmentCalendarEvent[],
  dependencies?: CalendarDeliveryDependencies,
): Promise<CalendarDeliveryResult>;
```

Use `Capacitor.getPlatform()`; on Android/iOS request full access, obtain the default calendar with `{ useFallbackCalendar: true }`, then call `createEvent` with Unix milliseconds, `calendarId`, and `alerts: [-CALENDAR_REMINDER_MINUTES]`. On web, denial, missing default calendar or total native failure, call `downloadCalendarFile(events)`. For partial failure, do not re-download successful events; return failed event identifiers so the UI can list their dates.

- [ ] **Step 4: Run tests and commit**

```bash
npm test -- --run src/app/lib/calendar-delivery.test.ts
git add src/app/lib/calendar-delivery.ts src/app/lib/calendar-delivery.test.ts
git commit -m "feat: deliver assignment events to calendars"
```

### Task 5: Build the confirmed-assignment UI with TDD

**Files:**
- Create: `src/app/components/AssignmentCalendarActions.test.tsx`
- Create: `src/app/components/AssignmentCalendarActions.tsx`

- [ ] **Step 1: Write failing component tests**

Test the approved layout and behavior:

```tsx
vi.mock('../lib/assignment-calendar-source');
vi.mock('../lib/calendar-delivery');
render(<AssignmentCalendarActions notification={confirmedCart} onHide={vi.fn()} />);
expect(screen.getByText('Confirmado ✓')).toBeVisible();
expect(screen.getByRole('button', { name: /adicionar ao calendário/i })).toBeVisible();
```

Also assert: pending notifications render nothing; double click starts one operation; field service opens a dialog with `Somente a próxima` and `Todas deste mês`; the dialog reports the event count; success, validation error and partial failure produce the expected toast calls.

- [ ] **Step 2: Verify RED**

```bash
npm test -- --run src/app/components/AssignmentCalendarActions.test.tsx
```

Expected: FAIL because the component is missing.

- [ ] **Step 3: Implement the component**

Use the shared `Dialog`, `Button` and `CalendarPlus` icon. The public contract is:

```ts
interface AssignmentCalendarActionsProps {
  notification: AssignmentNotification;
  onHide: (id: string) => Promise<void>;
}
```

Render actions in `flex flex-wrap items-center justify-end gap-1 shrink-0` so they remain side by side when space allows and wrap safely on narrow screens. The calendar button resolves source data, asks scope only for recurring field service, builds event(s), delivers them and reports `Evento adicionado ao calendário.` or `${count} eventos adicionados ao calendário.`. Disable it while loading and retain the existing hide action.

- [ ] **Step 4: Run tests and commit**

```bash
npm test -- --run src/app/components/AssignmentCalendarActions.test.tsx
git add src/app/components/AssignmentCalendarActions.tsx src/app/components/AssignmentCalendarActions.test.tsx
git commit -m "feat: add calendar actions for confirmed assignments"
```

### Task 6: Integrate the actions into Minhas Designações

**Files:**
- Modify: `src/app/components/Dashboard.tsx:325`
- Create: `src/app/components/Dashboard.calendar.test.tsx`

- [ ] **Step 1: Write a failing dashboard integration test**

Mock auth, notification context and API loads. Render one pending and one confirmed notification, then assert:

```ts
expect(screen.getAllByRole('button', { name: /confirmar/i })).toHaveLength(1);
expect(screen.getAllByRole('button', { name: /adicionar ao calendário/i })).toHaveLength(1);
```

- [ ] **Step 2: Verify RED**

```bash
npm test -- --run src/app/components/Dashboard.calendar.test.tsx
```

Expected: FAIL because the confirmed row has no calendar button.

- [ ] **Step 3: Replace confirmed-row inline actions**

Import `AssignmentCalendarActions`. Keep the current pending branch unchanged and replace lines currently rendering `Confirmado ✓` plus the hide button with:

```tsx
<AssignmentCalendarActions
  notification={notification}
  onHide={hideNotification}
/>
```

Do not add the button to the quick-link meeting cards or the header notification popover in this delivery; the approved scope is the main `Minhas Designações` group.

- [ ] **Step 4: Run focused and full tests**

```bash
npm test -- --run src/app/components/Dashboard.calendar.test.tsx src/app/components/AssignmentCalendarActions.test.tsx
npm test -- --run
```

Expected: focused tests PASS and the complete suite exits 0.

- [ ] **Step 5: Commit dashboard integration**

```bash
git add src/app/components/Dashboard.tsx src/app/components/Dashboard.calendar.test.tsx
git commit -m "feat: expose calendar action after confirmation"
```

### Task 7: Validate builds and native configuration

**Files:**
- Modify only if verification exposes a defect in files already listed above.

- [ ] **Step 1: Run static and production validation**

```bash
npx tsc --noEmit
npm run build
```

Expected: both commands exit 0 without TypeScript or Vite errors.

- [ ] **Step 2: Run all automated tests**

```bash
npm test -- --run
```

Expected: all test files PASS with no unhandled rejection.

- [ ] **Step 3: Build Android debug artifact**

```bash
npm run apk:debug
```

Expected: Gradle reports `BUILD SUCCESSFUL` and produces the debug APK.

- [ ] **Step 4: Perform the manual acceptance matrix**

In a browser and an Android emulator/device verify:

1. Pending designation has no calendar action.
2. Confirmation reveals the approved side-by-side action immediately.
3. Cart intervals of one and two hours retain their exact end time.
4. A meeting event covers the full meeting period.
5. Field service offers next/all-month and excludes past occurrences.
6. Every event contains location/details and a three-day alert.
7. Denying native permission triggers `.ics` fallback.
8. Ambiguous `08:30 / 08:45` explains that a single time must be configured.

If verification exposes a defect, return to the task that owns the affected file, add a failing regression test, apply the minimal fix, rerun that task's focused tests and commit only those files with `fix: address assignment calendar verification`. Do not create an empty commit.
