import { isMinistryAssistant } from './meeting-confirmation-rules';
import { supabase } from './supabase';
import type { AssignmentNotification } from '../types';
import { getSafeReturnPath } from './auth-return-path';

const MEETING_ASSIGNMENT_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export function isMeetingAssignmentUuid(value: string): boolean { return MEETING_ASSIGNMENT_UUID.test(value); }

export type MeetingKind = 'midweek' | 'weekend';
export type MeetingResponseStatus = 'pending_confirmation' | 'confirmed' | 'declined' | 'revoked';

export interface MeetingSummary {
  id: string;
  kind: MeetingKind;
  date: string;
  startTime: string | null;
  assignmentCount: number;
  pendingCount: number;
  unconfirmedCount?: number;
  confirmedCount?: number;
  declinedCount?: number;
}

export interface PersonalMeetingAssignment {
  notification: AssignmentNotification | null;
  revision: string | null;
  meetingId: string;
  meetingKind: MeetingKind;
  date: string;
  roleLabel: string;
  title: string;
  partNumber: number | null;
  time: string | null;
  duration: number | null;
  location: string | null;
  partnerName: string | null;
  canRespond: boolean;
  confirmationRequired?: boolean;
}

export type AssignmentResolution =
  | { kind: 'current'; assignment: PersonalMeetingAssignment }
  | { kind: 'changed'; currentPath: string }
  | { kind: 'unavailable' };

export interface MeetingResponseInput {
  notificationId: string;
  revision: string;
  decision: 'confirmed' | 'declined' | 'pending_confirmation';
  reason?: string;
}

export interface ManagedMeetingAssignmentResponse extends AssignmentNotification {
  memberName: string;
  roleLabel: string;
  assignmentTitle: string;
  partNumber: number | null;
}

export function buildMeetingResponseReviewPath(notificationId: string, revision?: string | null): string {
  const query = new URLSearchParams({ assignment: notificationId });
  if (revision) { query.set('revision', revision); query.set('view', 'personal'); }
  return `/assignments/meetings?${query.toString()}`;
}

export function isMeetingAssignmentNotification(
  notification: Pick<AssignmentNotification, 'category' | 'sourceType' | 'slotKey'> & { assignmentRevision?: string | null },
): boolean {
  if (notification.category === 'audio_video' && notification.sourceType === 'audio_video_role') {
    return Boolean(notification.assignmentRevision) && (['sound', 'image', 'stage', 'roving_mic_1', 'roving_mic_2'].includes(notification.slotKey)
      || /^attendant:(0|[1-9]\d{0,5})$/.test(notification.slotKey));
  }
  if (notification.category === 'midweek') {
    if (notification.sourceType === 'midweek_meeting_role') {
      return ['president_id', 'opening_prayer_id', 'closing_prayer_id', 'treasure_talk_speaker_id',
        'treasure_gems_speaker_id', 'treasure_reading_student_id', 'cbs_conductor_id', 'cbs_reader_id']
        .includes(notification.slotKey);
    }
    if (notification.sourceType === 'midweek_ministry_part') {
      return ['student_id', 'assistant_id'].includes(notification.slotKey);
    }
    return notification.sourceType === 'midweek_christian_life_part' && notification.slotKey === 'speaker_id';
  }

  return notification.category === 'weekend' && notification.sourceType === 'weekend_meeting_role'
    && ['president_id', 'watchtower_conductor_id', 'watchtower_reader_id', 'closing_prayer_id'].includes(notification.slotKey);
}


function throwRPCError(error: unknown): never {
  throw new Error(`Erro ao acessar designação da reunião: ${(error as { message?: string })?.message || 'falha desconhecida'}`);
}

function mapNotification(row: any): AssignmentNotification {
  return {
    id: row.id,
    memberId: row.member_id,
    category: row.category,
    sourceType: row.source_type,
    sourceId: row.source_id,
    slotKey: row.slot_key,
    title: row.title,
    message: row.message,
    assignmentDate: row.assignment_date ?? null,
    status: row.status,
    isRead: Boolean(row.is_read),
    createdAt: row.created_at,
    confirmedAt: row.confirmed_at ?? null,
    hiddenAt: row.hidden_at ?? null,
    declineReason: row.decline_reason ?? null,
    respondedAt: row.responded_at ?? null,
    assignmentRevision: row.assignment_revision ?? null,
  };
}

function mapAssignment(row: any): PersonalMeetingAssignment {
  const notification = row.notification ? mapNotification(row.notification) : null;
  const revision = row.revision ?? null;
  const confirmationRequired = row.confirmation_required !== false && !isMinistryAssistant(notification);
  const canRespond = confirmationRequired && row.can_respond === true && notification !== null && typeof revision === 'string'
    && notification.id.length > 0 && notification.assignmentRevision === revision
    && ['pending_confirmation', 'declined', 'confirmed'].includes(notification.status);
  return {
    notification,
    revision,
    meetingId: row.meeting_id,
    meetingKind: row.meeting_kind,
    date: row.date,
    roleLabel: row.role_label,
    title: row.title,
    partNumber: row.part_number ?? null,
    time: row.time ?? null,
    duration: row.duration ?? null,
    location: row.location ?? null,
    partnerName: row.partner_name ?? null,
    canRespond,
    confirmationRequired,
  };
}

