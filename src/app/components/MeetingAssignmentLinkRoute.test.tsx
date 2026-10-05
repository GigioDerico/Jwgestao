import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MeetingAssignmentLinkRoute } from './MeetingAssignmentLinkRoute';

const mocks = vi.hoisted(() => ({ resolve: vi.fn(), respond: vi.fn(), user: { role: 'publicador', member_id: 'member-1' } as any }));
vi.mock('../lib/meeting-assignments', () => ({ resolvePersonalAssignment: mocks.resolve }));
vi.mock('../context/AuthContext', () => ({ useAuth: () => ({ user: mocks.user, loading: false }) }));
vi.mock('../hooks/usePermissions', () => ({ usePermissions: () => ({ can: () => true }) }));
vi.mock('./meeting-assignments/MeetingAssignmentCard', () => ({ MeetingAssignmentCard: ({ assignment }: any) => <div><h2>{assignment.title}</h2><button>Confirmar designação</button></div> }));
vi.mock('../context/NotificationsContext', () => ({ useNotifications: () => ({ respondToMeetingAssignment: mocks.respond, hideNotification: vi.fn() }) }));
const assignment: any = { notification: { id: '123e4567-e89b-42d3-a456-426614174000', memberId: 'member-1', category: 'midweek', sourceType: 'midweek_ministry_part', sourceId: 'part-id', slotKey: 'student_id', title: 'Parte', message: '', assignmentDate: '2026-10-08', status: 'pending_confirmation', isRead: true, createdAt: '2026-10-01', assignmentRevision: '123e4567-e89b-42d3-a456-426614174001' }, revision: '123e4567-e89b-42d3-a456-426614174001', meetingId: 'meeting-id', meetingKind: 'midweek', date: '2026-10-08', roleLabel: 'Estudante', title: 'Iniciando conversas', partNumber: 4, canRespond: true };
function renderRoute(url: string) { return render(<MemoryRouter initialEntries={[url]}><Routes><Route path="/assignments/meetings/respond/:notificationId" element={<MeetingAssignmentLinkRoute />} /></Routes></MemoryRouter>); }
describe('MeetingAssignmentLinkRoute', () => {
  beforeEach(() => { mocks.resolve.mockReset(); mocks.respond.mockReset(); mocks.user = { role: 'publicador', member_id: 'member-1' }; });
  it('opens the exact personal assignment without submitting a response', async () => {
    mocks.resolve.mockResolvedValue({ kind: 'current', assignment });
    renderRoute('/assignments/meetings/respond/123e4567-e89b-42d3-a456-426614174000?revision=123e4567-e89b-42d3-a456-426614174001');
    expect(await screen.findByRole('heading', { name: /Iniciando conversas/ })).toBeVisible();
    expect(mocks.resolve).toHaveBeenCalledWith(assignment.notification.id, assignment.revision);
    expect(mocks.respond).not.toHaveBeenCalled();
  });
  it('explains a changed link with only the safe current route', async () => {
    mocks.resolve.mockResolvedValue({ kind: 'changed', currentPath: '/assignments/meetings?notificationId=123e4567-e89b-42d3-a456-426614174000&revision=123e4567-e89b-42d3-a456-426614174001' });
    renderRoute('/assignments/meetings/respond/123e4567-e89b-42d3-a456-426614174000?revision=123e4567-e89b-42d3-a456-426614174001');
    expect(await screen.findByText(/link é de uma versão anterior/i)).toBeVisible();
  });
  it('does not adopt latest revision when no version is supplied', async () => {
    renderRoute('/assignments/meetings/respond/123e4567-e89b-42d3-a456-426614174000');
    expect(await screen.findByRole('heading', { name: 'Designação indisponível' })).toBeVisible();
    expect(mocks.resolve).not.toHaveBeenCalled();
  });
  it('shows generic unavailability for another account', async () => {
    mocks.user = { role: 'publicador', member_id: 'different-member' };
    mocks.resolve.mockResolvedValue({ kind: 'unavailable' });
    renderRoute('/assignments/meetings/respond/123e4567-e89b-42d3-a456-426614174000?revision=123e4567-e89b-42d3-a456-426614174001');
    expect(await screen.findByRole('heading', { name: 'Designação indisponível' })).toBeVisible();
    expect(screen.queryByText(/Nome|Motivo|Estudante/)).not.toBeInTheDocument();
  });
});
