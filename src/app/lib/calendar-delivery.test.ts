import { describe, expect, it, vi } from 'vitest';

vi.mock('@capacitor/core', () => ({
  Capacitor: { getPlatform: vi.fn(() => 'web') },
}));

vi.mock('@ebarooni/capacitor-calendar', () => ({
  CapacitorCalendar: {
    requestFullCalendarAccess: vi.fn(),
    getDefaultCalendar: vi.fn(),
    createEvent: vi.fn(),
  },
}));

import type { AssignmentCalendarEvent } from './assignment-calendar';
import {
  deliverCalendarEvents,
  type CalendarDeliveryDependencies,
} from './calendar-delivery';

function event(overrides: Partial<AssignmentCalendarEvent> = {}): AssignmentCalendarEvent {
  return {
    uid: 'notification-1:cart-1:publisher1:2026-09-14@jwgestao',
    title: 'Designação — Publicador 1',
    description: 'Carrinho de testemunho público',
    location: 'Praça Central',
    startsAt: new Date(2026, 8, 14, 9, 0),
    endsAt: new Date(2026, 8, 14, 11, 0),
    reminderMinutesBefore: 4320,
    ...overrides,
  };
}

function dependencies(
  overrides: Partial<CalendarDeliveryDependencies> = {},
): CalendarDeliveryDependencies {
  return {
    platform: 'android',
    calendar: {
      requestFullCalendarAccess: vi.fn().mockResolvedValue({ result: 'granted' }),
      getDefaultCalendar: vi.fn().mockResolvedValue({ result: { id: 'primary-calendar' } }),
      createEvent: vi.fn().mockResolvedValue({ id: 'native-event-1' }),
    } as unknown as CalendarDeliveryDependencies['calendar'],
    downloadIcs: vi.fn(),
    ...overrides,
  };
}

describe('deliverCalendarEvents', () => {
  it('downloads a stable ICS file on web', async () => {
    const currentEvent = event();
    const deps = dependencies({ platform: 'web' });

    const result = await deliverCalendarEvents([currentEvent], deps);

    expect(deps.downloadIcs).toHaveBeenCalledWith(
      [currentEvent],
      'jwgestao-designacoes.ics',
    );
    expect(deps.calendar.requestFullCalendarAccess).not.toHaveBeenCalled();
    expect(result).toEqual({ mode: 'ics', created: 0, failed: [] });
  });

  it.each(['android', 'ios'] as const)(
    'creates events in the default %s calendar with Unix milliseconds and a 72-hour alert',
    async platform => {
      const currentEvent = event();
      const deps = dependencies({ platform });

      const result = await deliverCalendarEvents([currentEvent], deps);

      expect(deps.calendar.requestFullCalendarAccess).toHaveBeenCalledOnce();
      expect(deps.calendar.getDefaultCalendar).toHaveBeenCalledWith({
        useFallbackCalendar: true,
      });
      expect(deps.calendar.createEvent).toHaveBeenCalledWith({
        title: currentEvent.title,
        location: currentEvent.location,
        description: currentEvent.description,
        startDate: currentEvent.startsAt.getTime(),
        endDate: currentEvent.endsAt.getTime(),
        calendarId: 'primary-calendar',
        alerts: [-4320],
      });
      expect(deps.downloadIcs).not.toHaveBeenCalled();
      expect(result).toEqual({ mode: 'native', created: 1, failed: [] });
    },
  );

  it('falls back to ICS when full calendar access is denied', async () => {
    const currentEvent = event();
    const deps = dependencies();
    vi.mocked(deps.calendar.requestFullCalendarAccess).mockResolvedValue({ result: 'denied' });

    const result = await deliverCalendarEvents([currentEvent], deps);

    expect(deps.calendar.getDefaultCalendar).not.toHaveBeenCalled();
    expect(deps.downloadIcs).toHaveBeenCalledWith(
      [currentEvent],
      'jwgestao-designacoes.ics',
    );
    expect(result).toEqual({ mode: 'ics', created: 0, failed: [] });
  });

  it('falls back to ICS when there is no default or fallback calendar', async () => {
    const currentEvent = event();
    const deps = dependencies();
    vi.mocked(deps.calendar.getDefaultCalendar).mockResolvedValue({ result: null });

    const result = await deliverCalendarEvents([currentEvent], deps);

    expect(deps.calendar.createEvent).not.toHaveBeenCalled();
    expect(deps.downloadIcs).toHaveBeenCalledWith(
      [currentEvent],
      'jwgestao-designacoes.ics',
    );
    expect(result).toEqual({ mode: 'ics', created: 0, failed: [] });
  });

  it('falls back to ICS when native setup throws', async () => {
    const currentEvent = event();
    const deps = dependencies();
    vi.mocked(deps.calendar.requestFullCalendarAccess).mockRejectedValue(
      new Error('native bridge unavailable'),
    );

    const result = await deliverCalendarEvents([currentEvent], deps);

    expect(deps.downloadIcs).toHaveBeenCalledWith(
      [currentEvent],
      'jwgestao-designacoes.ics',
    );
    expect(result).toEqual({ mode: 'ics', created: 0, failed: [] });
  });

  it('returns partial native success without downloading duplicate events', async () => {
    const firstEvent = event();
    const secondEvent = event({
      uid: 'notification-2:cart-2:publisher2:2026-09-15@jwgestao',
      startsAt: new Date(2026, 8, 15, 9, 0),
      endsAt: new Date(2026, 8, 15, 11, 0),
    });
    const deps = dependencies();
    vi.mocked(deps.calendar.createEvent)
      .mockResolvedValueOnce({ id: 'native-event-1' })
      .mockRejectedValueOnce(new Error('Calendar is read-only'));

    const result = await deliverCalendarEvents([firstEvent, secondEvent], deps);

    expect(deps.calendar.createEvent).toHaveBeenCalledTimes(2);
    expect(deps.downloadIcs).not.toHaveBeenCalled();
    expect(result).toEqual({
      mode: 'native',
      created: 1,
      failed: [{ uid: secondEvent.uid, message: 'Calendar is read-only' }],
    });
  });

  it('falls back to one ICS file when every native event fails', async () => {
    const firstEvent = event();
    const secondEvent = event({ uid: 'notification-2@jwgestao' });
    const deps = dependencies();
    vi.mocked(deps.calendar.createEvent).mockRejectedValue(new Error('Native failure'));

    const result = await deliverCalendarEvents([firstEvent, secondEvent], deps);

    expect(deps.downloadIcs).toHaveBeenCalledWith(
      [firstEvent, secondEvent],
      'jwgestao-designacoes.ics',
    );
    expect(result).toEqual({ mode: 'ics', created: 0, failed: [] });
  });

  it('rejects an empty event list without requesting access or downloading', async () => {
    const deps = dependencies();

    await expect(deliverCalendarEvents([], deps)).rejects.toThrow('Nenhum evento');

    expect(deps.calendar.requestFullCalendarAccess).not.toHaveBeenCalled();
    expect(deps.downloadIcs).not.toHaveBeenCalled();
  });
});
