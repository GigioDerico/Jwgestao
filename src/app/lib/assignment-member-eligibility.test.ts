import { describe, expect, it } from 'vitest';
import { filterMembersEligibleForAssignments } from './assignment-member-eligibility';

describe('filterMembersEligibleForAssignments', () => {
  it('removes inactive and disassociated members', () => {
    const result = filterMembersEligibleForAssignments([
      { id: 'active', spiritual_status: 'publicador' },
      { id: 'inactive', spiritual_status: 'inativo' },
      { id: 'removed', spiritual_status: 'desassociado' },
    ]);
    expect(result.map(member => member.id)).toEqual(['active']);
  });
});
