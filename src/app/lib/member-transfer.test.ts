import { beforeEach, describe, expect, it, vi } from 'vitest';
import { supabase } from './supabase';
import {
  cancelMemberTransfer,
  previewMemberTransfer,
  transferMember,
} from './member-transfer';

vi.mock('./supabase', () => ({ supabase: { rpc: vi.fn() } }));

const rpc = vi.mocked(supabase.rpc) as ReturnType<typeof vi.fn>;
const OFFLINE_MESSAGE = 'Você precisa estar online para transferir um membro.';

describe('member-transfer client', () => {
  beforeEach(() => {
    rpc.mockReset();
    Object.defineProperty(navigator, 'onLine', { configurable: true, value: true });
  });

  it.each([
    ['preview', () => previewMemberTransfer('member-id')],
    ['transfer', () => transferMember({ memberId: 'member-id', transferredAt: '2026-08-10' })],
    ['cancel', () => cancelMemberTransfer('transfer-id')],
  ])('blocks %s while offline without calling Supabase', async (_operation, execute) => {
    Object.defineProperty(navigator, 'onLine', { configurable: true, value: false });

    await expect(execute()).rejects.toThrow(OFFLINE_MESSAGE);
    expect(rpc).not.toHaveBeenCalled();
  });

  it.each([
    [{ future_assignment_count: '3' }, 3],
    [[{ future_assignment_count: 4 }], 4],
  ])('previews an object or single-row array response', async (data, expectedCount) => {
    rpc.mockResolvedValue({ data, error: null });

    await expect(previewMemberTransfer('member-id')).resolves.toEqual({
      futureAssignmentCount: expectedCount,
    });
    expect(rpc).toHaveBeenCalledWith('preview_member_transfer', { p_member_id: 'member-id' });
  });

  it('is safe during SSR when navigator is unavailable', async () => {
    const browserNavigator = globalThis.navigator;
    Object.defineProperty(globalThis, 'navigator', { configurable: true, value: undefined });
    rpc.mockResolvedValue({ data: { future_assignment_count: 0 }, error: null });

    try {
      await expect(previewMemberTransfer('member-id')).resolves.toEqual({ futureAssignmentCount: 0 });
    } finally {
      Object.defineProperty(globalThis, 'navigator', { configurable: true, value: browserNavigator });
    }
  });

  it('transfers with snake_case RPC arguments and a trimmed destination', async () => {
    rpc.mockResolvedValue({
      data: [{ transfer_id: 'transfer-id', removed_assignment_count: '3' }],
      error: null,
    });

    await expect(transferMember({
      memberId: 'member-id',
      transferredAt: '2026-08-10',
      destinationCongregation: ' Congregação Centro ',
    })).resolves.toEqual({ transferId: 'transfer-id', removedAssignmentCount: 3 });
    expect(rpc).toHaveBeenCalledWith('transfer_member', {
      p_member_id: 'member-id',
      p_transferred_at: '2026-08-10',
      p_destination_congregation: 'Congregação Centro',
    });
  });

  it.each([undefined, '', '   '])('normalizes an empty destination (%s) to null', async destinationCongregation => {
    rpc.mockResolvedValue({
      data: { transfer_id: 'transfer-id', removed_assignment_count: 0 },
      error: null,
    });

    await transferMember({
      memberId: 'member-id',
      transferredAt: '2026-08-10',
      destinationCongregation,
    });

    expect(rpc).toHaveBeenCalledWith('transfer_member', expect.objectContaining({
      p_destination_congregation: null,
    }));
  });

  it('accepts an object transfer response', async () => {
    rpc.mockResolvedValue({
      data: { transfer_id: 'transfer-id', removed_assignment_count: 2 },
      error: null,
    });

    await expect(transferMember({ memberId: 'member-id', transferredAt: '2026-08-10' }))
      .resolves.toEqual({ transferId: 'transfer-id', removedAssignmentCount: 2 });
  });

  it('cancels with a snake_case RPC argument', async () => {
    rpc.mockResolvedValue({ data: null, error: null });

    await cancelMemberTransfer('transfer-id');

    expect(rpc).toHaveBeenCalledWith('cancel_member_transfer', { p_transfer_id: 'transfer-id' });
  });

  it.each([
    ['preview', () => previewMemberTransfer('member-id')],
    ['transfer', () => transferMember({ memberId: 'member-id', transferredAt: '2026-08-10' })],
    ['cancel', () => cancelMemberTransfer('transfer-id')],
  ])('preserves the Supabase error message for %s', async (_operation, execute) => {
    rpc.mockResolvedValue({ data: null, error: { message: 'Falha do banco' } });

    await expect(execute()).rejects.toThrow('Falha do banco');
  });

  it.each([null, [], {}, { future_assignment_count: null }, { future_assignment_count: 'abc' }])(
    'rejects a malformed preview response: %j',
    async data => {
      rpc.mockResolvedValue({ data, error: null });

      await expect(previewMemberTransfer('member-id')).rejects.toThrow(
        'Resposta inválida ao verificar as designações do membro.',
      );
    },
  );

  it.each([
    null,
    [],
    {},
    { transfer_id: '', removed_assignment_count: 1 },
    { transfer_id: 'transfer-id', removed_assignment_count: null },
    { transfer_id: 'transfer-id', removed_assignment_count: 'abc' },
  ])('rejects a malformed transfer response: %j', async data => {
    rpc.mockResolvedValue({ data, error: null });

    await expect(transferMember({ memberId: 'member-id', transferredAt: '2026-08-10' }))
      .rejects.toThrow('Resposta inválida ao transferir o membro.');
  });
});
