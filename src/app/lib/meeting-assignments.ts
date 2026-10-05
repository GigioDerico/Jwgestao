import { supabase } from './supabase';
import type { AssignmentNotification } from '../types';

export type MeetingKind = 'midweek' | 'weekend';
export type MeetingResponseStatus = 'pending_confirmation' | 'confirmed' | 'declined' | 'revoked';

export interface MeetingSummary {
  id: string;
  kind: MeetingKind;
  date: string;
  startTime: string | null;
  assignmentCount: number;
  pendingCount: number;
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
}

export type AssignmentResolution =
  | { kind: 'current'; assignment: PersonalMeetingAssignment }
  | { kind: 'changed'; currentPath: string }
  | { kind: 'unavailable' };

export interface MeetingResponseInput {
  notificationId: string;
  revision: string;
  decision: 'confirmed' | 'declined';
  reason?: string;
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
  const canRespond = row.can_respond === true && notification !== null && typeof revision === 'string'
    && notification.id.length > 0 && notification.assignmentRevision === revision
    && notification.status === 'pending_confirmation';
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
  const { data, error } = await supabase.rpc('resolve_personal_assignment', {
    p_notification_id: notificationId,
    p_revision: revision,
  });
  if (error) throwRPCError(error);
  if (data?.kind === 'unavailable') return { kind: 'unavailable' };
  if (data?.kind === 'changed' && (data.current_path === '/assignments/meetings'
    || (typeof data.current_path === 'string' && data.current_path.startsWith('/assignments/meetings?')))) {
    return { kind: 'changed', currentPath: data.current_path };
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
