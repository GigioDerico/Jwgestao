import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router';
import { api } from '../lib/api';
import {
  MIDWEEK_PRIMARY_ROOM,
  addMinutesToTime,
  buildMidweekScheduleTimes,
  isValidTimeValue,
  parseDurationMinutes,
  timeToMinutes,
} from '../lib/midweek-schedule';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { usePermissions } from '../hooks/usePermissions';
import {
  formatWeekendSpeakerCongregation,
  parseWeekendSpeakerCongregation,
  serializeWeekendSpeakerCongregation,
} from '../helpers';
import { Plus, X, ChevronDown, BookOpen, MessageCircle } from 'lucide-react';
import { toast } from 'sonner';
import { sendDesignationWhatsApp } from '../lib/whatsapp';

type MeetingEditField = {
  label: string;
  mode: 'member' | 'text' | 'weekend_speaker';
  currentValue: string;
  secondaryValue?: string;
  tertiaryValue?: string;
  table: 'midweek_meetings' | 'weekend_meetings' | 'midweek_ministry_parts' | 'midweek_christian_life_parts';
  rowId: string;
  column: string;
};
type MeetingFormMode = 'create' | 'edit';

type AudioVideoRestrictionAssignment = {
  date: string;
  sound_member_id?: string | null;
  image_member_id?: string | null;
  stage_member_id?: string | null;
  roving_mic_1_member_id?: string | null;
  roving_mic_2_member_id?: string | null;
  attendants_member_ids?: string[] | null;
};

const MINISTRY_PART_TYPES = [
  'Iniciando conversas',
  'Cultivando interesse',
  'Explicando suas crenças',
  'Fazendo discípulos',
  'Discurso',
] as const;

const createEmptyMinistryPartDraft = (time = '20:00') => ({
  time,
  title: '',
  duration: '',
  studentId: '',
  assistantId: '',
});

const createEmptyChristianLifePartDraft = (time = '20:20') => ({
  time,
  title: '',
  duration: '',
  speakerId: '',
});

const createEmptyMidweekDraft = () => ({
  date: '',
  bibleReading: '',
  presidentId: '',
  openingPrayerId: '',
  closingPrayerId: '',
  openingSong: '',
  openingSongTime: '19:30',
  openingCommentsTime: '19:34',
  openingCommentsDuration: '1',
  middleSong: '',
  middleSongTime: '20:16',
  closingSong: '',
  closingSongTime: '21:10',
  treasureTitle: '',
  treasureTime: '19:35',
  treasureDuration: '10',
  treasureSpeakerId: '',
  gemsTime: '19:45',
  gemsDuration: '10',
  gemsSpeakerId: '',
  readingTime: '19:55',
  readingDuration: '4',
  readingStudentId: '',
  cbsTime: '20:35',
  cbsDuration: '30',
  cbsConductorId: '',
  cbsReaderId: '',
  closingCommentsTime: '21:05',
  closingCommentsDuration: '3',
  ministryParts: [createEmptyMinistryPartDraft()],
  christianLifeParts: [createEmptyChristianLifePartDraft()],
});

const createEmptyWeekendDraft = () => ({
  date: '',
  presidentId: '',
  talkTheme: '',
  talkSpeakerName: '',
  talkCongregation: '',
  talkCongregationCity: '',
  watchtowerConductorId: '',
  watchtowerReaderId: '',
  closingPrayerId: '',
});

type MidweekDraft = ReturnType<typeof createEmptyMidweekDraft>;
type WeekendDraft = ReturnType<typeof createEmptyWeekendDraft>;

function getSequentialTimeError(times: { label: string; value: string }[]) {
  const normalizedTimes = times.filter(entry => entry.value);
  for (const entry of normalizedTimes) {
    if (!isValidTimeValue(entry.value)) {
      return `${entry.label} precisa estar no formato HH:MM.`;
    }
  }

  for (let index = 1; index < normalizedTimes.length; index += 1) {
    if (timeToMinutes(normalizedTimes[index].value) <= timeToMinutes(normalizedTimes[index - 1].value)) {
      return 'Os horários da programação devem estar em ordem crescente.';
    }
  }

  return null;
}

function getAudioVideoAssignedMemberIds(assignment?: AudioVideoRestrictionAssignment | null) {
  if (!assignment) {
    return new Set<string>();
  }

  return new Set(
    [
      assignment.sound_member_id,
      assignment.image_member_id,
      assignment.stage_member_id,
      assignment.roving_mic_1_member_id,
      assignment.roving_mic_2_member_id,
      ...(Array.isArray(assignment.attendants_member_ids) ? assignment.attendants_member_ids : []),
    ].filter((memberId): memberId is string => Boolean(memberId)),
  );
}

function getUnavailableWeekendReaderIds(
  date: string | undefined,
  audioVideoAssignments: AudioVideoRestrictionAssignment[],
) {
  if (!date) {
    return new Set<string>();
  }

  const sameDayAssignment = audioVideoAssignments.find(item => item.date === date);
  return getAudioVideoAssignedMemberIds(sameDayAssignment);
}

