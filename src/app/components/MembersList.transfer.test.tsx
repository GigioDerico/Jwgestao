import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MembersList } from './MembersList';

const mocks = vi.hoisted(() => ({
  getMembers: vi.fn(),
  updateMember: vi.fn(),
  clearReadCache: vi.fn(),
  previewMemberTransfer: vi.fn(),
  transferMember: vi.fn(),
  cancelMemberTransfer: vi.fn(),
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
  toastWarning: vi.fn(),
  canEdit: true,
  authUser: {
    id: 'auth-user-uuid',
    member_id: 'self-member-id',
    role: 'coordenador',
  } as { id: string; member_id?: string; role: string } | null,
}));

vi.mock('../lib/api', () => ({
  api: {
    getMembers: mocks.getMembers,
    updateMember: mocks.updateMember,
  },
}));

vi.mock('../lib/offline-cache', () => ({
  clearReadCache: mocks.clearReadCache,
}));

vi.mock('../lib/member-transfer', () => ({
  previewMemberTransfer: mocks.previewMemberTransfer,
  transferMember: mocks.transferMember,
  cancelMemberTransfer: mocks.cancelMemberTransfer,
}));

vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({ user: mocks.authUser, isAdmin: false }),
}));

vi.mock('../hooks/usePermissions', () => ({
  usePermissions: () => ({
    can: (permission: string) => permission === 'edit_members' ? mocks.canEdit : true,
  }),
}));

vi.mock('../lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockResolvedValue({ data: [], error: null }),
    })),
  },
}));

vi.mock('../lib/member-export', () => ({
  generateMemberListPdf: vi.fn(),
  generateMemberListExcel: vi.fn(),
}));

vi.mock('sonner', () => ({
  toast: {
    success: mocks.toastSuccess,
    error: mocks.toastError,
    warning: mocks.toastWarning,
    info: vi.fn(),
    loading: vi.fn(),
    dismiss: vi.fn(),
  },
}));

function rawMember(
  id: string,
  fullName: string,
  activeTransfer?: {
    id: string;
    transferredAt: string;
    destinationCongregation: string | null;
    createdAt: string;
  },
) {
  return {
    id,
    full_name: fullName,
    email: `${id}@example.com`,
    phone: '11999999999',
    spiritual_status: 'publicador',
    gender: 'M',
    roles: [],
    activeTransfer,
  };
}

