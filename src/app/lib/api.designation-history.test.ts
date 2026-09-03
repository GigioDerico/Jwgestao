import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

type QueryResult = { data: unknown[] | null; error: { message: string } | null };

const { from, responses, queries } = vi.hoisted(() => {
  const responses = new Map<string, QueryResult>();
  const queries: Array<{ table: string; operations: Array<[string, ...unknown[]]> }> = [];
  const from = vi.fn((table: string) => {
    const query = { table, operations: [] as Array<[string, ...unknown[]]> };
    queries.push(query);
    const builder: Record<string, unknown> = {};
    for (const method of ['select', 'gte', 'lte', 'order', 'in']) {
      builder[method] = (...args: unknown[]) => {
        query.operations.push([method, ...args]);
        return builder;
      };
    }
    builder.then = (resolve: (result: QueryResult) => unknown) =>
      Promise.resolve(responses.get(table) ?? { data: [], error: null }).then(resolve);
    return builder;
  });
  return { from, responses, queries };
});

vi.mock('./supabase', () => ({ supabase: { from, rpc: vi.fn() } }));
vi.mock('./offline-cache', () => ({
  readThroughCache: vi.fn(async (_key: string, loader: () => Promise<unknown>) => loader()),
}));

import { api } from './api';

describe('api.getDesignationHistory transfer audit', () => {
  beforeEach(() => {
    from.mockClear();
    responses.clear();
    queries.length = 0;
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-10T12:00:00'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('queries the requested date range and merges audit entries in existing order', async () => {
    responses.set('members', {
      data: [{ id: 'member-current', full_name: 'Zélia' }],
      error: null,
    });
    responses.set('weekend_meetings', {
      data: [{
        id: 'weekend-id',
        date: '2026-08-09',
        president_id: 'member-current',
        watchtower_conductor_id: null,
        watchtower_reader_id: null,
        closing_prayer_id: null,
      }],
      error: null,
    });
    responses.set('member_transfer_assignment_audit', {
      data: [{
        id: 'audit-id',
        source: 'midweek',
        source_type: 'midweek_meeting_role',
        source_id: 'meeting-id',
        slot_key: 'president_id',
        role_label: 'Presidente',
        assignment_date: '2026-08-10',
        member_id: 'member-transferred',
        member_name: 'Ana',
        details: null,
      }],
      error: null,
    });

    const result = await api.getDesignationHistory(1);

    const auditQuery = queries.find(query => query.table === 'member_transfer_assignment_audit');
    expect(auditQuery?.operations).toEqual(expect.arrayContaining([
      ['select', 'id, source, source_type, source_id, slot_key, role_label, assignment_date, member_id, member_name, details'],
      ['gte', 'assignment_date', expect.any(String)],
      ['lte', 'assignment_date', expect.any(String)],
    ]));
    expect(result.map(entry => entry.id)).toEqual([
      'audit:audit-id',
      expect.stringMatching(/^weekend:weekend-id:president:/),
    ]);
  });

  it('throws a contextual error when transfer audit loading fails', async () => {
    responses.set('member_transfer_assignment_audit', {
      data: null,
      error: { message: 'permission denied' },
    });

    await expect(api.getDesignationHistory(1)).rejects.toThrow(
      'Erro ao carregar histórico de transferências: permission denied',
    );
  });
});
