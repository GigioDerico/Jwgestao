import type { AssignmentNotification } from '../types';

export function isMinistryAssistant(notification: Pick<AssignmentNotification, 'sourceType' | 'slotKey'> | null | undefined): boolean {
  return notification?.sourceType === 'midweek_ministry_part' && notification.slotKey === 'assistant_id';
}
