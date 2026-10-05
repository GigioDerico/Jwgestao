import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AssignmentNotification } from '../types';
import { Dashboard } from './Dashboard';

const { confirm, hideNotification, notifications, apiMock, calendarActionProps } = vi.hoisted(() => ({
  confirm: vi.fn(),
  hideNotification: vi.fn(),
  notifications: [] as AssignmentNotification[],
  calendarActionProps: [] as Array<{
    notification: AssignmentNotification;
    onHide: (id: string) => Promise<void>;
  }>,
  apiMock: {
    getMembers: vi.fn().mockResolvedValue([]),
    getMidweekMeetings: vi.fn().mockResolvedValue([]),
    getWeekendMeetings: vi.fn().mockResolvedValue([]),
    getAppSetting: vi.fn().mockResolvedValue(null),
  },
}));

vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({ user: { name: 'Maria Teste' }, isAdmin: false }),
}));
vi.mock('../context/NotificationsContext', () => ({
  useNotifications: () => ({ notifications, confirm, hideNotification }),
}));
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
vi.mock('../lib/api', () => ({
  api: apiMock,
}));
vi.mock('./AssignmentCalendarActions', () => ({
  AssignmentCalendarActions: (props: {
    notification: AssignmentNotification;
    onHide: (id: string) => Promise<void>;
  }) => {
    calendarActionProps.push(props);
    return (
      <button data-testid={`calendar-action-${props.notification.id}`}>Adicionar ao calendário</button>
    );
  },
}));

function notification(status: AssignmentNotification['status'], id: string): AssignmentNotification {
  return {
    id,
    memberId: 'member-1',
    category: 'midweek',
    sourceType: 'midweek_meeting_role',
    sourceId: 'meeting-1',
    slotKey: 'president',
    title: 'Presidente',
    message: 'Você foi designado para presidente em 15/09/2026.',
    assignmentDate: '2026-09-15',
    status,
    isRead: true,
    createdAt: '2026-09-01T12:00:00Z',
  };
}

describe('Dashboard calendar actions', () => {
  beforeEach(() => {
    notifications.splice(0, notifications.length);
    calendarActionProps.splice(0, calendarActionProps.length);
    confirm.mockReset();
    hideNotification.mockReset();
    apiMock.getMembers.mockResolvedValue([]);
    apiMock.getMidweekMeetings.mockResolvedValue([]);
    apiMock.getWeekendMeetings.mockResolvedValue([]);
    apiMock.getAppSetting.mockResolvedValue(null);
  });

  it('renders calendar action only in the confirmed assignment row', async () => {
    notifications.push(notification('confirmed', 'confirmed-1'));

    render(<Dashboard />);

    expect(await screen.findByTestId('calendar-action-confirmed-1')).toBeVisible();
    expect(screen.getByText('Minhas Designações')).toBeVisible();
    expect(screen.getAllByTestId('calendar-action-confirmed-1')).toHaveLength(1);
  });

  it('passes the notification hide callback to the confirmed assignment action', async () => {
    notifications.push(notification('confirmed', 'confirmed-1'));

    render(<Dashboard />);

    await screen.findByTestId('calendar-action-confirmed-1');
    expect(calendarActionProps.length).toBeGreaterThan(0);
    expect(calendarActionProps).toEqual(expect.arrayContaining([
      expect.objectContaining({
        notification: expect.objectContaining({ id: 'confirmed-1' }),
        onHide: hideNotification,
      }),
    ]));
    expect(calendarActionProps.every(props => props.onHide === hideNotification)).toBe(true);
  });

  it('wraps confirmed assignment actions below readable text on narrow screens', async () => {
    notifications.push(notification('confirmed', 'confirmed-1'));

    render(<Dashboard />);

    const action = await screen.findByTestId('calendar-action-confirmed-1');
    const actionWrapper = action.parentElement;
    const notificationRow = actionWrapper?.parentElement;

    expect(notificationRow).toHaveClass('flex-wrap');
    expect(actionWrapper).toHaveClass('w-full', 'min-w-0', 'sm:w-auto');
  });

  it('keeps pending rows on confirmation and hide actions without calendar action', async () => {
    notifications.push(notification('pending_confirmation', 'pending-1'));

    render(<Dashboard />);

    expect(await screen.findByRole('button', { name: 'Confirmar' })).toBeVisible();
    expect(screen.queryByTestId('calendar-action-pending-1')).not.toBeInTheDocument();
    expect(screen.getByTitle('Ocultar do painel')).toBeVisible();
  });
});
