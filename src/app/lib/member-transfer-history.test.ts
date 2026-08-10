import { describe, expect, it } from 'vitest';
import {
  mapTransferAuditHistory,
  type TransferAuditHistoryRow,
} from './member-transfer-history';

const base = {
  source_id: 'source-id',
  assignment_date: '2026-08-01',
  member_id: 'member-id',
  member_name: 'Membro',
  details: 'Detalhes',
};

describe('mapTransferAuditHistory', () => {
  it('normalizes every audited role slot and preserves entry data', () => {
    const slots = [
      ['midweek', 'midweek_meeting_role', 'president_id', 'president'],
      ['midweek', 'midweek_meeting_role', 'opening_prayer_id', 'opening_prayer'],
      ['midweek', 'midweek_meeting_role', 'closing_prayer_id', 'closing_prayer'],
      ['midweek', 'midweek_meeting_role', 'treasure_talk_speaker_id', 'treasure_talk'],
      ['midweek', 'midweek_meeting_role', 'treasure_gems_speaker_id', 'treasure_gems'],
      ['midweek', 'midweek_meeting_role', 'treasure_reading_student_id', 'treasure_reading'],
      ['midweek', 'midweek_meeting_role', 'cbs_conductor_id', 'cbs_conductor'],
      ['midweek', 'midweek_meeting_role', 'cbs_reader_id', 'cbs_reader'],
      ['midweek', 'midweek_ministry_part', 'student_id', 'ministry_student'],
      ['midweek', 'midweek_ministry_part', 'assistant_id', 'ministry_assistant'],
      ['midweek', 'midweek_christian_life_part', 'speaker_id', 'christian_life_speaker'],
      ['weekend', 'weekend_meeting_role', 'watchtower_conductor_id', 'watchtower_conductor'],
      ['weekend', 'weekend_meeting_role', 'watchtower_reader_id', 'watchtower_reader'],
      ['audio_video', 'audio_video_role', 'sound', 'sound'],
      ['audio_video', 'audio_video_role', 'image', 'image'],
      ['audio_video', 'audio_video_role', 'stage', 'stage'],
      ['audio_video', 'audio_video_role', 'roving_mic_1', 'roving_mic_1'],
      ['audio_video', 'audio_video_role', 'roving_mic_2', 'roving_mic_2'],
      ['field_service', 'field_service_assignment', 'responsible', 'responsible'],
      ['cart', 'cart_assignment', 'publisher1', 'publisher1'],
      ['cart', 'cart_assignment', 'publisher2', 'publisher2'],
    ] as const;
    const rows: TransferAuditHistoryRow[] = slots.map(
      ([source, source_type, slot_key], index) => ({
        ...base,
        id: `audit-${index}`,
        source,
        source_type,
        slot_key,
        role_label: `Papel ${index}`,
      }),
    );

    const result = mapTransferAuditHistory(rows);

    expect(result.map(entry => entry.roleKey)).toEqual(slots.map(([, , , roleKey]) => roleKey));
    expect(result[0]).toEqual({
      id: 'audit:audit-0',
      date: base.assignment_date,
      source: 'midweek',
      sourceId: base.source_id,
      roleKey: 'president',
      roleLabel: 'Papel 0',
      memberId: base.member_id,
      memberName: base.member_name,
      details: base.details,
    });
  });

  it('normalizes attendant indexes without producing NaN for invalid slots', () => {
    const rows: TransferAuditHistoryRow[] = [
      {
        ...base,
        id: 'audit-valid',
        source: 'audio_video',
        source_type: 'audio_video_role',
        slot_key: 'attendant:0',
        role_label: 'Indicador',
      },
      {
        ...base,
        id: 'audit-invalid',
        source: 'audio_video',
        source_type: 'audio_video_role',
        slot_key: 'attendant:invalid',
        role_label: 'Indicador',
      },
    ];

    expect(mapTransferAuditHistory(rows).map(entry => entry.roleKey)).toEqual([
      'attendant_1',
      'attendant:invalid',
    ]);
  });
});
