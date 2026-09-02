import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  buildCartEvent,
  buildFieldServiceEvents,
  buildMeetingEvent,
  combineLocalDateTime,
  downloadCalendarFile,
  parseTimeRange,
  remainingWeekdayDatesInMonth,
  serializeCalendar,
} from './assignment-calendar';

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

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

  it.each([
    '09:00 - 11:00',
    '25:00 às 26:00',
    '09:60 às 11:00',
    '09:00 às 11:00 extra',
  ])('rejects the invalid range %s', value => {
    expect(() => parseTimeRange(value)).toThrow('Informe o período no formato HH:MM às HH:MM.');
  });
});

describe('combineLocalDateTime', () => {
  it('combines a date and time in the device local timezone', () => {
    const result = combineLocalDateTime('2026-09-14', '08:45');

    expect(result.getFullYear()).toBe(2026);
    expect(result.getMonth()).toBe(8);
    expect(result.getDate()).toBe(14);
    expect(result.getHours()).toBe(8);
    expect(result.getMinutes()).toBe(45);
  });

  it.each([
    ['2026-02-30', '08:45'],
    ['2026-09-14', '24:00'],
    ['14/09/2026', '08:45'],
  ])('rejects invalid local date/time %s %s', (date, time) => {
    expect(() => combineLocalDateTime(date, time)).toThrow('Data ou horário inválido');
  });
});

describe('remainingWeekdayDatesInMonth', () => {
  it('includes today and excludes past Mondays', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 8, 14, 12));

    expect(remainingWeekdayDatesInMonth(2026, 9, 1)).toEqual([
      '2026-09-14',
      '2026-09-21',
      '2026-09-28',
    ]);
  });

  it.each([0, 13])('rejects month %s outside 1-12', month => {
    expect(() => remainingWeekdayDatesInMonth(2026, month, 1)).toThrow('Mês inválido');
  });
});

const cartInput = {
  notificationId: 'notification-1',
  sourceId: 'cart-1',
  slotKey: 'publisher1',
  roleLabel: 'Publicador 1',
  date: '2026-09-14',
  timeRange: '09:00 às 11:00',
  location: 'Praça Central',
  description: 'Carrinho de testemunho público',
};

const fieldServiceInput = {
  notificationId: 'notification-2',
  sourceId: 'field-service-1',
  slotKey: 'responsible',
  roleLabel: 'Responsável',
  year: 2026,
  month: 9,
  weekday: 1,
  startTime: '08:30',
  location: 'Salão do Reino',
  description: 'Saída de campo',
};

const meetingInput = {
  notificationId: 'notification-3',
  sourceId: 'meeting-1',
  slotKey: 'sound',
  roleLabel: 'Som',
  date: '2026-09-17',
  startTime: '19:30',
  location: 'Salão do Reino',
  description: 'Reunião do meio de semana',
};

