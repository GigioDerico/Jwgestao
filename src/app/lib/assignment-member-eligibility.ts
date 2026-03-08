export const RESTRICTED_ASSIGNMENT_STATUSES = ['inativo', 'desassociado'] as const;

export function isMemberEligibleForAssignments(
  memberOrStatus:
    | { spiritual_status?: string | null }
    | string
    | null
    | undefined,
): boolean {
  const status =
    typeof memberOrStatus === 'string'
      ? memberOrStatus
      : memberOrStatus?.spiritual_status;

  if (!status) {
    return true;
  }

  return !RESTRICTED_ASSIGNMENT_STATUSES.includes(
    status as (typeof RESTRICTED_ASSIGNMENT_STATUSES)[number],
  );
}

export function filterMembersEligibleForAssignments<T extends { spiritual_status?: string | null }>(
  members: T[],
): T[] {
  return members.filter(member => isMemberEligibleForAssignments(member));
}
