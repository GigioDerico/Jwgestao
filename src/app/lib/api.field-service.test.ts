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

describe('field service assignment notifications', () => {
  beforeEach(() => {
    from.mockClear();
    responses.clear();
    queries.length = 0;
  });

  const notificationSlots = () =>
    queries
      .filter(query => query.table === 'member_assignment_notifications')
      .flatMap(query =>
        query.operations
          .filter(([method]) => method === 'eq')
          .filter(([, column]) => column === 'slot_key')
          .map(([, , value]) => value),
      );

  it('creates a notification slot for the second responsible', async () => {
    responses.set('field_service_assignments', {
      data: {
        ...baseRow,
        responsible_2: 'Maria Souza',
        responsible_2_member_id: 'member-2',
      },
      error: null,
    });

    await api.syncFieldServiceAssignmentNotifications('assignment-1');

    expect(notificationSlots()).toContain('responsible');
    expect(notificationSlots()).toContain('responsible_2');
  });

  it('revokes the second slot when the second responsible is removed', async () => {
    responses.set('field_service_assignments', {
      data: { ...baseRow, responsible_2: null, responsible_2_member_id: null },
      error: null,
    });

    await api.syncFieldServiceAssignmentNotifications('assignment-1');

    // O slot continua sendo visitado mesmo sem membro: é assim que uma
    // notificação anterior do segundo dirigente é revogada.
    const revokedResponsible2 = queries
      .filter(query => query.table === 'member_assignment_notifications')
      .filter(query =>
        query.operations.some(([method, column, value]) =>
          method === 'eq' && column === 'slot_key' && value === 'responsible_2',
        ),
      )
      .some(query =>
        query.operations.some(([method, payload]) =>
          method === 'update' && (payload as { status?: string })?.status === 'revoked',
        ),
      );
    expect(revokedResponsible2).toBe(true);
  });
});

describe('field service designation history', () => {
  beforeEach(() => {
    from.mockClear();
    responses.clear();
    queries.length = 0;
  });

  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;

  it('emits one entry per responsible when both are set', async () => {
    responses.set('members', {
      data: [
        { id: 'member-1', full_name: 'João Silva' },
        { id: 'member-2', full_name: 'Maria Souza' },
      ],
      error: null,
    });
    responses.set('field_service_assignments', {
      data: [{
        id: 'assignment-1',
        month: currentMonth,
        year: currentYear,
        category: 'Segunda-feira',
        weekday: 'Segunda-feira',
        responsible: 'João Silva',
        responsible_member_id: 'member-1',
        responsible_2: 'Maria Souza',
        responsible_2_member_id: 'member-2',
      }],
      error: null,
    });

    const result = await api.getDesignationHistory(1);
    const fieldService = result.filter(entry => entry.source === 'field_service');

    expect(fieldService.map(entry => entry.memberName).sort()).toEqual([
      'João Silva',
      'Maria Souza',
    ]);
    expect(fieldService.map(entry => entry.roleKey).sort()).toEqual([
      'responsible',
      'responsible_2',
    ]);
    expect(fieldService.every(entry => entry.roleLabel === 'Responsável')).toBe(true);
  });

  it('emits a single entry when there is no second responsible', async () => {
    responses.set('members', {
      data: [{ id: 'member-1', full_name: 'João Silva' }],
      error: null,
    });
    responses.set('field_service_assignments', {
      data: [{
        id: 'assignment-1',
        month: currentMonth,
        year: currentYear,
        category: 'Segunda-feira',
        weekday: 'Segunda-feira',
        responsible: 'João Silva',
        responsible_member_id: 'member-1',
        responsible_2: null,
        responsible_2_member_id: null,
      }],
      error: null,
    });

    const result = await api.getDesignationHistory(1);
    const fieldService = result.filter(entry => entry.source === 'field_service');

    expect(fieldService).toHaveLength(1);
    expect(fieldService[0].memberName).toBe('João Silva');
  });
});
