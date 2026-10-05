import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AssignmentNotification } from '../types';
import { Dashboard } from './Dashboard';

const { confirm, hideNotification, notifications, apiMock, calendarActionProps } = vi.hoisted(() => ({
  confirm: vi.fn(),
  hideNotification: vi.fn(),
  notifications: [] as AssignmentNotification[],
  calendarActionProps: [] as Array<{ notification: AssignmentNotification; onHide: (id: string) => Promise<void> }>,
  apiMock: {
    getMembers: vi.fn().mockResolvedValue([]),
    getMidweekMeetings: vi.fn().mockResolvedValue([]),
    getWeekendMeetings: vi.fn().mockResolvedValue([]),
    getAppSetting: vi.fn().mockResolvedValue(null),
  },
}));

vi.mock('../context/AuthContext', () => ({ useAuth: () => ({ user: { name: 'Maria Teste' }, isAdmin: false }) }));
vi.mock('../context/NotificationsContext', () => ({ useNotifications: () => ({ notifications, confirm, hideNotification }) }));
vi.mock('react-router', () => ({
  useNavigate: () => vi.fn(),
  Link: (props: any) => <a href={props.to}>{props.children}</a>,
}));
vi.mock('../lib/meeting-assignments', () => ({
  buildMeetingResponseReviewPath: (id: string, revision?: string) => `/assignments/meetings?notificationId=${id}${revision ? `&revision=${revision}` : ''}`,
  isMeetingAssignmentNotification: (notification: { category: string; sourceType: string; slotKey: string }) =>
    notification.category === 'midweek' && notification.sourceType === 'midweek_meeting_role' && notification.slotKey === 'president_id'
    || notification.category === 'weekend' && notification.sourceType === 'weekend_meeting_role' && notification.slotKey === 'president_id',
  isMeetingDatePast: (date: string) => date < '2026-10-05',
}));
vi.mock('../lib/api', () => ({ api: apiMock }));
vi.mock('./AssignmentCalendarActions', () => ({
  AssignmentCalendarActions: (props: { notification: AssignmentNotification; onHide: (id: string) => Promise<void> }) => {
    calendarActionProps.push(props);
    return <button data-testid={`calendar-action-${props.notification.id}`}>Adicionar ao calendário</button>;
  },
}));

function meetingNotification(status: AssignmentNotification['status'], id: string, extras: Partial<AssignmentNotification> = {}): AssignmentNotification {
  return {
    id, memberId: 'member-1', category: 'midweek', sourceType: 'midweek_meeting_role', sourceId: 'meeting-1',
    slotKey: 'president_id', title: 'Presidente', message: 'Você foi designado para presidente em 15/11/2026.',
    assignmentDate: '2026-11-15', status, isRead: true, createdAt: '2026-11-01T12:00:00Z', ...extras,
  };
}

describe('Dashboard meeting responses', () => {
  beforeEach(() => {
    notifications.splice(0, notifications.length);
    calendarActionProps.splice(0, calendarActionProps.length);
    confirm.mockReset();
    hideNotification.mockReset();
    Object.values(apiMock).forEach(mock => mock.mockClear());
    apiMock.getMembers.mockResolvedValue([]);
    apiMock.getMidweekMeetings.mockResolvedValue([]);
    apiMock.getWeekendMeetings.mockResolvedValue([]);
    apiMock.getAppSetting.mockResolvedValue(null);
  });

  it('preserves declined assignment text without a confirmation or calendar action', async () => {
    notifications.push(meetingNotification('declined', 'declined-1', { declineReason: 'Não estarei na cidade.' }));

    render(<Dashboard />);

    expect(await screen.findByText('Recusa enviada')).toBeVisible();
    expect(screen.getByText('Presidente')).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Confirmar' })).not.toBeInTheDocument();
    expect(screen.queryByTestId('calendar-action-declined-1')).not.toBeInTheDocument();
  });

  it('uses hiddenAt to exclude hidden assignments from the compact list', async () => {
    notifications.push(meetingNotification('pending_confirmation', 'hidden-1', { hiddenAt: '2026-11-02T12:00:00Z' }));

    render(<Dashboard />);

    expect(await screen.findByText('Nenhuma designação pendente')).toBeVisible();
    expect(screen.queryByText('Presidente')).not.toBeInTheDocument();
  });

  it('keeps a path to the meeting response page beside quick confirmation', async () => {
    notifications.push(meetingNotification('pending_confirmation', 'pending-1', { assignmentRevision: 'rev-1' }));

    render(<Dashboard />);

    expect(await screen.findByRole('link', { name: 'Ver designação' })).toHaveAttribute(
      'href', '/assignments/meetings?notificationId=pending-1&revision=rev-1',
    );
    expect(screen.getAllByRole('button', { name: 'Confirmar' }).length).toBeGreaterThan(0);
  });

  it('does not add a meeting response link to audio/video assignments on the same date', async () => {
    apiMock.getMidweekMeetings.mockResolvedValue([{ date: '2026-11-15', opening_song_time: '19:30' }]);
    notifications.push(meetingNotification('pending_confirmation', 'meeting-assignment', { assignmentRevision: 'rev-1' }));
    notifications.push({
      ...meetingNotification('pending_confirmation', 'av-assignment'),
      category: 'audio_video', sourceType: 'audio_video', slotKey: 'sound_member_id', title: 'Som',
    });

    render(<Dashboard />);

    await screen.findByText('Reunião do Meio de Semana');
    const links = screen.getAllByRole('link', { name: 'Ver designação' });
    expect(links.length).toBeGreaterThan(0);
    expect(links.every(link => link.getAttribute('href')?.includes('notificationId=meeting-assignment'))).toBe(true);
    expect(links.some(link => link.getAttribute('href')?.includes('notificationId=av-assignment'))).toBe(false);
  });
});