export function isMeetingDatePast(date: string, now = new Date()): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(now);
  const value = (type: Intl.DateTimeFormatPartTypes) => parts.find(part => part.type === type)?.value || '';
  const today = `${value('year')}-${value('month')}-${value('day')}`;
  return date < today;
}

export async function getPersonalMeetings(period: 'upcoming' | 'past'): Promise<MeetingSummary[]> {
  const { data, error } = await supabase.rpc('get_personal_meetings', { p_period: period });
  if (error) throwRPCError(error);
  return (data || []).map((row: any) => ({
    id: row.id,
    kind: row.kind,
    date: row.date,
    startTime: row.start_time ?? null,
    assignmentCount: Number(row.assignment_count ?? 0),
    pendingCount: Number(row.pending_count ?? 0),
    unconfirmedCount: Number(row.unconfirmed_count ?? row.pending_count ?? 0),
    confirmedCount: Number(row.confirmed_count ?? 0),
    declinedCount: Number(row.declined_count ?? 0),
  }));
}

export async function getPersonalMeetingAssignments(kind: MeetingKind, meetingId: string): Promise<PersonalMeetingAssignment[]> {
  const { data, error } = await supabase.rpc('get_personal_meeting_assignments', {
    p_kind: kind,
    p_meeting_id: meetingId,
  });
  if (error) throwRPCError(error);
  return (data || []).map(mapAssignment);
}

export async function resolvePersonalAssignment(notificationId: string, revision: string): Promise<AssignmentResolution> {
  if (!isMeetingAssignmentUuid(notificationId) || !isMeetingAssignmentUuid(revision)) return { kind: 'unavailable' };
  const { data, error } = await supabase.rpc('resolve_personal_assignment', {
    p_notification_id: notificationId,
    p_revision: revision,
  });
  if (error) throwRPCError(error);
  if (data?.kind === 'unavailable') return { kind: 'unavailable' };
  if (data?.kind === 'changed') {
    const safePath = getSafeReturnPath(data.current_path);
    if (safePath.startsWith('/assignments/meetings?assignment=')) {
      const params = new URLSearchParams(safePath.split('?')[1]);
      params.set('view', 'personal');
      return { kind: 'changed', currentPath: `/assignments/meetings?${params.toString()}` };
    }
  }
  if (data?.kind !== 'current' || !data.assignment?.notification || typeof data.assignment.revision !== 'string') {
    return { kind: 'unavailable' };
  }
  const assignment = mapAssignment(data.assignment);
  if (assignment.notification?.id !== notificationId || assignment.revision !== revision
    || assignment.notification.assignmentRevision !== revision) {
    return { kind: 'unavailable' };
  }
  return { kind: 'current', assignment };
}

export async function respondToMeetingAssignment(input: MeetingResponseInput): Promise<AssignmentNotification> {
  const reason = input.reason ?? null;
  const { data, error } = await supabase.rpc('respond_to_meeting_assignment', {
    p_notification_id: input.notificationId,
    p_revision: input.revision,
    p_decision: input.decision,
    p_reason: reason,
  });
  if (error) throwRPCError(error);
  if (!data || data.id !== input.notificationId || data.assignment_revision !== input.revision
    || data.status !== input.decision) {
    throw new Error('A resposta retornada não corresponde à versão carregada da designação. Atualize a reunião e tente novamente.');
  }
  return mapNotification(data);
}

export async function getMeetingAssignmentResponses(kind: MeetingKind, meetingId: string): Promise<ManagedMeetingAssignmentResponse[]> {
  const { data, error } = await supabase.rpc('get_meeting_assignment_responses', {
    p_kind: kind,
    p_meeting_id: meetingId,
  });
  if (error) throwRPCError(error);
  return (data || []).map(mapManagedMeetingResponse);
}

function mapManagedMeetingResponse(row: any): ManagedMeetingAssignmentResponse {
  return {
    ...mapNotification(row.notification),
    memberName: row.member_name,
    roleLabel: row.role_label,
    assignmentTitle: row.assignment_title,
    partNumber: row.part_number === null || row.part_number === undefined ? null : Number(row.part_number),
  };
}

export interface ManagedMeetingConfirmationGroup {
  id: string;
  kind: MeetingKind;
  date: string;
  responses: ManagedMeetingAssignmentResponse[];
}

export async function getManagedMeetingConfirmations(month: string): Promise<ManagedMeetingConfirmationGroup[]> {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) throw new Error('Mês inválido.');
  const { data, error } = await supabase.rpc('get_managed_meeting_confirmations', { p_month: `${month}-01` });
  if (error) throwRPCError(error);
  return (data || []).map((row: any) => ({ id: row.id, kind: row.kind, date: row.date,
    responses: (row.responses || []).map(mapManagedMeetingResponse) }));
}
