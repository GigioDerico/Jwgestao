import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PublisherMeetingsPage } from './PublisherMeetingsPage';
import { getPersonalMeetings, getPersonalMeetingAssignments, resolvePersonalAssignment } from '../../lib/meeting-assignments';

vi.mock('../../lib/meeting-assignments', () => ({
  getPersonalMeetings: vi.fn(),
  getPersonalMeetingAssignments: vi.fn(),
  resolvePersonalAssignment: vi.fn(),
  isMeetingAssignmentUuid: (value: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value),
  isMeetingDatePast: (date: string) => date < '2026-10-05',
}));
function renderPublisher(path = '/assignments/meetings') { return render(<MemoryRouter initialEntries={[path]}><PublisherMeetingsPage /></MemoryRouter>); }

vi.mock('../../context/NotificationsContext', () => ({
  useNotifications: () => ({ respondToMeetingAssignment }),
}));
vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({ user: { member_id: currentMemberId } }),
}));
vi.mock('../AssignmentCalendarActions', () => ({ AssignmentCalendarActions: () => null }));
let currentMemberId: string | null = 'member-1';
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
const weekendAssignment = { ...assignment, notification: { ...assignment.notification, id: 'weekend-notification',
  category: 'weekend' as const, sourceType: 'weekend_meeting_role', sourceId: 'weekend-1', slotKey: 'watchtower_reader',
  title: 'Sentinela' }, revision: 'weekend-revision', meetingId: 'meeting-2', meetingKind: 'weekend' as const,
  title: 'Leitor da Sentinela', roleLabel: 'Leitor', partNumber: null };
const pastMeeting = { ...meetings[0], id: 'past-meeting', date: '2026-10-01', pendingCount: 0 };
const pastAssignment = { ...assignment, meetingId: 'past-meeting', date: '2026-10-01', title: 'Designação histórica', canRespond: false,
  notification: { ...assignment.notification, id: 'past-notification', status: 'confirmed' as const } };
const member2Meeting = { ...meetings[0], id: 'member-2-meeting' };
const member2Assignment = { ...assignment, meetingId: member2Meeting.id, title: 'Designação do segundo membro',
  notification: { ...assignment.notification, id: 'member-2-notification', memberId: 'member-2' } };

