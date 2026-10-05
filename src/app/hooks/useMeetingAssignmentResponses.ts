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
  const [responseState, setResponseState] = useState<{
    key: string | null;
    rows: ManagedMeetingAssignmentResponse[];
  }>({ key: null, rows: [] });
  const responseKey = enabled && meetingId ? `${kind}:${meetingId}` : null;
  const sourceIdsKey = [...new Set(sourceIds)].sort().join('|');

  useEffect(() => {
    if (!responseKey || !meetingId) {
      setResponseState({ key: null, rows: [] });
      return;
    }

    let active = true;
    let latestRequest = 0;
    const relevantSourceIds = new Set(sourceIdsKey.split('|').filter(Boolean));
    setResponseState({ key: responseKey, rows: [] });
    const refresh = async () => {
      const requestId = ++latestRequest;
      try {
        const rows = await getMeetingAssignmentResponses(kind, meetingId);
        if (active && requestId === latestRequest) setResponseState({ key: responseKey, rows });
      } catch (error) {
        console.error('Error fetching meeting assignment responses', error);
        if (active && requestId === latestRequest) setResponseState({ key: responseKey, rows: [] });
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
  }, [responseKey, enabled, kind, meetingId, sourceIdsKey]);

  return responseState.key === responseKey ? responseState.rows : [];
}