function memberCard(name: string) {
  const label = screen.getByText(name);
  const button = label.closest('button');
  if (!button) throw new Error(`Card de ${name} não encontrado`);
  return button;
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(resolvePromise => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
}

describe('MembersList member transfer workflow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.canEdit = true;
    mocks.authUser = { id: 'auth-user-uuid', member_id: 'self-member-id', role: 'coordenador' };
    Object.defineProperty(navigator, 'onLine', { configurable: true, value: true });
    Object.defineProperty(Element.prototype, 'scrollIntoView', {
      configurable: true,
      value: vi.fn(),
    });
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation(callback => {
      callback(0);
      return 1;
    });
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => undefined);
    mocks.getMembers.mockResolvedValue([
      rawMember('self-member-id', 'Próprio membro'),
      rawMember('eligible-member-id', 'Membro elegível'),
      rawMember('transferred-member-id', 'Membro já transferido', {
        id: 'active-transfer-id',
        transferredAt: '2026-08-09',
        destinationCongregation: 'Congregação Norte',
        createdAt: '2026-08-09T12:00:00Z',
      }),
    ]);
    mocks.previewMemberTransfer.mockResolvedValue({ futureAssignmentCount: 2 });
    mocks.transferMember.mockResolvedValue({ transferId: 'new-transfer-id', removedAssignmentCount: 2 });
    mocks.cancelMemberTransfer.mockResolvedValue(undefined);
    mocks.updateMember.mockResolvedValue(undefined);
    mocks.clearReadCache.mockResolvedValue(undefined);
  });

  it('shows actions only with permission, online, not self, and according to active transfer', async () => {
    const user = userEvent.setup();
    const view = render(<MembersList />);
    await screen.findByText('Membro elegível');

    await user.click(memberCard('Próprio membro'));
    expect(screen.queryByRole('button', { name: 'Transferir de congregação' })).not.toBeInTheDocument();

    await user.click(memberCard('Membro elegível'));
    expect(screen.getByRole('button', { name: 'Transferir de congregação' })).toBeInTheDocument();

    await user.click(memberCard('Membro já transferido'));
    expect(screen.getByText('Transferido')).toBeInTheDocument();
    expect(screen.getByText(/09\/08\/2026/)).toBeInTheDocument();
    expect(screen.getByText(/Congregação Norte/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cancelar transferência' })).toBeInTheDocument();

    fireEvent(window, new Event('offline'));
    expect(screen.queryByRole('button', { name: 'Cancelar transferência' })).not.toBeInTheDocument();

    fireEvent(window, new Event('online'));
    mocks.canEdit = false;
    view.rerender(<MembersList />);
    expect(screen.queryByRole('button', { name: 'Cancelar transferência' })).not.toBeInTheDocument();
  });

  it('ignores a stale transfer preview after opening a different member', async () => {
    const firstPreview = deferred<{ futureAssignmentCount: number }>();
    const secondPreview = deferred<{ futureAssignmentCount: number }>();
    mocks.previewMemberTransfer
      .mockReturnValueOnce(firstPreview.promise)
      .mockReturnValueOnce(secondPreview.promise);
    const user = userEvent.setup();
    render(<MembersList />);
    await screen.findByText('Membro elegível');

    await user.click(memberCard('Membro elegível'));
    await user.click(screen.getByRole('button', { name: 'Transferir de congregação' }));
    expect(mocks.previewMemberTransfer).toHaveBeenCalledWith('eligible-member-id');
    await user.click(screen.getByRole('button', { name: 'Voltar' }));

    await user.click(memberCard('Próprio membro'));
    await user.click(memberCard('Membro elegível'));
    mocks.authUser = { id: 'auth-user-uuid', member_id: 'another-member-id', role: 'coordenador' };
    await user.click(memberCard('Próprio membro'));
    await user.click(screen.getByRole('button', { name: 'Transferir de congregação' }));
    expect(mocks.previewMemberTransfer).toHaveBeenLastCalledWith('self-member-id');

    await act(async () => secondPreview.resolve({ futureAssignmentCount: 1 }));
    expect(await screen.findByText(/1 designação futura será removida/i)).toBeInTheDocument();
    await act(async () => firstPreview.resolve({ futureAssignmentCount: 9 }));
    expect(screen.queryByText(/9 designações futuras serão removidas/i)).not.toBeInTheDocument();
    expect(screen.getByText(/1 designação futura será removida/i)).toBeInTheDocument();
  });

  it('transfers, refetches, collapses and reports the removed count', async () => {
    const user = userEvent.setup();
    render(<MembersList />);
    await screen.findByText('Membro elegível');

    await user.click(memberCard('Membro elegível'));
    await user.click(screen.getByRole('button', { name: 'Transferir de congregação' }));
    await screen.findByText(/2 designações futuras serão removidas/i);
    await user.type(screen.getByLabelText('Congregação de destino'), '  Congregação Sul  ');
    await user.click(screen.getByRole('button', { name: 'Confirmar transferência' }));

    await waitFor(() => expect(mocks.transferMember).toHaveBeenCalledWith(expect.objectContaining({
      memberId: 'eligible-member-id',
      destinationCongregation: 'Congregação Sul',
    })));
    await waitFor(() => expect(mocks.getMembers).toHaveBeenCalledTimes(2));
    expect(mocks.toastSuccess).toHaveBeenCalledWith(expect.stringMatching(/2 designações futuras removidas/i));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Transferir de congregação' })).not.toBeInTheDocument();
  });

  it('keeps preview errors in the flow and disables confirmation', async () => {
    mocks.previewMemberTransfer.mockRejectedValue(new Error('Prévia indisponível'));
    const user = userEvent.setup();
    render(<MembersList />);
    await screen.findByText('Membro elegível');

    await user.click(memberCard('Membro elegível'));
    await user.click(screen.getByRole('button', { name: 'Transferir de congregação' }));

    expect(await screen.findByText(/não foi possível carregar o impacto/i)).toBeInTheDocument();
    expect(mocks.toastError).toHaveBeenCalledWith('Prévia indisponível');
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Confirmar transferência' })).toBeDisabled();
  });

  it('cancels by transfer id, refetches, collapses and explains assignments are not restored', async () => {
    const active = rawMember('transferred-member-id', 'Membro já transferido', {
      id: 'active-transfer-id',
      transferredAt: '2026-08-09',
      destinationCongregation: 'Congregação Norte',
      createdAt: '2026-08-09T12:00:00Z',
    });
    mocks.getMembers
      .mockResolvedValueOnce([active])
      .mockResolvedValueOnce([rawMember('transferred-member-id', 'Membro já transferido')]);
    const user = userEvent.setup();
    render(<MembersList />);
    await screen.findByText('Membro já transferido');

    await user.click(memberCard('Membro já transferido'));
    await user.click(screen.getByRole('button', { name: 'Cancelar transferência' }));
    const dialog = screen.getByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: 'Cancelar transferência' }));

    await waitFor(() => expect(mocks.cancelMemberTransfer).toHaveBeenCalledWith('active-transfer-id'));
    await waitFor(() => expect(mocks.getMembers).toHaveBeenCalledTimes(2));
    expect(mocks.clearReadCache).toHaveBeenCalledTimes(1);
    expect(mocks.clearReadCache.mock.invocationCallOrder[0]).toBeLessThan(mocks.getMembers.mock.invocationCallOrder[1]);
    expect(mocks.toastSuccess).toHaveBeenCalledWith(expect.stringMatching(/designações removidas não foram restauradas/i));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Cancelar transferência' })).not.toBeInTheDocument();
    await user.click(memberCard('Membro já transferido'));
    expect(screen.getByRole('button', { name: 'Transferir de congregação' })).toBeInTheDocument();
  });

  it('keeps the dialog open and exposes transfer errors in the dialog and toast', async () => {
    mocks.transferMember.mockRejectedValue(new Error('Erro do servidor'));
    const user = userEvent.setup();
    render(<MembersList />);
    await screen.findByText('Membro elegível');

    await user.click(memberCard('Membro elegível'));
    await user.click(screen.getByRole('button', { name: 'Transferir de congregação' }));
    await screen.findByText(/2 designações futuras serão removidas/i);
    await user.click(screen.getByRole('button', { name: 'Confirmar transferência' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Erro do servidor');
    expect(mocks.toastError).toHaveBeenCalledWith('Erro do servidor');
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Confirmar transferência' })).toBeEnabled();
    expect(mocks.getMembers).toHaveBeenCalledTimes(1);
  });

  it('prevents an active transfer from being reactivated or regrouped in the editor', async () => {
    const user = userEvent.setup();
    render(<MembersList />);
    await screen.findByText('Membro já transferido');

    await user.click(memberCard('Membro já transferido'));
    await user.click(screen.getByRole('button', { name: 'Editar Membro' }));

    expect(screen.getByText(/cancele a transferência para alterar situação ou grupo/i)).toBeInTheDocument();
    expect(screen.getByLabelText('Situação Espiritual')).toBeDisabled();
    expect(screen.getByLabelText('Grupo de Saída')).toBeDisabled();
    await user.click(screen.getByRole('button', { name: 'Salvar Alterações' }));

    await waitFor(() => expect(mocks.updateMember).toHaveBeenCalledWith(
      'transferred-member-id',
      expect.objectContaining({ spiritual_status: 'inativo', group_id: undefined }),
    ));
  });

  it('clears read cache before refetch and renders the fresh transferred state', async () => {
    const initial = rawMember('eligible-member-id', 'Membro elegível');
    const transferred = {
      ...rawMember('eligible-member-id', 'Membro elegível', {
        id: 'new-transfer-id',
        transferredAt: '2026-08-10',
        destinationCongregation: 'Congregação Sul',
        createdAt: '2026-08-10T12:00:00Z',
      }),
      spiritual_status: 'inativo',
    };
    mocks.getMembers.mockResolvedValueOnce([initial]).mockResolvedValueOnce([transferred]);
    const user = userEvent.setup();
    render(<MembersList />);
    await screen.findByText('Membro elegível');

    await user.click(memberCard('Membro elegível'));
    await user.click(screen.getByRole('button', { name: 'Transferir de congregação' }));
    await screen.findByText(/2 designações futuras serão removidas/i);
    await user.click(screen.getByRole('button', { name: 'Confirmar transferência' }));

    await waitFor(() => expect(mocks.getMembers).toHaveBeenCalledTimes(2));
    expect(mocks.clearReadCache).toHaveBeenCalledTimes(1);
    expect(mocks.clearReadCache.mock.invocationCallOrder[0]).toBeLessThan(mocks.getMembers.mock.invocationCallOrder[1]);
    await user.click(screen.getByRole('button', { name: 'Filtros' }));
    await user.click(screen.getByRole('button', { name: 'Inativos/Desass.' }));
    await user.click(memberCard('Membro elegível'));
    expect(screen.getByText('Transferido')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cancelar transferência' })).toBeInTheDocument();
  });

  it('keeps an optimistic transferred state when refresh fails without repeating the RPC', async () => {
    mocks.getMembers
      .mockResolvedValueOnce([rawMember('eligible-member-id', 'Membro elegível')])
      .mockRejectedValueOnce(new Error('Sem rede'));
    const user = userEvent.setup();
    render(<MembersList />);
    await screen.findByText('Membro elegível');

    await user.click(memberCard('Membro elegível'));
    await user.click(screen.getByRole('button', { name: 'Transferir de congregação' }));
    await screen.findByText(/2 designações futuras serão removidas/i);
    await user.click(screen.getByRole('button', { name: 'Confirmar transferência' }));
    await waitFor(() => expect(mocks.toastWarning).toHaveBeenCalledWith(expect.stringMatching(/atualização pendente/i)));

    await user.click(screen.getByRole('button', { name: 'Filtros' }));
    await user.click(screen.getByRole('button', { name: 'Inativos/Desass.' }));
    await user.click(memberCard('Membro elegível'));
    expect(screen.getByText('Transferido')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cancelar transferência' })).toBeInTheDocument();
    expect(mocks.transferMember).toHaveBeenCalledTimes(1);
  });
});
