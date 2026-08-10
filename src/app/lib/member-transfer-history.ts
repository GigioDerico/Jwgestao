import type { DesignationHistoryEntry } from './api';

export interface TransferAuditHistoryRow {
  id: string;
  source: DesignationHistoryEntry['source'];
  source_type: string;
  source_id: string;
  slot_key: string;
  role_label: string;
  assignment_date: string;
  member_id: string;
  member_name: string;
  details: string | null;
}

const ROLE_KEY_BY_SLOT: Record<string, string> = {
  president_id: 'president',
  opening_prayer_id: 'opening_prayer',
  closing_prayer_id: 'closing_prayer',
  treasure_talk_speaker_id: 'treasure_talk',
  treasure_gems_speaker_id: 'treasure_gems',
  treasure_reading_student_id: 'treasure_reading',
  cbs_conductor_id: 'cbs_conductor',
  cbs_reader_id: 'cbs_reader',
  student_id: 'ministry_student',
  assistant_id: 'ministry_assistant',
  speaker_id: 'christian_life_speaker',
  watchtower_conductor_id: 'watchtower_conductor',
  watchtower_reader_id: 'watchtower_reader',
  sound: 'sound',
  image: 'image',
  stage: 'stage',
  roving_mic_1: 'roving_mic_1',
  roving_mic_2: 'roving_mic_2',
  responsible: 'responsible',
  publisher1: 'publisher1',
  publisher2: 'publisher2',
};

function normalizeAuditRoleKey(row: TransferAuditHistoryRow): string {
  if (row.source_type === 'audio_video_role') {
    const attendantMatch = /^attendant:(\d+)$/.exec(row.slot_key);
    if (attendantMatch) {
      return `attendant_${Number(attendantMatch[1]) + 1}`;
    }
  }

  return ROLE_KEY_BY_SLOT[row.slot_key] ?? row.slot_key;
}

export function mapTransferAuditHistory(
  rows: TransferAuditHistoryRow[],
): DesignationHistoryEntry[] {
  return rows.map(row => ({
    id: `audit:${row.id}`,
    date: row.assignment_date,
    source: row.source,
    sourceId: row.source_id,
    roleKey: normalizeAuditRoleKey(row),
    roleLabel: row.role_label,
    memberId: row.member_id,
    memberName: row.member_name,
    details: row.details,
  }));
}
