import { beforeEach, describe, expect, it, vi } from 'vitest';

type QueryResult = { data: unknown; error: { message: string } | null };

const { from, queries } = vi.hoisted(() => {
  const queries: Array<{ table: string; operations: Array<[string, ...unknown[]]> }> = [];
  const from = vi.fn((table: string) => {
    const query = { table, operations: [] as Array<[string, ...unknown[]]> };
    queries.push(query);
    const builder: Record<string, unknown> = {};
    for (const method of ['select', 'eq']) {
      builder[method] = (...args: unknown[]) => {
        query.operations.push([method, ...args]);
        return builder;
      };
    }
    builder.maybeSingle = () => {
      query.operations.push(['maybeSingle']);
      return Promise.resolve({ data: { id: `${table}-1` }, error: null } satisfies QueryResult);
    };
    return builder;
  });
  return { from, queries };
});

vi.mock('./supabase', () => ({ supabase: { from, rpc: vi.fn() } }));
vi.mock('./offline-cache', () => ({
  readThroughCache: vi.fn(async (_key: string, loader: () => Promise<unknown>) => loader()),
}));

import { api } from './api';

describe('assignment calendar API lookups', () => {
  beforeEach(() => {
    from.mockClear();
    queries.length = 0;
  });

  it('loads an audio/video assignment without nonexistent meeting relations', async () => {
    await api.getAudioVideoAssignmentById('audio-1');

    expect(queries).toEqual([{
      table: 'audio_video_assignments',
      operations: [
        ['select', '*'],
        ['eq', 'id', 'audio-1'],
        ['maybeSingle'],
      ],
    }]);
  });

  it('loads midweek and weekend meetings by exact date', async () => {
    await api.getMidweekMeetingByDate('2026-09-16');
    await api.getWeekendMeetingByDate('2026-09-20');

    expect(queries).toEqual([
      {
        table: 'midweek_meetings',
        operations: [
          ['select', '*'],
          ['eq', 'date', '2026-09-16'],
          ['maybeSingle'],
        ],
      },
      {
        table: 'weekend_meetings',
        operations: [
          ['select', '*'],
          ['eq', 'date', '2026-09-20'],
          ['maybeSingle'],
        ],
      },
    ]);
  });
});
