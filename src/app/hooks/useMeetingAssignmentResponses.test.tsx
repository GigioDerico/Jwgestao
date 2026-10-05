import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getResponses, onHandlers, channel, removeChannel } = vi.hoisted(() => {
  const onHandlers: Array<(payload: any) => void> = [];
  const channel: any = { on: vi.fn(), subscribe: vi.fn() };
  channel.on.mockImplementation((_event: string, _filter: any, handler: (payload: any) => void) => {
    onHandlers.push(handler);
    return channel;
  });
  channel.subscribe.mockReturnValue(channel);
  return { getResponses: vi.fn(), onHandlers, channel, removeChannel: vi.fn() };
});

vi.mock('../lib/meeting-assignments', () => ({ getMeetingAssignmentResponses: getResponses }));
vi.mock('../lib/supabase', () => ({ supabase: {
  channel: vi.fn(() => channel),
  removeChannel,
} }));

import { useMeetingAssignmentResponses } from './useMeetingAssignmentResponses';

describe('useMeetingAssignmentResponses', () => {
  beforeEach(() => {
    getResponses.mockReset().mockResolvedValue([]);
    onHandlers.splice(0);
    channel.on.mockClear();
    channel.on.mockImplementation((_event: string, _filter: any, handler: (payload: any) => void) => {
      onHandlers.push(handler);
      return channel;
    });
    channel.subscribe.mockClear();
    removeChannel.mockClear();
  });

  it('loads once, refreshes on focus and matching realtime updates, and cleans up', async () => {
    const { unmount } = renderHook(() => useMeetingAssignmentResponses('midweek', 'meeting-1', ['meeting-1', 'part-1'], true));
    await waitFor(() => expect(getResponses).toHaveBeenCalledTimes(1));

    act(() => window.dispatchEvent(new Event('focus')));
    await waitFor(() => expect(getResponses).toHaveBeenCalledTimes(2));

    act(() => onHandlers[0]({ new: { source_id: 'other-part' }, old: {} }));
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(getResponses).toHaveBeenCalledTimes(2);

    act(() => onHandlers[0]({ new: { source_id: 'part-1' }, old: {} }));
    await waitFor(() => expect(getResponses).toHaveBeenCalledTimes(3));

    unmount();
    act(() => window.dispatchEvent(new Event('focus')));
    expect(removeChannel).toHaveBeenCalledTimes(1);
    expect(getResponses).toHaveBeenCalledTimes(3);
  });

  it('clears responses on meeting changes and ignores older overlapping requests', async () => {
    let resolveFirst!: (rows: any[]) => void;
    let resolveSecond!: (rows: any[]) => void;
    let resolveNewMeeting!: (rows: any[]) => void;
    getResponses
      .mockReturnValueOnce(new Promise(resolve => { resolveFirst = resolve; }))
      .mockReturnValueOnce(new Promise(resolve => { resolveSecond = resolve; }))
      .mockReturnValueOnce(new Promise(resolve => { resolveNewMeeting = resolve; }));
    const stale = { id: 'old', memberName: 'Designação antiga' } as any;
    const refreshed = { id: 'refreshed', memberName: 'Resposta atualizada' } as any;
    const current = { id: 'current', memberName: 'Designação atual' } as any;
    const { result, rerender } = renderHook(
      ({ meetingId }) => useMeetingAssignmentResponses('midweek', meetingId, [meetingId], true),
      { initialProps: { meetingId: 'meeting-1' } },
    );
    await waitFor(() => expect(getResponses).toHaveBeenCalledTimes(1));

    act(() => window.dispatchEvent(new Event('focus')));
    await waitFor(() => expect(getResponses).toHaveBeenCalledTimes(2));
    resolveSecond([refreshed]);
    await waitFor(() => expect(result.current).toEqual([refreshed]));
    resolveFirst([stale]);
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(result.current).toEqual([refreshed]);

    rerender({ meetingId: 'meeting-2' });
    expect(result.current).toEqual([]);
    await waitFor(() => expect(getResponses).toHaveBeenCalledTimes(3));
    resolveNewMeeting([current]);
    await waitFor(() => expect(result.current).toEqual([current]));
    expect(result.current).toEqual([current]);
  });
});