export function AssignmentsPage() {
  const { user } = useAuth();
  const { can } = usePermissions();
  const [meetingType, setMeetingType] = useState<'midweek' | 'weekend'>('midweek');
  const [selectedMeetingIdx, setSelectedMeetingIdx] = useState(0);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editField, setEditField] = useState<MeetingEditField | null>(null);
  const [showCreateMeetingModal, setShowCreateMeetingModal] = useState(false);
  const [meetingFormMode, setMeetingFormMode] = useState<MeetingFormMode>('create');
  const [createMeetingType, setCreateMeetingType] = useState<'midweek' | 'weekend'>('midweek');
  const [midweekDraft, setMidweekDraft] = useState(createEmptyMidweekDraft());
  const [weekendDraft, setWeekendDraft] = useState(createEmptyWeekendDraft());

  const [midweekMeetings, setMidweekMeetings] = useState<any[]>([]);
  const [weekendMeetings, setWeekendMeetings] = useState<any[]>([]);
  const [allMembers, setAllMembers] = useState<any[]>([]);
  const [audioVideoAssignments, setAudioVideoAssignments] = useState<AudioVideoRestrictionAssignment[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [membersData, mwData, weData, avData] = await Promise.all([
        api.getMembers(),
        api.getMidweekMeetings(),
        api.getWeekendMeetings(),
        supabase
          .from('audio_video_assignments')
          .select('date, sound_member_id, image_member_id, stage_member_id, roving_mic_1_member_id, roving_mic_2_member_id, attendants_member_ids')
      ]);

      if (avData.error) {
        throw avData.error;
      }

      setAllMembers(membersData);
      setMidweekMeetings(mwData);
      setWeekendMeetings(weData);
      setAudioVideoAssignments((avData.data || []) as AudioVideoRestrictionAssignment[]);
    } catch (e) {
      console.error('Error fetching assignment data', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const canManageAssignments = user?.role === 'coordenador' || user?.role === 'designador';
  const canViewAssignments = can('view_assignments');
  const canCreateAssignments = canManageAssignments && can('create_assignments');
  const canEditAssignments = canManageAssignments && can('edit_assignments');

  if (user && (!canManageAssignments || !canViewAssignments)) {
    return <Navigate to="/dashboard" replace />;
  }

  const openEdit = (field: MeetingEditField) => {
    setEditField(field);
    setShowEditModal(true);
  };

  const openCreateMeetingModal = () => {
    setMeetingFormMode('create');
    setCreateMeetingType(meetingType);
    setMidweekDraft(createEmptyMidweekDraft());
    setWeekendDraft(createEmptyWeekendDraft());
    setShowCreateMeetingModal(true);
  };

  const populateMidweekDraftFromMeeting = (meeting: any) => {
    const sortedMinistryParts = Array.isArray(meeting?.ministry_parts) && meeting.ministry_parts.length > 0
      ? [...meeting.ministry_parts].sort((a: any, b: any) => (a.part_number || 0) - (b.part_number || 0))
      : [];
    const sortedChristianLifeParts = Array.isArray(meeting?.christian_life_parts) && meeting.christian_life_parts.length > 0
      ? [...meeting.christian_life_parts].sort((a: any, b: any) => (a.part_number || 0) - (b.part_number || 0))
      : [];
    const fallbackTimes = buildMidweekScheduleTimes({
      openingSongTime: meeting?.opening_song_time,
      openingCommentsTime: meeting?.opening_comments_time,
      treasureTalkTime: meeting?.treasure_talk_time,
      treasureGemsTime: meeting?.treasure_gems_time,
      treasureReadingTime: meeting?.treasure_reading_time,
      middleSongTime: meeting?.middle_song_time,
      cbsTime: meeting?.cbs_time,
      closingCommentsTime: meeting?.closing_comments_time,
      closingSongTime: meeting?.closing_song_time,
      ministryParts: sortedMinistryParts,
      christianLifeParts: sortedChristianLifeParts,
      cbsDuration: meeting?.cbs_duration,
      closingCommentsDuration: meeting?.closing_comments_duration,
    });

    const ministryParts = sortedMinistryParts.length > 0
      ? sortedMinistryParts.map((part: any, index: number) => ({
        time: fallbackTimes.ministryTimes[index] || '20:00',
        title: part.title || '',
        duration: part.duration ? String(part.duration) : '',
        studentId: part.student_id || '',
        assistantId: part.assistant_id || '',
      }))
      : [createEmptyMinistryPartDraft()];

    const christianLifeParts = sortedChristianLifeParts.length > 0
      ? sortedChristianLifeParts.map((part: any, index: number) => ({
        time: fallbackTimes.christianLifeTimes[index] || '20:20',
        title: part.title || '',
        duration: part.duration ? String(part.duration) : '',
        speakerId: part.speaker_id || '',
      }))
      : [createEmptyChristianLifePartDraft()];

    setMidweekDraft({
      date: meeting?.date || '',
      bibleReading: meeting?.bible_reading || '',
      presidentId: meeting?.president_id || '',
      openingPrayerId: meeting?.opening_prayer_id || '',
      closingPrayerId: meeting?.closing_prayer_id || '',
      openingSong: meeting?.opening_song ? String(meeting.opening_song) : '',
      openingSongTime: fallbackTimes.openingSongTime,
      openingCommentsTime: fallbackTimes.openingCommentsTime,
      openingCommentsDuration: meeting?.opening_comments_duration ? String(meeting.opening_comments_duration) : '1',
      middleSong: meeting?.middle_song ? String(meeting.middle_song) : '',
      middleSongTime: fallbackTimes.middleSongTime,
      closingSong: meeting?.closing_song ? String(meeting.closing_song) : '',
      closingSongTime: fallbackTimes.closingSongTime,
      treasureTitle: meeting?.treasure_talk_title || '',
      treasureTime: fallbackTimes.treasureTalkTime,
      treasureDuration: meeting?.treasure_talk_duration ? String(meeting.treasure_talk_duration) : '10',
      treasureSpeakerId: meeting?.treasure_talk_speaker_id || '',
      gemsTime: fallbackTimes.treasureGemsTime,
      gemsDuration: meeting?.treasure_gems_duration ? String(meeting.treasure_gems_duration) : '10',
      gemsSpeakerId: meeting?.treasure_gems_speaker_id || '',
      readingTime: fallbackTimes.treasureReadingTime,
      readingDuration: meeting?.treasure_reading_duration ? String(meeting.treasure_reading_duration) : '4',
      readingStudentId: meeting?.treasure_reading_student_id || '',
      cbsTime: fallbackTimes.cbsTime,
      cbsDuration: meeting?.cbs_duration ? String(meeting.cbs_duration) : '30',
      cbsConductorId: meeting?.cbs_conductor_id || '',
      cbsReaderId: meeting?.cbs_reader_id || '',
      closingCommentsTime: fallbackTimes.closingCommentsTime,
      closingCommentsDuration: meeting?.closing_comments_duration ? String(meeting.closing_comments_duration) : '3',
      ministryParts,
      christianLifeParts,
    });
  };

  const populateWeekendDraftFromMeeting = (meeting: any) => {
    const talkCongregation = parseWeekendSpeakerCongregation(meeting?.talk_congregation);

    setWeekendDraft({
      date: meeting?.date || '',
      presidentId: meeting?.president_id || '',
      talkTheme: meeting?.talk_theme || '',
      talkSpeakerName: meeting?.talk_speaker_name || '',
      talkCongregation: talkCongregation.congregation,
      talkCongregationCity: talkCongregation.city,
      watchtowerConductorId: meeting?.watchtower_conductor_id || '',
      watchtowerReaderId: meeting?.watchtower_reader_id || '',
      closingPrayerId: meeting?.closing_prayer_id || '',
    });
  };

  const openEditMeetingModal = () => {
    const currentMeeting = meetingType === 'midweek'
      ? midweekMeetings[selectedMeetingIdx]
      : weekendMeetings[selectedMeetingIdx];

    if (!currentMeeting) {
      toast.error('Nenhuma reunião selecionada para editar.');
      return;
    }

    setMeetingFormMode('edit');
    setCreateMeetingType(meetingType);
    if (meetingType === 'midweek') {
      populateMidweekDraftFromMeeting(currentMeeting);
    } else {
      populateWeekendDraftFromMeeting(currentMeeting);
    }
    setShowCreateMeetingModal(true);
  };

  const saveAssignment = async ({
    value,
    memberId,
    secondaryValue,
    tertiaryValue,
  }: {
    value: string;
    memberId?: string | null;
    secondaryValue?: string;
    tertiaryValue?: string;
  }) => {
    if (!editField) return;

    const table = editField.table;
    const rowId = editField.rowId;
    let payload: Record<string, any>;

    if (editField.mode === 'member') {
      payload = { [editField.column]: memberId || null };
    } else if (editField.mode === 'weekend_speaker') {
      payload = {
        talk_speaker_name: value.trim(),
        talk_congregation: serializeWeekendSpeakerCongregation(secondaryValue, tertiaryValue) || null,
      };
    } else {
      payload = { [editField.column]: value };
    }

    const { error } = await supabase
      .from(table)
      .update(payload as any)
      .eq('id', rowId);

    if (error) {
      toast.error(error.message || 'Erro ao salvar designação.');
      return;
    }

    try {
      if (table === 'midweek_meetings') {
        await api.syncMidweekMeetingNotifications(rowId);
      } else if (table === 'weekend_meetings') {
        await api.syncWeekendMeetingNotifications(rowId);
      } else if (table === 'midweek_ministry_parts') {
        await api.syncMidweekMinistryPartNotifications(rowId);
      } else if (table === 'midweek_christian_life_parts') {
        await api.syncMidweekChristianLifePartNotifications(rowId);
      }
    } catch (syncError: any) {
      toast.error(syncError?.message || 'A designação foi salva, mas a notificação não pôde ser sincronizada.');
      return;
    }

    setShowEditModal(false);
    setEditField(null);
    await fetchData();
    toast.success('Designação salva no banco.');
  };

  const handleCreateMeeting = async () => {
    if (createMeetingType === 'midweek') {
      if (!midweekDraft.date || !midweekDraft.bibleReading.trim()) {
        toast.error('Preencha a data e a leitura da Bíblia.');
        return;
      }

      const ministryParts = midweekDraft.ministryParts
        .map(part => ({
          time: part.time.trim(),
          title: part.title.trim(),
          duration: part.duration.trim(),
          studentId: part.studentId,
          assistantId: part.assistantId,
        }))
        .filter(part => part.title || part.duration || part.studentId || part.assistantId);

      const hasInvalidMinistryPart = ministryParts.some(part => !part.time || !part.title || !part.duration);
      if (hasInvalidMinistryPart) {
        toast.error('Cada linha do ministério precisa ter horário, tipo e tempo.');
        return;
      }

      const christianLifeParts = midweekDraft.christianLifeParts
        .map(part => ({
          time: part.time.trim(),
          title: part.title.trim(),
          duration: part.duration.trim(),
          speakerId: part.speakerId,
        }))
        .filter(part => part.title || part.duration || part.speakerId);

      const hasInvalidChristianLifePart = christianLifeParts.some(part => !part.time || !part.title || !part.duration);
      if (hasInvalidChristianLifePart) {
        toast.error('Cada linha de nossa vida cristã precisa ter horário, tema e tempo.');
        return;
      }

      const fixedTimeEntries = [
        { label: 'Cântico inicial', value: midweekDraft.openingSongTime.trim() },
        { label: 'Comentários iniciais', value: midweekDraft.openingCommentsTime.trim() },
        { label: 'Tesouros da Palavra de Deus', value: midweekDraft.treasureTime.trim() },
        { label: 'Joias espirituais', value: midweekDraft.gemsTime.trim() },
        { label: 'Leitura da Bíblia', value: midweekDraft.readingTime.trim() },
        { label: 'Cântico do meio', value: midweekDraft.middleSongTime.trim() },
        { label: 'Estudo bíblico de congregação', value: midweekDraft.cbsTime.trim() },
        { label: 'Comentários finais', value: midweekDraft.closingCommentsTime.trim() },
        { label: 'Cântico final', value: midweekDraft.closingSongTime.trim() },
      ];

      if (fixedTimeEntries.some(entry => !entry.value)) {
        toast.error('Todos os itens visíveis da programação precisam ter horário.');
        return;
      }

      const orderedTimes = [
        fixedTimeEntries[0],
        fixedTimeEntries[1],
        fixedTimeEntries[2],
        fixedTimeEntries[3],
        fixedTimeEntries[4],
        ...ministryParts.map((part, index) => ({ label: `Parte do ministério ${index + 1}`, value: part.time })),
        fixedTimeEntries[5],
        ...christianLifeParts.map((part, index) => ({ label: `Nossa vida cristã ${index + 1}`, value: part.time })),
        fixedTimeEntries[6],
        fixedTimeEntries[7],
        fixedTimeEntries[8],
      ];

      const timeError = getSequentialTimeError(orderedTimes);
      if (timeError) {
        toast.error(timeError);
        return;
      }

      const fixedDurations = [
        { label: 'Comentários iniciais', value: midweekDraft.openingCommentsDuration },
        { label: 'Tesouros da Palavra de Deus', value: midweekDraft.treasureDuration },
        { label: 'Joias espirituais', value: midweekDraft.gemsDuration },
        { label: 'Leitura da Bíblia', value: midweekDraft.readingDuration },
        { label: 'Estudo bíblico de congregação', value: midweekDraft.cbsDuration },
        { label: 'Comentários finais', value: midweekDraft.closingCommentsDuration },
      ];

      const invalidFixedDuration = fixedDurations.find(entry => parseDurationMinutes(entry.value) <= 0);
      if (invalidFixedDuration) {
        toast.error(`${invalidFixedDuration.label} precisa ter uma duração maior que zero.`);
        return;
      }

      try {
        const payload = {
          date: midweekDraft.date,
          bible_reading: midweekDraft.bibleReading.trim(),
          president_id: midweekDraft.presidentId || undefined,
          opening_prayer_id: midweekDraft.openingPrayerId || undefined,
          closing_prayer_id: midweekDraft.closingPrayerId || undefined,
          opening_song: midweekDraft.openingSong ? Number(midweekDraft.openingSong) : null,
          opening_song_time: midweekDraft.openingSongTime.trim(),
          opening_comments_time: midweekDraft.openingCommentsTime.trim(),
          opening_comments_duration: Number(midweekDraft.openingCommentsDuration),
          middle_song: midweekDraft.middleSong ? Number(midweekDraft.middleSong) : null,
          middle_song_time: midweekDraft.middleSongTime.trim(),
          closing_song: midweekDraft.closingSong ? Number(midweekDraft.closingSong) : null,
          closing_song_time: midweekDraft.closingSongTime.trim(),
          treasure_talk_title: midweekDraft.treasureTitle.trim() || undefined,
          treasure_talk_time: midweekDraft.treasureTime.trim(),
          treasure_talk_duration: Number(midweekDraft.treasureDuration),
          treasure_talk_speaker_id: midweekDraft.treasureSpeakerId || undefined,
          treasure_gems_time: midweekDraft.gemsTime.trim(),
          treasure_gems_duration: Number(midweekDraft.gemsDuration),
          treasure_gems_speaker_id: midweekDraft.gemsSpeakerId || undefined,
          treasure_reading_time: midweekDraft.readingTime.trim(),
          treasure_reading_duration: Number(midweekDraft.readingDuration),
          treasure_reading_student_id: midweekDraft.readingStudentId || undefined,
          treasure_reading_room: MIDWEEK_PRIMARY_ROOM,
          cbs_time: midweekDraft.cbsTime.trim(),
          cbs_duration: Number(midweekDraft.cbsDuration),
          cbs_conductor_id: midweekDraft.cbsConductorId || undefined,
          cbs_reader_id: midweekDraft.cbsReaderId || undefined,
          closing_comments_time: midweekDraft.closingCommentsTime.trim(),
          closing_comments_duration: Number(midweekDraft.closingCommentsDuration),
          ministry_parts: ministryParts.map(part => ({
            scheduled_time: part.time,
            title: part.title,
            duration: Number(part.duration),
            student_id: part.studentId || undefined,
            assistant_id: part.assistantId || undefined,
            room: MIDWEEK_PRIMARY_ROOM,
          })),
          christian_life_parts: christianLifeParts.map(part => ({
            scheduled_time: part.time,
            title: part.title,
            duration: Number(part.duration),
            speaker_id: part.speakerId || undefined,
          })),
        };

        const targetMeeting = meetingFormMode === 'edit' ? midweekMeetings[selectedMeetingIdx] : null;
        const savedMeeting = meetingFormMode === 'edit' && targetMeeting
          ? await api.updateMidweekMeeting(targetMeeting.id, payload)
          : await api.createMidweekMeeting(payload);

        setMidweekMeetings(prev =>
          meetingFormMode === 'edit' && targetMeeting
            ? prev.map(item => (item.id === targetMeeting.id ? savedMeeting : item))
            : [savedMeeting, ...prev]
        );
        setMeetingType('midweek');
        setSelectedMeetingIdx(0);
        setShowCreateMeetingModal(false);
        setMidweekDraft(createEmptyMidweekDraft());
        toast.success(meetingFormMode === 'edit' ? 'Reunião de meio de semana atualizada.' : 'Reunião de meio de semana salva no banco.');
      } catch (err: any) {
        toast.error(err.message || 'Erro ao salvar reunião de meio de semana.');
      }
      return;
    }

    if (!weekendDraft.date || !weekendDraft.talkSpeakerName.trim()) {
      toast.error('Preencha a data e o nome do orador.');
      return;
    }

    try {
      const payload = {
        date: weekendDraft.date,
        president_id: weekendDraft.presidentId || undefined,
        closing_prayer_id: weekendDraft.closingPrayerId || undefined,
        talk_theme: weekendDraft.talkTheme.trim() || undefined,
        talk_speaker_name: weekendDraft.talkSpeakerName.trim(),
        talk_congregation: serializeWeekendSpeakerCongregation(
          weekendDraft.talkCongregation,
          weekendDraft.talkCongregationCity,
        ),
        watchtower_conductor_id: weekendDraft.watchtowerConductorId || undefined,
        watchtower_reader_id: weekendDraft.watchtowerReaderId || undefined,
      };

      const targetMeeting = meetingFormMode === 'edit' ? weekendMeetings[selectedMeetingIdx] : null;
      const savedMeeting = meetingFormMode === 'edit' && targetMeeting
        ? await api.updateWeekendMeeting(targetMeeting.id, payload)
        : await api.createWeekendMeeting(payload);

      setWeekendMeetings(prev =>
        meetingFormMode === 'edit' && targetMeeting
          ? prev.map(item => (item.id === targetMeeting.id ? savedMeeting : item))
          : [savedMeeting, ...prev]
      );
      setMeetingType('weekend');
      setSelectedMeetingIdx(0);
      setShowCreateMeetingModal(false);
      setWeekendDraft(createEmptyWeekendDraft());
      toast.success(meetingFormMode === 'edit' ? 'Reunião de fim de semana atualizada.' : 'Reunião de fim de semana salva no banco.');
    } catch (err: any) {
      toast.error(err.message || 'Erro ao salvar reunião de fim de semana.');
    }
  };

  if (loading) return <div className="rounded-xl border border-border bg-card p-8 text-center text-muted-foreground">Carregando designações do banco de dados...</div>;

  return (
    <div className="max-w-5xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-foreground">Designações de Reuniões</h1>
          <p className="text-muted-foreground" style={{ fontSize: '0.85rem' }}>
            Separe e organize as partes das reuniões do meio e do fim de semana em uma página própria.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {canCreateAssignments && (
            <button
              onClick={openCreateMeetingModal}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-primary-foreground transition-colors hover:bg-primary/90"
            >
              <Plus size={16} />
              <span style={{ fontSize: '0.9rem' }}>Nova Reunião</span>
            </button>
          )}
          {canEditAssignments && (
            <button
              onClick={openEditMeetingModal}
              className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2 text-foreground transition-colors hover:bg-muted"
            >
              <BookOpen size={16} />
              <span style={{ fontSize: '0.9rem' }}>Editar Reunião</span>
            </button>
          )}
        </div>
      </div>

      <MeetingsAssignmentsContent
        midweekMeetings={midweekMeetings}
        weekendMeetings={weekendMeetings}
        meetingType={meetingType}
        setMeetingType={setMeetingType}
        selectedMeetingIdx={selectedMeetingIdx}
        setSelectedMeetingIdx={setSelectedMeetingIdx}
        openEdit={openEdit}
        showEditModal={showEditModal}
        editField={editField}
        allMembers={allMembers}
        audioVideoAssignments={audioVideoAssignments}
        canEditAssignments={canEditAssignments}
        onCloseModal={() => setShowEditModal(false)}
        onSaveModal={saveAssignment}
      />

      {canCreateAssignments && showCreateMeetingModal && (
        <CreateMeetingModal
          mode={meetingFormMode}
          meetingType={createMeetingType}
          setMeetingType={setCreateMeetingType}
          members={allMembers}
          midweekDraft={midweekDraft}
          setMidweekDraft={setMidweekDraft}
          weekendDraft={weekendDraft}
          setWeekendDraft={setWeekendDraft}
          audioVideoAssignments={audioVideoAssignments}
          onClose={() => setShowCreateMeetingModal(false)}
          onSave={handleCreateMeeting}
        />
      )}
    </div>
  );
}

function MeetingsAssignmentsContent({
  midweekMeetings,
  weekendMeetings,
  meetingType,
  setMeetingType,
  selectedMeetingIdx,
  setSelectedMeetingIdx,
  openEdit,
  showEditModal,
  editField,
  allMembers,
  audioVideoAssignments,
  canEditAssignments,
  onCloseModal,
  onSaveModal,
}: {
  midweekMeetings: any[];
  weekendMeetings: any[];
  meetingType: 'midweek' | 'weekend';
  setMeetingType: (t: 'midweek' | 'weekend') => void;
  selectedMeetingIdx: number;
  setSelectedMeetingIdx: (i: number) => void;
  openEdit: (field: MeetingEditField) => void;
  showEditModal: boolean;
  editField: MeetingEditField | null;
  allMembers: any[];
  audioVideoAssignments: AudioVideoRestrictionAssignment[];
  canEditAssignments: boolean;
  onCloseModal: () => void;
  onSaveModal: (payload: {
    value: string;
    memberId?: string | null;
    secondaryValue?: string;
    tertiaryValue?: string;
  }) => void;
}) {
  const weekendMaleMembers = allMembers.filter(member => member.gender === 'M');
  const weekendPresidentMembers = weekendMaleMembers.filter(
    member => member.spiritual_status === 'anciao' || member.spiritual_status === 'servo_ministerial',
  );

  const sendWhatsAppDesignation = async (payload: Parameters<typeof sendDesignationWhatsApp>[0]) => {
    const toastId = toast.loading('Enviando WhatsApp...');

    try {
      await sendDesignationWhatsApp(payload);
      toast.success('Designação enviada com sucesso!', { id: toastId });
    } catch (err: any) {
      toast.error(err.message || 'Erro ao enviar WhatsApp.', { id: toastId });
    }
  };

  const renderWhatsAppButton = (payload: Parameters<typeof sendDesignationWhatsApp>[0] | null) => {
    if (!payload?.phone) {
      return null;
    }

    return (
      <div className="flex justify-end pr-3 pt-1">
        <button
          onClick={() => sendWhatsAppDesignation(payload)}
          className="flex items-center gap-1.5 text-[0.8rem] font-medium text-green-600 hover:text-green-700 bg-green-50 hover:bg-green-100 px-3 py-1.5 rounded-lg transition-colors border border-green-100"
        >
          <MessageCircle size={15} />
          Enviar Designação
        </button>
      </div>
    );
  };

  const getEditModalMembers = (field: MeetingEditField | null) => {
    if (!field || field.mode !== 'member' || field.table !== 'weekend_meetings') {
      return allMembers;
    }

    if (field.column === 'president_id') {
      return weekendPresidentMembers;
    }

    if (field.column === 'watchtower_reader_id') {
      const meeting = weekendMeetings.find(item => item.id === field.rowId);
      const unavailableMemberIds = getUnavailableWeekendReaderIds(meeting?.date, audioVideoAssignments);
      return weekendMaleMembers.filter(member => !unavailableMemberIds.has(member.id));
    }

    return weekendMaleMembers;
  };

  if (meetingType === 'midweek') {
    const meeting = midweekMeetings[selectedMeetingIdx];
    if (!meeting) return <div className="p-6 text-center text-gray-500 rounded-xl bg-white border border-gray-100">Não há reuniões de Meio de Semana cadastradas.</div>;

    // Safety fallback properties mapping from Supabase payload
    const mappedTreasureTitle = meeting.treasure_talk_title || 'Nenhum Tema';
    const mappedPresident = meeting.president?.full_name || 'Desconhecido';
    const mappedOpeningPrayer = meeting.opening_prayer?.full_name || 'Desconhecido';
    const mappedClosingPrayer = meeting.closing_prayer?.full_name || 'Desconhecido';

    // Treasures 
    const mappedTalkSpeaker = meeting.treasure_talk_speaker?.full_name || 'Desconhecido';
    const mappedGemsSpeaker = meeting.treasure_gems_speaker?.full_name || 'Desconhecido';
    const mappedReadingStudent = meeting.treasure_reading_student?.full_name || 'Desconhecido';

    // CBS
    const mappedCbsConductor = meeting.cbs_conductor?.full_name || 'Desconhecido';
    const mappedCbsReader = meeting.cbs_reader?.full_name || 'Desconhecido';

    // Parts processing ensuring safely array map
    const ministryParts = meeting.ministry_parts?.sort((a: any, b: any) => a.part_number - b.part_number) || [];
    const lifeParts = meeting.christian_life_parts?.sort((a: any, b: any) => a.part_number - b.part_number) || [];
    const ministryDisplayOffset = 3;
    const lifeDisplayOffset = ministryDisplayOffset + ministryParts.length;
    const cbsDisplayNumber = lifeDisplayOffset + lifeParts.length + 1;

    return (
      <>
        {/* Meeting selector */}
        <div className="bg-white rounded-xl border border-gray-100 p-3 flex flex-col sm:flex-row gap-3">
          <div className="flex gap-1 bg-gray-100 rounded-lg p-1 sm:w-auto">
            <button
              onClick={() => { setMeetingType('midweek'); setSelectedMeetingIdx(0); }}
              className={`px-3 py-1.5 rounded-md transition ${meetingType === 'midweek' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'}`}
              style={{ fontSize: '0.85rem' }}
            >
              Meio de Semana
            </button>
            <button
              onClick={() => { setMeetingType('weekend'); setSelectedMeetingIdx(0); }}
              className={`px-3 py-1.5 rounded-md transition ${(meetingType as string) === 'weekend' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'}`}
              style={{ fontSize: '0.85rem' }}
            >
              Fim de Semana
            </button>
          </div>
          <div className="flex-1">
            <select
              value={selectedMeetingIdx}
              onChange={e => setSelectedMeetingIdx(Number(e.target.value))}
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg"
              style={{ fontSize: '0.9rem' }}
            >
              {midweekMeetings.map((m: any, i: number) => (
                <option key={m.id} value={i}>
                  {new Date(m.date + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' })} — {m.bible_reading || 'Sem Leitura Informada'}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Assignment cards */}
        <div className="space-y-4">
          <AssignmentSection title="Geral" color="bg-gray-700">
            <AssignmentField label="Presidente" value={mappedPresident} onClick={() => openEdit({ label: 'Presidente', mode: 'member', currentValue: mappedPresident, table: 'midweek_meetings', rowId: meeting.id, column: 'president_id' })} canEdit={canEditAssignments} />
            <AssignmentField label="Oração Inicial" value={mappedOpeningPrayer} onClick={() => openEdit({ label: 'Oração Inicial', mode: 'member', currentValue: mappedOpeningPrayer, table: 'midweek_meetings', rowId: meeting.id, column: 'opening_prayer_id' })} canEdit={canEditAssignments} />
            <AssignmentField label="Oração Final" value={mappedClosingPrayer} onClick={() => openEdit({ label: 'Oração Final', mode: 'member', currentValue: mappedClosingPrayer, table: 'midweek_meetings', rowId: meeting.id, column: 'closing_prayer_id' })} canEdit={canEditAssignments} />
          </AssignmentSection>

          <AssignmentSection title="Tesouros da Palavra de Deus" color="bg-[#5b2c2c]">
            <AssignmentField label={`1. ${mappedTreasureTitle}`} value={mappedTalkSpeaker} onClick={() => openEdit({ label: 'Discurso', mode: 'member', currentValue: mappedTalkSpeaker, table: 'midweek_meetings', rowId: meeting.id, column: 'treasure_talk_speaker_id' })} canEdit={canEditAssignments} />
            <AssignmentField label="2. Joias Espirituais" value={mappedGemsSpeaker} onClick={() => openEdit({ label: 'Joias Espirituais', mode: 'member', currentValue: mappedGemsSpeaker, table: 'midweek_meetings', rowId: meeting.id, column: 'treasure_gems_speaker_id' })} canEdit={canEditAssignments} />
            <AssignmentField label="3. Leitura da Bíblia" value={mappedReadingStudent} onClick={() => openEdit({ label: 'Leitura da Bíblia', mode: 'member', currentValue: mappedReadingStudent, table: 'midweek_meetings', rowId: meeting.id, column: 'treasure_reading_student_id' })} canEdit={canEditAssignments} />
            {renderWhatsAppButton(
              meeting.treasure_reading_student?.phone
                ? {
                    studentName: meeting.treasure_reading_student.full_name,
                    date: new Date(meeting.date + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
                    partNumber: 3,
                    location: MIDWEEK_PRIMARY_ROOM,
                    phone: meeting.treasure_reading_student.phone,
                  }
                : null
            )}
          </AssignmentSection>

          <AssignmentSection title="Faça Seu Melhor no Ministério" color="bg-[#c4972a]">
            {ministryParts.length === 0 && <div className="p-3 text-sm text-gray-500">Nenhuma parte cadastrada no banco.</div>}
            {ministryParts.map((part: any, idx: number) => (
              <div key={idx} className="space-y-1 relative pb-2 mb-2 border-b border-gray-50 last:border-0 last:pb-0 last:mb-0">
                {(() => {
                  const displayNumber = ministryDisplayOffset + idx + 1;

                  return (
                    <>
                <AssignmentField
                  label={`${displayNumber}. ${part.title} (${part.duration} min) — Estudante`}
                  value={part.student?.full_name || 'Desconhecido'}
                  onClick={() => openEdit({ label: `Parte ${displayNumber} Estudante`, mode: 'member', currentValue: part.student?.full_name || '', table: 'midweek_ministry_parts', rowId: part.id, column: 'student_id' })}
                  canEdit={canEditAssignments}
                />
                {part.assistant_id && (
                  <AssignmentField
                    label={`${displayNumber}. ${part.title} — Ajudante`}
                    value={part.assistant?.full_name || 'Desconhecido'}
                    onClick={() => openEdit({ label: `Parte ${displayNumber} Ajudante`, mode: 'member', currentValue: part.assistant?.full_name || '', table: 'midweek_ministry_parts', rowId: part.id, column: 'assistant_id' })}
                    indent
                    canEdit={canEditAssignments}
                  />
                )}
                {renderWhatsAppButton(
                  part.student?.phone
                    ? {
                        studentName: part.student.full_name,
                        assistantName: part.assistant?.full_name,
                        date: new Date(meeting.date + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
                        partNumber: displayNumber,
                        location: part.room || MIDWEEK_PRIMARY_ROOM,
                        phone: part.student.phone,
                      }
                    : null
                )}
                    </>
                  );
                })()}
              </div>
            ))}
          </AssignmentSection>

          <AssignmentSection title="Nossa Vida Cristã" color="bg-[#5b2c2c]">
            {lifeParts.length === 0 && <div className="p-3 text-sm text-gray-500">Nenhuma parte cadastrada no banco.</div>}
            {lifeParts.map((part: any, idx: number) => (
              (() => {
                const displayNumber = lifeDisplayOffset + idx + 1;

                return (
                  <AssignmentField
                    key={idx}
                    label={`${displayNumber}. ${part.title} (${part.duration} min)`}
                    value={part.speaker?.full_name || 'Desconhecido'}
                    onClick={() => openEdit({ label: `Parte ${displayNumber}`, mode: 'member', currentValue: part.speaker?.full_name || '', table: 'midweek_christian_life_parts', rowId: part.id, column: 'speaker_id' })}
                    canEdit={canEditAssignments}
                  />
                );
              })()
            ))}
            <AssignmentField
              label={`${cbsDisplayNumber}. Estudo Bíblico — Dirigente`}
              value={mappedCbsConductor}
              onClick={() => openEdit({ label: 'Dirigente EBC', mode: 'member', currentValue: mappedCbsConductor, table: 'midweek_meetings', rowId: meeting.id, column: 'cbs_conductor_id' })}
              canEdit={canEditAssignments}
            />
            <AssignmentField
              label={`${cbsDisplayNumber}. Estudo Bíblico — Leitor`}
              value={mappedCbsReader}
              onClick={() => openEdit({ label: 'Leitor EBC', mode: 'member', currentValue: mappedCbsReader, table: 'midweek_meetings', rowId: meeting.id, column: 'cbs_reader_id' })}
              canEdit={canEditAssignments}
            />
          </AssignmentSection>
        </div>

        {canEditAssignments && showEditModal && editField && (
          <EditModal
            field={editField}
            members={allMembers}
            onClose={onCloseModal}
            onSave={onSaveModal}
          />
        )}
      </>
    );
  }

  // Weekend view
  const meeting = weekendMeetings[selectedMeetingIdx];
  if (!meeting) return <div className="p-6 text-center text-gray-500 rounded-xl bg-white border border-gray-100">Não há reuniões de Fim de Semana cadastradas.</div>;
  const talkCongregationLabel = formatWeekendSpeakerCongregation(meeting.talk_congregation);
  const talkSpeakerLabel = talkCongregationLabel
    ? `${meeting.talk_speaker_name || 'Desconhecido'} (${talkCongregationLabel})`
    : (meeting.talk_speaker_name || 'Desconhecido');

  return (
    <>
      <div className="bg-white rounded-xl border border-gray-100 p-3 flex flex-col sm:flex-row gap-3">
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1 sm:w-auto">
          <button
            onClick={() => { setMeetingType('midweek'); setSelectedMeetingIdx(0); }}
            className={`px-3 py-1.5 rounded-md transition ${(meetingType as string) === 'midweek' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'}`}
            style={{ fontSize: '0.85rem' }}
          >
            Meio de Semana
          </button>
          <button
            onClick={() => { setMeetingType('weekend'); setSelectedMeetingIdx(0); }}
            className={`px-3 py-1.5 rounded-md transition ${meetingType === 'weekend' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'}`}
            style={{ fontSize: '0.85rem' }}
          >
            Fim de Semana
          </button>
        </div>
        <div className="flex-1">
          <select
            value={selectedMeetingIdx}
            onChange={e => setSelectedMeetingIdx(Number(e.target.value))}
            className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg"
            style={{ fontSize: '0.9rem' }}
          >
            {weekendMeetings.map((m: any, i: number) => (
              <option key={m.id} value={i}>
                {new Date(m.date + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' })} — {m.talk_theme || 'Reunião Pública'}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="space-y-4">
        <AssignmentSection title="Conferência Pública" color="bg-[#1a5fb4]">
          <AssignmentField label="Presidente" value={meeting.president?.full_name || 'Desconhecido'} onClick={() => openEdit({ label: 'Presidente', mode: 'member', currentValue: meeting.president?.full_name || '', table: 'weekend_meetings', rowId: meeting.id, column: 'president_id' })} canEdit={canEditAssignments} />
          {renderWhatsAppButton(
            meeting.president?.phone
              ? {
                  studentName: meeting.president.full_name,
                  date: new Date(meeting.date + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
                  partNumber: 'Presidente',
                  assignmentLabel: 'Designação',
                  meetingTitle: 'DESIGNAÇÃO PARA A REUNIÃO DE FIM DE SEMANA',
                  location: MIDWEEK_PRIMARY_ROOM,
                  phone: meeting.president.phone,
                }
              : null
          )}
          <AssignmentField label="Tema" value={meeting.talk_theme || 'Não definido'} onClick={() => openEdit({ label: 'Tema', mode: 'text', currentValue: meeting.talk_theme || '', table: 'weekend_meetings', rowId: meeting.id, column: 'talk_theme' })} canEdit={canEditAssignments} />
          <AssignmentField
            label="Orador"
            value={talkSpeakerLabel}
            onClick={() => {
              const talkCongregation = parseWeekendSpeakerCongregation(meeting.talk_congregation);
              openEdit({
                label: 'Orador',
                mode: 'weekend_speaker',
                currentValue: meeting.talk_speaker_name || '',
                secondaryValue: talkCongregation.congregation,
                tertiaryValue: talkCongregation.city,
                table: 'weekend_meetings',
                rowId: meeting.id,
                column: 'talk_speaker_name',
              });
            }}
            canEdit={canEditAssignments}
          />
        </AssignmentSection>

        <AssignmentSection title="Estudo de A Sentinela" color="bg-[#1a5fb4]">
          <AssignmentField label="Dirigente" value={meeting.watchtower_conductor?.full_name || 'Desconhecido'} onClick={() => openEdit({ label: 'Dirigente', mode: 'member', currentValue: meeting.watchtower_conductor?.full_name || '', table: 'weekend_meetings', rowId: meeting.id, column: 'watchtower_conductor_id' })} canEdit={canEditAssignments} />
          <AssignmentField label="Leitor" value={meeting.watchtower_reader?.full_name || 'Desconhecido'} onClick={() => openEdit({ label: 'Leitor', mode: 'member', currentValue: meeting.watchtower_reader?.full_name || '', table: 'weekend_meetings', rowId: meeting.id, column: 'watchtower_reader_id' })} canEdit={canEditAssignments} />
          {renderWhatsAppButton(
            meeting.watchtower_reader?.phone
              ? {
                  studentName: meeting.watchtower_reader.full_name,
                  date: new Date(meeting.date + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
                  partNumber: 'Leitor da Sentinela',
                  assignmentLabel: 'Designação',
                  meetingTitle: 'DESIGNAÇÃO PARA A REUNIÃO DE FIM DE SEMANA',
                  location: MIDWEEK_PRIMARY_ROOM,
                  phone: meeting.watchtower_reader.phone,
                }
              : null
          )}
        </AssignmentSection>

        <AssignmentSection title="Encerramento" color="bg-gray-700">
          <AssignmentField label="Oração Final" value={meeting.closing_prayer?.full_name || 'Desconhecido'} onClick={() => openEdit({ label: 'Oração Final', mode: 'member', currentValue: meeting.closing_prayer?.full_name || '', table: 'weekend_meetings', rowId: meeting.id, column: 'closing_prayer_id' })} canEdit={canEditAssignments} />
        </AssignmentSection>
      </div>

      {canEditAssignments && showEditModal && editField && (
        <EditModal
          field={editField}
          members={getEditModalMembers(editField)}
          onClose={onCloseModal}
          onSave={onSaveModal}
        />
      )}
    </>
  );
}

function AssignmentSection({ title, color, children }: { title: string; color: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
      <div className={`${color} px-4 py-2`}>
        <h4 className="text-white tracking-wide" style={{ fontSize: '0.85rem' }}>{title}</h4>
      </div>
      <div className="divide-y divide-gray-200 p-1">
        {children}
      </div>
    </div>
  );
}

function AssignmentField({
  label,
  value,
  onClick,
  canEdit = true,
  indent = false,
}: {
  label: string;
  value: string;
  onClick: () => void;
  canEdit?: boolean;
  indent?: boolean;
}) {
  if (!canEdit) {
    return (
      <div
        className={`w-full flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 px-3 py-2.5 rounded-lg text-left ${indent ? 'pl-8' : ''}`}
      >
        <span className="text-gray-500 flex-1" style={{ fontSize: '0.85rem' }}>{label}</span>
        <span className="text-gray-900 flex items-center gap-1" style={{ fontSize: '0.85rem' }}>
          {value}
        </span>
      </div>
    );
  }

  return (
    <button
      onClick={onClick}
      className={`w-full flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-50 transition-colors text-left ${indent ? 'pl-8' : ''}`}
    >
      <span className="text-gray-500 flex-1" style={{ fontSize: '0.85rem' }}>{label}</span>
      <span className="text-gray-900 flex items-center gap-1" style={{ fontSize: '0.85rem' }}>
        {value}
        <ChevronDown size={12} className="text-gray-400" />
      </span>
    </button>
  );
}

function EditModal({
  field,
  members,
  onClose,
  onSave,
}: {
  field: MeetingEditField;
  members: any[];
  onClose: () => void;
  onSave: (payload: {
    value: string;
    memberId?: string | null;
    secondaryValue?: string;
    tertiaryValue?: string;
  }) => void;
}) {
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(field.currentValue);
  const [secondaryValue, setSecondaryValue] = useState(field.secondaryValue || '');
  const [tertiaryValue, setTertiaryValue] = useState(field.tertiaryValue || '');
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(() => {
    const currentMember = members.find(m => m.full_name === field.currentValue);
    return currentMember?.id || null;
  });

  const filtered = members.filter(m =>
    m.full_name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="fixed inset-0 bg-[#082c45]/40 backdrop-blur-sm z-50 flex items-center justify-center p-5 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] flex flex-col shadow-2xl animate-in zoom-in-95 duration-200 overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between shrink-0">
          <div>
            <h3 className="text-gray-900">Editar Designação</h3>
            <p className="text-gray-500 mt-0.5" style={{ fontSize: '0.8rem' }}>{field.label}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>

        {field.mode === 'member' ? (
          <>
            <div className="p-3 border-b border-gray-100 shrink-0">
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Buscar membro..."
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                style={{ fontSize: '0.9rem' }}
                autoFocus
              />
            </div>

            <div className="flex-1 overflow-y-auto p-2">
              {filtered.map(m => (
                <button
                  key={m.id}
                  onClick={() => {
                    setSelected(m.full_name);
                    setSelectedMemberId(m.id);
                  }}
                  className={`w-full text-left px-3 py-2.5 rounded-lg transition-colors ${selected === m.full_name ? 'bg-blue-50 text-blue-700' : 'hover:bg-gray-50 text-gray-700'
                    }`}
                  style={{ fontSize: '0.9rem' }}
                >
                  {m.full_name}
                </button>
              ))}
            </div>
          </>
        ) : field.mode === 'weekend_speaker' ? (
          <div className="flex-1 space-y-4 p-4">
            <div>
              <label className="mb-1 block text-gray-500" style={{ fontSize: '0.8rem' }}>Nome completo do Orador</label>
              <input
                type="text"
                value={selected}
                onChange={e => setSelected(e.target.value)}
                className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                style={{ fontSize: '0.9rem' }}
                autoFocus
              />
            </div>
            <div>
              <label className="mb-1 block text-gray-500" style={{ fontSize: '0.8rem' }}>Nome da Congregação</label>
              <input
                type="text"
                value={secondaryValue}
                onChange={e => setSecondaryValue(e.target.value)}
                className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                style={{ fontSize: '0.9rem' }}
              />
            </div>
            <div>
              <label className="mb-1 block text-gray-500" style={{ fontSize: '0.8rem' }}>Cidade da Congregação</label>
              <input
                type="text"
                value={tertiaryValue}
                onChange={e => setTertiaryValue(e.target.value)}
                className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                style={{ fontSize: '0.9rem' }}
              />
            </div>
          </div>
        ) : (
          <div className="flex-1 p-4">
            <label className="mb-1 block text-gray-500" style={{ fontSize: '0.8rem' }}>Valor</label>
            <input
              type="text"
              value={selected}
              onChange={e => setSelected(e.target.value)}
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              style={{ fontSize: '0.9rem' }}
              autoFocus
            />
          </div>
        )}

        <div className="p-3 border-t border-gray-100 flex gap-3 justify-end shrink-0">
          <button onClick={onClose} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition" style={{ fontSize: '0.9rem' }}>
            Cancelar
          </button>
          <button
            onClick={() => onSave({
              value: selected,
              memberId: field.mode === 'member' ? selectedMemberId : undefined,
              secondaryValue: field.mode === 'weekend_speaker' ? secondaryValue : undefined,
              tertiaryValue: field.mode === 'weekend_speaker' ? tertiaryValue : undefined,
            })}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition shadow-md shadow-primary/10"
            style={{ fontSize: '0.9rem' }}
          >
            Confirmar
          </button>
        </div>
      </div>
    </div>
  );
}

function CreateMeetingModal({
  mode,
  meetingType,
  setMeetingType,
  members,
  midweekDraft,
  setMidweekDraft,
  weekendDraft,
  setWeekendDraft,
  audioVideoAssignments,
  onClose,
  onSave,
}: {
  mode: MeetingFormMode;
  meetingType: 'midweek' | 'weekend';
  setMeetingType: (type: 'midweek' | 'weekend') => void;
  members: any[];
  midweekDraft: MidweekDraft;
  setMidweekDraft: React.Dispatch<React.SetStateAction<MidweekDraft>>;
  weekendDraft: WeekendDraft;
  setWeekendDraft: React.Dispatch<React.SetStateAction<WeekendDraft>>;
  audioVideoAssignments: AudioVideoRestrictionAssignment[];
  onClose: () => void;
  onSave: () => void;
}) {
  const memberOptions = members.map((member: any) => ({
    id: member.id,
    name: member.full_name,
    gender: member.gender,
    spiritualStatus: member.spiritual_status,
  }));
  const weekendMaleMemberOptions = memberOptions.filter(option => option.gender === 'M');
  const weekendPresidentOptions = weekendMaleMemberOptions.filter(
    option => option.spiritualStatus === 'anciao' || option.spiritualStatus === 'servo_ministerial',
  );
  const unavailableWeekendReaderIds = getUnavailableWeekendReaderIds(weekendDraft.date, audioVideoAssignments);
  const weekendReaderOptions = weekendMaleMemberOptions.filter(
    option => !unavailableWeekendReaderIds.has(option.id),
  );

  const renderMemberSelect = (
    value: string,
    onChange: (value: string) => void,
    label: string,
    options = memberOptions,
  ) => (
    <div>
      <label className="mb-1 block text-muted-foreground" style={{ fontSize: '0.8rem' }}>{label}</label>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full rounded-lg border border-border bg-card px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
        style={{ fontSize: '0.9rem' }}
      >
        <option value="">Selecione...</option>
        {options.map(option => (
          <option key={option.id} value={option.id}>{option.name}</option>
        ))}
      </select>
    </div>
  );

  const renderTimeField = (
    label: string,
    value: string,
    onChange: (value: string) => void,
  ) => (
    <div>
      <label className="mb-1 block text-muted-foreground" style={{ fontSize: '0.8rem' }}>{label}</label>
      <input
        type="time"
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full rounded-lg border border-border bg-card px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
      />
    </div>
  );

  const renderDurationField = (
    label: string,
    value: string,
    onChange: (value: string) => void,
  ) => (
    <div>
      <label className="mb-1 block text-muted-foreground" style={{ fontSize: '0.8rem' }}>{label}</label>
      <input
        type="number"
        min="1"
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full rounded-lg border border-border bg-card px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
      />
    </div>
  );

  const updateMinistryPart = (
    index: number,
    field: keyof MidweekDraft['ministryParts'][number],
    value: string,
  ) => {
    setMidweekDraft(prev => ({
      ...prev,
      ministryParts: prev.ministryParts.map((part, partIndex) =>
        partIndex === index ? { ...part, [field]: value } : part
      ),
    }));
  };

  const updateMinistryPartType = (index: number, value: string) => {
    setMidweekDraft(prev => ({
      ...prev,
      ministryParts: prev.ministryParts.map((part, partIndex) =>
        partIndex === index
          ? {
            ...part,
            title: value,
            assistantId: value === 'Discurso' ? '' : part.assistantId,
          }
          : part
      ),
    }));
  };

  const addMinistryPart = () => {
    const lastPart = midweekDraft.ministryParts[midweekDraft.ministryParts.length - 1];
    const nextTime = lastPart && isValidTimeValue(lastPart.time)
      ? addMinutesToTime(lastPart.time, parseDurationMinutes(lastPart.duration) + 1)
      : '20:00';

    setMidweekDraft(prev => ({
      ...prev,
      ministryParts: [...prev.ministryParts, createEmptyMinistryPartDraft(nextTime)],
    }));
  };

  const removeMinistryPart = (index: number) => {
    setMidweekDraft(prev => ({
      ...prev,
      ministryParts: prev.ministryParts.length === 1
        ? [createEmptyMinistryPartDraft()]
        : prev.ministryParts.filter((_, partIndex) => partIndex !== index),
    }));
  };

  const updateChristianLifePart = (
    index: number,
    field: keyof MidweekDraft['christianLifeParts'][number],
    value: string,
  ) => {
    setMidweekDraft(prev => ({
      ...prev,
      christianLifeParts: prev.christianLifeParts.map((part, partIndex) =>
        partIndex === index ? { ...part, [field]: value } : part
      ),
    }));
  };

  const addChristianLifePart = () => {
    const baseTime = isValidTimeValue(midweekDraft.middleSongTime)
      ? addMinutesToTime(midweekDraft.middleSongTime, 4)
      : '20:20';
    const lastPart = midweekDraft.christianLifeParts[midweekDraft.christianLifeParts.length - 1];
    const nextTime = lastPart && isValidTimeValue(lastPart.time)
      ? addMinutesToTime(lastPart.time, parseDurationMinutes(lastPart.duration))
      : baseTime;

    setMidweekDraft(prev => ({
      ...prev,
      christianLifeParts: [...prev.christianLifeParts, createEmptyChristianLifePartDraft(nextTime)],
    }));
  };

  const removeChristianLifePart = (index: number) => {
    setMidweekDraft(prev => ({
      ...prev,
      christianLifeParts: prev.christianLifeParts.length === 1
        ? [createEmptyChristianLifePartDraft()]
        : prev.christianLifeParts.filter((_, partIndex) => partIndex !== index),
    }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-5 animate-in fade-in duration-200">
      <div className="max-h-[90vh] w-full max-w-3xl overflow-hidden rounded-2xl border border-border bg-card shadow-2xl animate-in zoom-in-95 duration-200">
        <div className="flex items-start justify-between border-b border-border px-5 py-4">
          <div>
            <h3 className="text-foreground">{mode === 'edit' ? 'Editar Reunião' : 'Nova Reunião'}</h3>
            <p className="mt-1 text-muted-foreground" style={{ fontSize: '0.85rem' }}>
              {meetingType === 'midweek'
                ? 'Monte a estrutura base da reunião de meio de semana.'
                : 'Cadastre a estrutura base da reunião de fim de semana.'}
            </p>
          </div>
          <button onClick={onClose} className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
            <X size={18} />
          </button>
        </div>

        <div className="max-h-[calc(90vh-140px)] overflow-y-auto px-5 py-4">
          <div className="mb-4 rounded-xl border border-border bg-muted p-1">
            <div className="flex gap-1">
              <button
                onClick={() => setMeetingType('midweek')}
                className={`flex-1 rounded-lg px-3 py-2 transition-colors ${meetingType === 'midweek'
                  ? 'bg-card text-primary shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
                  }`}
                style={{ fontSize: '0.85rem' }}
              >
                Meio de Semana
              </button>
              <button
                onClick={() => setMeetingType('weekend')}
                className={`flex-1 rounded-lg px-3 py-2 transition-colors ${meetingType === 'weekend'
                  ? 'bg-card text-primary shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
                  }`}
                style={{ fontSize: '0.85rem' }}
              >
                Final de Semana
              </button>
            </div>
          </div>

          {meetingType === 'midweek' ? (
            <div className="space-y-4">
              <div className="rounded-xl border border-border bg-muted/30 p-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-muted-foreground" style={{ fontSize: '0.8rem' }}>Data</label>
                    <input
                      type="date"
                      value={midweekDraft.date}
                      onChange={e => setMidweekDraft(prev => ({ ...prev, date: e.target.value }))}
                      className="w-full rounded-lg border border-border bg-card px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-muted-foreground" style={{ fontSize: '0.8rem' }}>Leitura da Bíblia</label>
                    <input
                      type="text"
                      value={midweekDraft.bibleReading}
                      onChange={e => setMidweekDraft(prev => ({ ...prev, bibleReading: e.target.value }))}
                      placeholder="Ex.: Isaías 38-40"
                      className="w-full rounded-lg border border-border bg-card px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  {renderMemberSelect(midweekDraft.presidentId, value => setMidweekDraft(prev => ({ ...prev, presidentId: value })), 'Presidente')}
                  {renderMemberSelect(midweekDraft.openingPrayerId, value => setMidweekDraft(prev => ({ ...prev, openingPrayerId: value })), 'Oração Inicial')}
                  {renderMemberSelect(midweekDraft.closingPrayerId, value => setMidweekDraft(prev => ({ ...prev, closingPrayerId: value })), 'Oração Final')}
                  <div className="md:col-span-2 rounded-lg border border-border bg-card px-3 py-2 text-muted-foreground" style={{ fontSize: '0.85rem' }}>
                    Sala única desta programação: <span className="text-foreground">{MIDWEEK_PRIMARY_ROOM}</span>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-border bg-card p-4">
                <h4 className="mb-3 text-foreground" style={{ fontSize: '0.9rem' }}>Abertura</h4>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-muted-foreground" style={{ fontSize: '0.8rem' }}>Cântico Inicial</label>
                    <input
                      type="number"
                      value={midweekDraft.openingSong}
                      onChange={e => setMidweekDraft(prev => ({ ...prev, openingSong: e.target.value }))}
                      className="w-full rounded-lg border border-border bg-card px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  {renderTimeField('Horário do cântico inicial', midweekDraft.openingSongTime, value => setMidweekDraft(prev => ({ ...prev, openingSongTime: value })))}
                  {renderDurationField('Comentários iniciais (min)', midweekDraft.openingCommentsDuration, value => setMidweekDraft(prev => ({ ...prev, openingCommentsDuration: value })))}
                  {renderTimeField('Horário dos comentários iniciais', midweekDraft.openingCommentsTime, value => setMidweekDraft(prev => ({ ...prev, openingCommentsTime: value })))}
                </div>
              </div>

              <div className="rounded-xl border border-border bg-card p-4">
                <h4 className="mb-3 text-foreground" style={{ fontSize: '0.9rem' }}>Tesouros da Palavra de Deus</h4>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="md:col-span-2">
                    <label className="mb-1 block text-muted-foreground" style={{ fontSize: '0.8rem' }}>Tema de Tesouros</label>
                    <input
                      type="text"
                      value={midweekDraft.treasureTitle}
                      onChange={e => setMidweekDraft(prev => ({ ...prev, treasureTitle: e.target.value }))}
                      placeholder="Tema principal"
                      className="w-full rounded-lg border border-border bg-card px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  {renderTimeField('Horário do discurso', midweekDraft.treasureTime, value => setMidweekDraft(prev => ({ ...prev, treasureTime: value })))}
                  {renderDurationField('Duração do discurso (min)', midweekDraft.treasureDuration, value => setMidweekDraft(prev => ({ ...prev, treasureDuration: value })))}
                  {renderMemberSelect(midweekDraft.treasureSpeakerId, value => setMidweekDraft(prev => ({ ...prev, treasureSpeakerId: value })), 'Discurso de Tesouros')}
                  <div />
                  {renderTimeField('Horário de joias espirituais', midweekDraft.gemsTime, value => setMidweekDraft(prev => ({ ...prev, gemsTime: value })))}
                  {renderDurationField('Duração de joias (min)', midweekDraft.gemsDuration, value => setMidweekDraft(prev => ({ ...prev, gemsDuration: value })))}
                  {renderMemberSelect(midweekDraft.gemsSpeakerId, value => setMidweekDraft(prev => ({ ...prev, gemsSpeakerId: value })), 'Joias Espirituais')}
                  <div />
                  {renderTimeField('Horário da leitura', midweekDraft.readingTime, value => setMidweekDraft(prev => ({ ...prev, readingTime: value })))}
                  {renderDurationField('Duração da leitura (min)', midweekDraft.readingDuration, value => setMidweekDraft(prev => ({ ...prev, readingDuration: value })))}
                  {renderMemberSelect(midweekDraft.readingStudentId, value => setMidweekDraft(prev => ({ ...prev, readingStudentId: value })), 'Leitura da Bíblia')}
                </div>
              </div>

              <div className="rounded-xl border border-border bg-muted/40 p-4">
                <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h4 className="text-foreground" style={{ fontSize: '0.9rem' }}>Faça Seu Melhor no Ministério</h4>
                    <p className="text-muted-foreground" style={{ fontSize: '0.8rem' }}>
                      Cada linha precisa ter horário, tipo, tempo e pode ter até dois participantes.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={addMinistryPart}
                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-3 py-2 text-primary-foreground transition-colors hover:bg-primary/90"
                    style={{ fontSize: '0.85rem' }}
                  >
                    <Plus size={14} />
                    Adicionar linha
                  </button>
                </div>

                <div className="space-y-3">
                  {midweekDraft.ministryParts.map((part, index) => (
                    <div key={index} className="rounded-xl border border-border bg-card p-3">
                      <div className="mb-3 flex items-center justify-between">
                        <span className="text-foreground" style={{ fontSize: '0.85rem' }}>
                          Linha {index + 1}
                        </span>
                        <button
                          type="button"
                          onClick={() => removeMinistryPart(index)}
                          className="rounded-md px-2 py-1 text-red-600 transition-colors hover:bg-red-50"
                          style={{ fontSize: '0.75rem' }}
                        >
                          Excluir
                        </button>
                      </div>

                      <div className="grid gap-3 md:grid-cols-2">
                        {renderTimeField('Horário', part.time, value => updateMinistryPart(index, 'time', value))}
                        {renderDurationField('Tempo (min)', part.duration, value => updateMinistryPart(index, 'duration', value))}
                        <div className="md:col-span-2">
                          <label className="mb-1 block text-muted-foreground" style={{ fontSize: '0.8rem' }}>Tipo</label>
                          <select
                            value={part.title}
                            onChange={e => updateMinistryPartType(index, e.target.value)}
                            className="w-full rounded-lg border border-border bg-card px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                          >
                            <option value="">Selecione...</option>
                            {part.title && !MINISTRY_PART_TYPES.includes(part.title as typeof MINISTRY_PART_TYPES[number]) ? (
                              <option value={part.title}>{part.title}</option>
                            ) : null}
                            {MINISTRY_PART_TYPES.map(option => (
                              <option key={option} value={option}>{option}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="mb-1 block text-muted-foreground" style={{ fontSize: '0.8rem' }}>Participante 1</label>
                          <select
                            value={part.studentId}
                            onChange={e => updateMinistryPart(index, 'studentId', e.target.value)}
                            className="w-full rounded-lg border border-border bg-card px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                          >
                            <option value="">Selecione...</option>
                            {memberOptions.map(option => (
                              <option key={`student-${index}-${option.id}`} value={option.id}>{option.name}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="mb-1 block text-muted-foreground" style={{ fontSize: '0.8rem' }}>
                            {part.title === 'Discurso' ? 'Participante 2 (não usado)' : 'Participante 2 (opcional)'}
                          </label>
                          <select
                            value={part.assistantId}
                            onChange={e => updateMinistryPart(index, 'assistantId', e.target.value)}
                            disabled={part.title === 'Discurso'}
                            className="w-full rounded-lg border border-border bg-card px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                          >
                            <option value="">Selecione...</option>
                            {memberOptions.map(option => (
                              <option key={`assistant-${index}-${option.id}`} value={option.id}>{option.name}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-xl border border-border bg-card p-4">
                <div className="mb-3 grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-muted-foreground" style={{ fontSize: '0.8rem' }}>Cântico do Meio</label>
                    <input
                      type="number"
                      value={midweekDraft.middleSong}
                      onChange={e => setMidweekDraft(prev => ({ ...prev, middleSong: e.target.value }))}
                      className="w-full rounded-lg border border-border bg-card px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  {renderTimeField('Horário do cântico do meio', midweekDraft.middleSongTime, value => setMidweekDraft(prev => ({ ...prev, middleSongTime: value })))}
                </div>

                <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h4 className="text-foreground" style={{ fontSize: '0.9rem' }}>Nossa Vida Cristã</h4>
                    <p className="text-muted-foreground" style={{ fontSize: '0.8rem' }}>
                      As linhas desta seção também são dinâmicas e entram antes do estudo bíblico.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={addChristianLifePart}
                    className="inline-flex items-center justify-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-foreground transition-colors hover:bg-muted"
                    style={{ fontSize: '0.85rem' }}
                  >
                    <Plus size={14} />
                    Adicionar linha
                  </button>
                </div>

                <div className="space-y-3">
                  {midweekDraft.christianLifeParts.map((part, index) => (
                    <div key={index} className="rounded-xl border border-border bg-muted/20 p-3">
                      <div className="mb-3 flex items-center justify-between">
                        <span className="text-foreground" style={{ fontSize: '0.85rem' }}>
                          Parte {index + 1}
                        </span>
                        <button
                          type="button"
                          onClick={() => removeChristianLifePart(index)}
                          className="rounded-md px-2 py-1 text-red-600 transition-colors hover:bg-red-50"
                          style={{ fontSize: '0.75rem' }}
                        >
                          Excluir
                        </button>
                      </div>

                      <div className="grid gap-3 md:grid-cols-2">
                        {renderTimeField('Horário', part.time, value => updateChristianLifePart(index, 'time', value))}
                        {renderDurationField('Tempo (min)', part.duration, value => updateChristianLifePart(index, 'duration', value))}
                        <div className="md:col-span-2">
                          <label className="mb-1 block text-muted-foreground" style={{ fontSize: '0.8rem' }}>Tema</label>
                          <input
                            type="text"
                            value={part.title}
                            onChange={e => updateChristianLifePart(index, 'title', e.target.value)}
                            placeholder="Ex.: Relatório anual de serviço"
                            className="w-full rounded-lg border border-border bg-card px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                          />
                        </div>
                        {renderMemberSelect(part.speakerId, value => updateChristianLifePart(index, 'speakerId', value), 'Designado')}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  {renderTimeField('Horário do estudo bíblico', midweekDraft.cbsTime, value => setMidweekDraft(prev => ({ ...prev, cbsTime: value })))}
                  {renderDurationField('Duração do estudo bíblico (min)', midweekDraft.cbsDuration, value => setMidweekDraft(prev => ({ ...prev, cbsDuration: value })))}
                  {renderMemberSelect(midweekDraft.cbsConductorId, value => setMidweekDraft(prev => ({ ...prev, cbsConductorId: value })), 'Dirigente do EBC')}
                  {renderMemberSelect(midweekDraft.cbsReaderId, value => setMidweekDraft(prev => ({ ...prev, cbsReaderId: value })), 'Leitor do EBC')}
                  {renderTimeField('Horário dos comentários finais', midweekDraft.closingCommentsTime, value => setMidweekDraft(prev => ({ ...prev, closingCommentsTime: value })))}
                  {renderDurationField('Comentários finais (min)', midweekDraft.closingCommentsDuration, value => setMidweekDraft(prev => ({ ...prev, closingCommentsDuration: value })))}
                  <div>
                    <label className="mb-1 block text-muted-foreground" style={{ fontSize: '0.8rem' }}>Cântico Final</label>
                    <input
                      type="number"
                      value={midweekDraft.closingSong}
                      onChange={e => setMidweekDraft(prev => ({ ...prev, closingSong: e.target.value }))}
                      className="w-full rounded-lg border border-border bg-card px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  {renderTimeField('Horário do cântico final', midweekDraft.closingSongTime, value => setMidweekDraft(prev => ({ ...prev, closingSongTime: value })))}
                </div>
              </div>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-muted-foreground" style={{ fontSize: '0.8rem' }}>Data</label>
                <input
                  type="date"
                  value={weekendDraft.date}
                  onChange={e => setWeekendDraft(prev => ({ ...prev, date: e.target.value }))}
                  className="w-full rounded-lg border border-border bg-card px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              {renderMemberSelect(
                weekendDraft.presidentId,
                value => setWeekendDraft(prev => ({ ...prev, presidentId: value })),
                'Presidente',
                weekendPresidentOptions,
              )}
              <div className="md:col-span-2">
                <label className="mb-1 block text-muted-foreground" style={{ fontSize: '0.8rem' }}>Tema da Conferência</label>
                <input
                  type="text"
                  value={weekendDraft.talkTheme}
                  onChange={e => setWeekendDraft(prev => ({ ...prev, talkTheme: e.target.value }))}
                  className="w-full rounded-lg border border-border bg-card px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="mb-1 block text-muted-foreground" style={{ fontSize: '0.8rem' }}>Nome completo do Orador</label>
                <input
                  type="text"
                  value={weekendDraft.talkSpeakerName}
                  onChange={e => setWeekendDraft(prev => ({ ...prev, talkSpeakerName: e.target.value }))}
                  className="w-full rounded-lg border border-border bg-card px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="mb-1 block text-muted-foreground" style={{ fontSize: '0.8rem' }}>Nome da Congregação</label>
                <input
                  type="text"
                  value={weekendDraft.talkCongregation}
                  onChange={e => setWeekendDraft(prev => ({ ...prev, talkCongregation: e.target.value }))}
                  className="w-full rounded-lg border border-border bg-card px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="mb-1 block text-muted-foreground" style={{ fontSize: '0.8rem' }}>Cidade da Congregação</label>
                <input
                  type="text"
                  value={weekendDraft.talkCongregationCity}
                  onChange={e => setWeekendDraft(prev => ({ ...prev, talkCongregationCity: e.target.value }))}
                  className="w-full rounded-lg border border-border bg-card px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div />
              {renderMemberSelect(
                weekendDraft.watchtowerConductorId,
                value => setWeekendDraft(prev => ({ ...prev, watchtowerConductorId: value })),
                'Dirigente da Sentinela',
                weekendMaleMemberOptions,
              )}
              {renderMemberSelect(
                weekendDraft.watchtowerReaderId,
                value => setWeekendDraft(prev => ({ ...prev, watchtowerReaderId: value })),
                'Leitor da Sentinela',
                weekendReaderOptions,
              )}
              {renderMemberSelect(
                weekendDraft.closingPrayerId,
                value => setWeekendDraft(prev => ({ ...prev, closingPrayerId: value })),
                'Oração Final',
                weekendMaleMemberOptions,
              )}
            </div>
          )}
        </div>

        <div className="flex flex-col-reverse gap-2 border-t border-border px-5 py-4 sm:flex-row sm:justify-end">
          <button
            onClick={onClose}
            className="rounded-lg border border-border px-4 py-2 text-foreground transition-colors hover:bg-muted"
            style={{ fontSize: '0.9rem' }}
          >
            Cancelar
          </button>
          <button
            onClick={onSave}
            className="rounded-lg bg-primary px-4 py-2 text-primary-foreground transition-colors hover:bg-primary/90"
            style={{ fontSize: '0.9rem' }}
          >
            {mode === 'edit' ? 'Salvar alterações' : 'Criar reunião'}
          </button>
        </div>
      </div>
    </div>
  );
}
