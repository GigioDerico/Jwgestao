import type { AssignmentNotification } from '../types';
import type {
  CartCalendarInput,
  FieldServiceCalendarInput,
  MeetingCalendarInput,
} from './assignment-calendar';
import { parseTimeRange } from './assignment-calendar';

export interface AssignmentCalendarApi {
  getAudioVideoAssignmentById(id: string): Promise<any | null>;
  getFieldServiceAssignmentById(id: string): Promise<any | null>;
  getCartAssignmentById(id: string): Promise<any | null>;
  getMidweekMinistryPartCalendarSource(id: string): Promise<any | null>;
  getMidweekChristianLifePartCalendarSource(id: string): Promise<any | null>;
  getMidweekMeetingById(id: string): Promise<any | null>;
  getWeekendMeetingById(id: string): Promise<any | null>;
  getMidweekMeetingByDate(date: string): Promise<any | null>;
  getWeekendMeetingByDate(date: string): Promise<any | null>;
  getAppSetting(key: string): Promise<string | null>;
}

export type AssignmentCalendarSource =
  | (MeetingCalendarInput & { kind: 'meeting' })
  | (CartCalendarInput & { kind: 'cart' })
  | (FieldServiceCalendarInput & { kind: 'field_service'; recurring: boolean });

export interface AssignmentCalendarOptions {
  midweekTime?: string | null;
  weekendTime?: string | null;
}

const ROLE_LABELS: Record<string, string> = {
  president: 'Presidente', president_id: 'Presidente',
  opening_prayer: 'Oração Inicial', opening_prayer_id: 'Oração Inicial',
  closing_prayer: 'Oração Final', closing_prayer_id: 'Oração Final',
  treasure_talk_speaker_id: 'Tesouros da Palavra', treasure_gems_speaker_id: 'Joias Espirituais',
  treasure_reading_student_id: 'Leitura da Bíblia', cbs_conductor_id: 'Dirigente do Estudo',
  cbs_reader_id: 'Leitor do Estudo', student_id: 'Estudante', assistant_id: 'Ajudante', speaker_id: 'Orador',
  watchtower_conductor_id: 'Dirigente da Sentinela', watchtower_reader_id: 'Leitor da Sentinela',
  sound: 'Som', image: 'Imagem', stage: 'Palco', roving_mic_1: 'Microfone Volante 1', roving_mic_2: 'Microfone Volante 2',
  publisher1: 'Publicador 1', publisher2: 'Publicador 2', responsible: 'Responsável', responsible_2: 'Responsável',
};

function roleLabel(slotKey: string, title?: string): string {
  const attendant = /^attendant:(\d+)$/.exec(slotKey);
  if (attendant) return `Indicador ${Number(attendant[1]) + 1}`;
  const base = ROLE_LABELS[slotKey] || title || slotKey;
  if (title && slotKey === 'assistant_id') return `${title} — ${base}`;
  if (title && slotKey === 'speaker_id') return `${title} — ${base}`;
  if (title && slotKey === 'student_id') return title;
  return base;
}

function description(notification: AssignmentNotification, label: string): string {
  return `${label}: ${notification.message}`;
}

function timeOnly(value: unknown): string | undefined {
  if (typeof value !== 'string' || !value.trim()) return undefined;
  const match = value.trim().match(/^(\d{1,2}:\d{2})/);
  return match?.[1].padStart(5, '0');
}

function weekdayNumber(value: string): number {
  const normalized = value.toLocaleLowerCase('pt-BR').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const names = ['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'];
  const index = names.findIndex(name => normalized.includes(name));
  if (index < 0) throw new Error('Dia da semana inválido para o calendário.');
  return index;
}

async function settingOr(options: AssignmentCalendarOptions, key: 'midweekTime' | 'weekendTime', api: AssignmentCalendarApi) {
  return options[key] || await api.getAppSetting(key === 'midweekTime' ? 'midweek_meeting_time' : 'weekend_meeting_time');
}

function meetingTimes(meeting: any, fallback: string | null, isMidweek: boolean): { startTime: string; endTime?: string } {
  const startTime = timeOnly(isMidweek ? meeting.opening_song_time : meeting.start_time) || timeOnly(fallback);
  if (!startTime) throw new Error('Defina o horário da reunião antes de adicionar ao calendário.');
  const closing = timeOnly(meeting.closing_comments_time);
  const duration = Number(meeting.closing_comments_duration || 0);
  let endTime: string | undefined;
  if (closing && duration > 0) {
    const [h, m] = closing.split(':').map(Number);
    const end = h * 60 + m + duration;
    endTime = `${String(Math.floor(end / 60) % 24).padStart(2, '0')}:${String(end % 60).padStart(2, '0')}`;
  } else if (timeOnly(meeting.end_time)) endTime = timeOnly(meeting.end_time);
  return { startTime, endTime };
}

