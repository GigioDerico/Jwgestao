import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PublisherMeetingsPage } from './PublisherMeetingsPage';
import { getPersonalMeetings, getPersonalMeetingAssignments } from '../../lib/meeting-assignments';

vi.mock('../../lib/meeting-assignments', () => ({
  getPersonalMeetings: vi.fn(),
  getPersonalMeetingAssignments: vi.fn(),
  isMeetingDatePast: (date: string) => date < '2026-10-05',
}));
vi.mock('../../context/NotificationsContext', () => ({
  useNotifications: () => ({ respondToMeetingAssignment }),
}));
vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({ user: { member_id: linkedMemberId ? 'member-1' : null } }),
}));
vi.mock('../AssignmentCalendarActions', () => ({ AssignmentCalendarActions: () => null }));
let linkedMemberId = true;
let respondToMeetingAssignment: ReturnType<typeof vi.fn>;

const meetings = [
  { id: 'meeting-1', kind: 'midweek' as const, date: '2026-10-08', startTime: null, assignmentCount: 1, pendingCount: 1 },
  { id: 'meeting-2', kind: 'weekend' as const, date: '2026-10-11', startTime: '09:00', assignmentCount: 0, pendingCount: 0 },
];
const assignment = {
  notification: {
    id: 'notification-1', memberId: 'member-1', category: 'midweek' as const, sourceType: 'midweek_ministry_part',
    sourceId: 'part-1', slotKey: 'student', title: 'Iniciando conversas', message: '', assignmentDate: '2026-10-08',
    status: 'pending_confirmation' as const, isRead: true, createdAt: '2026-10-01', assignmentRevision: 'rev-1',
  }, revision: 'rev-1', meetingId: 'meeting-1', meetingKind: 'midweek' as const, date: '2026-10-08',
  roleLabel: 'Estudante', title: 'Iniciando conversas', partNumber: 4, time: null, duration: 3,
  location: null, partnerName: null, canRespond: true,
};
const secondAssignment = { ...assignment, notification: { ...assignment.notification, id: 'notification-2',
  sourceId: 'part-2', slotKey: 'assistant', assignmentRevision: 'rev-2' }, revision: 'rev-2',
  roleLabel: 'Ajudante', title: 'Cultivando interesse', partNumber: 5 };

describe('PublisherMeetingsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    linkedMemberId = true;
    respondToMeetingAssignment = vi.fn(async () => undefined);
    vi.mocked(getPersonalMeetings).mockResolvedValue(meetings);
    vi.mocked(getPersonalMeetingAssignments).mockImplementation(async (_kind, meetingId) => meetingId === 'meeting-1' ? [assignment, secondAssignment] : []);
  });

  it('lists registered meetings and shows only personal assignments, without the meeting schedule', async () => {
    render(<PublisherMeetingsPage />);
    expect(await screen.findByRole('heading', { name: 'Suas próximas reuniões' })).toBeVisible();
    expect(screen.getByText('Não informado')).toBeVisible();
    expect(await screen.findByRole('heading', { name: /4\. Iniciando conversas/ })).toBeVisible();
    const region = screen.getByRole('region', { name: 'Reuniões e designações pessoais' });
    expect(region.className).toContain('md:grid-cols-');
    expect(screen.getByLabelText('Reuniões cadastradas').parentElement?.className).toBe('block');
    expect(screen.getByRole('region', { name: 'Detalhes de Reunião de meio de semana' }).parentElement?.className).toContain('hidden md:block');
    await userEvent.setup().click(screen.getByRole('button', { name: /Reunião de fim de semana/ }));
    expect(screen.getByText('Você não tem designação nesta reunião')).toBeVisible();
    expect(screen.getByLabelText('Reuniões cadastradas').parentElement?.className).toBe('hidden md:block');
    expect(screen.getByRole('region', { name: 'Detalhes de Reunião de fim de semana' }).parentElement?.className).toBe('block');
    expect(screen.queryByText(/programação completa|cronograma/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/discurso|cântico|oração/i)).not.toBeInTheDocument();
  });

  it('reloads details and pending count after each independent response', async () => {
    render(<PublisherMeetingsPage />);
    await screen.findByRole('heading', { name: /4\. Iniciando conversas/ });
    const buttons = screen.getAllByRole('button', { name: /Confirmar designação/ });
    expect(buttons).toHaveLength(2);
    fireEvent.click(buttons[0]);
    await waitFor(() => expect(getPersonalMeetingAssignments).toHaveBeenCalledTimes(2));
    fireEvent.click(screen.getAllByRole('button', { name: /Confirmar designação/ })[1]);
    await waitFor(() => expect(getPersonalMeetingAssignments).toHaveBeenCalledTimes(3));
    expect(respondToMeetingAssignment).toHaveBeenNthCalledWith(1, expect.objectContaining({ notificationId: 'notification-1', revision: 'rev-1' }));
    expect(respondToMeetingAssignment).toHaveBeenNthCalledWith(2, expect.objectContaining({ notificationId: 'notification-2', revision: 'rev-2' }));
  });

  it('loads the past tab as read-only history', async () => {
    vi.mocked(getPersonalMeetings).mockImplementation(async period => period === 'past'
      ? [{ ...meetings[0], date: '2026-10-01', pendingCount: 0 }]
      : meetings);
    vi.mocked(getPersonalMeetingAssignments).mockResolvedValue([{ ...assignment, date: '2026-10-01', canRespond: false,
      notification: { ...assignment.notification, status: 'confirmed' } }]);
    const user = userEvent.setup();
    render(<PublisherMeetingsPage />);
    await screen.findByRole('heading', { name: /4\. Iniciando conversas/ });
    await user.click(screen.getByRole('tab', { name: 'Histórico' }));
    expect(await screen.findByText('Participação confirmada')).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Confirmar designação' })).not.toBeInTheDocument();
  });

  it('offers retry after a load failure', async () => {
    vi.mocked(getPersonalMeetings).mockRejectedValueOnce(new Error('offline')).mockResolvedValue(meetings);
    const user = userEvent.setup();
    render(<PublisherMeetingsPage />);
    expect(await screen.findByText('Não foi possível carregar as reuniões.')).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Tentar novamente' }));
    expect(await screen.findByRole('heading', { name: /4\. Iniciando conversas/ })).toBeVisible();
  });

  it('explains when the signed-in account has no linked member', async () => {
    linkedMemberId = false;
    render(<PublisherMeetingsPage />);
    expect(await screen.findByText(/contate o responsável pelas designações/i)).toBeVisible();
  });
});
