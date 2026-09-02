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
  notificationId: string;
  sourceId: string;
  slotKey: string;
  roleLabel: string;
  date: string;
  timeRange: string;
  location?: string;
  description: string;
}

export interface FieldServiceCalendarInput {
  notificationId: string;
  sourceId: string;
  slotKey: string;
  roleLabel: string;
  year: number;
  month: number;
  weekday: number;
  startTime: string;
  location?: string;
  description: string;
}

export interface MeetingCalendarInput {
  notificationId: string;
  sourceId: string;
  slotKey: string;
  roleLabel: string;
  date: string;
  startTime: string;
  endTime?: string;
  location?: string;
  description: string;
}

export type FieldServiceCalendarScope = 'next' | 'month';

const TIME_PATTERN = /^(\d{1,2}):(\d{2})$/;

function parseTime(value: string): [number, number] | null {
  const match = value.match(TIME_PATTERN);
  if (!match) return null;

  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return null;

  return [hours, minutes];
}

export function parseTimeRange(value: string): [string, string] {
  if (value.includes('/')) {
    throw new Error('Defina um único horário antes de adicionar ao calendário.');
  }

  const match = value.match(/^(\d{1,2}:\d{2})\s+(?:às|as)\s+(\d{1,2}:\d{2})$/i);
  if (!match || !parseTime(match[1]) || !parseTime(match[2])) {
    throw new Error('Informe o período no formato HH:MM às HH:MM.');
  }

  return [match[1].padStart(5, '0'), match[2].padStart(5, '0')];
}

export function combineLocalDateTime(date: string, time: string): Date {
  const dateMatch = date.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const parsedTime = parseTime(time);
  if (!dateMatch || !parsedTime) {
    throw new Error('Data ou horário inválido para o calendário.');
  }

  const year = Number(dateMatch[1]);
  const month = Number(dateMatch[2]);
  const day = Number(dateMatch[3]);
  const [hours, minutes] = parsedTime;
  const result = new Date(year, month - 1, day, hours, minutes, 0, 0);

  if (
    result.getFullYear() !== year
    || result.getMonth() !== month - 1
    || result.getDate() !== day
    || result.getHours() !== hours
    || result.getMinutes() !== minutes
  ) {
    throw new Error('Data ou horário inválido para o calendário.');
  }

  return result;
}

export function remainingWeekdayDatesInMonth(
  year: number,
  month: number,
  weekday: number,
  now = new Date(),
): string[] {
  if (!Number.isInteger(month) || month < 1 || month > 12) {
    throw new Error('Mês inválido para o calendário.');
  }

  const dates: string[] = [];
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const lastDay = new Date(year, month, 0).getDate();

  for (let day = 1; day <= lastDay; day += 1) {
    const candidate = new Date(year, month - 1, day, 12);
    if (candidate.getDay() === weekday && candidate >= today) {
      dates.push(`${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`);
    }
  }

  return dates;
}

function eventUid(notificationId: string, sourceId: string, slotKey: string, date: string): string {
  return `${notificationId}:${sourceId}:${slotKey}:${date}@jwgestao`;
}

function buildEvent(
  input: Pick<CartCalendarInput, 'notificationId' | 'sourceId' | 'slotKey' | 'roleLabel' | 'location' | 'description'>,
  date: string,
  startsAt: Date,
  endsAt: Date,
): AssignmentCalendarEvent {
  return {
    uid: eventUid(input.notificationId, input.sourceId, input.slotKey, date),
    title: `Designação — ${input.roleLabel}`,
    description: input.description,
    location: input.location,
    startsAt,
    endsAt,
    reminderMinutesBefore: CALENDAR_REMINDER_MINUTES,
  };
}

function assertEndAfterStart(startsAt: Date, endsAt: Date): void {
  if (endsAt <= startsAt) {
    throw new Error('O término deve ser posterior ao início para adicionar ao calendário.');
  }
}

export function buildCartEvent(input: CartCalendarInput): AssignmentCalendarEvent {
  const [startTime, endTime] = parseTimeRange(input.timeRange);
  const startsAt = combineLocalDateTime(input.date, startTime);
  const endsAt = combineLocalDateTime(input.date, endTime);
  assertEndAfterStart(startsAt, endsAt);

  return buildEvent(input, input.date, startsAt, endsAt);
}

export function buildFieldServiceEvents(
  input: FieldServiceCalendarInput,
  scope: FieldServiceCalendarScope,
  now = new Date(),
): AssignmentCalendarEvent[] {
  const dates = remainingWeekdayDatesInMonth(input.year, input.month, input.weekday, now);
  const selectedDates = scope === 'next' ? dates.slice(0, 1) : dates;

  return selectedDates.map(date => {
    const startsAt = combineLocalDateTime(date, input.startTime);
    const endsAt = new Date(startsAt.getTime() + 120 * 60 * 1000);
    return buildEvent(input, date, startsAt, endsAt);
  });
}

export function buildMeetingEvent(input: MeetingCalendarInput): AssignmentCalendarEvent {
  const startsAt = combineLocalDateTime(input.date, input.startTime);
  const endsAt = input.endTime
    ? combineLocalDateTime(input.date, input.endTime)
    : new Date(startsAt.getTime() + 105 * 60 * 1000);
  assertEndAfterStart(startsAt, endsAt);

  return buildEvent(input, input.date, startsAt, endsAt);
}

function formatLocalDateTime(value: Date): string {
  if (Number.isNaN(value.getTime())) {
    throw new Error('Data ou horário inválido para o calendário.');
  }

  return [
    String(value.getFullYear()).padStart(4, '0'),
    String(value.getMonth() + 1).padStart(2, '0'),
    String(value.getDate()).padStart(2, '0'),
    'T',
    String(value.getHours()).padStart(2, '0'),
    String(value.getMinutes()).padStart(2, '0'),
    String(value.getSeconds()).padStart(2, '0'),
  ].join('');
}

function escapeCalendarText(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/\r\n|\r|\n/g, '\\n')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,');
}

export function serializeCalendar(events: AssignmentCalendarEvent[]): string {
  if (events.length === 0) {
    throw new Error('Nenhum evento para adicionar ao calendário.');
  }

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//JW Gestão//Designações//PT-BR',
    'CALSCALE:GREGORIAN',
  ];

  for (const event of events) {
    lines.push(
      'BEGIN:VEVENT',
      `UID:${event.uid}`,
      `DTSTART:${formatLocalDateTime(event.startsAt)}`,
      `DTEND:${formatLocalDateTime(event.endsAt)}`,
      `SUMMARY:${escapeCalendarText(event.title)}`,
      `DESCRIPTION:${escapeCalendarText(event.description)}`,
    );

    if (event.location) {
      lines.push(`LOCATION:${escapeCalendarText(event.location)}`);
    }

    lines.push(
      'BEGIN:VALARM',
      'ACTION:DISPLAY',
      'TRIGGER:-PT72H',
      `DESCRIPTION:${escapeCalendarText(event.title)}`,
      'END:VALARM',
      'END:VEVENT',
    );
  }

  lines.push('END:VCALENDAR');
  return `${lines.join('\r\n')}\r\n`;
}

export function downloadCalendarFile(
  events: AssignmentCalendarEvent[],
  filename = 'designacoes.ics',
): void {
  const blob = new Blob([serializeCalendar(events)], { type: 'text/calendar' });
  const objectUrl = URL.createObjectURL(blob);

  try {
    const anchor = document.createElement('a');
    anchor.href = objectUrl;
    anchor.download = filename;
    anchor.click();
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}
