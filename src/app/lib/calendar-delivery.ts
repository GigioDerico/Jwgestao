import { Capacitor } from '@capacitor/core';
import { CapacitorCalendar } from '@ebarooni/capacitor-calendar';
import {
  CALENDAR_REMINDER_MINUTES,
  downloadCalendarFile,
  type AssignmentCalendarEvent,
} from './assignment-calendar';

const CALENDAR_FILENAME = 'jwgestao-designacoes.ics';

export interface CalendarDeliveryResult {
  mode: 'native' | 'ics';
  created: number;
  failed: Array<{ uid: string; message: string }>;
}

export interface CalendarDeliveryDependencies {
  platform: 'android' | 'ios' | 'web';
  calendar: Pick<
    typeof CapacitorCalendar,
    'requestFullCalendarAccess' | 'getDefaultCalendar' | 'createEvent'
  >;
  downloadIcs: (events: AssignmentCalendarEvent[], filename?: string) => void;
}

function defaultDependencies(): CalendarDeliveryDependencies {
  const platform = Capacitor.getPlatform();

  return {
    platform: platform === 'android' || platform === 'ios' ? platform : 'web',
    calendar: CapacitorCalendar,
    downloadIcs: downloadCalendarFile,
  };
}

function failureMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function downloadFallback(
  events: AssignmentCalendarEvent[],
  dependencies: CalendarDeliveryDependencies,
): CalendarDeliveryResult {
  dependencies.downloadIcs(events, CALENDAR_FILENAME);
  return { mode: 'ics', created: 0, failed: [] };
}

export async function deliverCalendarEvents(
  events: AssignmentCalendarEvent[],
  dependencies: CalendarDeliveryDependencies = defaultDependencies(),
): Promise<CalendarDeliveryResult> {
  if (events.length === 0) {
    throw new Error('Nenhum evento para adicionar ao calendário.');
  }

  if (dependencies.platform === 'web') {
    return downloadFallback(events, dependencies);
  }

  let calendarId: string;
  try {
    const permission = await dependencies.calendar.requestFullCalendarAccess();
    if (permission.result !== 'granted') {
      return downloadFallback(events, dependencies);
    }

    const defaultCalendar = await dependencies.calendar.getDefaultCalendar({
      useFallbackCalendar: true,
    });
    if (!defaultCalendar.result) {
      return downloadFallback(events, dependencies);
    }
    calendarId = defaultCalendar.result.id;
  } catch {
    return downloadFallback(events, dependencies);
  }

  let created = 0;
  const failed: CalendarDeliveryResult['failed'] = [];

  for (const event of events) {
    try {
      await dependencies.calendar.createEvent({
        title: event.title,
        location: event.location,
        description: event.description,
        startDate: event.startsAt.getTime(),
        endDate: event.endsAt.getTime(),
        calendarId,
        alerts: [-CALENDAR_REMINDER_MINUTES],
      });
      created += 1;
    } catch (error) {
      failed.push({ uid: event.uid, message: failureMessage(error) });
    }
  }

  if (created === 0) {
    return downloadFallback(events, dependencies);
  }

  return { mode: 'native', created, failed };
}
