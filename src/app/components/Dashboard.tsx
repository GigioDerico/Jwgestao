import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationsContext';
import { api } from '../lib/api';
import { formatPhoneDisplay } from '../helpers';
import { toast } from 'sonner';
import {
  Users,
  CalendarDays,
  BookOpen,
  UserCheck,
  Clock,
  ChevronRight,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';

function getWeekStart(date: Date) {
  const normalized = new Date(date);
  normalized.setHours(12, 0, 0, 0);
  const day = normalized.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  normalized.setDate(normalized.getDate() + diff);
  return normalized;
}

function formatWeekLabel(start: Date) {
  const end = new Date(start);
  end.setDate(start.getDate() + 6);

  return `Semana de ${start.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
  })} a ${end.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
  })}`;
}

function getNextMeetingMeta(meetings: Array<{ date?: string | null; startTime?: string | null }>) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const upcomingMeetings = meetings
    .filter((meeting): meeting is { date: string; startTime?: string | null } => Boolean(meeting?.date))
    .map(meeting => ({
      ...meeting,
      timestamp: new Date(`${meeting.date}T12:00:00`).getTime(),
    }))
    .filter(meeting => !Number.isNaN(meeting.timestamp) && meeting.timestamp >= today.getTime())
    .sort((a, b) => a.timestamp - b.timestamp);

  if (upcomingMeetings.length === 0) {
    return null;
  }

  return {
    date: upcomingMeetings[0].date,
    startTime: upcomingMeetings[0].startTime || null,
  };
}

function formatMeetingDateLabel(date: string | null | undefined) {
  if (!date) {
    return 'Nenhuma próxima reunião cadastrada';
  }

  const parsed = new Date(`${date}T12:00:00`);
  return parsed.toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
  });
}