export async function resolveAssignmentCalendarSource(
  notification: AssignmentNotification,
  api: AssignmentCalendarApi,
  options: AssignmentCalendarOptions = {},
): Promise<AssignmentCalendarSource> {
  const common = { notificationId: notification.id, sourceId: notification.sourceId, slotKey: notification.slotKey, description: description(notification, roleLabel(notification.slotKey)) };
  let result: AssignmentCalendarSource | null = null;

  if (notification.sourceType === 'cart_assignment') {
    const row = await api.getCartAssignmentById(notification.sourceId);
    if (!row) throw new Error('Não foi possível encontrar a designação de carrinho.');
    if (!row.time?.trim()) throw new Error('Defina o horário da designação de carrinho antes de adicionar ao calendário.');
    const [year, month, day] = [row.year, row.month, row.day];
    result = { kind: 'cart', ...common, roleLabel: roleLabel(notification.slotKey), date: `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`, timeRange: (() => { parseTimeRange(row.time); return row.time; })(), location: row.location || undefined };
  } else if (notification.sourceType === 'field_service_assignment') {
    const row = await api.getFieldServiceAssignmentById(notification.sourceId);
    if (!row) throw new Error('Não foi possível encontrar a designação de saída de campo.');
    const startTime = timeOnly(row.time);
    if (row.time?.includes('/')) throw new Error('Defina um único horário antes de adicionar ao calendário.');
    if (!startTime) throw new Error('Defina o horário da designação de saída de campo antes de adicionar ao calendário.');
    result = { kind: 'field_service', ...common, roleLabel: roleLabel(notification.slotKey), year: row.year, month: row.month, weekday: weekdayNumber(row.weekday), startTime, location: row.location || undefined, recurring: !row.date };
    if (row.date) result.date = row.date;
  } else {
    let meeting: any;
    let part: any;
    let resolvedDate = notification.assignmentDate;
    const isMidweek = notification.sourceType.startsWith('midweek');
    let meetingIsMidweek = isMidweek;
    if (notification.sourceType === 'midweek_ministry_part') part = await api.getMidweekMinistryPartCalendarSource(notification.sourceId);
    else if (notification.sourceType === 'midweek_christian_life_part') part = await api.getMidweekChristianLifePartCalendarSource(notification.sourceId);
    else if (notification.sourceType === 'midweek_meeting_role') meeting = await api.getMidweekMeetingById(notification.sourceId);
    else if (notification.sourceType === 'weekend_meeting_role') meeting = await api.getWeekendMeetingById(notification.sourceId);
    else if (notification.sourceType === 'audio_video_role') {
      const row = await api.getAudioVideoAssignmentById(notification.sourceId);
      if (!row) throw new Error('Não foi possível encontrar a designação de áudio e vídeo.');
      const assignmentDate = notification.assignmentDate || row.date;
      if (!assignmentDate) throw new Error('Defina a data da designação de áudio e vídeo antes de adicionar ao calendário.');
      resolvedDate = assignmentDate;
      const [midweekMeeting, weekendMeeting] = await Promise.all([
        api.getMidweekMeetingByDate(assignmentDate),
        api.getWeekendMeetingByDate(assignmentDate),
      ]);
      meeting = midweekMeeting || weekendMeeting;
      meetingIsMidweek = Boolean(midweekMeeting);
    } else throw new Error('Esta designação não é compatível com o calendário.');
    if (part) meeting = part.meeting;
    if (!meeting) throw new Error('Não foi possível encontrar a designação da reunião.');
    const times = meetingTimes(meeting, await settingOr(options, meetingIsMidweek ? 'midweekTime' : 'weekendTime', api), meetingIsMidweek);
    const label = roleLabel(notification.slotKey, part?.title);
    result = { kind: 'meeting', ...common, roleLabel: label, description: description(notification, label), date: meeting.date || resolvedDate!, ...times, location: part?.room || meeting.location || undefined };
  }
  if (!result) throw new Error('Não foi possível encontrar a designação para o calendário.');
  return result;
}
