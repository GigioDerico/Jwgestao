import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, RefreshCw, Search } from 'lucide-react';
import { getManagedMeetingConfirmations, type ManagedMeetingConfirmationGroup, type ManagedMeetingAssignmentResponse } from '../../lib/meeting-assignments';
import { supabase } from '../../lib/supabase';
import { Button } from '../ui/button';

const labels = { all: 'Todas', declined: 'Recusadas', pending_confirmation: 'Pendentes', confirmed: 'Confirmadas' };
type StatusFilter = keyof typeof labels;
const priority = { declined: 0, pending_confirmation: 1, confirmed: 2, revoked: 3, hidden: 4 };
const normalize = (text: string) => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
function currentMonth() { return new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' }).slice(0, 7); }
function responseTime(value?: string | null) {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

export interface ManagedMeetingConfirmationsProps {
  managerId?: string;
  initialMonth?: string;
  canEdit?: boolean;
  refreshToken?: number;
  onMonthChange?: (month: string) => void;
  onTreat?: (meeting: ManagedMeetingConfirmationGroup, response: ManagedMeetingAssignmentResponse) => void;
}

export function ManagedMeetingConfirmations({ managerId, initialMonth = currentMonth(), canEdit = false, onTreat, onMonthChange, refreshToken = 0 }: ManagedMeetingConfirmationsProps) {
  const [month, setMonth] = useState(initialMonth);
  useEffect(() => { onMonthChange?.(month); }, [month, onMonthChange]);
  const [filter, setFilter] = useState<StatusFilter>('all');
  const [kind, setKind] = useState('all');
  const [search, setSearch] = useState('');
  const [reload, setReload] = useState(0);
  const [state, setState] = useState<{ key: string; groups: ManagedMeetingConfirmationGroup[]; loading: boolean; error: string }>({ key: '', groups: [], loading: true, error: '' });
  const key = `${managerId || ''}:${month}`;

  useEffect(() => {
    if (!managerId) return;
    let active = true;
    let request = 0;
    let refreshTimer: ReturnType<typeof setTimeout> | undefined;
    const load = async (background = false) => {
      const generation = ++request;
      setState(previous => ({ key, groups: previous.key === key ? previous.groups : [], loading: !background, error: '' }));
      try {
        const groups = await getManagedMeetingConfirmations(month);
        if (active && generation === request) setState({ key, groups, loading: false, error: '' });
      } catch (cause) {
        if (active && generation === request) setState({ key, groups: [], loading: false,
          error: cause instanceof Error ? cause.message : 'Não foi possível carregar as respostas.' });
      }
    };
    const refresh = () => { clearTimeout(refreshTimer); refreshTimer = setTimeout(() => { void load(true); }, 200); };
    void load();
    window.addEventListener('focus', refresh);
    const channel = supabase.channel(`managed-meeting-confirmations:${managerId}:${month}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'member_assignment_notifications' }, refresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'midweek_meetings' }, refresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'weekend_meetings' }, refresh)
      .subscribe();
    return () => { active = false; clearTimeout(refreshTimer); window.removeEventListener('focus', refresh); void supabase.removeChannel(channel); };
  }, [managerId, month, reload, key, refreshToken]);

  const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' });
  const groups = useMemo(() => state.key === key ? state.groups.filter(group => group.date >= today) : [], [state.key, state.groups, key, today]);
  const loading = state.key !== key || state.loading;
  const error = state.key === key ? state.error : '';
  const counts = useMemo(() => groups.flatMap(group => group.responses).reduce((total, row) => {
    total.all++;
    if (row.status in total) total[row.status as StatusFilter]++;
    return total;
  }, { all: 0, declined: 0, pending_confirmation: 0, confirmed: 0 }), [groups]);
  const visible = groups.filter(group => kind === 'all' || group.kind === kind).map(group => ({ ...group,
    responses: group.responses.filter(row => (filter === 'all' || row.status === filter)
      && normalize(`${row.memberName} ${row.roleLabel} ${row.assignmentTitle}`).includes(normalize(search.trim())))
      .sort((a, b) => (priority[a.status] ?? 4) - (priority[b.status] ?? 4) || a.memberName.localeCompare(b.memberName, 'pt-BR')),
  })).filter(group => group.responses.length > 0 || (filter === 'all' && !search.trim()));
  const moveMonth = (delta: number) => {
    const [year, number] = month.split('-').map(Number);
    const date = new Date(year, number - 1 + delta, 1);
    setMonth(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`);
  };

  return <section className="space-y-4" aria-label="Confirmações por reunião">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div><h2 className="font-semibold text-foreground">Respostas por reunião</h2><p className="mt-1 text-sm text-muted-foreground">Acompanhe as confirmações das reuniões de hoje em diante e trate as recusas das partes e de áudio e vídeo.</p></div>
      <Button variant="outline" disabled={loading} onClick={() => setReload(value => value + 1)}><RefreshCw size={15} className={loading ? 'animate-spin' : ''} />Atualizar</Button>
    </div>
    <div className="flex flex-wrap items-end gap-3 rounded-xl border border-border bg-card p-4">
      <div><label htmlFor="confirmations-month" className="mb-1 block text-xs font-medium">Mês das reuniões</label><div className="flex items-center gap-1">
        <Button size="icon" variant="ghost" aria-label="Mês anterior" onClick={() => moveMonth(-1)}><ChevronLeft /></Button>
        <input id="confirmations-month" type="month" value={month} onChange={event => { if (/^\d{4}-(0[1-9]|1[0-2])$/.test(event.target.value)) setMonth(event.target.value); }} className="min-h-10 rounded-lg border border-border bg-background px-2 text-sm" />
        <Button size="icon" variant="ghost" aria-label="Próximo mês" onClick={() => moveMonth(1)}><ChevronRight /></Button>
      </div></div>
      <div className="min-w-48 flex-1"><label htmlFor="confirmations-search" className="mb-1 block text-xs font-medium">Buscar nome ou função</label><div className="relative"><Search aria-hidden size={16} className="absolute left-3 top-3 text-muted-foreground" /><input id="confirmations-search" type="search" value={search} onChange={event => setSearch(event.target.value)} placeholder="Nome ou função…" className="min-h-10 w-full rounded-lg border border-border bg-background pl-9 pr-3 text-sm" /></div></div>
      <div><label htmlFor="confirmations-kind" className="mb-1 block text-xs font-medium">Tipo de reunião</label><select id="confirmations-kind" value={kind} onChange={event => setKind(event.target.value)} className="min-h-10 rounded-lg border border-border bg-background px-3 text-sm"><option value="all">Todas as reuniões</option><option value="midweek">Meio de semana</option><option value="weekend">Fim de semana</option></select></div>
    </div>
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4" role="group" aria-label="Filtrar respostas">
      {(Object.keys(labels) as StatusFilter[]).map(status => <button key={status} type="button" aria-pressed={filter === status} onClick={() => setFilter(status)}
        className={`rounded-xl border px-4 py-3 text-left transition-colors ${status === 'declined' ? 'border-rose-200 bg-rose-50 text-rose-900' : status === 'pending_confirmation' ? 'border-amber-200 bg-amber-50 text-amber-900' : status === 'confirmed' ? 'border-emerald-200 bg-emerald-50 text-emerald-900' : 'border-border bg-card'} ${filter === status ? 'ring-2 ring-primary/40' : ''}`}>
        <strong className="block text-xl">{loading ? '—' : counts[status]}</strong><span className="text-sm">{labels[status]}</span>
      </button>)}
    </div>
    {error ? <div role="alert" className="rounded-xl border border-destructive/30 bg-card p-5"><p className="text-sm">{error}</p><Button className="mt-3" variant="outline" onClick={() => setReload(value => value + 1)}>Tentar novamente</Button></div>
      : loading ? <p role="status" className="rounded-xl border bg-card p-6 text-center text-muted-foreground">Carregando respostas…</p>
      : !groups.length ? <p className="rounded-xl border border-dashed p-8 text-center text-muted-foreground">Nenhuma reunião de hoje em diante neste mês.</p>
      : !visible.length ? <p className="rounded-xl border border-dashed p-8 text-center text-muted-foreground">Nenhuma resposta corresponde aos filtros.</p>
      : <div className="space-y-3">{visible.map((group, index) => {
        const original = groups.find(item => item.id === group.id && item.kind === group.kind)!;
        const declined = original.responses.filter(row => row.status === 'declined').length;
        const pending = original.responses.filter(row => row.status === 'pending_confirmation').length;
        const confirmed = original.responses.filter(row => row.status === 'confirmed').length;
        return <details key={`${key}:${group.kind}:${group.id}`} open={declined > 0 || index === 0 || filter !== 'all' || Boolean(search)} className={`overflow-hidden rounded-xl border bg-card ${declined ? 'border-rose-200' : 'border-border'}`}>
          <summary className="cursor-pointer px-4 py-4 focus-visible:outline-primary sm:px-5"><span className="ml-1 inline-flex flex-wrap items-center gap-x-4 gap-y-2"><span><strong className="block text-sm">{new Date(`${group.date}T12:00:00`).toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}</strong><span className="text-xs text-muted-foreground">{group.kind === 'midweek' ? 'Reunião de meio de semana' : 'Reunião de fim de semana'}</span></span><span className="flex flex-wrap gap-2 text-xs"><span className="rounded-full bg-rose-50 px-2 py-1 text-rose-800">{declined} recusada{declined === 1 ? '' : 's'}</span><span className="rounded-full bg-amber-50 px-2 py-1 text-amber-800">{pending} pendente{pending === 1 ? '' : 's'}</span><span className="rounded-full bg-emerald-50 px-2 py-1 text-emerald-800">{confirmed} confirmada{confirmed === 1 ? '' : 's'}</span></span></span></summary>
          {!group.responses.length ? <p className="border-t px-5 py-5 text-sm text-muted-foreground">Nenhuma designação registrada nesta reunião.</p> : <ul className="border-t px-4 sm:px-5">{group.responses.map(row => <li key={row.id} className="border-b border-border py-4 last:border-0">
            <div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0 flex-1"><p className="font-medium">{row.memberName}</p><p className="mt-1 text-sm text-muted-foreground">{row.partNumber ? `${row.partNumber}. ` : ''}{row.assignmentTitle} · {row.roleLabel}</p><p className="mt-1 text-xs text-muted-foreground">{row.category === 'audio_video' ? 'Áudio e vídeo' : 'Parte da reunião'}{row.respondedAt ? ` · Respondido em ${responseTime(row.respondedAt)}` : ''}</p></div>
              <span className={`rounded-full px-3 py-1 text-xs font-medium ${row.status === 'declined' ? 'bg-rose-50 text-rose-800' : row.status === 'confirmed' ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-50 text-amber-800'}`}>{row.status === 'declined' ? 'Recusada' : row.status === 'confirmed' ? 'Confirmada' : 'Aguardando resposta'}</span></div>
            {row.status === 'declined' && <div className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-3 text-sm text-rose-900"><strong className="block text-xs">Motivo da recusa</strong><p className="mt-1 whitespace-pre-wrap break-words">{row.declineReason || 'Motivo não informado.'}</p></div>}
            {canEdit && onTreat && row.status === 'declined' && <Button variant="outline" className="mt-3" aria-label={`Tratar designação de ${row.memberName}`} onClick={() => onTreat(original, row)}>Tratar designação</Button>}
          </li>)}</ul>}
        </details>;
      })}</div>}
    <p className="text-xs text-muted-foreground">Recusas aparecem primeiro. A substituição é feita na designação; a resposta do participante permanece registrada até a alteração.</p>
  </section>;
}
