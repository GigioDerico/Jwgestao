import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowLeft, CalendarDays, ChevronRight, Clock3, RefreshCw } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationsContext';
import {
  getPersonalMeetings,
  getPersonalMeetingAssignments,
  isMeetingDatePast,
  type MeetingKind,
  type MeetingSummary,
  type PersonalMeetingAssignment,
} from '../../lib/meeting-assignments';
import { Button } from '../ui/button';
import { MeetingAssignmentCard } from './MeetingAssignmentCard';

type Period = 'upcoming' | 'past';

export function PublisherMeetingsPage() {
  const { user } = useAuth();
  const { respondToMeetingAssignment, hideNotification } = useNotifications();
  const memberLinked = Boolean(user?.member_id);
  const [period, setPeriod] = useState<Period>('upcoming');
  const [meetings, setMeetings] = useState<MeetingSummary[]>([]);
  const [selected, setSelected] = useState<MeetingSummary | null>(null);
  const [assignments, setAssignments] = useState<PersonalMeetingAssignment[]>([]);
  const [loadingMeetings, setLoadingMeetings] = useState(false);
  const [loadingAssignments, setLoadingAssignments] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [detailError, setDetailError] = useState('');
  const [mobileDetail, setMobileDetail] = useState(false);

  const loadMeetings = useCallback(async (requestedPeriod = period) => {
    if (!memberLinked) return;
    setLoadingMeetings(true);
    setLoadError('');
    try {
      const result = await getPersonalMeetings(requestedPeriod);
      setMeetings(result);
      setSelected(current => result.find(meeting => meeting.id === current?.id && meeting.kind === current.kind) || result[0] || null);
    } catch {
      setLoadError('Não foi possível carregar as reuniões.');
    } finally {
      setLoadingMeetings(false);
    }
  }, [memberLinked, period]);

  useEffect(() => { void loadMeetings(period); }, [loadMeetings, period]);

  const loadAssignments = useCallback(async (meeting: MeetingSummary | null) => {
    if (!meeting || !memberLinked) { setAssignments([]); return; }
    setLoadingAssignments(true);
    setDetailError('');
    try {
      setAssignments(await getPersonalMeetingAssignments(meeting.kind, meeting.id));
    } catch {
      setDetailError('Não foi possível carregar os detalhes da sua designação.');
    } finally {
      setLoadingAssignments(false);
    }
  }, [memberLinked]);

  useEffect(() => { void loadAssignments(selected); }, [loadAssignments, selected]);

  const pendingCount = useMemo(() => meetings.reduce((sum, meeting) => sum + meeting.pendingCount, 0), [meetings]);
  const choosePeriod = (next: Period) => {
    if (next === period) return;
    setMeetings([]);
    setSelected(null);
    setAssignments([]);
    setMobileDetail(false);
    setPeriod(next);
  };

  const refreshSelected = async () => {
    const current = selected;
    if (!current) return;
    setDetailError('');
    setLoadingAssignments(true);
    try {
      const [nextAssignments, nextMeetings] = await Promise.all([
        getPersonalMeetingAssignments(current.kind, current.id), getPersonalMeetings(period),
      ]);
      setAssignments(nextAssignments);
      setMeetings(nextMeetings);
    } catch {
      setDetailError('Esta designação pode ter sido alterada. Atualize os detalhes antes de responder novamente.');
      await loadAssignments(current);
    } finally {
      setLoadingAssignments(false);
    }
  };

  if (!memberLinked) return (
    <main className="mx-auto w-full max-w-5xl p-5 sm:p-8">
      <PageTitle pendingCount={0} />
      <div className="mt-8 rounded-2xl border border-dashed bg-card px-6 py-12 text-center">
        <CalendarDays className="mx-auto size-10 text-sky-700" aria-hidden="true" />
        <h2 className="mt-4 text-lg font-semibold">Sua conta ainda não está vinculada a um membro</h2>
        <p className="mx-auto mt-2 max-w-lg text-sm text-muted-foreground">Para consultar suas reuniões e responder às designações, contate o responsável pelas designações e peça para vincular sua conta ao seu cadastro de membro.</p>
      </div>
    </main>
  );

  return (
    <main className="mx-auto w-full max-w-7xl p-4 sm:p-7 lg:px-10 lg:py-9">
      <PageTitle pendingCount={pendingCount} />
      <div role="tablist" aria-label="Período das reuniões" className="mt-7 flex gap-2 border-b">
        <PeriodTab active={period === 'upcoming'} onClick={() => choosePeriod('upcoming')}>Próximas reuniões</PeriodTab>
        <PeriodTab active={period === 'past'} onClick={() => choosePeriod('past')}>Histórico</PeriodTab>
      </div>

      <section className="mt-5 grid gap-5 md:grid-cols-[minmax(250px,330px)_minmax(0,1fr)] lg:gap-7" aria-label="Reuniões e designações pessoais">
        <div className={mobileDetail ? 'hidden md:block' : 'block'}>
          {loadingMeetings && meetings.length === 0 ? <LoadingState label="Carregando reuniões…" />
            : loadError ? <ErrorState message={loadError} onRetry={() => void loadMeetings(period)} />
              : meetings.length === 0 ? <EmptyMeetings period={period} />
                : <div className="space-y-3" aria-label="Reuniões cadastradas">
                  {meetings.map(meeting => <MeetingListItem key={`${meeting.kind}:${meeting.id}`} meeting={meeting}
                    selected={selected?.id === meeting.id && selected.kind === meeting.kind}
                    onClick={() => { setSelected(meeting); setMobileDetail(true); }} />)}
                </div>}
        </div>

        <div className={mobileDetail ? 'block' : 'hidden md:block'}>
          {mobileDetail && <Button variant="ghost" className="mb-3 md:hidden" onClick={() => setMobileDetail(false)}><ArrowLeft aria-hidden="true" /> Voltar às reuniões</Button>}
          {!selected ? <div className="hidden min-h-72 items-center justify-center rounded-2xl border border-dashed bg-card p-8 text-center text-sm text-muted-foreground md:flex">Selecione uma reunião para consultar suas designações.</div>
            : <section aria-label={`Detalhes de ${meetingName(selected.kind)}`}>
              <div className="mb-4 rounded-2xl border bg-card px-5 py-4 sm:px-6">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-sky-800">{isMeetingDatePast(selected.date) ? 'Reunião encerrada' : 'Sua próxima reunião'}</p>
                <h2 className="mt-1.5 text-xl font-semibold tracking-tight">{meetingName(selected.kind)}</h2>
                <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
                  <span>{formatMeetingDate(selected.date)}</span><span className="inline-flex items-center gap-1"><Clock3 aria-hidden="true" size={14} />{selected.startTime || 'Não informado'}</span>
                </p>
              </div>
              <div className="rounded-2xl border bg-card p-4 sm:p-5">
                <h3 className="mb-4 flex items-center gap-2 font-semibold"><span className="size-2 rounded-full bg-sky-600" />{isMeetingDatePast(selected.date) ? 'Sua designação realizada' : 'Suas designações'}</h3>
                {loadingAssignments && assignments.length === 0 ? <LoadingState label="Carregando sua designação…" />
                  : detailError && assignments.length === 0 ? <ErrorState message={detailError} onRetry={() => void loadAssignments(selected)} />
                    : assignments.length === 0 ? <div className="rounded-xl border border-dashed bg-muted/20 px-5 py-9 text-center">
                      <h4 className="font-medium">Você não tem designação nesta reunião</h4><p className="mt-1 text-sm text-muted-foreground">Quando uma designação for atribuída a você, ela aparecerá aqui.</p>
                    </div>
                      : <div className="space-y-4">{assignments.map((assignment, index) => <MeetingAssignmentCard
                        key={assignment.notification?.id || `${assignment.meetingId}-${assignment.roleLabel}-${index}`}
                        assignment={assignment} onRespond={async input => {
                          try { await respondToMeetingAssignment(input); await refreshSelected(); }
                          catch (error) { await refreshSelected(); throw error; }
                        }} onHide={async id => { await hideNotification(id); await refreshSelected(); }} />)}</div>}
                {detailError && assignments.length > 0 && <p role="status" className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">{detailError}</p>}
                <p className="mt-4 text-center text-xs text-muted-foreground">São exibidas somente suas próprias designações.</p>
              </div>
            </section>}
        </div>
      </section>
    </main>
  );
}

function PageTitle({ pendingCount }: { pendingCount: number }) {
  return <header className="flex items-start justify-between gap-3">
    <div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-sky-800">Designações / Reunião</p><h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">Suas próximas reuniões</h1><p className="mt-1 text-sm text-muted-foreground">Confira suas designações e confirme sua participação.</p></div>
    <div className="hidden rounded-xl border bg-card px-4 py-3 text-sm sm:block"><strong className="block text-lg">{pendingCount} {pendingCount === 1 ? 'resposta pendente' : 'respostas pendentes'}</strong><span className="text-xs text-muted-foreground">{pendingCount ? 'Aguardamos sua resposta.' : 'Você está em dia.'}</span></div>
    <span className="sr-only" aria-live="polite">{pendingCount} respostas pendentes</span>
  </header>;
}

function PeriodTab({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return <button role="tab" aria-selected={active} type="button" onClick={onClick} className={`border-b-2 px-3 py-3 text-sm font-medium transition-colors sm:px-4 ${active ? 'border-sky-600 text-sky-800' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>{children}</button>;
}

function MeetingListItem({ meeting, selected, onClick }: { meeting: MeetingSummary; selected: boolean; onClick: () => void }) {
  const date = new Date(`${meeting.date}T12:00:00`);
  return <button type="button" onClick={onClick} aria-current={selected ? 'true' : undefined} className={`w-full rounded-2xl border bg-card p-4 text-left transition-all hover:border-sky-300 ${selected ? 'border-sky-400 shadow-sm ring-1 ring-sky-100' : 'border-border'}`}>
    <span className="flex items-center gap-3"><span className="grid size-12 shrink-0 place-items-center rounded-xl bg-muted text-center leading-none"><span><small className="block text-[9px] uppercase text-muted-foreground">{date.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '')}</small><strong className="mt-1 block text-xl">{date.getDate()}</strong></span></span>
      <span className="min-w-0 flex-1"><strong className="block truncate text-sm">{meetingName(meeting.kind)}</strong><small className="mt-1 block text-muted-foreground">{date.toLocaleDateString('pt-BR', { weekday: 'long' })} · {meeting.startTime || 'Não informado'}</small></span><ChevronRight size={17} className="shrink-0 text-muted-foreground" /></span>
    <span className="mt-4 flex items-center justify-between border-t pt-3 text-xs text-muted-foreground"><span>{meeting.assignmentCount ? `${meeting.assignmentCount} ${meeting.assignmentCount === 1 ? 'designação sua' : 'designações suas'}` : 'Sem designação para você'}</span>{meeting.pendingCount > 0 && <strong className="rounded-full bg-amber-50 px-2 py-1 font-medium text-amber-800">{meeting.pendingCount} pendente{meeting.pendingCount === 1 ? '' : 's'}</strong>}</span>
  </button>;
}

function EmptyMeetings({ period }: { period: Period }) {
  return <div className="rounded-2xl border border-dashed bg-card px-5 py-12 text-center"><CalendarDays className="mx-auto size-9 text-muted-foreground" aria-hidden="true" /><h2 className="mt-3 font-semibold">{period === 'past' ? 'Seu histórico está vazio' : 'Nenhuma reunião cadastrada'}</h2><p className="mt-1 text-sm text-muted-foreground">{period === 'past' ? 'Reuniões anteriores aparecerão aqui.' : 'As reuniões cadastradas aparecerão aqui.'}</p></div>;
}

function LoadingState({ label }: { label: string }) { return <div role="status" className="flex min-h-36 items-center justify-center gap-2 rounded-xl bg-muted/30 text-sm text-muted-foreground"><RefreshCw className="animate-spin" size={17} aria-hidden="true" />{label}</div>; }
function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) { return <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-5 text-center"><p role="alert" className="text-sm">{message}</p><Button variant="outline" className="mt-3" onClick={onRetry}>Tentar novamente</Button></div>; }
function formatMeetingDate(date: string) { return new Date(`${date}T12:00:00`).toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' }); }
function meetingName(kind: MeetingKind) { return kind === 'midweek' ? 'Reunião de meio de semana' : 'Reunião de fim de semana'; }
