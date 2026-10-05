import { Capacitor } from '@capacitor/core';
import { buildPublicAppUrl } from './public-url';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function buildMeetingAssignmentPath(notificationId: string, revision: string): string {
  if (!UUID.test(notificationId) || !UUID.test(revision)) throw new Error('A designação não possui uma versão válida para compartilhar.');
  return `/assignments/meetings/respond/${notificationId}?revision=${encodeURIComponent(revision)}`;
}

export function buildMeetingAssignmentUrl(notificationId: string, revision: string): string {
  const path = buildMeetingAssignmentPath(notificationId, revision);
  const url = new URL(buildPublicAppUrl(path));
  const localDevelopment = import.meta.env.DEV && !Capacitor.isNativePlatform() && ['localhost', '127.0.0.1'].includes(url.hostname);
  if (url.protocol !== 'https:' && !localDevelopment) {
    throw new Error('O endereço público do aplicativo precisa usar HTTPS.');
  }
  return url.toString();
}

export interface MeetingAssignmentLinkReference {
  id: string;
  memberId: string;
  sourceType: string;
  sourceId: string;
  slotKey: string;
  assignmentRevision?: string | null;
}

export function getRecipientMeetingAssignmentUrl(
  rows: MeetingAssignmentLinkReference[],
  recipientMemberId: string | null | undefined,
  sourceType: string,
  sourceId: string,
  slotKey: string,
): string | undefined {
  if (!recipientMemberId) return undefined;
  const notification = rows.find(row => row.memberId === recipientMemberId && row.sourceType === sourceType
    && row.sourceId === sourceId && row.slotKey === slotKey);
  if (!notification?.id || !notification.assignmentRevision) {
    throw new Error('Não foi possível preparar o link desta designação. Sincronize novamente antes de enviar.');
  }
  return buildMeetingAssignmentUrl(notification.id, notification.assignmentRevision);
}
