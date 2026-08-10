export const RESTRICTED_ASSIGNMENT_STATUSES = ['inativo', 'desassociado'] as const;

type MemberStatusLike = {
  spiritual_status?: string | null;
  spiritualStatus?: string | null;
};

function resolveMemberStatus(
  value: MemberStatusLike | string | null | undefined,
): string | null {
  if (typeof value === 'string') {
    return value;
  }

  return value?.spiritual_status ?? value?.spiritualStatus ?? null;
}

export function isMemberEligibleForAssignments(
  memberOrStatus: MemberStatusLike | string | null | undefined,
): boolean {
  const status = resolveMemberStatus(memberOrStatus);

  if (!status) {
    return true;
  }

  return !RESTRICTED_ASSIGNMENT_STATUSES.includes(
    status as (typeof RESTRICTED_ASSIGNMENT_STATUSES)[number],
  );
}

export function filterMembersEligibleForAssignments<T extends MemberStatusLike>(
  members: T[],
): T[] {
  return members.filter(member => {
    const status = resolveMemberStatus(member);
    return isMemberEligibleForAssignments(status);
  });
}
