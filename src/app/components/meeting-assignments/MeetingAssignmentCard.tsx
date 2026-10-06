import { useRef, useState } from 'react';
import { CalendarDays, Clock3, MapPin, UsersRound } from 'lucide-react';
import { isMinistryAssistant } from '../../lib/meeting-confirmation-rules';
import type { MeetingResponseInput, PersonalMeetingAssignment } from '../../lib/meeting-assignments';
import type { AssignmentNotification } from '../../types';
import { AssignmentCalendarActions } from '../AssignmentCalendarActions';
import { Button } from '../ui/button';
import { DeclineAssignmentDialog } from './DeclineAssignmentDialog';
import { AssignmentResponseBadge } from './AssignmentResponseBadge';

export interface MeetingAssignmentCardProps {
  assignment: PersonalMeetingAssignment;
  onRespond: (input: MeetingResponseInput) => Promise<AssignmentNotification | void>;
  onHide?: (notificationId: string) => Promise<void>;
  responsesEnabled?: boolean;
}

export function MeetingAssignmentCard({ assignment, onRespond, onHide = async () => {}, responsesEnabled = true }: MeetingAssignmentCardProps) {
  const [declineOpen, setDeclineOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState('');
  const [savedResponse, setSavedResponse] = useState<AssignmentNotification | null>(null);
  const declineTriggerRef = useRef<HTMLButtonElement>(null);
  const notification = savedResponse?.assignmentRevision === assignment.revision
    ? savedResponse
    : assignment.notification;
  const confirmationRequired = assignment.confirmationRequired !== false && !isMinistryAssistant(notification);
  const status = notification?.status || 'revoked';

  const respond = async (decision: MeetingResponseInput['decision'], reason?: string) => {
    if (!notification || !assignment.revision || saving) return;
    setSaving(true);
    setActionError('');
    try {
      const saved = await onRespond({ notificationId: notification.id, revision: assignment.revision, decision, reason });
      if (saved) setSavedResponse(saved);
    } catch (error) {
      const changed = isRevisionConflict(error);
      setActionError(changed
        ? 'Esta designação mudou de versão. Atualize os detalhes e confira a versão atual antes de responder.'
        : error instanceof Error ? error.message : 'Não foi possível salvar sua resposta. Tente novamente.');
      if (changed) setDeclineOpen(false);
      throw error;
    } finally {
      setSaving(false);
    }
  };

  const meetingDate = new Date(`${assignment.date}T12:00:00`);
  const dateLabel = meetingDate.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
  const timeLabel = assignment.time || 'Não informado';
  const canRespond = confirmationRequired && responsesEnabled && assignment.canRespond && ['pending_confirmation', 'declined', 'confirmed'].includes(status);
  return (
    <>
      <article aria-label={`Designação: ${assignment.title}`} className="overflow-hidden rounded-2xl border border-sky-100 bg-gradient-to-br from-sky-50/70 to-white shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-sky-100/80 px-5 py-4 sm:px-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-sky-800">{assignment.meetingKind === 'midweek' ? 'Reunião de meio de semana' : 'Reunião de fim de semana'}</p>
            <h3 className="mt-2 text-xl font-semibold tracking-tight text-foreground">
              {assignment.partNumber ? `${assignment.partNumber}. ` : ''}{assignment.title}
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">Sua função: {assignment.roleLabel}</p>
          </div>
          {!confirmationRequired ? <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">Não precisa confirmar</span> : notification
            ? <AssignmentResponseBadge status={status} reason={notification.declineReason} />
            : <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">Sem resposta registrada</span>}
        </div>

        <div className="grid grid-cols-2 gap-x-5 gap-y-4 px-5 py-5 sm:grid-cols-3 sm:px-6">
          <Info icon={<CalendarDays />} label="Data" value={dateLabel} />
          <Info icon={<Clock3 />} label="Horário" value={timeLabel} />
          {assignment.duration !== null && <Info icon={<Clock3 />} label="Duração" value={`${assignment.duration} minutos`} />}
          {assignment.location && <Info icon={<MapPin />} label="Local" value={assignment.location} />}
          {assignment.partnerName && <Info icon={<UsersRound />} label="Ajudante" value={assignment.partnerName} />}
        </div>

        {canRespond && <p className="mx-5 flex gap-2 rounded-lg border bg-white/70 px-3 py-2.5 text-xs leading-relaxed text-muted-foreground sm:mx-6">
          <span aria-hidden="true" className="font-bold text-sky-700">ⓘ</span>
          Confira a matéria e as instruções da sua designação antes da reunião.
        </p>}

        {actionError && <p role="alert" className="mx-5 mt-4 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900 sm:mx-6">{actionError}</p>}

        <div className="flex flex-col gap-2 px-5 py-5 sm:flex-row sm:px-6">
          {canRespond && <>
            {status !== 'confirmed' && <Button type="button" disabled={saving} onClick={() => { void respond('confirmed').catch(() => {}); }} className="min-h-11 flex-1 bg-sky-700 hover:bg-sky-800">
              {saving ? 'Salvando…' : status === 'declined' ? 'Decidi participar' : '✓  Confirmar designação'}
            </Button>}
            {status === 'confirmed' && <Button type="button" disabled={saving} variant="outline" onClick={() => { void respond('pending_confirmation').catch(() => {}); }} className="min-h-11">{saving ? 'Salvando…' : 'Marcar como não confirmada'}</Button>}
            {(status === 'pending_confirmation' || status === 'confirmed') && <Button ref={declineTriggerRef} type="button" disabled={saving} variant="outline" onClick={() => setDeclineOpen(true)} className="min-h-11">Não posso participar</Button>}
          </>}
          {status === 'confirmed' && notification && <AssignmentCalendarActions notification={notification as AssignmentNotification} onHide={onHide} />}
          {confirmationRequired && status === 'declined' && <p className="text-sm text-muted-foreground">O responsável poderá organizar uma substituição.</p>}
        </div>
      </article>

      {notification && <DeclineAssignmentDialog open={declineOpen} assignment={assignment} triggerRef={declineTriggerRef} onOpenChange={setDeclineOpen}
        onSubmit={reason => respond('declined', reason)} />}
    </>
  );
}

function isRevisionConflict(error: unknown): boolean {
  const value = error as { message?: string; code?: string } | null;
  return /meeting_assignment_revision_conflict/i.test(value?.message || '')
    || value?.code === '40001'
    || /versão|designação mudou|atribuição alterada/i.test(value?.message || '');
}

function Info({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return <div className="min-w-0">
    <span className="flex items-center gap-1.5 text-xs text-muted-foreground">{icon}{label}</span>
    <strong className="mt-1 block break-words text-sm font-medium">{value}</strong>
  </div>;
}
