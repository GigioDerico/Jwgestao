import { supabase } from './supabase';

export interface ActiveMemberTransfer {
  id: string;
  transferredAt: string;
  destinationCongregation: string | null;
  createdAt: string;
}

export interface MemberTransferImpact {
  futureAssignmentCount: number;
}

export interface TransferMemberInput {
  memberId: string;
  transferredAt: string;
  destinationCongregation?: string;
}

export interface TransferMemberResult {
  transferId: string;
  removedAssignmentCount: number;
}

const OFFLINE_MESSAGE = 'Você precisa estar online para transferir um membro.';

function requireOnline() {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    throw new Error(OFFLINE_MESSAGE);
  }
}

function firstRow(data: unknown): unknown {
  return Array.isArray(data) ? data[0] : data;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function parseCount(value: unknown): number | null {
  if (
    (typeof value !== 'number' && typeof value !== 'string')
    || (typeof value === 'string' && value.trim() === '')
  ) {
    return null;
  }

  const count = Number(value);
  return Number.isFinite(count) && count >= 0 ? count : null;
}

export async function previewMemberTransfer(memberId: string): Promise<MemberTransferImpact> {
  requireOnline();
  const { data, error } = await supabase.rpc('preview_member_transfer', { p_member_id: memberId });
  if (error) throw new Error(error.message);

  const result = firstRow(data);
  const futureAssignmentCount = isRecord(result)
    ? parseCount(result.future_assignment_count)
    : null;

  if (futureAssignmentCount === null) {
    throw new Error('Resposta inválida ao verificar as designações do membro.');
  }

  return { futureAssignmentCount };
}

export async function transferMember(input: TransferMemberInput): Promise<TransferMemberResult> {
  requireOnline();
  const normalizedDestination = input.destinationCongregation?.trim() || null;
  const { data, error } = await supabase.rpc('transfer_member', {
    p_member_id: input.memberId,
    p_transferred_at: input.transferredAt,
    // The generated optional string omits PostgreSQL's accepted explicit null.
    p_destination_congregation: normalizedDestination as string,
  });
  if (error) throw new Error(error.message);

  const result = firstRow(data);
  const transferId = isRecord(result) ? result.transfer_id : null;
  const removedAssignmentCount = isRecord(result)
    ? parseCount(result.removed_assignment_count)
    : null;

  if (typeof transferId !== 'string' || !transferId || removedAssignmentCount === null) {
    throw new Error('Resposta inválida ao transferir o membro.');
  }

  return { transferId, removedAssignmentCount };
}

export async function cancelMemberTransfer(transferId: string): Promise<void> {
  requireOnline();
  const { error } = await supabase.rpc('cancel_member_transfer', { p_transfer_id: transferId });
  if (error) throw new Error(error.message);
}
