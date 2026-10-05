import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import {
  getMeetingAssignmentResponses,
  type ManagedMeetingAssignmentResponse,
  type MeetingKind,
} from '../lib/meeting-assignments';

export function useMeetingAssignmentResponses(
  kind: MeetingKind,
  meetingId: string | undefined,
  sourceIds: string[],
  enabled: boolean,
) {
  const [responses, setResponses] = useState<ManagedMeetingAssignmentResponse[]>([]);
  const sourceIdsKey = [...new Set(sourceIds)].sort().join('|');

  useEffect(() => {
    if (!enabled || !meetingId) {
      setResponses([]);
      return;
    }

    let active = true;
    const relevantSourceIds = new Set(sourceIdsKey.split('|').filter(Boolean));
    const refresh = async () => {
      try {
        const rows = await getMeetingAssignmentResponses(kind, meetingId);
        if (active) setResponses(rows);
      } catch (error) {
        console.error('Error fetching meeting assignment responses', error);
        if (active) setResponses([]);
      }
    };

    void refresh();
    window.addEventListener('focus', refresh);
    const channel = supabase
      .channel(`meeting-assignment-responses:${kind}:${meetingId}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'member_assignment_notifications',
      }, payload => {
        const row = (payload.new && Object.keys(payload.new).length ? payload.new : payload.old) as any;
        if (row && relevantSourceIds.has(row.source_id)) void refresh();
      })
      .subscribe();

    return () => {
      active = false;
      window.removeEventListener('focus', refresh);
      void supabase.removeChannel(channel);
    };
  }, [enabled, kind, meetingId, sourceIdsKey]);

  return responses;
}
