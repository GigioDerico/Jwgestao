import { beforeEach, describe, expect, it, vi } from 'vitest';

const { from, updates } = vi.hoisted(() => {
  const updates: Array<{ table: string; payload: Record<string, unknown> }> = [];
  const from = vi.fn((table: string) => {
    const builder: Record<string, unknown> = {};
    builder.update = (payload: Record<string, unknown>) => {
      updates.push({ table, payload });
      return builder;
    };
    builder.eq = () => Promise.resolve({ error: null });
    return builder;
  });
  return { from, updates };
});

vi.mock('./supabase', () => ({ supabase: { from, rpc: vi.fn() } }));
vi.mock('./offline-cache', () => ({ readThroughCache: vi.fn(async (_key: string, loader: () => Promise<unknown>) => loader()) }));

import { api } from './api';

describe('meeting notification hiding', () => {
  beforeEach(() => { from.mockClear(); updates.length = 0; });

  it('sets hidden_at without mutating the response status', async () => {
    await api.hideAssignmentNotification('notification-1');
    expect(from).toHaveBeenCalledWith('member_assignment_notifications');
    expect(updates[0].table).toBe('member_assignment_notifications');
    expect(updates[0].payload).toHaveProperty('hidden_at');
    expect(updates[0].payload).not.toHaveProperty('status');
  });
});
