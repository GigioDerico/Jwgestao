import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NotificationsProvider, useNotifications } from './NotificationsContext';
import type { AssignmentNotification } from '../types';

const api = vi.hoisted(() => ({
  getMyAssignmentNotifications: vi.fn(),
  respondToMeetingAssignment: vi.fn(),
  confirmAssignmentNotification: vi.fn(),
  hideAssignmentNotification: vi.fn(),
  markAssignmentNotificationRead: vi.fn(),
  markAllAssignmentNotificationsRead: vi.fn(),
}));
vi.mock('../lib/api', () => ({ api }));
vi.mock('./AuthContext', () => ({ useAuth: () => ({ user: { member_id: 'member1' } }) }));
vi.mock('../lib/supabase', () => ({
  supabase: { channel: () => ({ on() { return this; }, subscribe() { return this; } }), removeChannel: vi.fn() },
}));
vi.mock('sonner', () => ({ toast: { info: vi.fn() } }));

const meetingNotification = {
  id: 'n1', memberId: 'member1', category: 'midweek', sourceType: 'midweek_ministry_part', sourceId: 'p1',
  slotKey: 'student_id', title: 'Consideração', message: 'Designação', assignmentDate: '2099-10-06',
  status: 'pending_confirmation', isRead: false, createdAt: '2099-10-01T00:00:00Z', assignmentRevision: 'rev1',
};

describe('NotificationsContext meeting responses', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.getMyAssignmentNotifications.mockResolvedValue([meetingNotification]);
    api.respondToMeetingAssignment.mockResolvedValue({ ...meetingNotification, status: 'confirmed' });
  });

  it('requires and forwards the loaded revision to the response RPC', async () => {
    const { result } = renderHook(() => useNotifications(), { wrapper: NotificationsProvider });
    await waitFor(() => expect(result.current.notifications).toHaveLength(1));
    await act(async () => result.current.confirm('n1'));
    expect(api.respondToMeetingAssignment).toHaveBeenCalledWith({
      notificationId: 'n1', revision: 'rev1', decision: 'confirmed',
    });
    expect(api.confirmAssignmentNotification).not.toHaveBeenCalled();
  });

  it('does not lose meeting response state when the notification is hidden', async () => {
    const { result } = renderHook(() => useNotifications(), { wrapper: NotificationsProvider });
    await waitFor(() => expect(result.current.notifications).toHaveLength(1));
    await act(async () => result.current.hideNotification('n1'));
    expect(api.hideAssignmentNotification).toHaveBeenCalledWith('n1');
    expect(result.current.pendingCount).toBe(1);
  });

  it('refuses to confirm a meeting assignment whose loaded version is missing', async () => {
    api.getMyAssignmentNotifications.mockResolvedValue([{ ...meetingNotification, assignmentRevision: null }]);
    const { result } = renderHook(() => useNotifications(), { wrapper: NotificationsProvider });
    await waitFor(() => expect(result.current.notifications).toHaveLength(1));
    await expect(act(async () => result.current.confirm('n1'))).rejects.toThrow('Atualize as designações');
    expect(api.respondToMeetingAssignment).not.toHaveBeenCalled();
    expect(api.confirmAssignmentNotification).not.toHaveBeenCalled();
  });

  it('excludes past meeting responses from the pending count', async () => {
    api.getMyAssignmentNotifications.mockResolvedValue([{ ...meetingNotification, assignmentDate: '2000-01-01' }]);
    const { result } = renderHook(() => useNotifications(), { wrapper: NotificationsProvider });
    await waitFor(() => expect(result.current.notifications).toHaveLength(1));
    expect(result.current.pendingCount).toBe(0);
  });

  it('returns the response record after the database confirms it', async () => {
    const { result } = renderHook(() => useNotifications(), { wrapper: NotificationsProvider });
    await waitFor(() => expect(result.current.notifications).toHaveLength(1));
    let saved: AssignmentNotification | undefined;
    await act(async () => {
      saved = await result.current.respondToMeetingAssignment({
        notificationId: 'n1', revision: 'rev1', decision: 'confirmed',
      });
    });
    expect(saved).toEqual({ ...meetingNotification, status: 'confirmed' });
  });
});
