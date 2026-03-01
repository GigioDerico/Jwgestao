import React, { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { Loader2, CalendarDays, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '../lib/api';
import { downloadElementAsImage, downloadElementAsPdf } from '../lib/dom-export';
import {
  DEFAULT_CONGREGATION_NAME,
  MIDWEEK_PRIMARY_ROOM,
  buildMidweekScheduleTimes,
} from '../lib/midweek-schedule';
import { ExportActions } from './ExportActions';
import { MidweekMeetingView } from './MidweekMeetingView';
import { WeekendMeetingView } from './WeekendMeetingView';
import { useAuth } from '../context/AuthContext';
import { usePermissions } from '../hooks/usePermissions';
import { formatWeekendSpeakerCongregation } from '../helpers';
import type { MidweekMeeting, WeekendMeeting } from '../types';

function getName(value: any): string {
  if (!value) return '';
  if (typeof value === 'string') return value;
  return value.full_name || '';
}

function normalizeMidweekMeeting(meeting: any): MidweekMeeting {
  const rawMinistryParts = Array.isArray(meeting.ministry_parts)
    ? [...meeting.ministry_parts].sort((a: any, b: any) => (a.part_number || 0) - (b.part_number || 0))
    : [];
  const rawChristianLifeParts = Array.isArray(meeting.christian_life_parts)
    ? [...meeting.christian_life_parts].sort((a: any, b: any) => (a.part_number || 0) - (b.part_number || 0))
    : [];
  const cbsDuration = meeting.cbs_duration || 30;
  const closingCommentsDuration = meeting.closing_comments_duration || 3;
  const scheduleTimes = buildMidweekScheduleTimes({
    openingSongTime: meeting.opening_song_time,
    openingCommentsTime: meeting.opening_comments_time,
    treasureTalkTime: meeting.treasure_talk_time,
    treasureGemsTime: meeting.treasure_gems_time,
    treasureReadingTime: meeting.treasure_reading_time,
    middleSongTime: meeting.middle_song_time,
    cbsTime: meeting.cbs_time,
    closingCommentsTime: meeting.closing_comments_time,
    closingSongTime: meeting.closing_song_time,
    ministryParts: rawMinistryParts,
    christianLifeParts: rawChristianLifeParts,
    cbsDuration,
    closingCommentsDuration,
  });

  const ministryParts = rawMinistryParts.map((part: any, index: number) => ({
    number: part.part_number || 0,
    time: scheduleTimes.ministryTimes[index] || '20:00',
    title: part.title || 'Parte',
    duration: part.duration || 0,
    student: getName(part.student) || 'A definir',
    assistant: getName(part.assistant) || undefined,
    room: MIDWEEK_PRIMARY_ROOM,
  }));

  const christianLifeParts = rawChristianLifeParts.map((part: any, index: number) => ({
    number: part.part_number || 0,
    time: scheduleTimes.christianLifeTimes[index] || '20:20',
    title: part.title || 'Parte',
    duration: part.duration || 0,
    speaker: getName(part.speaker) || 'A definir',
  }));

  return {
    id: meeting.id,
    date: meeting.date,
    bible_reading: meeting.bible_reading || '',
    president: getName(meeting.president) || 'A definir',
    opening_prayer: getName(meeting.opening_prayer) || 'A definir',
    closing_prayer: getName(meeting.closing_prayer) || 'A definir',
    opening_song: meeting.opening_song || 0,
    opening_song_time: scheduleTimes.openingSongTime,
    opening_comments: {
      time: scheduleTimes.openingCommentsTime,
      duration: meeting.opening_comments_duration || 1,
    },
    middle_song: meeting.middle_song || 0,
    middle_song_time: scheduleTimes.middleSongTime,
    closing_song: meeting.closing_song || 0,
    closing_song_time: scheduleTimes.closingSongTime,
    treasures: {
      talk: {
        title: meeting.treasure_talk_title || 'Tema a definir',
        duration: meeting.treasure_talk_duration || 10,
        time: scheduleTimes.treasureTalkTime,
        speaker: getName(meeting.treasure_talk_speaker) || 'A definir',
      },
      spiritual_gems: {
        duration: meeting.treasure_gems_duration || 10,
        time: scheduleTimes.treasureGemsTime,
        speaker: getName(meeting.treasure_gems_speaker) || 'A definir',
      },
      bible_reading: {
        duration: meeting.treasure_reading_duration || 4,
        time: scheduleTimes.treasureReadingTime,
        student: getName(meeting.treasure_reading_student) || 'A definir',
        room: MIDWEEK_PRIMARY_ROOM,
      },
    },
    ministry: {
      parts: ministryParts,
    },
    christian_life: {
      parts: christianLifeParts,
      congregation_bible_study: {
        time: scheduleTimes.cbsTime,
        duration: cbsDuration,
        conductor: getName(meeting.cbs_conductor) || 'A definir',
        reader: getName(meeting.cbs_reader) || 'A definir',
      },
      closing_comments: {
        time: scheduleTimes.closingCommentsTime,
        duration: closingCommentsDuration,
      },
    },
  };
}

function normalizeWeekendMeeting(meeting: any): WeekendMeeting {
  const congregationLabel = formatWeekendSpeakerCongregation(meeting.talk_congregation);

  return {
    id: meeting.id,
    date: meeting.date,
    president: getName(meeting.president) || 'A definir',
    public_talk: {
      theme: meeting.talk_theme || 'Tema a definir',
      speaker: meeting.talk_speaker_name || 'A definir',
      congregation: congregationLabel || 'Congregação local',
    },
    watchtower_study: {
      conductor: getName(meeting.watchtower_conductor) || 'A definir',
      reader: getName(meeting.watchtower_reader) || 'A definir',
    },
    closing_prayer: getName(meeting.closing_prayer) || 'A definir',
  };
}

function MidweekSheetPrint({
  meetings,
  congregationName,
}: {
  meetings: MidweekMeeting[];
  congregationName: string;
}) {
  return (
    <div
      className="mx-auto w-full max-w-[860px] border border-stone-300 bg-white px-5 py-4 text-[#141414]"
      style={{ fontFamily: 'Calibri, Arial, sans-serif' }}
    >
      <div className="flex flex-col gap-1.5 sm:relative sm:min-h-[30px] sm:justify-end">
        <h3 className="text-[0.95rem] font-semibold leading-tight sm:whitespace-nowrap sm:text-right sm:text-[1.05rem] md:text-[1.5rem]">
          Programação da reunião do meio de semana
        </h3>
        <p className="text-[0.8rem] font-semibold tracking-tight sm:absolute sm:left-0 sm:whitespace-nowrap md:text-[1rem]">
          {congregationName}
        </p>
      </div>

      <div className="mt-2 space-y-0.5">
        <div className="h-0.5 bg-[#686868]" />
        <div className="h-px bg-[#9a9a9a]" />
      </div>

      <div className="mt-3 space-y-6 md:space-y-8">
        {meetings.map((meeting, index) => (
          <div key={meeting.id} className={index < meetings.length - 1 ? 'border-b border-stone-200 pb-6 md:pb-8' : ''}>
            <MidweekMeetingView meeting={meeting} />
          </div>
        ))}
      </div>
    </div>
  );
}

function MidweekMeetingSheet({
  meetings,
  congregationName,
  sheetIndex,
}: {
  meetings: MidweekMeeting[];
  congregationName: string;
  sheetIndex: number;
}) {
  return (
    <div className="space-y-3 rounded-2xl border border-border bg-card p-3 shadow-sm">
      <div>
        <p className="text-foreground font-medium" style={{ fontSize: '0.9rem' }}>
          Página {sheetIndex + 1}
        </p>
        <p className="text-muted-foreground" style={{ fontSize: '0.8rem' }}>
          Esta folha agrupa {meetings.length} reunião{meetings.length > 1 ? 'ões' : ''} para visualização e impressão.
        </p>
      </div>
      <MidweekSheetPrint meetings={meetings} congregationName={congregationName} />
    </div>
  );
}

function getWeekendExportMonthLabel(meetings: WeekendMeeting[]) {
  const timestamps = meetings
    .map(meeting => new Date(`${meeting.date}T12:00:00`).getTime())
    .filter(timestamp => !Number.isNaN(timestamp));

  const referenceDate = timestamps.length > 0 ? new Date(Math.min(...timestamps)) : new Date();

  return referenceDate.toLocaleDateString('pt-BR', { month: 'long' }).toUpperCase();
}

function WeekendExportDocument({ meetings }: { meetings: WeekendMeeting[] }) {
  const monthLabel = getWeekendExportMonthLabel(meetings);

  return (
    <div
      className="mx-auto flex min-h-[1697px] w-full max-w-[860px] flex-col bg-white px-5 py-4 text-[#141414]"
      style={{ fontFamily: 'Calibri, Arial, sans-serif' }}
    >
      <div className="overflow-hidden rounded-xl border border-[#0f2f53] bg-white">
        <div className="bg-[#1a5fb4] px-4 py-2.5 text-center text-white">
          <h3 className="text-[1.08rem] font-bold leading-tight">
            Conferência Pública
          </h3>
          <p className="text-[0.9rem] font-bold leading-tight">
            e
          </p>
          <p className="text-[0.98rem] font-bold leading-tight">
            Estudo de &quot;A Sentinela&quot; - {monthLabel}
          </p>
        </div>
      </div>
      <div className="mt-3 flex-1 space-y-3">
        {meetings.length > 0 ? (
          meetings.map(meeting => (
            <WeekendExportMeetingCard key={meeting.id} meeting={meeting} />
          ))
        ) : (
          <div className="rounded-xl border border-stone-200 bg-white px-4 py-8 text-center text-stone-500">
            Nenhuma reunião de fim de semana cadastrada.
          </div>
        )}
      </div>
    </div>
  );
}

function WeekendExportMeetingCard({ meeting }: { meeting: WeekendMeeting }) {
  const dateObj = new Date(`${meeting.date}T12:00:00`);
  const dateFormatted = dateObj.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
  });
  const speakerLabel = meeting.public_talk.congregation
    ? `${meeting.public_talk.speaker} (${meeting.public_talk.congregation})`
    : meeting.public_talk.speaker;

  return (
    <div className="h-full overflow-hidden rounded-xl border border-[#d4deea] bg-white shadow-[0_1px_0_rgba(15,47,83,0.08)]">
      <div className="bg-[#1a5fb4] px-3 py-1.5 text-center text-white">
        <h4 className="text-[0.9rem] font-semibold leading-tight">{dateFormatted}</h4>
      </div>
      <div className="space-y-1.5 px-3 py-2.5 text-[0.82rem] leading-[1.16]">
        <WeekendExportField
          label="Presidente"
          value={meeting.president}
        />
        <div className="rounded-lg bg-blue-50/30 px-2.5 py-2">
          <p className="mb-1 text-[0.9rem] font-semibold tracking-[0.05em] text-blue-600">CONFERÊNCIA PÚBLICA</p>
          <div className="space-y-0.5">
            <WeekendExportField label="Tema" value={meeting.public_talk.theme} compact valueClass="text-green-700 italic" />
            <WeekendExportField label="Orador" value={speakerLabel} compact />
          </div>
        </div>
        <div className="rounded-lg bg-blue-50/30 px-2.5 py-2">
          <p className="mb-1 text-[0.9rem] font-semibold tracking-[0.05em] text-blue-600">ESTUDO DE A SENTINELA</p>
          <div className="space-y-0.5">
            <WeekendExportField label="Dirigente" value={meeting.watchtower_study.conductor} compact />
            <WeekendExportField label="Leitor" value={meeting.watchtower_study.reader} compact valueClass="text-red-600" />
          </div>
        </div>
        <WeekendExportField
          label="Oração Final"
          value={meeting.closing_prayer}
        />
      </div>
    </div>
  );
}

