import { beforeEach, describe, expect, it, vi } from 'vitest';

const { order, select, from } = vi.hoisted(() => {
  const order = vi.fn();
  const select = vi.fn(() => ({ order }));
  const from = vi.fn(() => ({ select }));
  return { order, select, from };
});

vi.mock('./supabase', () => ({ supabase: { from, rpc: vi.fn() } }));
vi.mock('./offline-cache', () => ({
  readThroughCache: vi.fn(async (_key: string, loader: () => Promise<unknown>) => loader()),
}));

import { api } from './api';

describe('api.getMembers', () => {
  beforeEach(() => {
    from.mockClear();
    select.mockClear();
    order.mockReset();
  });

  it('flattens only the active transfer and removes raw joined relations', async () => {
    order.mockResolvedValue({
      data: [{
        id: 'member-id',
        full_name: 'Ana',
        user_profiles: [{ system_role: 'secretario', is_active: false }],
        member_privileges: [{ role: 'pioneiro' }],
        member_transfers: [
          {
            id: 'cancelled-transfer',
            transferred_at: '2026-01-01',
            destination_congregation: 'Norte',
            created_at: '2026-01-01T10:00:00Z',
            cancelled_at: '2026-02-01T10:00:00Z',
          },
          {
            id: 'active-transfer',
            transferred_at: '2026-08-10',
            destination_congregation: 'Centro',
            created_at: '2026-08-10T10:00:00Z',
            cancelled_at: null,
          },
        ],
      }],
      error: null,
    });

    const result = await api.getMembers();

    expect(select).toHaveBeenCalledWith(expect.stringContaining('user_profiles(system_role, is_active)'));
    expect(select).toHaveBeenCalledWith(expect.stringContaining('member_transfers!member_transfers_member_id_fkey'));
    expect(result).toEqual([expect.objectContaining({
      id: 'member-id',
      roles: ['pioneiro'],
      system_role: 'secretario',
      activeTransfer: {
        id: 'active-transfer',
        transferredAt: '2026-08-10',
        destinationCongregation: 'Centro',
        createdAt: '2026-08-10T10:00:00Z',
      },
    })]);
    expect(result[0]).not.toHaveProperty('member_transfers');
    expect(result[0]).not.toHaveProperty('member_privileges');
    expect(result[0]).not.toHaveProperty('user_profiles');
  });

  it('omits activeTransfer when all transfer records are cancelled', async () => {
    order.mockResolvedValue({
      data: [{
        id: 'member-id',
        full_name: 'Ana',
        user_profiles: { system_role: 'publicador', is_active: true },
        member_privileges: [],
        member_transfers: [{
          id: 'cancelled-transfer',
          transferred_at: '2026-01-01',
          destination_congregation: null,
          created_at: '2026-01-01T10:00:00Z',
          cancelled_at: '2026-02-01T10:00:00Z',
        }],
      }],
      error: null,
    });

    const [member] = await api.getMembers();

    expect(member).not.toHaveProperty('activeTransfer');
    expect(member).not.toHaveProperty('member_transfers');
    expect(member.system_role).toBe('publicador');
  });
});
