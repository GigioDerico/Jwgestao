import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { MidweekMeetingView } from './MidweekMeetingView';
import { WeekendMeetingView } from './WeekendMeetingView';
import type { MidweekMeeting, WeekendMeeting } from '../types';
import { Loader2, CalendarDays } from 'lucide-react';

export function MeetingsPage() {
  const [tab, setTab] = useState<'midweek' | 'weekend'>('midweek');
  const [midweekMeetings, setMidweekMeetings] = useState<MidweekMeeting[]>([]);
  const [weekendMeetings, setWeekendMeetings] = useState<WeekendMeeting[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [mw, we] = await Promise.all([
          api.getMidweekMeetings(),
          api.getWeekendMeetings(),
        ]);
        setMidweekMeetings(mw as unknown as MidweekMeeting[]);
        setWeekendMeetings(we as unknown as WeekendMeeting[]);
      } catch (e) {
        console.error('Erro ao carregar reuniões:', e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div className="max-w-5xl mx-auto space-y-4">
      <div>
        <h1 className="text-foreground">Reuniões</h1>
        <p className="text-muted-foreground" style={{ fontSize: '0.85rem' }}>Programação das reuniões da congregação</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-muted rounded-xl p-1 shadow-inner border border-border/50">
        <button
          onClick={() => setTab('midweek')}
          className={`flex-1 py-2.5 rounded-lg transition-all font-medium ${tab === 'midweek'
              ? 'bg-card text-primary shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
            }`}
          style={{ fontSize: '0.9rem' }}
        >
          Meio de Semana
        </button>
        <button
          onClick={() => setTab('weekend')}
          className={`flex-1 py-2.5 rounded-lg transition-all font-medium ${tab === 'weekend'
              ? 'bg-card text-primary shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
            }`}
          style={{ fontSize: '0.9rem' }}
        >
          Fim de Semana
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="animate-spin text-primary" size={28} />
        </div>
      ) : tab === 'midweek' ? (
        midweekMeetings.length > 0 ? (
          <div className="space-y-6">
            {midweekMeetings.map(meeting => (
              <MidweekMeetingView key={meeting.id} meeting={meeting} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            <CalendarDays size={32} className="mx-auto mb-2 opacity-30" />
            <p>Nenhuma reunião de meio de semana cadastrada</p>
          </div>
        )
      ) : (
        weekendMeetings.length > 0 ? (
          <div className="space-y-6">
            {weekendMeetings.map(meeting => (
              <WeekendMeetingView key={meeting.id} meeting={meeting} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            <CalendarDays size={32} className="mx-auto mb-2 opacity-30" />
            <p>Nenhuma reunião de fim de semana cadastrada</p>
          </div>
        )
      )}
    </div>
  );
}
