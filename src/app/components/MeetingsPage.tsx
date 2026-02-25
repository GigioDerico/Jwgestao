import React, { useState } from 'react';
import { midweekMeetings, weekendMeetings } from '../data/mockData';
import { MidweekMeetingView } from './MidweekMeetingView';
import { WeekendMeetingView } from './WeekendMeetingView';

export function MeetingsPage() {
  const [tab, setTab] = useState<'midweek' | 'weekend'>('midweek');

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
          className={`flex-1 py-2.5 rounded-lg transition-all font-medium ${
            tab === 'midweek'
              ? 'bg-card text-primary shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
          style={{ fontSize: '0.9rem' }}
        >
          Meio de Semana
        </button>
        <button
          onClick={() => setTab('weekend')}
          className={`flex-1 py-2.5 rounded-lg transition-all font-medium ${
            tab === 'weekend'
              ? 'bg-card text-primary shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
          style={{ fontSize: '0.9rem' }}
        >
          Fim de Semana
        </button>
      </div>

      {/* Content */}
      {tab === 'midweek' ? (
        <div className="space-y-6">
          {midweekMeetings.map(meeting => (
            <MidweekMeetingView key={meeting.id} meeting={meeting} />
          ))}
        </div>
      ) : (
        <div className="space-y-6">
          {weekendMeetings.map(meeting => (
            <WeekendMeetingView key={meeting.id} meeting={meeting} />
          ))}
        </div>
      )}
    </div>
  );
}