function getMeetingRelativeLabel(date: string | null | undefined) {
  if (!date) {
    return null;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const target = new Date(`${date}T12:00:00`);
  target.setHours(0, 0, 0, 0);

  const diffInDays = Math.round((target.getTime() - today.getTime()) / 86400000);

  if (diffInDays === 0) {
    return 'Hoje';
  }

  if (diffInDays === 1) {
    return 'Amanhã';
  }

  return null;
}

function formatMeetingTimeLabel(time: string | null | undefined) {
  if (!time) {
    return 'Horário não definido';
  }

  return time;
}

function getAssignmentDesignationLabel(message: string) {
  return message
    .replace(/^Você foi designado para\s+/i, '')
    .replace(/\s+em \d{2}\/\d{2}(?:\/\d{4})?\.$/i, '')
    .replace(/\.$/, '');
}

export function Dashboard() {
  const { user, isAdmin } = useAuth();
  const { notifications, confirm } = useNotifications();
  const navigate = useNavigate();
  const [membersCount, setMembersCount] = useState(0);
  const [eldersCount, setEldersCount] = useState(0);
  const [midweekCount, setMidweekCount] = useState(0);
  const [weekendCount, setWeekendCount] = useState(0);
  const [midweekSchedule, setMidweekSchedule] = useState<Array<{ date: string; startTime?: string | null }>>([]);
  const [weekendSchedule, setWeekendSchedule] = useState<Array<{ date: string; startTime?: string | null }>>([]);
  const [configuredMidweekTime, setConfiguredMidweekTime] = useState('');
  const [configuredWeekendTime, setConfiguredWeekendTime] = useState('');
  const [recentMembers, setRecentMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const members = await api.getMembers();
        setMembersCount(members.length);
        setEldersCount(
          members.filter((member: any) =>
            (Array.isArray(member.roles) && member.roles.includes('anciao')) ||
            member.spiritual_status === 'anciao'
          ).length
        );
        setRecentMembers(members.slice(0, 5));
        const [mw, we, midweekTimeSetting, weekendTimeSetting] = await Promise.all([
          api.getMidweekMeetings(),
          api.getWeekendMeetings(),
          api.getAppSetting('midweek_meeting_time').catch(() => null),
          api.getAppSetting('weekend_meeting_time').catch(() => null),
        ]);

        setMidweekCount(mw.length);
        setMidweekSchedule(mw.map((meeting: any) => ({
          date: meeting.date,
          startTime: meeting.opening_song_time || meeting.opening_comments_time || null,
        })));
        setWeekendCount(we.length);
        setWeekendSchedule(we.map((meeting: any) => ({
          date: meeting.date,
          startTime: null,
        })));
        setConfiguredMidweekTime(midweekTimeSetting || '');
        setConfiguredWeekendTime(weekendTimeSetting || '');
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const nextMidweekMeeting = useMemo(() => getNextMeetingMeta(midweekSchedule), [midweekSchedule]);
  const nextWeekendMeeting = useMemo(() => getNextMeetingMeta(weekendSchedule), [weekendSchedule]);
  const nextMidweekDate = nextMidweekMeeting?.date || null;
  const nextWeekendDate = nextWeekendMeeting?.date || null;
  const nextMidweekRelativeLabel = getMeetingRelativeLabel(nextMidweekDate);
  const nextWeekendRelativeLabel = getMeetingRelativeLabel(nextWeekendDate);
  const displayMidweekTime = configuredMidweekTime || nextMidweekMeeting?.startTime || '';
  const displayWeekendTime = configuredWeekendTime || nextWeekendMeeting?.startTime || '';

  const visibleNotifications = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return notifications.filter(notification => {
      if (notification.status === 'revoked') {
        return false;
      }

      if (!notification.assignmentDate) {
        return true;
      }

      const assignmentDate = new Date(`${notification.assignmentDate}T12:00:00`);
      assignmentDate.setHours(0, 0, 0, 0);
      return !Number.isNaN(assignmentDate.getTime()) && assignmentDate.getTime() >= today.getTime();
    });
  }, [notifications]);

  const nextMidweekNotifications = useMemo(
    () => visibleNotifications.filter(
      notification =>
        notification.category === 'midweek' &&
        notification.assignmentDate === nextMidweekDate
    ),
    [visibleNotifications, nextMidweekDate]
  );

  const nextWeekendNotifications = useMemo(
    () => visibleNotifications.filter(
      notification =>
        notification.category === 'weekend' &&
        notification.assignmentDate === nextWeekendDate
    ),
    [visibleNotifications, nextWeekendDate]
  );

  const notificationGroups = useMemo(() => {
    const groups = new Map<string, { label: string; items: typeof visibleNotifications }>();

    for (const notification of visibleNotifications) {
      if (!notification.assignmentDate) {
        const existing = groups.get('no-date');
        if (existing) {
          existing.items.push(notification);
        } else {
          groups.set('no-date', {
            label: 'Sem data definida',
            items: [notification],
          });
        }
        continue;
      }

      const assignmentDate = new Date(`${notification.assignmentDate}T12:00:00`);
      const weekStart = getWeekStart(assignmentDate);
      const key = weekStart.toISOString().slice(0, 10);
      const existing = groups.get(key);

      if (existing) {
        existing.items.push(notification);
      } else {
        groups.set(key, {
          label: formatWeekLabel(weekStart),
          items: [notification],
        });
      }
    }

    return Array.from(groups.entries())
      .sort(([aKey], [bKey]) => {
        if (aKey === 'no-date') return 1;
        if (bKey === 'no-date') return -1;
        return aKey.localeCompare(bKey);
      })
      .map(([, group]) => group);
  }, [visibleNotifications]);

  const stats = [
    { label: 'Membros', value: loading ? '...' : membersCount, icon: Users, color: 'bg-blue-500', path: '/members' },
    { label: 'Reuniões Meio de Semana', value: loading ? '...' : midweekCount, icon: CalendarDays, color: 'bg-amber-500', path: '/meetings', state: { initialTab: 'midweek' } },
    { label: 'Reuniões Fim de Semana', value: loading ? '...' : weekendCount, icon: BookOpen, color: 'bg-green-500', path: '/meetings', state: { initialTab: 'weekend' } },
    { label: 'Anciãos', value: loading ? '...' : eldersCount, icon: UserCheck, color: 'bg-purple-500', path: '/members' },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Welcome */}
      <div>
        <h1 className="text-foreground">Olá, {user?.name.split(' ')[0]}!</h1>
        <p className="text-muted-foreground mt-1" style={{ fontSize: '0.9rem' }}>
          Bem-vindo ao sistema de gestão da congregação.
        </p>
      </div>

      {/* Stats cards */}
      {isAdmin && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          {stats.map((stat) => (
            <button
              key={stat.label}
              onClick={() => navigate(stat.path, stat.state ? { state: stat.state } : undefined)}
              className="bg-card rounded-xl p-4 border border-border hover:shadow-md hover:border-primary/20 transition-all text-left group"
            >
              <div className={`w-10 h-10 ${stat.color} rounded-lg flex items-center justify-center mb-3 shadow-sm`}>
                <stat.icon size={20} className="text-white" />
              </div>
              <p className="text-foreground font-bold" style={{ fontSize: '1.5rem' }}>{stat.value}</p>
              <p className="text-muted-foreground flex items-center gap-1" style={{ fontSize: '0.8rem' }}>
                {stat.label}
                <ChevronRight size={12} className="opacity-0 group-hover:opacity-100 transition-opacity text-primary" />
              </p>
            </button>
          ))}
        </div>
      )}

      {/* My Assignments */}
      <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
        <div className="p-4 md:p-5 border-b border-border bg-muted/30">
          <h3 className="text-foreground flex items-center gap-2 font-semibold">
            <Clock size={18} className="text-primary" />
            Minhas Designações
          </h3>
        </div>

        {visibleNotifications.length > 0 ? (
          <div>
            {notificationGroups.map((group, groupIndex) => (
              <div key={group.label} className={groupIndex > 0 ? 'border-t border-border' : ''}>
                <div className="border-b border-border bg-muted/20 px-4 md:px-5 py-2">
                  <p className="text-muted-foreground font-medium" style={{ fontSize: '0.78rem' }}>
                    {group.label}
                  </p>
                </div>
                <div className="divide-y divide-border">
                  {group.items.map((notification) => (
                    <div key={notification.id} className="px-4 md:px-5 py-3.5 flex items-start gap-3 hover:bg-muted/30 transition-colors">
                      <div className={`mt-0.5 shrink-0 ${notification.status === 'confirmed' ? 'text-green-500' : 'text-amber-500'}`}>
                        {notification.status === 'confirmed' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-foreground font-medium" style={{ fontSize: '0.9rem' }}>{notification.title}</p>
                        <p className="text-muted-foreground" style={{ fontSize: '0.8rem' }}>{notification.message}</p>
                      </div>
                      {notification.status === 'pending_confirmation' ? (
                        <button
                          onClick={async () => {
                            try {
                              await confirm(notification.id);
                            } catch (error: any) {
                              console.error(error);
                              toast.error(error?.message || 'Erro ao confirmar designação.');
                            }
                          }}
                          className="shrink-0 rounded-full bg-primary/10 px-3 py-1 font-medium text-primary transition-colors hover:bg-primary/20"
                          style={{ fontSize: '0.75rem' }}
                        >
                          Confirmar
                        </button>
                      ) : (
                        <span
                          className="shrink-0 rounded-full bg-green-50 px-3 py-1 font-medium text-green-700"
                          style={{ fontSize: '0.75rem' }}
                        >
                          Confirmado ✓
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 text-center bg-card">
            <CalendarDays size={32} className="text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-muted-foreground" style={{ fontSize: '0.9rem' }}>Nenhuma designação pendente</p>
          </div>
        )}
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-gradient-to-r from-[#082c45] to-[#0a3d62] text-white rounded-xl p-5 text-left hover:shadow-lg transition-all border border-white/5">
          <button
            onClick={() => navigate('/meetings', { state: { initialTab: 'midweek' } })}
            className="w-full text-left group"
          >
            <CalendarDays size={24} className="mb-2 text-primary group-hover:scale-110 transition-transform" />
            <h3 className="text-white font-bold">Reunião do Meio de Semana</h3>
            <p className="text-white/60 mt-1" style={{ fontSize: '0.85rem' }}>Vida e Ministério Cristão</p>
            <p className="mt-3 text-white/80" style={{ fontSize: '0.8rem' }}>
              Próxima reunião: {formatMeetingDateLabel(nextMidweekDate)}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {nextMidweekRelativeLabel && (
                <span
                  className="rounded-full bg-amber-400/20 px-2.5 py-1 text-amber-100"
                  style={{ fontSize: '0.72rem' }}
                >
                  {nextMidweekRelativeLabel}
                </span>
              )}
              <span className="text-white/70" style={{ fontSize: '0.76rem' }}>
                Horário: {formatMeetingTimeLabel(displayMidweekTime)}
              </span>
            </div>
          </button>

          <div className="mt-4 space-y-2">
            {nextMidweekNotifications.length > 0 ? (
              nextMidweekNotifications.map(notification => (
                <div
                  key={notification.id}
                  className={`rounded-lg border px-3 py-2 ${notification.status === 'pending_confirmation'
                    ? 'border-red-300 bg-red-500/10'
                    : 'border-emerald-300 bg-emerald-500/10'
                    }`}
                >
                  <p
                    className={`font-medium ${notification.status === 'pending_confirmation' ? 'text-red-100' : 'text-emerald-100'}`}
                    style={{ fontSize: '0.8rem' }}
                  >
                    {getAssignmentDesignationLabel(notification.message)}
                  </p>
                  <p
                    className={notification.status === 'pending_confirmation' ? 'text-red-100/90' : 'text-emerald-100/90'}
                    style={{ fontSize: '0.74rem' }}
                  >
                    {notification.status === 'pending_confirmation'
                      ? 'Aguardando sua confirmação'
                      : 'Designação já confirmada'}
                  </p>
                  {notification.status === 'pending_confirmation' && (
                    <button
                      onClick={async () => {
                        try {
                          await confirm(notification.id);
                        } catch (error: any) {
                          console.error(error);
                          toast.error(error?.message || 'Erro ao confirmar designação.');
                        }
                      }}
                      className="mt-2 rounded-full bg-white/15 px-3 py-1 text-white transition-colors hover:bg-white/25"
                      style={{ fontSize: '0.72rem' }}
                    >
                      Confirmar
                    </button>
                  )}
                </div>
              ))
            ) : (
              <p className="text-white/70" style={{ fontSize: '0.78rem' }}>
                Você não tem designação na próxima reunião.
              </p>
            )}
          </div>
        </div>

        <div className="bg-gradient-to-r from-[#35bdf8] to-[#29abe2] text-[#082c45] rounded-xl p-5 text-left hover:shadow-lg transition-all border border-[#082c45]/5">
          <button
            onClick={() => navigate('/meetings', { state: { initialTab: 'weekend' } })}
            className="w-full text-left group"
          >
            <BookOpen size={24} className="mb-2 text-[#082c45] group-hover:scale-110 transition-transform" />
            <h3 className="text-[#082c45] font-bold">Reunião do Fim de Semana</h3>
            <p className="text-[#082c45]/70 mt-1" style={{ fontSize: '0.85rem' }}>Conferência Pública e A Sentinela</p>
            <p className="mt-3 text-[#082c45]/80" style={{ fontSize: '0.8rem' }}>
              Próxima reunião: {formatMeetingDateLabel(nextWeekendDate)}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {nextWeekendRelativeLabel && (
                <span
                  className="rounded-full bg-amber-100 px-2.5 py-1 text-amber-700"
                  style={{ fontSize: '0.72rem' }}
                >
                  {nextWeekendRelativeLabel}
                </span>
              )}
              <span className="text-[#082c45]/70" style={{ fontSize: '0.76rem' }}>
                Horário: {formatMeetingTimeLabel(displayWeekendTime)}
              </span>
            </div>
          </button>

          <div className="mt-4 space-y-2">
            {nextWeekendNotifications.length > 0 ? (
              nextWeekendNotifications.map(notification => (
                <div
                  key={notification.id}
                  className={`rounded-lg border px-3 py-2 ${notification.status === 'pending_confirmation'
                    ? 'border-red-300 bg-red-50'
                    : 'border-emerald-300 bg-emerald-50'
                    }`}
                >
                  <p
                    className={`font-medium ${notification.status === 'pending_confirmation' ? 'text-red-700' : 'text-emerald-700'}`}
                    style={{ fontSize: '0.8rem' }}
                  >
                    {getAssignmentDesignationLabel(notification.message)}
                  </p>
                  <p
                    className={notification.status === 'pending_confirmation' ? 'text-red-700/80' : 'text-emerald-700/80'}
                    style={{ fontSize: '0.74rem' }}
                  >
                    {notification.status === 'pending_confirmation'
                      ? 'Aguardando sua confirmação'
                      : 'Designação já confirmada'}
                  </p>
                  {notification.status === 'pending_confirmation' && (
                    <button
                      onClick={async () => {
                        try {
                          await confirm(notification.id);
                        } catch (error: any) {
                          console.error(error);
                          toast.error(error?.message || 'Erro ao confirmar designação.');
                        }
                      }}
                      className="mt-2 rounded-full bg-red-100 px-3 py-1 text-red-700 transition-colors hover:bg-red-200"
                      style={{ fontSize: '0.72rem' }}
                    >
                      Confirmar
                    </button>
                  )}
                </div>
              ))
            ) : (
              <p className="text-[#082c45]/70" style={{ fontSize: '0.78rem' }}>
                Você não tem designação na próxima reunião.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Recent Members Preview */}
      {isAdmin && (
        <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
          <div className="p-4 md:p-5 border-b border-border flex items-center justify-between bg-muted/30">
            <h3 className="text-foreground font-semibold">Membros Recentes</h3>
            <button
              onClick={() => navigate('/members')}
              className="text-primary hover:underline flex items-center gap-1 font-medium"
              style={{ fontSize: '0.85rem' }}
            >
              Ver todos <ChevronRight size={14} />
            </button>
          </div>
          <div className="divide-y divide-border">
            {recentMembers.map((member) => (
              <div key={member.id} className="px-4 md:px-5 py-3 flex items-center gap-3 hover:bg-muted/30 transition-colors">
                <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center shrink-0 border border-primary/10">
                  <span className="text-accent-foreground font-bold" style={{ fontSize: '0.75rem' }}>
                    {member.full_name.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-foreground truncate font-medium" style={{ fontSize: '0.9rem' }}>{member.full_name}</p>
                  <p className="text-muted-foreground truncate" style={{ fontSize: '0.75rem' }}>{formatPhoneDisplay(member.phone) || 'Sem telefone'}</p>
                </div>
                <span className="px-2 py-0.5 rounded-full font-medium bg-gray-100 text-gray-700" style={{ fontSize: '0.7rem' }}>
                  {member.spiritual_status === 'publicador_batizado' ? 'Pub. Batizado' :
                    member.spiritual_status === 'publicador' ? 'Publicador' :
                      member.spiritual_status === 'estudante' ? 'Estudante' : 'Membro'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
