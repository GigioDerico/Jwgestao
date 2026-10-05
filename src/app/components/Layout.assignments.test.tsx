import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Layout } from './Layout';
vi.mock('../lib/meeting-assignments', () => ({
  buildMeetingResponseReviewPath: (id: string, revision?: string) => `/assignments/meetings?assignment=${id}${revision ? `&revision=${revision}` : ''}`,
  isMeetingDatePast: (date: string) => date < '2026-10-05',
}));

let role = 'publicador';
let viewPermission = true;
let approvedAudioVideo = true;
let approvedCart = true;
const notifications: any[] = [];
vi.mock('../context/AuthContext', () => ({ useAuth: () => ({
  user: { id: 'user-1', name: 'Ana Lima', role, approved_audio_video: approvedAudioVideo, approved_carrinho: approvedCart },
  logout: vi.fn(), loading: false,
}) }));
vi.mock('../context/NotificationsContext', () => ({ useNotifications: () => ({
  notifications, unreadCount: 0, pendingCount: 0, loading: false,
  markRead: vi.fn(), markAllRead: vi.fn(), confirm: vi.fn(),
}) }));
vi.mock('../hooks/usePermissions', () => ({ usePermissions: () => ({ can: () => viewPermission }) }));
vi.mock('../lib/ministry-api', () => ({ ministryApi: {
  pullFromCloud: vi.fn(async () => ({ errors: [] })),
  syncIfOnline: vi.fn(async () => ({ synced: 0, errors: [] })),
  subscribeToOnline: vi.fn(() => () => {}),
} }));
vi.mock('./ProfileDrawer', () => ({ ProfileDrawer: () => null }));

function renderLayout(path = '/assignments/meetings') {
  return render(<MemoryRouter initialEntries={[path]}><Layout /></MemoryRouter>);
}

describe('Layout assignment navigation', () => {
  beforeEach(() => { role = 'publicador'; viewPermission = true; approvedAudioVideo = true; approvedCart = true; notifications.splice(0); });
  it('adds Reunião and keeps approved audio/video and cart items for a Publicador', () => {
    renderLayout();
    expect(screen.getByRole('button', { name: 'Reunião' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Áudio e Vídeo' })).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Saída de Campo' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Carrinho' })).toBeVisible();
  });
  it('shows only Reunião when the Publicador has no separate audio/video or cart approval', () => {
    approvedAudioVideo = false;
    approvedCart = false;
    renderLayout();
    expect(screen.getByRole('button', { name: 'Reunião' })).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Áudio e Vídeo' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Carrinho' })).not.toBeInTheDocument();
  });
  it.each([
    [true, false, true, false],
    [false, true, false, true],
  ])('keeps audio/video and cart access independent (%s, %s)', (audio, cart, audioVisible, cartVisible) => {
    approvedAudioVideo = audio;
    approvedCart = cart;
    renderLayout();
    expect(screen.getByRole('button', { name: 'Reunião' })).toBeVisible();
    expect(Boolean(screen.queryByRole('button', { name: 'Áudio e Vídeo' }))).toBe(audioVisible);
    expect(Boolean(screen.queryByRole('button', { name: 'Carrinho' }))).toBe(cartVisible);
  });
  it('keeps the existing admin tabs for coordinators and designers', () => {
    role = 'coordenador';
    renderLayout();
    expect(screen.getAllByRole('button', { name: 'Reuniões' })).toHaveLength(2);
    expect(screen.getByRole('button', { name: 'Áudio e Vídeo' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Saída de Campo' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Carrinho' })).toBeVisible();
  });
  it('does not show Designações when the permission is absent', () => {
    viewPermission = false;
    renderLayout();
    expect(screen.queryByRole('button', { name: 'Designações' })).not.toBeInTheDocument();
  });

  it('shows a refusal in the notification bell without a confirmation action', async () => {
    notifications.push({
      id: 'n1', memberId: 'm1', category: 'midweek', sourceType: 'midweek_meeting_role', sourceId: 'meeting1',
      slotKey: 'president_id', title: 'Presidente', message: 'Presidente em 15/11/2026', assignmentDate: '2026-11-15',
      status: 'declined', isRead: false, createdAt: '2026-10-01T00:00:00Z',
    });
    renderLayout();

    fireEvent.click(screen.getByRole('button', { name: 'Abrir notificações' }));

    expect(await screen.findByText('Recusa enviada')).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Confirmar' })).not.toBeInTheDocument();
    expect(screen.queryByText('Confirmada')).not.toBeInTheDocument();
  });

  it('does not offer quick confirmation for a past meeting and links to its history', async () => {
    notifications.push({
      id: 'past-n1', memberId: 'm1', category: 'midweek', sourceType: 'midweek_meeting_role', sourceId: 'meeting1',
      slotKey: 'president_id', title: 'Presidente', message: 'Presidente em 15/09/2026', assignmentDate: '2026-09-15',
      status: 'pending_confirmation', isRead: true, createdAt: '2026-09-01T00:00:00Z', assignmentRevision: 'rev-1',
    });
    renderLayout();
    fireEvent.click(screen.getByRole('button', { name: 'Abrir notificações' }));

    expect(await screen.findByRole('link', { name: 'Ver histórico' })).toHaveAttribute(
      'href', '/assignments/meetings?assignment=past-n1&revision=rev-1',
    );
    expect(screen.queryByRole('button', { name: 'Confirmar' })).not.toBeInTheDocument();
  });
});
