import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { ArrowLeft, CalendarDays, ChevronLeft, ChevronRight, Clock3, RefreshCw } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationsContext';
import {
  getPersonalMeetings,
  getPersonalMeetingAssignments,
  resolvePersonalAssignment,
  isMeetingAssignmentUuid,
  isMeetingDatePast,
  type MeetingKind,
  type MeetingSummary,
  type PersonalMeetingAssignment,
} from '../../lib/meeting-assignments';
import { Button } from '../ui/button';
import { MeetingAssignmentCard } from './MeetingAssignmentCard';
import { getSafeReturnPath } from '../../lib/auth-return-path';

type Period = 'upcoming' | 'past';

export function PublisherMeetingsPage() {
  const { user } = useAuth();
  const { respondToMeetingAssignment, hideNotification } = useNotifications();
  const memberId = user?.member_id || null;
  const [searchParams, setSearchParams] = useSearchParams();
  const targetAssignmentId = searchParams.get('assignment') || searchParams.get('notificationId');
  const targetRevision = searchParams.get('revision');
  const targetIdentity = `${user?.id || ''}:${memberId || ''}:${targetAssignmentId || ''}:${targetRevision || ''}`;
  const [targetState, setTargetState] = useState<{ key: string; status: 'loading' | 'ready' | 'unavailable' | 'changed' | 'resolver-error' | 'list-error'; changedPath?: string }>({ key: '', status: 'loading' });
  const memberLinked = Boolean(memberId);
  const [period, setPeriod] = useState<Period>('upcoming');
  const [historyMonth, setHistoryMonth] = useState<string | null>(null);
  const [meetings, setMeetings] = useState<MeetingSummary[]>([]);
  const [selected, setSelected] = useState<MeetingSummary | null>(null);
  const [assignments, setAssignments] = useState<PersonalMeetingAssignment[]>([]);
  const [loadingMeetings, setLoadingMeetings] = useState(false);
  const [loadingAssignments, setLoadingAssignments] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [detailError, setDetailError] = useState('');
  const [mobileDetail, setMobileDetail] = useState(false);
  const [meetingsIdentity, setMeetingsIdentity] = useState('');
  const [detailsIdentity, setDetailsIdentity] = useState('');
  const [detailsReady, setDetailsReady] = useState(false);
  const memberIdRef = useRef<string | null>(memberId);
  const periodRef = useRef(period);
  const selectedRef = useRef<MeetingSummary | null>(selected);
  const selectedIdentityRef = useRef<string | null>(null);
  const meetingsRequestRef = useRef(0);
  const detailsRequestRef = useRef(0);
  const historyMonthIdentityRef = useRef('');
  memberIdRef.current = memberId;
  periodRef.current = period;
  selectedRef.current = selected;

  const loadMeetings = useCallback(async (requestedPeriod = period) => {
    if (!memberId) return;
    const requestId = ++meetingsRequestRef.current;
    const requestedMember = memberId;
    const identity = listIdentity(requestedMember, requestedPeriod);
    setLoadingMeetings(true);
    setLoadError('');
    let resolvingTarget = false;
    try {
      let targetAssignment: PersonalMeetingAssignment | null = null;
      if (targetAssignmentId || targetRevision) {
        setTargetState({ key: targetIdentity, status: 'loading' });
        if (!targetAssignmentId || !targetRevision || !isMeetingAssignmentUuid(targetAssignmentId) || !isMeetingAssignmentUuid(targetRevision)) {
          setTargetState({ key: targetIdentity, status: 'unavailable' });
          setMeetings([]); setMeetingsIdentity(listIdentity(requestedMember, requestedPeriod));
          setSelected(null); setAssignments([]); setDetailsReady(false);
          return;
        }
        resolvingTarget = true;
        const resolution = await resolvePersonalAssignment(targetAssignmentId, targetRevision);
        resolvingTarget = false;
        if (requestId !== meetingsRequestRef.current || memberIdRef.current !== requestedMember || periodRef.current !== requestedPeriod) return;
        if (resolution.kind === 'changed') {
          setTargetState({ key: targetIdentity, status: 'changed', changedPath: resolution.currentPath });
          setMeetings([]); setMeetingsIdentity(listIdentity(requestedMember, requestedPeriod));
          setSelected(null); setAssignments([]); setDetailsReady(false);
          return;
        }
        if (resolution.kind !== 'current' || resolution.assignment.notification?.id !== targetAssignmentId
          || resolution.assignment.revision !== targetRevision || resolution.assignment.notification.memberId !== requestedMember) {
          setTargetState({ key: targetIdentity, status: 'unavailable' });
          setMeetings([]); setMeetingsIdentity(listIdentity(requestedMember, requestedPeriod));
          setSelected(null); setAssignments([]); setDetailsReady(false);
          return;
        }
        targetAssignment = resolution.assignment;
        const assignmentPeriod: Period = isMeetingDatePast(targetAssignment.date) ? 'past' : 'upcoming';
        if (assignmentPeriod !== requestedPeriod) {
          periodRef.current = assignmentPeriod;
          setPeriod(assignmentPeriod);
          return;
        }
      }
      if (targetAssignment) resolvingTarget = false;
      const result = await getPersonalMeetings(requestedPeriod);
      if (requestId !== meetingsRequestRef.current || memberIdRef.current !== requestedMember || periodRef.current !== requestedPeriod) return;
      setMeetings(result);
      setMeetingsIdentity(identity);
      if (requestedPeriod === 'past' && (targetAssignment || historyMonthIdentityRef.current !== identity)) {
        historyMonthIdentityRef.current = identity;
        const targetMonth = targetAssignment?.date.slice(0, 7);
        const availableMonths = result.map(meeting => meeting.date.slice(0, 7)).sort();
        const latestMonth = availableMonths[availableMonths.length - 1];
        setHistoryMonth(targetMonth || latestMonth || null);
      }
      const currentKey = selectedIdentityRef.current;
      const linkedMeeting = targetAssignment && result.find(meeting => meeting.id === targetAssignment!.meetingId && meeting.kind === targetAssignment!.meetingKind);
      if (targetAssignment && !linkedMeeting) {
        setTargetState({ key: targetIdentity, status: 'unavailable' });
        setSelected(null); setAssignments([]); setDetailsReady(false);
        return;
      }
      const next = linkedMeeting || result.find(meeting => meetingIdentity(requestedMember, requestedPeriod, meeting) === currentKey) || result[0] || null;
      if (targetAssignment) setTargetState({ key: targetIdentity, status: 'ready' });
      const nextKey = next ? meetingIdentity(requestedMember, requestedPeriod, next) : null;
      if (currentKey !== nextKey) {
        selectedIdentityRef.current = nextKey;
        selectedRef.current = next;
        detailsRequestRef.current += 1;
        setAssignments([]);
        setDetailsIdentity('');
        setDetailsReady(false);
        setSelected(next);
      }
      if (targetAssignment) setMobileDetail(true);
    } catch {
      if (requestId === meetingsRequestRef.current && memberIdRef.current === requestedMember && periodRef.current === requestedPeriod) {
        if (targetAssignmentId || targetRevision) setTargetState({ key: targetIdentity, status: resolvingTarget ? 'resolver-error' : 'list-error' });
        else setLoadError('Não foi possível carregar as reuniões.');
      }
    } finally {
      if (requestId === meetingsRequestRef.current && memberIdRef.current === requestedMember && periodRef.current === requestedPeriod) {
        setLoadingMeetings(false);
      }
    }
  }, [memberId, period, targetAssignmentId, targetRevision, targetIdentity]);

  useEffect(() => { void loadMeetings(period); }, [loadMeetings, period]);

  const selectMeeting = (meeting: MeetingSummary | null) => {
    if (targetAssignmentId || targetRevision) {
      setSearchParams({}, { replace: true });
      setTargetState({ key: '', status: 'loading' });
    }
    const nextKey = meeting && memberId ? meetingIdentity(memberId, period, meeting) : null;
    if (nextKey && nextKey === selectedIdentityRef.current) return;
    selectedIdentityRef.current = nextKey;
    selectedRef.current = meeting;
    detailsRequestRef.current += 1;
    setAssignments([]);
    setDetailsIdentity('');
    setDetailsReady(false);
    setDetailError('');
    setSelected(meeting);
  };

  const chooseHistoryMonth = (month: string) => {
    setHistoryMonth(month);
    const firstMeeting = meetings.find(meeting => meeting.date.slice(0, 7) === month) || null;
    selectMeeting(firstMeeting);
  };

  const loadAssignments = useCallback(async (meeting: MeetingSummary | null, requestedPeriod = period, failureMessage = 'Não foi possível carregar os detalhes da sua designação.') => {
    if (!meeting || !memberId) { setAssignments([]); setDetailsReady(false); return; }
    const requestedMember = memberId;
    const key = meetingIdentity(requestedMember, requestedPeriod, meeting);
    const requestId = ++detailsRequestRef.current;
    setLoadingAssignments(true);
    setDetailsReady(false);
    setDetailError('');
    try {
      const result = await getPersonalMeetingAssignments(meeting.kind, meeting.id);
      if (!isCurrentDetailRequest(requestId, key, requestedMember, requestedPeriod,
        detailsRequestRef.current, selectedIdentityRef.current, memberIdRef.current, periodRef.current)) return;
      if (targetAssignmentId && targetRevision && targetState.key === targetIdentity && targetState.status === 'ready'
        && !result.some(item => item.notification?.id === targetAssignmentId && item.revision === targetRevision)) {
        setTargetState({ key: targetIdentity, status: 'unavailable' });
        setAssignments([]); setSelected(null); setDetailsReady(false);
        return;
      }
      setAssignments(result);
      setDetailsIdentity(key);
      setDetailsReady(true);
    } catch {
      if (isCurrentDetailRequest(requestId, key, requestedMember, requestedPeriod,
        detailsRequestRef.current, selectedIdentityRef.current, memberIdRef.current, periodRef.current)) {
        setDetailError(failureMessage);
        setDetailsIdentity(key);
      }
    } finally {
      if (requestId === detailsRequestRef.current && memberIdRef.current === requestedMember && periodRef.current === requestedPeriod) {
        setLoadingAssignments(false);
      }
    }
  }, [memberId, period, targetAssignmentId, targetRevision, targetState.key, targetState.status, targetIdentity]);

  useEffect(() => { void loadAssignments(selected); }, [loadAssignments, selected]);

  const pendingCount = useMemo(() => meetings.reduce((sum, meeting) => sum + meeting.pendingCount, 0), [meetings]);
  const historyMonths = useMemo(() => [...new Set(meetings.map(meeting => meeting.date.slice(0, 7)))].sort().reverse(), [meetings]);
  const historyMonthIndex = historyMonths.indexOf(historyMonth || '');
  const visibleMeetings = useMemo(() => period !== 'past' || !historyMonth
    ? meetings
    : meetings.filter(meeting => meeting.date.slice(0, 7) === historyMonth), [historyMonth, meetings, period]);
  const choosePeriod = (next: Period) => {
    if (next === period) return;
    if (targetAssignmentId || targetRevision) {
      setSearchParams({}, { replace: true });
      setTargetState({ key: '', status: 'loading' });
    }
    periodRef.current = next;
    selectedIdentityRef.current = null;
    selectedRef.current = null;
    meetingsRequestRef.current += 1;
    detailsRequestRef.current += 1;
    setMeetings([]);
    setSelected(null);
    setAssignments([]);
    setMeetingsIdentity('');
    setDetailsIdentity('');
    setDetailsReady(false);
    setMobileDetail(false);
    setLoadError('');
    setDetailError('');
    setPeriod(next);
  };

  const refreshSelected = async (
    failureMessage = 'Não foi possível atualizar os detalhes. Tente novamente.',
    countFailureMessage = 'Não foi possível atualizar a contagem das reuniões. Tente atualizar os detalhes.',
  ) => {
    const current = selectedRef.current;
    const requestedMember = memberIdRef.current;
    const requestedPeriod = periodRef.current;
    if (!current || !requestedMember) return false;
    const key = meetingIdentity(requestedMember, requestedPeriod, current);
    const requestId = ++detailsRequestRef.current;
    setDetailsReady(false);
    setDetailError('');
    setLoadingAssignments(true);
    try {
      const nextAssignments = await getPersonalMeetingAssignments(current.kind, current.id);
      if (!isCurrentDetailRequest(requestId, key, requestedMember, requestedPeriod,
        detailsRequestRef.current, selectedIdentityRef.current, memberIdRef.current, periodRef.current)) return false;
      setAssignments(nextAssignments);
      setDetailsIdentity(key);
      setDetailsReady(true);
      try {
        const nextMeetings = await getPersonalMeetings(requestedPeriod);
        if (requestId === detailsRequestRef.current && memberIdRef.current === requestedMember && periodRef.current === requestedPeriod) {
          setMeetings(nextMeetings);
          setMeetingsIdentity(listIdentity(requestedMember, requestedPeriod));
        }
      } catch {
        if (requestId === detailsRequestRef.current && memberIdRef.current === requestedMember && periodRef.current === requestedPeriod) {
          setDetailError(countFailureMessage);
        }
      }
      return true;
    } catch {
      if (isCurrentDetailRequest(requestId, key, requestedMember, requestedPeriod,
        detailsRequestRef.current, selectedIdentityRef.current, memberIdRef.current, periodRef.current)) {
        setDetailsReady(false);
        setDetailsIdentity(key);
        setDetailError(failureMessage);
      }
      return false;
    } finally {
      if (requestId === detailsRequestRef.current && memberIdRef.current === requestedMember && periodRef.current === requestedPeriod) {
        setLoadingAssignments(false);
      }
    }
  };

  const detailsKey = selected && memberId ? meetingIdentity(memberId, period, selected) : '';
  const detailsAreCurrent = detailsReady && detailsIdentity === detailsKey;
  const meetingsAreCurrent = Boolean(memberId) && meetingsIdentity === listIdentity(memberId!, period);
  const targetIsActive = Boolean(targetAssignmentId || targetRevision);
  const visibleTargetState = targetState.key === targetIdentity ? targetState : null;

  useEffect(() => {
    if (!targetIsActive || !detailsAreCurrent || visibleTargetState?.status !== 'ready' || !targetAssignmentId) return;
    const element = document.querySelector<HTMLElement>(`[data-notification-id="${targetAssignmentId}"]`);
    if (!element) return;
    element.focus({ preventScroll: true });
    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [targetIsActive, detailsAreCurrent, visibleTargetState?.status, targetAssignmentId, assignments]);

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

  if (targetIsActive && (!visibleTargetState || visibleTargetState.status === 'loading')) {
    return <main className="mx-auto max-w-3xl p-6" role="status">Verificando sua designação…</main>;
  }
  if (targetIsActive && visibleTargetState?.status === 'changed') {
    return <main className="mx-auto max-w-3xl p-6"><h1 className="text-xl font-semibold">Esta designação foi atualizada</h1><p className="my-3">O link é de uma versão anterior. Confira a designação atual antes de responder.</p><Link className="text-sky-700 underline" to={getSafeReturnPath(visibleTargetState.changedPath)}>Ver designação atual</Link></main>;
  }
  if (targetIsActive && visibleTargetState?.status === 'unavailable') {
    return <main className="mx-auto max-w-3xl p-6"><h1 className="text-xl font-semibold">Designação indisponível</h1><p className="my-3">Não foi possível localizar esta designação para sua conta.</p><Link className="text-sky-700 underline" to="/assignments/meetings">Ir para Reunião</Link></main>;
  }
  if (targetIsActive && (visibleTargetState?.status === 'resolver-error' || visibleTargetState?.status === 'list-error')) return <main className="mx-auto max-w-3xl p-6"><ErrorState message={visibleTargetState.status === 'resolver-error' ? 'Não foi possível verificar esta designação.' : 'Não foi possível carregar as reuniões desta designação.'} onRetry={() => void loadMeetings(period)} /></main>;

  return (
    <main className="mx-auto w-full max-w-7xl p-4 sm:p-7 lg:px-10 lg:py-9">
      <PageTitle pendingCount={pendingCount} />
      <div role="tablist" aria-label="Período das reuniões" className="mt-7 flex gap-2 border-b">
        <PeriodTab active={period === 'upcoming'} onClick={() => choosePeriod('upcoming')}>Próximas reuniões</PeriodTab>
        <PeriodTab active={period === 'past'} onClick={() => choosePeriod('past')}>Histórico</PeriodTab>
      </div>

      <section className="mt-5 grid gap-5 md:grid-cols-[minmax(250px,330px)_minmax(0,1fr)] lg:gap-7" aria-label="Reuniões e designações pessoais">
        <div className={mobileDetail ? 'hidden md:block' : 'block'}>
          {period === 'past' && meetingsAreCurrent && historyMonths.length > 0 && <nav aria-label="Navegação por mês do histórico" className="mb-4 flex items-center justify-between rounded-2xl border bg-card px-2 py-2">
            <Button type="button" variant="ghost" size="icon" aria-label="Mês anterior" disabled={historyMonthIndex < 0 || historyMonthIndex >= historyMonths.length - 1} onClick={() => chooseHistoryMonth(historyMonths[historyMonthIndex + 1])}><ChevronLeft aria-hidden="true" /></Button>
            <p className="text-sm font-semibold capitalize" aria-live="polite">{historyMonth ? formatHistoryMonth(historyMonth) : 'Histórico'}</p>
            <Button type="button" variant="ghost" size="icon" aria-label="Próximo mês" disabled={historyMonthIndex <= 0} onClick={() => chooseHistoryMonth(historyMonths[historyMonthIndex - 1])}><ChevronRight aria-hidden="true" /></Button>
          </nav>}
          {loadingMeetings && (!meetingsAreCurrent || meetings.length === 0) ? <LoadingState label="Carregando reuniões…" />
            : loadError ? <ErrorState message={loadError} onRetry={() => void loadMeetings(period)} />
              : !meetingsAreCurrent ? <LoadingState label="Carregando reuniões…" />
                : visibleMeetings.length === 0 ? <EmptyMeetings period={period} />
                : <div className="space-y-3" aria-label="Reuniões cadastradas">
                  {visibleMeetings.map(meeting => <MeetingListItem key={`${meeting.kind}:${meeting.id}`} meeting={meeting}
                    selected={selected?.id === meeting.id && selected.kind === meeting.kind}
                    onClick={() => { selectMeeting(meeting); setMobileDetail(true); }} />)}
                </div>}
        </div>

        <div className={mobileDetail ? 'block' : 'hidden md:block'}>
          {mobileDetail && <Button variant="ghost" className="mb-3 md:hidden" onClick={() => setMobileDetail(false)}><ArrowLeft aria-hidden="true" /> Voltar às reuniões</Button>}
          {!meetingsAreCurrent ? <LoadingState label="Carregando sua reunião…" />
            : !selected ? <div className="hidden min-h-72 items-center justify-center rounded-2xl border border-dashed bg-card p-8 text-center text-sm text-muted-foreground md:flex">Selecione uma reunião para consultar suas designações.</div>
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
                      : <div className="space-y-4">{assignments.map((assignment, index) => <div
                        key={assignment.notification?.id || `${assignment.meetingId}-${assignment.roleLabel}-${index}`}
                        data-notification-id={assignment.notification?.id || undefined}
                        tabIndex={assignment.notification?.id === targetAssignmentId ? -1 : undefined}
                      ><MeetingAssignmentCard
                        assignment={assignment} responsesEnabled={detailsAreCurrent} onRespond={async input => {
                          try {
                            const saved = await respondToMeetingAssignment(input);
                            if (selectedIdentityRef.current === detailsKey && memberIdRef.current === memberId && periodRef.current === period) {
                              setAssignments(current => current.map(item => item.notification?.id === saved.id
                                ? { ...item, notification: saved, canRespond: item.canRespond } : item));
                              const previousStatus = assignment.notification?.status;
                              const pendingDelta = Number(saved.status === 'pending_confirmation') - Number(previousStatus === 'pending_confirmation');
                              const confirmedDelta = Number(saved.status === 'confirmed') - Number(previousStatus === 'confirmed');
                              const declinedDelta = Number(saved.status === 'declined') - Number(previousStatus === 'declined');
                              setMeetings(current => current.map(meeting => meetingIdentity(memberId || '', period, meeting) === detailsKey
                                ? { ...meeting,
                                  pendingCount: Math.max(0, meeting.pendingCount + pendingDelta),
                                  unconfirmedCount: Math.max(0, (meeting.unconfirmedCount ?? meeting.pendingCount) + pendingDelta),
                                  confirmedCount: Math.max(0, (meeting.confirmedCount ?? 0) + confirmedDelta),
                                  declinedCount: Math.max(0, (meeting.declinedCount ?? 0) + declinedDelta),
                                } : meeting));
                            }
                            await refreshSelected(
                              'Sua resposta foi salva, mas não foi possível atualizar os detalhes. Tente atualizar.',
                              'Sua resposta foi salva, mas não foi possível atualizar a contagem. Tente atualizar os detalhes.',
                            );
                            return saved;
                          } catch (error) {
                            await refreshSelected(
                              'A designação mudou. Atualize os detalhes antes de responder novamente.',
                              'A designação mudou, mas não foi possível atualizar a contagem. Tente atualizar os detalhes.',
                            );
                            throw error;
                          }
                        }} onHide={async id => { await hideNotification(id); await refreshSelected(); }} /></div>)}</div>}
                {detailError && assignments.length > 0 && <div role="status" className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900"><span>{detailError}</span><Button type="button" size="sm" variant="outline" onClick={() => void refreshSelected('Não foi possível atualizar os detalhes. Tente novamente.')} aria-label="Atualizar detalhes">Atualizar detalhes</Button></div>}
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
  const declined = (meeting.declinedCount || 0) > 0;
  const pending = (meeting.unconfirmedCount ?? meeting.pendingCount) > 0;
  const confirmed = meeting.assignmentCount > 0 && meeting.confirmedCount === meeting.assignmentCount;
  const color = declined ? 'bg-rose-50' : pending ? 'bg-amber-50' : confirmed ? 'bg-emerald-50' : 'bg-card';
  const responseLabel = declined ? 'Participação recusada' : pending ? 'Aguardando confirmação' : confirmed ? 'Participação confirmada' : '';
  return <button type="button" onClick={onClick} aria-current={selected ? 'true' : undefined} className={`w-full rounded-2xl border ${color} p-4 text-left transition-all hover:border-sky-300 ${selected ? 'border-sky-400 shadow-sm ring-1 ring-sky-100' : 'border-border'}`}>
    <span className="flex items-center gap-3"><span className="grid size-12 shrink-0 place-items-center rounded-xl bg-muted text-center leading-none"><span><small className="block text-[9px] uppercase text-muted-foreground">{date.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '')}</small><strong className="mt-1 block text-xl">{date.getDate()}</strong></span></span>
      <span className="min-w-0 flex-1"><strong className="block truncate text-sm">{meetingName(meeting.kind)}</strong><small className="mt-1 block text-muted-foreground">{date.toLocaleDateString('pt-BR', { weekday: 'long' })} · {meeting.startTime || 'Não informado'}</small></span><ChevronRight size={17} className="shrink-0 text-muted-foreground" /></span>
    <span className="mt-4 flex items-center justify-between border-t pt-3 text-xs text-muted-foreground"><span>{meeting.assignmentCount ? `${meeting.assignmentCount} ${meeting.assignmentCount === 1 ? 'designação sua' : 'designações suas'}` : 'Sem designação para você'}</span>{meeting.pendingCount > 0 && <strong className="rounded-full bg-amber-50 px-2 py-1 font-medium text-amber-800">{meeting.pendingCount} pendente{meeting.pendingCount === 1 ? '' : 's'}</strong>}</span>
    {responseLabel && <span className={`mt-2 block text-xs font-medium ${declined ? 'text-rose-800' : pending ? 'text-amber-800' : 'text-emerald-800'}`}>{responseLabel}</span>}
  </button>;
}

function EmptyMeetings({ period }: { period: Period }) {
  return <div className="rounded-2xl border border-dashed bg-card px-5 py-12 text-center"><CalendarDays className="mx-auto size-9 text-muted-foreground" aria-hidden="true" /><h2 className="mt-3 font-semibold">{period === 'past' ? 'Seu histórico está vazio' : 'Nenhuma reunião cadastrada'}</h2><p className="mt-1 text-sm text-muted-foreground">{period === 'past' ? 'Reuniões anteriores aparecerão aqui.' : 'As reuniões cadastradas aparecerão aqui.'}</p></div>;
}

function LoadingState({ label }: { label: string }) { return <div role="status" className="flex min-h-36 items-center justify-center gap-2 rounded-xl bg-muted/30 text-sm text-muted-foreground"><RefreshCw className="animate-spin" size={17} aria-hidden="true" />{label}</div>; }
function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) { return <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-5 text-center"><p role="alert" className="text-sm">{message}</p><Button variant="outline" className="mt-3" onClick={onRetry}>Tentar novamente</Button></div>; }
function formatMeetingDate(date: string) { return new Date(`${date}T12:00:00`).toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' }); }
function formatHistoryMonth(month: string) { return new Date(`${month}-01T12:00:00`).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }); }
function meetingName(kind: MeetingKind) { return kind === 'midweek' ? 'Reunião de meio de semana' : 'Reunião de fim de semana'; }
function listIdentity(memberId: string, period: Period) { return `${memberId}|${period}`; }
function meetingIdentity(memberId: string, period: Period, meeting: MeetingSummary) {
  return `${listIdentity(memberId, period)}|${meeting.kind}|${meeting.id}`;
}
function isCurrentDetailRequest(
  requestId: number,
  requestedKey: string,
  requestedMember: string,
  requestedPeriod: Period,
  activeRequestId: number,
  activeKey: string | null,
  activeMember: string | null,
  activePeriod: Period,
) {
  return requestId === activeRequestId && activeKey === requestedKey
    && activeMember === requestedMember && activePeriod === requestedPeriod;
}