describe('PublisherMeetingsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    currentMemberId = 'member-1';
    respondToMeetingAssignment = vi.fn(async (input: { notificationId: string; revision: string; decision: 'confirmed' | 'declined' }) => ({
      ...assignment.notification,
      id: input.notificationId,
      assignmentRevision: input.revision,
      status: input.decision,
    }));
    vi.mocked(getPersonalMeetings).mockResolvedValue(meetings);
    vi.mocked(resolvePersonalAssignment).mockReset();
    vi.mocked(getPersonalMeetingAssignments).mockImplementation(async (_kind, meetingId) => meetingId === 'meeting-1' ? [assignment, secondAssignment] : []);
  });


  it('consumes the RPC current_path assignment query and focuses the exact loaded assignment', async () => {
    const notificationId = '123e4567-e89b-42d3-a456-426614174000';
    const revision = '123e4567-e89b-42d3-a456-426614174001';
    const target = { ...weekendAssignment, notification: { ...weekendAssignment.notification, id: notificationId, assignmentRevision: revision }, revision, title: 'Foco exato no link' };
    vi.mocked(resolvePersonalAssignment).mockResolvedValue({ kind: 'current', assignment: target });
    vi.mocked(getPersonalMeetingAssignments).mockImplementation(async (_kind, meetingId) => meetingId === 'meeting-2' ? [target] : [assignment]);

    const scrollIntoView = vi.fn();
    HTMLElement.prototype.scrollIntoView = scrollIntoView;
    renderPublisher(`/assignments/meetings?assignment=${notificationId}&revision=${revision}`);
    const card = await screen.findByRole('heading', { name: /Foco exato no link/ });
    await waitFor(() => expect(getPersonalMeetingAssignments).toHaveBeenCalledWith('weekend', 'meeting-2'));
    await waitFor(() => expect(card.closest('[data-notification-id]')).toHaveAttribute('data-notification-id', notificationId));
    expect(document.activeElement).toHaveAttribute('data-notification-id', notificationId);
    expect(scrollIntoView).toHaveBeenCalled();
    expect(screen.getByRole('region', { name: 'Detalhes de Reunião de fim de semana' }).parentElement?.className).toBe('block');
    expect(screen.getByLabelText('Reuniões cadastradas').parentElement?.className).toBe('hidden md:block');
    expect(resolvePersonalAssignment).toHaveBeenCalledWith(notificationId, revision);
  });

  it('shows the unlinked account message before trying to resolve a target', async () => {
    currentMemberId = null;
    renderPublisher('/assignments/meetings?assignment=123e4567-e89b-42d3-a456-426614174000&revision=123e4567-e89b-42d3-a456-426614174001');
    expect(await screen.findByText('Sua conta ainda não está vinculada a um membro')).toBeVisible();
    expect(screen.queryByText('Verificando sua designação…')).not.toBeInTheDocument();
    expect(resolvePersonalAssignment).not.toHaveBeenCalled();
  });

  it('offers a retry when target resolution fails', async () => {
    const id = '123e4567-e89b-42d3-a456-426614174000';
    const revision = '123e4567-e89b-42d3-a456-426614174001';
    const target = { ...assignment, notification: { ...assignment.notification, id, assignmentRevision: revision }, revision };
    vi.mocked(resolvePersonalAssignment).mockRejectedValueOnce(new Error('network')).mockResolvedValueOnce({ kind: 'current', assignment: target });
    vi.mocked(getPersonalMeetingAssignments).mockResolvedValue([target]);
    renderPublisher(`/assignments/meetings?assignment=${id}&revision=${revision}`);
    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível verificar esta designação.');
    await userEvent.setup().click(screen.getByRole('button', { name: 'Tentar novamente' }));
    expect(await screen.findByRole('heading', { name: /Iniciando conversas/ })).toBeVisible();
  });

  it('offers an independent retry when the meeting list for a valid target fails', async () => {
    const id = '123e4567-e89b-42d3-a456-426614174000';
    const revision = '123e4567-e89b-42d3-a456-426614174001';
    const target = { ...assignment, notification: { ...assignment.notification, id, assignmentRevision: revision }, revision };
    vi.mocked(resolvePersonalAssignment).mockResolvedValue({ kind: 'current', assignment: target });
    vi.mocked(getPersonalMeetingAssignments).mockResolvedValue([target]);
    vi.mocked(getPersonalMeetings).mockRejectedValueOnce(new Error('network')).mockResolvedValueOnce(meetings);
    renderPublisher(`/assignments/meetings?assignment=${id}&revision=${revision}`);
    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível carregar as reuniões desta designação.');
    await userEvent.setup().click(screen.getByRole('button', { name: 'Tentar novamente' }));
    expect(await screen.findByRole('heading', { name: /Iniciando conversas/ })).toBeVisible();
  });

  it('clears the initial target when the user deliberately selects another meeting', async () => {
    const id = '123e4567-e89b-42d3-a456-426614174000';
    const revision = '123e4567-e89b-42d3-a456-426614174001';
    const target = { ...assignment, notification: { ...assignment.notification, id, assignmentRevision: revision }, revision };
    vi.mocked(resolvePersonalAssignment).mockResolvedValue({ kind: 'current', assignment: target });
    vi.mocked(getPersonalMeetingAssignments).mockImplementation(async (_kind, meetingId) => meetingId === 'meeting-1' ? [target] : []);
    renderPublisher(`/assignments/meetings?assignment=${id}&revision=${revision}`);
    await screen.findByRole('heading', { name: /Iniciando conversas/ });
    await userEvent.setup().click(screen.getByRole('button', { name: /Reunião de fim de semana/ }));
    expect(await screen.findByText('Você não tem designação nesta reunião')).toBeVisible();
    expect(screen.queryByText('Verificando sua designação…')).not.toBeInTheDocument();
  });

  it('lists registered meetings and shows only personal assignments, without the meeting schedule', async () => {
    renderPublisher();
    expect(await screen.findByRole('heading', { name: 'Suas próximas reuniões' })).toBeVisible();
    expect(screen.getAllByText('Não informado').length).toBeGreaterThan(0);
    expect(await screen.findByRole('heading', { name: /4\. Iniciando conversas/ })).toBeVisible();
    const region = screen.getByRole('region', { name: 'Reuniões e designações pessoais' });
    expect(region.className).toContain('md:grid-cols-');
    expect(screen.getByLabelText('Reuniões cadastradas').parentElement?.className).toBe('block');
    expect(screen.getByRole('region', { name: 'Detalhes de Reunião de meio de semana' }).parentElement?.className).toContain('hidden md:block');
    await userEvent.setup().click(screen.getByRole('button', { name: /Reunião de fim de semana/ }));
    expect(await screen.findByText('Você não tem designação nesta reunião')).toBeVisible();
    expect(screen.getByLabelText('Reuniões cadastradas').parentElement?.className).toBe('hidden md:block');
    expect(screen.getByRole('region', { name: 'Detalhes de Reunião de fim de semana' }).parentElement?.className).toBe('block');
    expect(screen.queryByText(/programação completa|cronograma/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/discurso|cântico|oração/i)).not.toBeInTheDocument();
  });

  it('keeps the preselected meeting details when opening that meeting on mobile', async () => {
    renderPublisher();
    expect(await screen.findByRole('heading', { name: /4\. Iniciando conversas/ })).toBeVisible();
    await userEvent.setup().click(screen.getByRole('button', { name: /Reunião de meio de semana/ }));
    expect(screen.getByRole('heading', { name: /4\. Iniciando conversas/ })).toBeVisible();
    expect(screen.getAllByRole('button', { name: /Confirmar designação/ })).toHaveLength(2);
    expect(screen.getByRole('region', { name: 'Detalhes de Reunião de meio de semana' }).parentElement?.className).toBe('block');
  });

  it('reloads details and pending count after each independent response', async () => {
    renderPublisher();
    await screen.findByRole('heading', { name: /4\. Iniciando conversas/ });
    const buttons = screen.getAllByRole('button', { name: /Confirmar designação/ });
    expect(buttons).toHaveLength(2);
    fireEvent.click(buttons[0]);
    await waitFor(() => expect(getPersonalMeetingAssignments).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(screen.getAllByRole('button', { name: /Confirmar designação/ })).toHaveLength(1));
    fireEvent.click(screen.getByRole('button', { name: /Confirmar designação/ }));
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
    renderPublisher();
    await screen.findByRole('heading', { name: /4\. Iniciando conversas/ });
    await user.click(screen.getByRole('tab', { name: 'Histórico' }));
    expect(await screen.findByText('Participação confirmada')).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Confirmar designação' })).not.toBeInTheDocument();
  });

  it('navigates historical meetings by month and updates the selected meeting', async () => {
    const juneMeeting = { ...pastMeeting, id: 'past-meeting-june', date: '2026-06-15' };
    vi.mocked(getPersonalMeetings).mockImplementation(async period => period === 'past'
      ? [pastMeeting, juneMeeting]
      : meetings);
    vi.mocked(getPersonalMeetingAssignments).mockImplementation(async (_kind, meetingId) =>
      meetingId === 'past-meeting' ? [pastAssignment] : []);
    const user = userEvent.setup();
    renderPublisher();
    await user.click(await screen.findByRole('tab', { name: 'Histórico' }));
    expect(await screen.findByText('Participação confirmada')).toBeVisible();
    expect(screen.getByText('outubro de 2026')).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Mês anterior' }));
    expect(await screen.findByText('junho de 2026')).toBeVisible();
    expect(await screen.findByText('Você não tem designação nesta reunião')).toBeVisible();
    expect(screen.queryByText('Participação confirmada')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Próximo mês' }));
    expect(await screen.findByText('outubro de 2026')).toBeVisible();
    expect(await screen.findByText('Participação confirmada')).toBeVisible();
  });

  it('offers retry after a load failure', async () => {
    vi.mocked(getPersonalMeetings).mockRejectedValueOnce(new Error('offline')).mockResolvedValue(meetings);
    const user = userEvent.setup();
    renderPublisher();
    expect(await screen.findByText('Não foi possível carregar as reuniões.')).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Tentar novamente' }));
    expect(await screen.findByRole('heading', { name: /4\. Iniciando conversas/ })).toBeVisible();
  });

  it('explains when the signed-in account has no linked member', async () => {
    currentMemberId = null;
    renderPublisher();
    expect(await screen.findByText(/contate o responsável pelas designações/i)).toBeVisible();
  });

  it('ignores an older meeting response after selection changes to another meeting', async () => {
    let resolveOld!: (value: typeof assignment[]) => void;
    vi.mocked(getPersonalMeetingAssignments).mockImplementation((_kind, meetingId) => meetingId === 'meeting-1'
      ? new Promise(resolve => { resolveOld = resolve; })
      : Promise.resolve([weekendAssignment]));
    const user = userEvent.setup();
    renderPublisher();
    await waitFor(() => expect(getPersonalMeetingAssignments).toHaveBeenCalledWith('midweek', 'meeting-1'));
    await user.click(screen.getByRole('button', { name: /Reunião de fim de semana/ }));
    expect(await screen.findByRole('heading', { name: /Leitor da Sentinela/ })).toBeVisible();
    await act(async () => { resolveOld([assignment]); });
    expect(screen.getByRole('heading', { name: /Leitor da Sentinela/ })).toBeVisible();
    expect(screen.queryByRole('heading', { name: /Iniciando conversas/ })).not.toBeInTheDocument();
  });

  it('ignores an older detail response after changing from upcoming to history', async () => {
    let resolveUpcoming!: (value: typeof assignment[]) => void;
    vi.mocked(getPersonalMeetings).mockImplementation(async period => period === 'past' ? [pastMeeting] : [meetings[0]]);
    vi.mocked(getPersonalMeetingAssignments).mockImplementation((_kind, meetingId) => meetingId === 'meeting-1'
      ? new Promise(resolve => { resolveUpcoming = resolve; })
      : Promise.resolve([pastAssignment]));
    const user = userEvent.setup();
    renderPublisher();
    await waitFor(() => expect(getPersonalMeetingAssignments).toHaveBeenCalledWith('midweek', 'meeting-1'));
    await user.click(screen.getByRole('tab', { name: 'Histórico' }));
    expect(await screen.findByRole('heading', { name: /Designação histórica/ })).toBeVisible();
    await act(async () => { resolveUpcoming([assignment]); });
    expect(screen.getByRole('heading', { name: /Designação histórica/ })).toBeVisible();
    expect(screen.queryByRole('heading', { name: /Iniciando conversas/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Confirmar designação/ })).not.toBeInTheDocument();
  });

  it('ignores a pending detail response from a previously signed-in member', async () => {
    let resolveMember1!: (value: typeof assignment[]) => void;
    vi.mocked(getPersonalMeetings).mockImplementation(async () => currentMemberId === 'member-2' ? [member2Meeting] : [meetings[0]]);
    vi.mocked(getPersonalMeetingAssignments).mockImplementation((_kind, meetingId) => meetingId === 'meeting-1'
      ? new Promise(resolve => { resolveMember1 = resolve; })
      : Promise.resolve([member2Assignment]));
    const { rerender } = renderPublisher();
    await waitFor(() => expect(getPersonalMeetingAssignments).toHaveBeenCalledWith('midweek', 'meeting-1'));
    currentMemberId = 'member-2';
    rerender(<MemoryRouter initialEntries={['/assignments/meetings']}><PublisherMeetingsPage /></MemoryRouter>);
    expect(await screen.findByRole('heading', { name: /Designação do segundo membro/ })).toBeVisible();
    await act(async () => { resolveMember1([assignment]); });
    expect(screen.getByRole('heading', { name: /Designação do segundo membro/ })).toBeVisible();
    expect(screen.queryByRole('heading', { name: /Iniciando conversas/ })).not.toBeInTheDocument();
  });

  it('keeps a saved confirmation and updated counter when the follow-up read fails', async () => {
    respondToMeetingAssignment.mockResolvedValue({ ...assignment.notification, status: 'confirmed' });
    vi.mocked(getPersonalMeetingAssignments).mockResolvedValueOnce([assignment]).mockRejectedValueOnce(new Error('offline'));
    const user = userEvent.setup();
    renderPublisher();
    await screen.findByRole('button', { name: /Confirmar designação/ });
    await user.click(screen.getByRole('button', { name: /Confirmar designação/ }));
    expect(await screen.findByText('Participação confirmada')).toBeVisible();
    expect(screen.queryByRole('button', { name: /Confirmar designação/ })).not.toBeInTheDocument();
    expect(screen.getAllByText('0 respostas pendentes')).toHaveLength(2);
    expect(screen.getByRole('button', { name: 'Atualizar detalhes' })).toBeVisible();
  });

  it('invalidates a declined response on revision conflict until a successful retry', async () => {
    respondToMeetingAssignment.mockRejectedValueOnce(new Error('Erro ao acessar designação da reunião: meeting_assignment_revision_conflict'));
    vi.mocked(getPersonalMeetingAssignments).mockResolvedValueOnce([assignment]).mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce([{ ...assignment, revision: 'rev-2', canRespond: true,
        notification: { ...assignment.notification, assignmentRevision: 'rev-2' } }]);
    const user = userEvent.setup();
    renderPublisher();
    await screen.findByRole('button', { name: 'Não posso participar' });
    await user.click(screen.getByRole('button', { name: 'Não posso participar' }));
    await user.type(screen.getByRole('textbox', { name: /motivo da recusa/i }), 'Imprevisto pessoal');
    await user.click(screen.getByRole('button', { name: 'Enviar recusa' }));
    await waitFor(() => expect(respondToMeetingAssignment).toHaveBeenCalledTimes(1));
    expect((await screen.findAllByText(/designação mudou/i)).length).toBeGreaterThan(0);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Não posso participar' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Atualizar detalhes' }));
    expect(await screen.findByRole('button', { name: 'Não posso participar' })).toBeVisible();
  });
});
