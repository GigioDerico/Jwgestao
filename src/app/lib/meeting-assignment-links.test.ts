import { describe, expect, it } from 'vitest';
import { buildMeetingAssignmentPath, buildMeetingAssignmentUrl, getRecipientMeetingAssignmentUrl } from './meeting-assignment-links';

describe('meeting assignment links', () => {
  it('creates a versioned path for UUID notification and revision', () => {
    expect(buildMeetingAssignmentPath('123e4567-e89b-42d3-a456-426614174000', '123e4567-e89b-42d3-a456-426614174001'))
      .toBe('/assignments/meetings/respond/123e4567-e89b-42d3-a456-426614174000?revision=123e4567-e89b-42d3-a456-426614174001');
  });
  it.each(['', 'abc', '../abc', '123e4567-e89b-02d3-a456-426614174000'])('rejects invalid UUID %s', bad => {
    expect(() => buildMeetingAssignmentPath(bad, '123e4567-e89b-42d3-a456-426614174001')).toThrow();
    expect(() => buildMeetingAssignmentPath('123e4567-e89b-42d3-a456-426614174000', bad)).toThrow();
  });
  it('builds the helper link from the assistant notification rather than the student notification', () => {
    const rows = [
      { id: '123e4567-e89b-42d3-a456-426614174000', memberId: 'student', sourceType: 'midweek_ministry_part', sourceId: 'part', slotKey: 'student_id', assignmentRevision: '123e4567-e89b-42d3-a456-426614174001' },
      { id: '123e4567-e89b-42d3-a456-426614174002', memberId: 'helper', sourceType: 'midweek_ministry_part', sourceId: 'part', slotKey: 'assistant_id', assignmentRevision: '123e4567-e89b-42d3-a456-426614174003' },
    ];
    const url = getRecipientMeetingAssignmentUrl(rows, 'helper', 'midweek_ministry_part', 'part', 'assistant_id');
    expect(url).toContain('123e4567-e89b-42d3-a456-426614174002');
    expect(url).toContain('123e4567-e89b-42d3-a456-426614174003');
  });
  it('blocks an internal member send when its notification is missing', () => {
    expect(() => getRecipientMeetingAssignmentUrl([], 'member-1', 'midweek_ministry_part', 'part-1', 'student_id')).toThrow(/não foi possível preparar/i);
  });
  it('keeps external non-member messages informational', () => {
    expect(getRecipientMeetingAssignmentUrl([], null, 'midweek_meeting_role', 'meeting-1', 'president_id')).toBeUndefined();
  });
  it('uses the configured public URL to build the direct URL', () => {
    expect(buildMeetingAssignmentUrl('123e4567-e89b-42d3-a456-426614174000', '123e4567-e89b-42d3-a456-426614174001'))
      .toMatch(/^(https:\/\/|http:\/\/localhost)/);
  });
});
