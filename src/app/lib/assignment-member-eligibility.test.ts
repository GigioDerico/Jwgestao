import { describe, expect, it } from 'vitest';
import {
  filterMembersEligibleForAssignments,
  isMemberEligibleForAssignments,
} from './assignment-member-eligibility';

describe('filterMembersEligibleForAssignments', () => {
  it('removes inactive and disassociated members', () => {
    const result = filterMembersEligibleForAssignments([
      { id: 'active', spiritual_status: 'publicador' },
      { id: 'inactive', spiritual_status: 'inativo' },
      { id: 'removed', spiritual_status: 'desassociado' },
    ]);
    expect(result.map(member => member.id)).toEqual(['active']);
  });

  it('resolves snake case, camel case, strings and null values consistently', () => {
    expect(isMemberEligibleForAssignments({ spiritualStatus: 'inativo' })).toBe(false);
    expect(isMemberEligibleForAssignments({ spiritual_status: 'desassociado' })).toBe(false);
    expect(isMemberEligibleForAssignments({ spiritualStatus: 'publicador' })).toBe(true);
    expect(isMemberEligibleForAssignments('inativo')).toBe(false);
    expect(isMemberEligibleForAssignments(null)).toBe(true);
  });

  it('filters objects that expose camel case status', () => {
    const result = filterMembersEligibleForAssignments([
      { id: 'active', spiritualStatus: 'publicador' },
      { id: 'inactive', spiritualStatus: 'inativo' },
    ]);

    expect(result.map(member => member.id)).toEqual(['active']);
  });
});
