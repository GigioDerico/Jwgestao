import { useRef, useState } from 'react';
import { CalendarPlus, X } from 'lucide-react';
import { toast } from 'sonner';
import type { AssignmentNotification } from '../types';
import { api } from '../lib/api';
import {
  buildCartEvent,
  buildFieldServiceEvents,
  buildMeetingEvent,
  type AssignmentCalendarEvent,
  type FieldServiceCalendarScope,
} from '../lib/assignment-calendar';
import {
  resolveAssignmentCalendarSource,
  type AssignmentCalendarSource,
} from '../lib/assignment-calendar-source';
import { deliverCalendarEvents } from '../lib/calendar-delivery';
import { Button } from './ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';

export interface AssignmentCalendarActionsProps {
  notification: AssignmentNotification;
  onHide: (id: string) => Promise<void>;
}

type RecurringFieldSource = Extract<AssignmentCalendarSource, { kind: 'field_service' }>;

function formatEventDate(event: AssignmentCalendarEvent): string {
  return event.startsAt.toLocaleDateString('pt-BR');
}

function eventDates(events: AssignmentCalendarEvent[]): string {
  return events.map(formatEventDate).join(', ');
}

function failedEventDates(
  events: AssignmentCalendarEvent[],
  failed: Array<{ uid: string }>,
): string {
  const failedUids = new Set(failed.map(item => item.uid));
  const dates = events
    .filter(event => failedUids.has(event.uid))
    .map(formatEventDate);

  if (dates.length > 0) return dates.join(', ');

  return failed
    .map(item => /:(\d{4})-(\d{2})-(\d{2})@/.exec(item.uid))
    .filter((match): match is RegExpExecArray => Boolean(match))
    .map(match => `${match[3]}/${match[2]}/${match[1]}`)
    .join(', ');
}

function successMessage(count: number): string {
  return count === 1
    ? 'Evento adicionado ao calendário.'
    : `${count} eventos adicionados ao calendário.`;
}

function eventsForSource(
  source: AssignmentCalendarSource,
  scope?: FieldServiceCalendarScope,
  notificationDate?: string | null,
): AssignmentCalendarEvent[] {
  if (source.kind === 'cart') return [buildCartEvent(source)];
  if (source.kind === 'meeting') return [buildMeetingEvent(source)];

  const explicitDate = source.date || notificationDate;
  const sourceWithDate = !source.recurring && explicitDate
    ? { ...source, date: explicitDate }
    : source;

  return buildFieldServiceEvents(sourceWithDate, scope || 'next');
}

export function AssignmentCalendarActions({
  notification,
  onHide,
}: AssignmentCalendarActionsProps) {
  const operationInFlight = useRef(false);
  const hideInFlight = useRef(false);
  const [loading, setLoading] = useState(false);
  const [hiding, setHiding] = useState(false);
  const [recurringSource, setRecurringSource] = useState<RecurringFieldSource | null>(null);
  const [monthCount, setMonthCount] = useState(0);

  if (notification.status !== 'confirmed') return null;

  const reportDelivery = async (events: AssignmentCalendarEvent[]) => {
    const result = await deliverCalendarEvents(events);

    if (result.mode === 'ics') {
      toast.info(`Arquivo de calendário gerado para: ${eventDates(events)}.`);
      return;
    }

    if (result.failed.length > 0) {
      const added = result.created === 1
        ? '1 evento adicionado'
        : `${result.created} eventos adicionados`;
      const dates = failedEventDates(events, result.failed);
      const reasons = [...new Set(result.failed.map(item => item.message))].join('; ');
      toast.error(
        `${added}. Não foi possível adicionar: ${dates || 'datas não identificadas'}. ${reasons}`,
      );
      return;
    }

    toast.success(successMessage(events.length));
  };

  const beginCalendarOperation = async () => {
    if (operationInFlight.current) return;
    operationInFlight.current = true;
    setLoading(true);

    try {
      const source = await resolveAssignmentCalendarSource(notification, api);

      if (source.kind === 'field_service' && source.recurring) {
        const events = eventsForSource(source, 'month');
        if (events.length === 0) {
          throw new Error('Não há ocorrências restantes neste mês para adicionar ao calendário.');
        }
        setRecurringSource(source);
        setMonthCount(events.length);
        return;
      }

      await reportDelivery(eventsForSource(source, undefined, notification.assignmentDate));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível adicionar ao calendário.');
    } finally {
      operationInFlight.current = false;
      setLoading(false);
    }
  };

  const deliverRecurring = async (scope: FieldServiceCalendarScope) => {
    if (!recurringSource || operationInFlight.current) return;
    operationInFlight.current = true;
    setLoading(true);

    try {
      const events = eventsForSource(recurringSource, scope);
      if (events.length === 0) {
        throw new Error('Não há ocorrências restantes neste mês para adicionar ao calendário.');
      }
      await reportDelivery(events);
      setRecurringSource(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível adicionar ao calendário.');
    } finally {
      operationInFlight.current = false;
      setLoading(false);
    }
  };

  const hideNotification = async () => {
    if (hideInFlight.current) return;
    hideInFlight.current = true;
    setHiding(true);
    try {
      await onHide(notification.id);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao ocultar');
    } finally {
      hideInFlight.current = false;
      setHiding(false);
    }
  };

  return (
    <>
      <div className="flex flex-wrap items-center justify-end gap-1 shrink-0">
        <span
          className="rounded-full bg-green-50 px-3 py-1 font-medium text-green-700"
          style={{ fontSize: '0.75rem' }}
        >
          Confirmado ✓
        </span>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={loading}
          onClick={beginCalendarOperation}
          aria-label={loading ? 'Adicionando...' : 'Adicionar ao calendário'}
        >
          <CalendarPlus aria-hidden="true" />
          {loading ? 'Adicionando...' : 'Adicionar ao calendário'}
        </Button>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          disabled={hiding}
          onClick={hideNotification}
          className="size-7 rounded-full text-muted-foreground hover:bg-red-50 hover:text-red-600"
          title="Ocultar do painel"
          aria-label="Ocultar do painel"
        >
          <X aria-hidden="true" />
        </Button>
      </div>

      <Dialog
        open={Boolean(recurringSource)}
        onOpenChange={open => {
          if (!open && !operationInFlight.current) setRecurringSource(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar saída de campo ao calendário</DialogTitle>
            <DialogDescription>
              Escolha se deseja adicionar somente a próxima saída ou todas as ocorrências restantes deste mês.
            </DialogDescription>
          </DialogHeader>

          <p className="text-sm text-foreground">
            {monthCount === 1
              ? '1 evento será adicionado neste mês.'
              : `${monthCount} eventos serão adicionados neste mês.`}
          </p>

          <div className="grid gap-2 sm:grid-cols-2">
            <Button
              type="button"
              variant="outline"
              disabled={loading}
              onClick={() => deliverRecurring('next')}
            >
              Somente a próxima
            </Button>
            <Button
              type="button"
              disabled={loading}
              onClick={() => deliverRecurring('month')}
            >
              Todas deste mês
            </Button>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              disabled={loading}
              onClick={() => setRecurringSource(null)}
            >
              Cancelar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