function WeekendExportField({
  label,
  value,
  compact = false,
  valueClass,
}: {
  label: string;
  value: string;
  compact?: boolean;
  valueClass?: string;
}) {
  return (
    <div className={`flex items-start ${compact ? 'gap-1' : 'gap-1.5'}`}>
      <span className={`shrink-0 font-semibold text-[#53657a] ${compact ? 'text-[0.9rem]' : 'text-[0.9rem]'}`}>{label}:</span>
      <span className={`min-w-0 flex-1 break-words ${valueClass || 'text-[#141414]'} ${compact ? 'text-[0.9rem]' : 'text-[0.9rem]'}`}>{value}</span>
    </div>
  );
}

export function MeetingsPage() {
  const { user } = useAuth();
  const { can } = usePermissions();
  const navigate = useNavigate();
  const location = useLocation();
  const locationState = location.state as { initialTab?: 'midweek' | 'weekend' } | null;
  const canOpenPlanning = (user?.role === 'coordenador' || user?.role === 'designador') && can('view_assignments');
  const canManagePlanning = canOpenPlanning && can('create_assignments') && can('edit_assignments');
  const canDownloadAssignments = can('download_assignments');
  const [tab, setTab] = useState<'midweek' | 'weekend'>(locationState?.initialTab === 'weekend' ? 'weekend' : 'midweek');
  const [midweekMeetings, setMidweekMeetings] = useState<MidweekMeeting[]>([]);
  const [weekendMeetings, setWeekendMeetings] = useState<WeekendMeeting[]>([]);
  const [congregationName, setCongregationName] = useState(DEFAULT_CONGREGATION_NAME);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState<'image' | 'pdf' | null>(null);
  const midweekExportRef = useRef<HTMLDivElement>(null);
  const weekendExportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (locationState?.initialTab === 'weekend') {
      setTab('weekend');
      return;
    }

    if (locationState?.initialTab === 'midweek') {
      setTab('midweek');
    }
  }, [locationState?.initialTab]);

  useEffect(() => {
    (async () => {
      try {
        const [mw, we, savedCongregationName] = await Promise.all([
          api.getMidweekMeetings(),
          api.getWeekendMeetings(),
          api.getAppSetting('congregation_name').catch(() => null),
        ]);
        setMidweekMeetings(mw.map(normalizeMidweekMeeting));
        setWeekendMeetings(we.map(normalizeWeekendMeeting));
        setCongregationName(
          !savedCongregationName || savedCongregationName === 'Congregação local'
            ? DEFAULT_CONGREGATION_NAME
            : savedCongregationName
        );
      } catch (e) {
        console.error('Erro ao carregar reuniões:', e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const midweekSheets: MidweekMeeting[][] = [];
  for (let index = 0; index < midweekMeetings.length; index += 2) {
    midweekSheets.push(midweekMeetings.slice(index, index + 2));
  }

  const handleExport = async (type: 'image' | 'pdf') => {
    const element = tab === 'midweek' ? midweekExportRef.current : weekendExportRef.current;
    const baseFilename = tab === 'midweek' ? 'reunioes-meio-semana' : 'reunioes-fim-semana';

    if (!element) {
      toast.error('Não foi possível preparar a exportação.');
      return;
    }

    setExporting(type);
    try {
      if (type === 'image') {
        await downloadElementAsImage(element, `${baseFilename}.jpg`);
        toast.success('Imagem JPG gerada com sucesso.');
      } else {
        await downloadElementAsPdf(element, `${baseFilename}.pdf`);
        toast.success('PDF gerado com sucesso.');
      }
    } catch (error: any) {
      toast.error(error?.message || 'Não foi possível exportar a programação.');
    } finally {
      setExporting(null);
    }
  };

  return (
    <div className="relative max-w-5xl mx-auto space-y-4">
      <div>
        <h1 className="text-foreground">Reuniões</h1>
        <p className="text-muted-foreground" style={{ fontSize: '0.85rem' }}>Programação das reuniões da congregação</p>
      </div>

      {canManagePlanning && (
        <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-foreground font-medium" style={{ fontSize: '0.9rem' }}>Criação e planejamento</p>
            <p className="text-muted-foreground" style={{ fontSize: '0.82rem' }}>
              A criação de novas reuniões e o encaixe inicial das designações agora ficam na área de planejamento.
            </p>
          </div>
          <button
            onClick={() => navigate('/assignments')}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-primary-foreground transition-colors hover:bg-primary/90"
            style={{ fontSize: '0.85rem' }}
          >
            <Plus size={14} />
            Abrir Planejamento
          </button>
        </div>
      )}

      <div className="flex gap-1 bg-muted rounded-xl p-1 shadow-inner border border-border/50">
        <button
          onClick={() => setTab('midweek')}
          className={`flex-1 py-2.5 rounded-lg transition-all font-medium ${tab === 'midweek'
            ? 'bg-card text-primary shadow-sm'
            : 'text-muted-foreground hover:text-foreground'
            }`}
          style={{ fontSize: '0.9rem' }}
        >
          Meio de Semana
        </button>
        <button
          onClick={() => setTab('weekend')}
          className={`flex-1 py-2.5 rounded-lg transition-all font-medium ${tab === 'weekend'
            ? 'bg-card text-primary shadow-sm'
            : 'text-muted-foreground hover:text-foreground'
            }`}
          style={{ fontSize: '0.9rem' }}
        >
          Fim de Semana
        </button>
      </div>

      {canDownloadAssignments && (
        <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-foreground font-medium" style={{ fontSize: '0.9rem' }}>
              Exportação da aba atual
            </p>
            <p className="text-muted-foreground" style={{ fontSize: '0.82rem' }}>
              {tab === 'midweek'
                ? 'Exporta todas as páginas de reunião de meio de semana atualmente visíveis.'
                : 'Exporta toda a listagem de reuniões de fim de semana atualmente visível.'}
            </p>
          </div>
          <ExportActions
            onExportImage={() => handleExport('image')}
            onExportPdf={() => handleExport('pdf')}
            exporting={exporting}
            disabled={loading}
          />
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="animate-spin text-primary" size={28} />
        </div>
      ) : tab === 'midweek' ? (
        midweekMeetings.length > 0 ? (
          <div className="space-y-6">
            {midweekSheets.map((sheetMeetings, sheetIndex) => (
              <MidweekMeetingSheet
                key={sheetMeetings.map(meeting => meeting.id).join('-')}
                meetings={sheetMeetings}
                congregationName={congregationName}
                sheetIndex={sheetIndex}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            <CalendarDays size={32} className="mx-auto mb-2 opacity-30" />
            <p>Nenhuma reunião de meio de semana cadastrada</p>
          </div>
        )
      ) : (
        weekendMeetings.length > 0 ? (
          <div className="space-y-6">
            {weekendMeetings.map(meeting => (
              <WeekendMeetingView key={meeting.id} meeting={meeting} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            <CalendarDays size={32} className="mx-auto mb-2 opacity-30" />
            <p>Nenhuma reunião de fim de semana cadastrada</p>
          </div>
        )
      )}

      <div className="pointer-events-none absolute -left-[10000px] top-0 w-[900px]" aria-hidden="true">
        <div ref={midweekExportRef} className="w-[900px] bg-white px-4 py-4">
          {midweekSheets.length > 0 ? (
            <div className="space-y-4">
              {midweekSheets.map((sheetMeetings, sheetIndex) => (
                <div key={sheetMeetings.map(meeting => meeting.id).join('-')} className={sheetIndex > 0 ? 'pt-2' : ''}>
                  <MidweekSheetPrint meetings={sheetMeetings} congregationName={congregationName} />
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-stone-200 bg-white px-4 py-8 text-center text-stone-500">
              Nenhuma reunião de meio de semana cadastrada.
            </div>
          )}
        </div>
      </div>

      <div className="pointer-events-none absolute -left-[10000px] top-0 w-[1200px]" aria-hidden="true">
        <div
          ref={weekendExportRef}
          data-export-pdf-mode="single-page"
          data-export-pdf-page="a4-portrait"
          className="w-[1200px] min-h-[1697px] bg-white"
        >
          <WeekendExportDocument meetings={weekendMeetings} />
        </div>
      </div>
    </div>
  );
}
