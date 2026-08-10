import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemberTransferDialog } from './MemberTransferDialog';

const member = {
  id: '20000000-0000-0000-0000-000000000002',
  full_name: 'Membro Transferido',
};

const baseProps = {
  member,
  open: true,
  mode: 'transfer' as const,
  loading: false,
  impact: { futureAssignmentCount: 3 },
  onOpenChange: vi.fn(),
  onTransfer: vi.fn().mockResolvedValue(undefined),
  onCancelTransfer: vi.fn().mockResolvedValue(undefined),
};

describe('MemberTransferDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(new Date(2026, 7, 10, 12));
    Object.defineProperty(navigator, 'onLine', { configurable: true, value: true });
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it('composes the shared Radix dialog without ref warnings', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    render(<MemberTransferDialog {...baseProps} />);
    expect(consoleError).not.toHaveBeenCalled();
  });

  it('shows member, local current date, destination limit and plural impact count', () => {
    render(<MemberTransferDialog {...baseProps} />);

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Membro Transferido')).toBeInTheDocument();
    expect(screen.getByLabelText('Data da transferência')).toHaveValue('2026-08-10');
    expect(screen.getByLabelText('Data da transferência')).toHaveAttribute('max', '2026-08-10');
    expect(screen.getByLabelText('Congregação de destino')).toHaveAttribute('maxlength', '150');
    expect(screen.getByText(/3 designações futuras serão removidas/i)).toBeInTheDocument();
  });

  it.each([
    [0, 'Nenhuma designação futura será removida.'],
    [1, '1 designação futura será removida.'],
  ])('formats an impact count of %i', (count, message) => {
    render(<MemberTransferDialog {...baseProps} impact={{ futureAssignmentCount: count }} />);
    expect(screen.getByText(message)).toBeInTheDocument();
  });

  it('disables confirmation while impact is loading', () => {
    render(<MemberTransferDialog {...baseProps} loading impact={null} />);
    expect(screen.getByText(/verificando designações futuras/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Confirmar transferência' })).toBeDisabled();
  });

  it('submits a trimmed destination and selected date', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<MemberTransferDialog {...baseProps} />);

    await user.clear(screen.getByLabelText('Data da transferência'));
    await user.type(screen.getByLabelText('Data da transferência'), '2026-08-09');
    await user.type(screen.getByLabelText('Congregação de destino'), '  Congregação Centro  ');
    await user.click(screen.getByRole('button', { name: 'Confirmar transferência' }));

    expect(baseProps.onTransfer).toHaveBeenCalledWith({
      memberId: member.id,
      transferredAt: '2026-08-09',
      destinationCongregation: 'Congregação Centro',
    });
  });

  it('omits an empty destination and prevents a double submit', async () => {
    let resolveTransfer!: () => void;
    const onTransfer = vi.fn(() => new Promise<void>(resolve => { resolveTransfer = resolve; }));
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<MemberTransferDialog {...baseProps} onTransfer={onTransfer} />);

    const confirm = screen.getByRole('button', { name: 'Confirmar transferência' });
    await user.click(confirm);
    fireEvent.click(confirm);

    expect(onTransfer).toHaveBeenCalledTimes(1);
    expect(onTransfer).toHaveBeenCalledWith({
      memberId: member.id,
      transferredAt: '2026-08-10',
      destinationCongregation: undefined,
    });
    expect(screen.getByRole('button', { name: 'Transferindo...' })).toBeDisabled();
    resolveTransfer();
  });

  it('keeps the dialog open and shows mutation errors', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const onTransfer = vi.fn().mockRejectedValue(new Error('Falha controlada'));
    render(<MemberTransferDialog {...baseProps} onTransfer={onTransfer} />);

    await user.click(screen.getByRole('button', { name: 'Confirmar transferência' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Falha controlada');
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(baseProps.onOpenChange).not.toHaveBeenCalledWith(false);
  });

  it('reacts to offline and online browser events', () => {
    render(<MemberTransferDialog {...baseProps} />);

    fireEvent(window, new Event('offline'));
    expect(screen.getByText(/você precisa estar online/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Confirmar transferência' })).toBeDisabled();

    fireEvent(window, new Event('online'));
    expect(screen.queryByText(/você precisa estar online/i)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Confirmar transferência' })).toBeEnabled();
  });

  it('shows cancellation data and warns that assignments are not restored', () => {
    render(
      <MemberTransferDialog
        {...baseProps}
        member={{
          ...member,
          activeTransfer: {
            id: '40000000-0000-0000-0000-000000000001',
            transferredAt: '2026-08-09',
            destinationCongregation: 'Congregação Norte',
            createdAt: '2026-08-10T12:00:00Z',
          },
        }}
        mode="cancel"
      />,
    );

    expect(screen.getByText('09/08/2026')).toBeInTheDocument();
    expect(screen.getByText('Congregação Norte')).toBeInTheDocument();
    expect(screen.getByText(/status, grupo e acesso ao sistema serão restaurados/i)).toBeInTheDocument();
    expect(screen.getByText(/designações removidas não serão restauradas/i)).toBeInTheDocument();
  });

  it('cancels by the active transfer id and prevents a double submit', async () => {
    let resolveCancel!: () => void;
    const onCancelTransfer = vi.fn(() => new Promise<void>(resolve => { resolveCancel = resolve; }));
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(
      <MemberTransferDialog
        {...baseProps}
        member={{
          ...member,
          activeTransfer: {
            id: 'transfer-id',
            transferredAt: '2026-08-10',
            destinationCongregation: null,
            createdAt: '2026-08-10T12:00:00Z',
          },
        }}
        mode="cancel"
        onCancelTransfer={onCancelTransfer}
      />,
    );

    const confirm = screen.getByRole('button', { name: 'Cancelar transferência' });
    await user.click(confirm);
    fireEvent.click(confirm);

    expect(onCancelTransfer).toHaveBeenCalledTimes(1);
    expect(onCancelTransfer).toHaveBeenCalledWith('transfer-id');
    resolveCancel();
  });

  it('resets form and error when the member, mode, open state changes', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const onTransfer = vi.fn().mockRejectedValue(new Error('Erro antigo'));
    const view = render(<MemberTransferDialog {...baseProps} onTransfer={onTransfer} />);

    await user.type(screen.getByLabelText('Congregação de destino'), 'Destino antigo');
    await user.click(screen.getByRole('button', { name: 'Confirmar transferência' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Erro antigo');

    view.rerender(
      <MemberTransferDialog
        {...baseProps}
        member={{ ...member, id: 'outro-id', full_name: 'Outro membro' }}
      />,
    );

    await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument());
    expect(screen.getByLabelText('Congregação de destino')).toHaveValue('');
    expect(screen.getByLabelText('Data da transferência')).toHaveValue('2026-08-10');

    await user.type(screen.getByLabelText('Congregação de destino'), 'Outro destino');
    view.rerender(
      <MemberTransferDialog
        {...baseProps}
        member={{
          ...member,
          id: 'outro-id',
          activeTransfer: {
            id: 'transfer-id',
            transferredAt: '2026-08-10',
            destinationCongregation: null,
            createdAt: '2026-08-10T12:00:00Z',
          },
        }}
        mode="cancel"
      />,
    );
    view.rerender(
      <MemberTransferDialog
        {...baseProps}
        member={{ ...member, id: 'outro-id' }}
        mode="transfer"
      />,
    );
    expect(screen.getByLabelText('Congregação de destino')).toHaveValue('');

    await user.type(screen.getByLabelText('Congregação de destino'), 'Destino ao fechar');
    view.rerender(<MemberTransferDialog {...baseProps} member={{ ...member, id: 'outro-id' }} open={false} />);
    view.rerender(<MemberTransferDialog {...baseProps} member={{ ...member, id: 'outro-id' }} open />);
    expect(screen.getByLabelText('Congregação de destino')).toHaveValue('');
  });

  it('does not allow closing while a mutation is running', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const onTransfer = vi.fn(() => new Promise<void>(() => undefined));
    render(<MemberTransferDialog {...baseProps} onTransfer={onTransfer} />);

    await user.click(screen.getByRole('button', { name: 'Confirmar transferência' }));
    expect(screen.getByRole('button', { name: 'Voltar' })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: 'Close' }));
    expect(baseProps.onOpenChange).not.toHaveBeenCalledWith(false);
  });
});
