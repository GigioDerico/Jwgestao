import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ManagedMeetingConfirmations } from './ManagedMeetingConfirmations';
import { getManagedMeetingConfirmations } from '../../lib/meeting-assignments';
vi.mock('../../lib/meeting-assignments', () => ({ getManagedMeetingConfirmations: vi.fn() }));
vi.mock('../../lib/supabase', () => ({ supabase: {
  channel: () => ({ on() { return this; }, subscribe() { return this; } }), removeChannel: vi.fn(),
} }));
const responses = [
  { id: 'refusal', memberId: 'member-1', memberName: 'Ana Lima', category: 'audio_video', sourceType: 'audio_video_role', sourceId: 'audio-1',
    slotKey: 'sound', roleLabel: 'Som', assignmentTitle: 'Áudio e vídeo · Som', partNumber: null, status: 'declined', declineReason: 'Vou viajar com a família.', respondedAt: '2026-10-06T15:00:00Z' },
  { id: 'confirmation', memberId: 'member-2', memberName: 'João Silva', category: 'midweek', sourceType: 'midweek_meeting_role', sourceId: 'meeting-1',
    slotKey: 'president_id', roleLabel: 'Presidente', assignmentTitle: 'Presidente', partNumber: null, status: 'confirmed', declineReason: null },
];
const groups = [{ id: 'meeting-1', kind: 'midweek', date: '2026-10-08', responses },
  { id: 'meeting-2', kind: 'weekend', date: '2026-10-11', responses: [] }];
function renderPanel(props = {}) { return render(<MemoryRouter><ManagedMeetingConfirmations managerId="manager-1" initialMonth="2026-10" canEdit {...props} /></MemoryRouter>); }
describe('ManagedMeetingConfirmations', () => {
  afterEach(() => { vi.useRealTimers(); });
  beforeEach(() => { vi.useFakeTimers({ toFake: ['Date'] }); vi.setSystemTime(new Date('2026-10-06T15:00:00Z')); vi.clearAllMocks(); vi.mocked(getManagedMeetingConfirmations).mockResolvedValue(groups as any); });
  it('excludes past meetings from the list and every counter, keeping today and future meetings', async () => {
    vi.setSystemTime(new Date('2026-10-07T01:00:00Z')); // Still October 6 in São Paulo.
    vi.mocked(getManagedMeetingConfirmations).mockResolvedValue([
      { id: 'past', kind: 'midweek', date: '2026-10-05', responses: [
        ...responses.map(row => ({ ...row, id: `past-${row.id}`, memberName: `Anterior ${row.memberName}` })),
        { ...responses[0], id: 'past-pending', status: 'pending_confirmation' },
      ] },
      { id: 'today', kind: 'midweek', date: '2026-10-06', responses: [responses[0]] },
      { id: 'future', kind: 'weekend', date: '2026-10-11', responses: [responses[1],
        { ...responses[0], id: 'future-pending', memberName: 'Pedro', status: 'pending_confirmation' }] },
    ] as any);
    renderPanel();
    await screen.findByText('Ana Lima');
    expect(screen.queryByText(/Anterior/)).not.toBeInTheDocument();
    expect(screen.queryByText(/5 de outubro/)).not.toBeInTheDocument();
    expect(screen.getByText(/6 de outubro/)).toBeInTheDocument();
    expect(screen.getByText(/11 de outubro/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Todas/ })).toHaveTextContent('3Todas');
    for (const label of ['Recusadas', 'Pendentes', 'Confirmadas']) {
      expect(screen.getByRole('button', { name: new RegExp(label) })).toHaveTextContent(`1${label}`);
    }
  });
  it('shows an appropriate empty state when all meetings have passed', async () => {
    vi.setSystemTime(new Date('2026-11-01T15:00:00Z'));
    renderPanel();
    expect(await screen.findByText('Nenhuma reunião de hoje em diante neste mês.')).toBeVisible();
    expect(screen.getByRole('button', { name: /Todas/ })).toHaveTextContent('0Todas');
  });
  it('groups responses by dated meeting and displays the audio/video refusal reason', async () => {
    const onTreat = vi.fn();
    renderPanel({ onTreat });
    expect(await screen.findByText('Ana Lima')).toBeVisible();
    expect(screen.getByText('Vou viajar com a família.')).toBeVisible();
    expect(screen.getByText('João Silva')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Tratar designação de Ana Lima' })).toBeVisible();
    await userEvent.setup().click(screen.getByRole('button', { name: 'Tratar designação de Ana Lima' }));
    expect(onTreat).toHaveBeenCalledWith(expect.objectContaining({ id: 'meeting-1' }), expect.objectContaining({ id: 'refusal' }));
    expect(screen.getByText(/11 de outubro/)).toBeInTheDocument();
  });
  it('filters refused responses and searches by name', async () => {
    renderPanel();
    await screen.findByText('Ana Lima');
    await userEvent.setup().click(screen.getByRole('button', { name: /Recusadas/ }));
    expect(screen.queryByText('João Silva')).not.toBeInTheDocument();
    await userEvent.setup().type(screen.getByRole('searchbox', { name: 'Buscar nome ou função' }), 'Ninguém');
    expect(screen.getByText('Nenhuma resposta corresponde aos filtros.')).toBeVisible();
  });
  it('shows a retryable error rather than an empty response list', async () => {
    vi.mocked(getManagedMeetingConfirmations).mockRejectedValueOnce(new Error('Conexão interrompida'));
    renderPanel();
    expect(await screen.findByRole('alert')).toHaveTextContent('Conexão interrompida');
    await userEvent.setup().click(screen.getByRole('button', { name: 'Tentar novamente' }));
    expect(await screen.findByText('Ana Lima')).toBeVisible();
  });
  it('reloads the chosen month and clears stale response data', async () => {
    renderPanel();
    await screen.findByText('Ana Lima');
    vi.mocked(getManagedMeetingConfirmations).mockResolvedValue([]);
    await userEvent.setup().click(screen.getByRole('button', { name: 'Próximo mês' }));
    await waitFor(() => expect(getManagedMeetingConfirmations).toHaveBeenLastCalledWith('2026-11'));
    expect(await screen.findByText('Nenhuma reunião de hoje em diante neste mês.')).toBeVisible();
    expect(screen.queryByText('Vou viajar com a família.')).not.toBeInTheDocument();
  });
  it('does not expose response controls without edit permission', async () => {
    renderPanel({ canEdit: false });
    await screen.findByText('Ana Lima');
    expect(screen.queryByRole('button', { name: /Tratar designação/ })).not.toBeInTheDocument();
  });
  it('refreshes responses after a substitution is saved', async () => {
    const panel = renderPanel({ refreshToken: 0 });
    await screen.findByText('Ana Lima');
    vi.mocked(getManagedMeetingConfirmations).mockResolvedValue([]);
    panel.rerender(<ManagedMeetingConfirmations managerId="manager" initialMonth="2026-10" refreshToken={1} />);
    expect(await screen.findByText('Nenhuma reunião de hoje em diante neste mês.')).toBeVisible();
    expect(screen.queryByText('Vou viajar com a família.')).not.toBeInTheDocument();
  });

});