describe('event builders', () => {
  it.each([
    ['09:00 às 10:00', 60],
    ['09:00 às 11:00', 120],
  ])('keeps the real cart duration for %s', (timeRange, durationMinutes) => {
    const event = buildCartEvent({ ...cartInput, timeRange });

    expect(event.endsAt.getTime() - event.startsAt.getTime()).toBe(durationMinutes * 60 * 1000);
    expect(event).toMatchObject({
      uid: 'notification-1:2026-09-14@jwgestao',
      title: 'Designação — Publicador 1',
      reminderMinutesBefore: 4320,
    });
  });

  it('rejects a cart interval whose end is not after its start', () => {
    expect(() => buildCartEvent({ ...cartInput, timeRange: '11:00 às 09:00' })).toThrow(
      'O término deve ser posterior ao início',
    );
  });

  it('builds the next or all remaining field-service occurrences with two-hour durations', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 8, 14, 12));

    const monthEvents = buildFieldServiceEvents(fieldServiceInput, 'month');
    const nextEvents = buildFieldServiceEvents(fieldServiceInput, 'next');

    expect(monthEvents).toHaveLength(3);
    expect(monthEvents.map(event => event.startsAt.getDate())).toEqual([14, 21, 28]);
    expect(monthEvents.every(event => event.endsAt.getTime() - event.startsAt.getTime() === 120 * 60 * 1000)).toBe(true);
    expect(monthEvents.map(event => event.uid)).toEqual([
      'notification-2:2026-09-14@jwgestao',
      'notification-2:2026-09-21@jwgestao',
      'notification-2:2026-09-28@jwgestao',
    ]);
    expect(nextEvents).toEqual([monthEvents[0]]);
  });

  it('uses the meeting end time when provided', () => {
    const event = buildMeetingEvent({ ...meetingInput, endTime: '21:00' });

    expect(event.endsAt.getTime() - event.startsAt.getTime()).toBe(90 * 60 * 1000);
  });

  it('falls back to 105 minutes when the meeting end time is missing', () => {
    const event = buildMeetingEvent(meetingInput);

    expect(event.endsAt.getTime() - event.startsAt.getTime()).toBe(105 * 60 * 1000);
    expect(event.reminderMinutesBefore).toBe(4320);
  });
});

describe('serializeCalendar', () => {
  it('serializes local fields, CRLF lines, escaped text and a 72-hour display alarm', () => {
    const event = buildCartEvent({
      ...cartInput,
      roleLabel: 'Carrinho, setor; norte\\sul',
      location: 'Salão, principal; entrada\\A',
      description: 'Primeira linha\nSegunda, linha; com \\ barra',
    });

    const ics = serializeCalendar([event]);

    expect(ics).toContain('BEGIN:VCALENDAR\r\n');
    expect(ics).toContain('BEGIN:VEVENT\r\n');
    expect(ics).toContain('UID:notification-1:2026-09-14@jwgestao\r\n');
    expect(ics).toContain('DTSTART:20260914T090000\r\n');
    expect(ics).toContain('DTEND:20260914T110000\r\n');
    expect(ics).toContain('SUMMARY:Designação — Carrinho\\, setor\\; norte\\\\sul\r\n');
    expect(ics).toContain('DESCRIPTION:Primeira linha\\nSegunda\\, linha\\; com \\\\ barra\r\n');
    expect(ics).toContain('LOCATION:Salão\\, principal\\; entrada\\\\A\r\n');
    expect(ics).toContain('BEGIN:VALARM\r\nACTION:DISPLAY\r\nTRIGGER:-PT72H\r\n');
    expect(ics).toMatch(/END:VCALENDAR\r\n$/);
    expect(ics.replaceAll('\r\n', '')).not.toContain('\n');
  });

  it('omits LOCATION when one is not provided', () => {
    expect(serializeCalendar([buildMeetingEvent({ ...meetingInput, location: undefined })])).not.toContain('LOCATION:');
  });

  it('rejects an empty event list', () => {
    expect(() => serializeCalendar([])).toThrow('Nenhum evento');
  });
});

describe('downloadCalendarFile', () => {
  it('downloads a calendar Blob and revokes its temporary URL', () => {
    const createObjectURL = vi.fn(() => 'blob:calendar');
    const revokeObjectURL = vi.fn();
    vi.stubGlobal('URL', { createObjectURL, revokeObjectURL });
    const click = vi.fn();
    const anchor = document.createElement('a');
    anchor.click = click;
    vi.spyOn(document, 'createElement').mockReturnValue(anchor);

    downloadCalendarFile([buildMeetingEvent(meetingInput)], 'minha-designacao.ics');

    expect(createObjectURL).toHaveBeenCalledOnce();
    expect(createObjectURL.mock.calls[0][0]).toBeInstanceOf(Blob);
    expect(createObjectURL.mock.calls[0][0].type).toBe('text/calendar');
    expect(anchor.download).toBe('minha-designacao.ics');
    expect(anchor.href).toBe('blob:calendar');
    expect(click).toHaveBeenCalledOnce();
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:calendar');
  });
});
