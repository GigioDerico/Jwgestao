import { beforeEach, describe, expect, it, vi } from 'vitest';

type QueryResult = { data: unknown; error: { message: string } | null };

const { from, responses, queries } = vi.hoisted(() => {
  const responses = new Map<string, QueryResult>();
  const queries: Array<{ table: string; operations: Array<[string, ...unknown[]]> }> = [];
  const from = vi.fn((table: string) => {
    const query = { table, operations: [] as Array<[string, ...unknown[]]> };
    queries.push(query);
    const builder: Record<string, unknown> = {};
    for (const method of ['select', 'insert', 'update', 'upsert', 'delete', 'eq', 'neq', 'gte', 'lte', 'order', 'in']) {
      builder[method] = (...args: unknown[]) => {
        query.operations.push([method, ...args]);
        return builder;
      };
    }
    const resolveFor = () => Promise.resolve(responses.get(table) ?? { data: [], error: null });
    builder.single = resolveFor;
    builder.maybeSingle = resolveFor;
    builder.then = (resolve: (result: QueryResult) => unknown) => resolveFor().then(resolve);
    return builder;
  });
  return { from, responses, queries };
});

vi.mock('./supabase', () => ({ supabase: { from, rpc: vi.fn() } }));
vi.mock('./offline-cache', () => ({
  readThroughCache: vi.fn(async (_key: string, loader: () => Promise<unknown>) => loader()),
}));

import { api } from './api';

const baseRow = {
  id: 'assignment-1',
  month: 9,
  year: 2026,
  weekday: 'Segunda-feira',
  time: '08:45',
  responsible: 'João Silva',
  responsible_member_id: 'member-1',
  location: 'Salão do Reino',
  category: 'Segunda-feira',
};

describe('field service assignments mapping', () => {
  beforeEach(() => {
    from.mockClear();
    responses.clear();
    queries.length = 0;
  });

  it('exposes the second responsible when it is set', async () => {
    responses.set('field_service_assignments', {
      data: [{
        ...baseRow,
        responsible_2: 'Maria Souza',
        responsible_2_member_id: 'member-2',
      }],
      error: null,
    });

    const [assignment] = await api.getFieldServiceAssignments(8, 2026);

    expect(assignment.responsible).toBe('João Silva');
    expect(assignment.responsible2).toBe('Maria Souza');
    expect(assignment.responsible2MemberId).toBe('member-2');
  });

  it('normalizes a missing second responsible to null', async () => {
    responses.set('field_service_assignments', {
      data: [{ ...baseRow, responsible_2: null, responsible_2_member_id: null }],
      error: null,
    });

    const [assignment] = await api.getFieldServiceAssignments(8, 2026);

    expect(assignment.responsible2).toBeNull();
    expect(assignment.responsible2MemberId).toBeNull();
  });
});
