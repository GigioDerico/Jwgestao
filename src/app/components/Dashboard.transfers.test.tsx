import { render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Dashboard } from './Dashboard';

const { apiMock } = vi.hoisted(() => ({
  apiMock: {
    getMembers: vi.fn(),
    getMidweekMeetings: vi.fn().mockResolvedValue([]),
    getWeekendMeetings: vi.fn().mockResolvedValue([]),
    getAppSetting: vi.fn().mockResolvedValue(null),
  },
}));

vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({ user: { name: 'Maria Teste' }, isAdmin: true }),
}));
vi.mock('../context/NotificationsContext', () => ({
  useNotifications: () => ({ notifications: [], confirm: vi.fn(), hideNotification: vi.fn() }),
}));
vi.mock('react-router', () => ({
  useNavigate: () => vi.fn(),
  Link: (props: any) => <a href={props.to}>{props.children}</a>,
}));
vi.mock('../lib/api', () => ({
  api: apiMock,
}));
vi.mock('../lib/supabase', () => ({
  supabase: {},
}));

function statCard(label: string): HTMLElement {
  let element: HTMLElement | null = screen.getByText(label);
  while (element && !within(element).queryByText(/^\d+$/)) {
    element = element.parentElement;
  }
  if (!element) throw new Error(`Stat card not found: ${label}`);
  return element;
}

describe('Dashboard transferred members', () => {
  beforeEach(() => {
    apiMock.getMembers.mockResolvedValue([
      {
        id: 'active-elder',
        full_name: 'Ancião Ativo',
        phone: '',
        spiritual_status: 'publicador_batizado',
        roles: ['anciao'],
      },
      {
        id: 'transferred-elder',
        full_name: 'Ancião Transferido',
        phone: '',
        spiritual_status: 'inativo',
        roles: ['anciao'],
        activeTransfer: { id: 'transfer-id', transferredAt: '2026-08-10' },
      },
    ]);
  });

  it('excludes transferred members from counts and recent members', async () => {
    render(<Dashboard />);

    expect(await screen.findByText('Ancião Ativo')).toBeInTheDocument();
    expect(screen.queryByText('Ancião Transferido')).not.toBeInTheDocument();
    expect(within(statCard('Membros')).getByText('1')).toBeInTheDocument();
    expect(within(statCard('Anciãos')).getByText('1')).toBeInTheDocument();
  });
});
