import { beforeEach, describe, expect, it, vi } from 'vitest';

const { rpc, from, select, eq, single, maybeSingle } = vi.hoisted(() => {
  const rpc = vi.fn();
  const single = vi.fn();
  const maybeSingle = vi.fn();
  const eq = vi.fn(() => ({ single, maybeSingle }));
  const select = vi.fn(() => ({ eq }));
  const from = vi.fn(() => ({ select }));
  return { rpc, from, select, eq, single, maybeSingle };
});

vi.mock('./supabase', () => ({ supabase: { from, rpc } }));
vi.mock('./offline-cache', () => ({ readThroughCache: vi.fn(async (_key: string, load: () => Promise<unknown>) => load()) }));

import { api } from './api';

describe('api.updateMidweekMeeting', () => {
  beforeEach(() => {
    rpc.mockReset().mockResolvedValue({ data: 'meeting-id', error: null });
    from.mockClear();
    select.mockClear();
    eq.mockClear();
    single.mockReset().mockResolvedValue({ data: { id: 'meeting-id', ministry_parts: [], christian_life_parts: [] }, error: null });
    maybeSingle.mockReset().mockResolvedValue({ data: { meeting_id: 'meeting-id' }, error: null });
  });

  it('sends persisted part IDs and ordering to the atomic RPC, then returns the reloaded meeting', async () => {
    const input = {
      date: '2026-10-12',
      bible_reading: 'Salmos 1',
      ministry_parts: [
        { id: 'part-b', title: 'Parte B', duration: 5, scheduled_time: '20:05' },
        { id: 'part-a', title: 'Parte A', duration: 4, scheduled_time: '20:10' },
        { title: 'Nova parte', duration: 3, scheduled_time: '20:14' },
      ],
      christian_life_parts: [{ id: 'life-a', title: 'Consideração', duration: 10, scheduled_time: '20:20' }],
    } as any;

    const result = await api.updateMidweekMeeting('meeting-id', input);

    expect(rpc).toHaveBeenCalledWith('update_midweek_program', {
      p_meeting_id: 'meeting-id',
      p_input: expect.objectContaining({
        date: '2026-10-12',
        ministry_parts: input.ministry_parts,
        christian_life_parts: input.christian_life_parts,
      }),
    });
    expect(result).toEqual({ id: 'meeting-id', ministry_parts: [], christian_life_parts: [] });
  });

  it('does not reload or report success when the transactional RPC rejects the edit', async () => {
    rpc.mockResolvedValue({ data: null, error: { message: 'meeting_part_id_invalid' } });

    await expect(api.updateMidweekMeeting('meeting-id', { date: '2026-10-12', bible_reading: 'Salmos 1' }))
      .rejects.toThrow('meeting_part_id_invalid');
    expect(from).not.toHaveBeenCalled();
  });

  it('reconciles through the database wrapper for the meeting header', async () => {
    await api.syncMidweekMeetingNotifications('meeting-id');
    expect(rpc).toHaveBeenCalledWith('reconcile_meeting_assignment_notifications', {
      p_kind: 'midweek', p_meeting_id: 'meeting-id',
    });
    expect(from).not.toHaveBeenCalled();
  });

  it('resolves a part parent before reconciling its meeting', async () => {
    await api.syncMidweekMinistryPartNotifications('part-id');
    expect(from).toHaveBeenCalledWith('midweek_ministry_parts');
    expect(select).toHaveBeenCalledWith('meeting_id');
    expect(eq).toHaveBeenCalledWith('id', 'part-id');
    expect(rpc).toHaveBeenCalledWith('reconcile_meeting_assignment_notifications', {
      p_kind: 'midweek', p_meeting_id: 'meeting-id',
    });
  });
});
