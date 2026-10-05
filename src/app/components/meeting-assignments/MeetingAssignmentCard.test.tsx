import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { MeetingAssignmentCard } from './MeetingAssignmentCard';

vi.mock('../AssignmentCalendarActions', () => ({ AssignmentCalendarActions: () => <button>Adicionar ao calendário</button> }));
vi.mock('./DeclineAssignmentDialog', () => ({ DeclineAssignmentDialog: () => null }));

const assignment = {
  notification: { id: 'notification-1', memberId: 'member-1', category: 'midweek', sourceType: 'midweek_ministry_part',
    sourceId: 'part-1', slotKey: 'student', title: 'Iniciando conversas', message: '', assignmentDate: '2026-10-08',
    status: 'pending_confirmation', isRead: true, createdAt: '2026-10-01', assignmentRevision: 'revision-1' },
  revision: 'revision-1', meetingId: 'meeting-1', meetingKind: 'midweek', date: '2026-10-08',
  roleLabel: 'Estudante', title: 'Iniciando conversas', partNumber: 4, time: null, duration: 3,
  location: null, partnerName: null, canRespond: true,
} as any;

describe('MeetingAssignmentCard', () => {
  it('offers only the personal response actions for a pending assignment', () => {
    render(<MeetingAssignmentCard assignment={assignment} onRespond={vi.fn()} />);
    expect(screen.getByRole('heading', { name: /4\. Iniciando conversas/ })).toBeVisible();
    expect(screen.getByText('Sua função: Estudante')).toBeVisible();
    expect(screen.getByText('Não informado')).toBeVisible();
    expect(screen.getByRole('button', { name: /Confirmar designação/ })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Não posso participar' })).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Adicionar ao calendário' })).not.toBeInTheDocument();
    expect(screen.queryByText(/cronograma|programação completa/i)).not.toBeInTheDocument();
  });

  it('has no response controls for a confirmed past version and offers calendar action', () => {
    render(<MeetingAssignmentCard assignment={{ ...assignment, canRespond: false, date: '2026-10-01',
      notification: { ...assignment.notification, status: 'confirmed' } }} onRespond={vi.fn()} />);
    expect(screen.queryByRole('button', { name: /Confirmar designação/ })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Adicionar ao calendário' })).toBeVisible();
  });

  it.each([
    ['midweek', 'Reunião de meio de semana'],
    ['weekend', 'Reunião de fim de semana'],
  ] as const)('labels a %s assignment accurately', (meetingKind, expectedLabel) => {
    render(<MeetingAssignmentCard assignment={{ ...assignment, meetingKind }} onRespond={vi.fn()} />);
    expect(screen.getByText(expectedLabel)).toBeVisible();
  });

  it('uses the exact loaded notification ID and revision when confirming', async () => {
    const onRespond = vi.fn(async () => undefined);
    const user = userEvent.setup();
    render(<MeetingAssignmentCard assignment={assignment} onRespond={onRespond} />);
    await user.click(screen.getByRole('button', { name: /Confirmar designação/ }));
    expect(onRespond).toHaveBeenCalledWith({ notificationId: 'notification-1', revision: 'revision-1', decision: 'confirmed', reason: undefined });
  });

  it('uses the server assignment again when a newer revision arrives in props', async () => {
    const onRespond = vi.fn(async () => ({ ...assignment.notification, status: 'confirmed', assignmentRevision: 'revision-1' }));
    const { rerender } = render(<MeetingAssignmentCard assignment={assignment} onRespond={onRespond} />);
    await userEvent.setup().click(screen.getByRole('button', { name: /Confirmar designação/ }));
    expect(await screen.findByText('Participação confirmada')).toBeVisible();

    const newerAssignment = { ...assignment, revision: 'revision-2', canRespond: true,
      notification: { ...assignment.notification, assignmentRevision: 'revision-2', status: 'pending_confirmation' } };
    rerender(<MeetingAssignmentCard assignment={newerAssignment} onRespond={onRespond} />);
    expect(screen.getByRole('button', { name: /Confirmar designação/ })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Não posso participar' })).toBeVisible();
  });
});
