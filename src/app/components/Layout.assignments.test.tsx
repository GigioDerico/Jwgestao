import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Layout } from './Layout';

let role = 'publicador';
let viewPermission = true;
vi.mock('../context/AuthContext', () => ({ useAuth: () => ({
  user: { id: 'user-1', name: 'Ana Lima', role, approved_audio_video: true, approved_carrinho: true },
  logout: vi.fn(), loading: false,
}) }));
vi.mock('../context/NotificationsContext', () => ({ useNotifications: () => ({
  notifications: [], unreadCount: 0, pendingCount: 0, loading: false,
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
  beforeEach(() => { role = 'publicador'; viewPermission = true; });
  it('shows only Reunião under Designações for a Publicador with assignment view permission', () => {
    renderLayout();
    expect(screen.getByRole('button', { name: 'Reunião' })).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Áudio e Vídeo' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Saída de Campo' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Carrinho' })).not.toBeInTheDocument();
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
});
