import { beforeEach, describe, expect, it, vi } from 'vitest';

const { rpc } = vi.hoisted(() => ({ rpc: vi.fn() }));
vi.mock('./supabase', () => ({ supabase: { rpc } }));

import {
  getPersonalMeetings,
  getPersonalMeetingAssignments,
  getMeetingAssignmentResponses,
  resolvePersonalAssignment,
  respondToMeetingAssignment,
  isMeetingDatePast,
} from './meeting-assignments';

describe('personal meeting assignment API', () => {
  beforeEach(() => rpc.mockReset());

  it('maps an empty meeting list without caching personal data', async () => {
    rpc.mockResolvedValue({ data: [], error: null });
    await expect(getPersonalMeetings('upcoming')).resolves.toEqual([]);
    expect(rpc).toHaveBeenCalledWith('get_personal_meetings', { p_period: 'upcoming' });
  });

  it('cuts off historical dates at midnight in Sao Paulo, not UTC', () => {
    const beforeLocalMidnight = new Date('2026-10-06T02:59:00Z');
    const afterLocalMidnight = new Date('2026-10-06T03:01:00Z');
    expect(isMeetingDatePast('2026-10-05', beforeLocalMidnight)).toBe(false);
    expect(isMeetingDatePast('2026-10-05', afterLocalMidnight)).toBe(true);
  });

  it('maps only nullable-safe personal assignment fields', async () => {
    rpc.mockResolvedValue({ data: [{
      notification: null, revision: null, meeting_id: 'm1', meeting_kind: 'midweek', date: '2026-10-06',
      role_label: 'Estudante', title: 'Consideração', part_number: 3, time: null, duration: 5,
      location: null, partner_name: null, can_respond: false,
    }], error: null });
    const [assignment] = await getPersonalMeetingAssignments('midweek', 'm1');
    expect(assignment).toMatchObject({
      notification: null, revision: null, meetingId: 'm1', title: 'Consideração', time: null,
      location: null, partnerName: null, canRespond: false,
    });
    expect(JSON.stringify(assignment)).not.toMatch(/phone|declineReason|otherMember/i);
    expect(rpc).toHaveBeenCalledWith('get_personal_meeting_assignments', { p_kind: 'midweek', p_meeting_id: 'm1' });
  });

  it('does not replace a stale link version with the fresh version', async () => {
    rpc.mockResolvedValue({ data: { kind: 'changed', current_path: '/assignments/meetings?assignment=123e4567-e89b-42d3-a456-426614174002&revision=123e4567-e89b-42d3-a456-426614174003' }, error: null });
    await expect(resolvePersonalAssignment('123e4567-e89b-42d3-a456-426614174000', '123e4567-e89b-42d3-a456-426614174001')).resolves.toEqual({
      kind: 'changed', currentPath: '/assignments/meetings?assignment=123e4567-e89b-42d3-a456-426614174002&revision=123e4567-e89b-42d3-a456-426614174003&view=personal',
    });
  });

  it('builds the RPC current-path contract with the assignment parameter', async () => {
    const { buildMeetingResponseReviewPath } = await import('./meeting-assignments');
    expect(buildMeetingResponseReviewPath('123e4567-e89b-42d3-a456-426614174000', '123e4567-e89b-42d3-a456-426614174001'))
      .toBe('/assignments/meetings?assignment=123e4567-e89b-42d3-a456-426614174000&revision=123e4567-e89b-42d3-a456-426614174001&view=personal');
  });

  it('rejects malformed notification IDs or revisions before calling the response RPC', async () => {
    await expect(resolvePersonalAssignment('bad', 'bad')).resolves.toEqual({ kind: 'unavailable' });
    expect(rpc).not.toHaveBeenCalled();
  });

  it('rejects a changed destination that does not identify the current version', async () => {
    rpc.mockResolvedValue({ data: { kind: 'changed', current_path: '/assignments/meetings' }, error: null });
    await expect(resolvePersonalAssignment('123e4567-e89b-42d3-a456-426614174000', '123e4567-e89b-42d3-a456-426614174001')).resolves.toEqual({ kind: 'unavailable' });
  });

  it('requires the loaded revision when writing a response', async () => {
    rpc.mockResolvedValue({ data: {
      id: 'n1', member_id: 'member1', category: 'midweek', source_type: 'midweek_ministry_part', source_id: 'p1',
      slot_key: 'student_id', title: 'Designação', message: 'Designação', assignment_date: '2026-10-06',
      status: 'confirmed', is_read: true, created_at: '2026-10-05T12:00:00Z', confirmed_at: '2026-10-05T12:01:00Z',
      hidden_at: null, decline_reason: null, responded_at: '2026-10-05T12:01:00Z', assignment_revision: 'r1',
    }, error: null });
    await respondToMeetingAssignment({ notificationId: 'n1', revision: 'r1', decision: 'confirmed' });
    expect(rpc).toHaveBeenCalledWith('respond_to_meeting_assignment', {
      p_notification_id: 'n1', p_revision: 'r1', p_decision: 'confirmed', p_reason: null,
    });
  });

  it('reads all assignment responses for a meeting in one authorized batch', async () => {
    rpc.mockResolvedValue({ data: [{
      notification: {
        id: 'n1', member_id: 'member1', category: 'midweek', source_type: 'midweek_ministry_part', source_id: 'p1',
        slot_key: 'assistant_id', title: 'Designação', message: 'Designação', assignment_date: '2026-10-06',
        status: 'declined', is_read: true, created_at: '2026-10-05T12:00:00Z', decline_reason: 'Ausente',
      },
      member_name: 'João', role_label: 'Ajudante', assignment_title: 'Consideração', part_number: 3,
    }], error: null });

    const rows = await getMeetingAssignmentResponses('midweek', 'meeting-1');

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      memberId: 'member1', memberName: 'João', sourceId: 'p1', slotKey: 'assistant_id', status: 'declined',
      declineReason: 'Ausente', roleLabel: 'Ajudante', assignmentTitle: 'Consideração', partNumber: 3,
    });
    expect(rpc).toHaveBeenCalledTimes(1);
    expect(rpc).toHaveBeenCalledWith('get_meeting_assignment_responses', { p_kind: 'midweek', p_meeting_id: 'meeting-1' });
  });
});
