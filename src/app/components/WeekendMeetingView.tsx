import React from 'react';
import { WeekendMeeting } from '../data/mockData';
import { User, Mic, BookOpen } from 'lucide-react';

interface Props {
  meeting: WeekendMeeting;
}

export function WeekendMeetingView({ meeting }: Props) {
  const dateObj = new Date(meeting.date + 'T12:00:00');
  const dateFormatted = dateObj.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
  });

  return (
    <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
      {/* Header */}
      <div className="bg-[#1a5fb4] px-4 md:px-5 py-3">
        <h3 className="text-white text-center">{dateFormatted}</h3>
      </div>

      {/* Content */}
      <div className="divide-y divide-gray-100">
        {/* Presidente */}
        <InfoRow label="Presidente:" value={meeting.president} icon={<User size={14} />} />

        {/* Public Talk */}
        <div className="px-4 md:px-5 py-3 bg-blue-50/30">
          <p className="text-blue-600 mb-2" style={{ fontSize: '0.75rem', letterSpacing: '0.05em' }}>CONFERÊNCIA PÚBLICA</p>
          <div className="space-y-2">
            <InfoRow
              label="Tema:"
              value={meeting.public_talk.theme}
              valueClass="text-green-700 italic"
              compact
            />
            <InfoRow
              label="Orador:"
              value={`${meeting.public_talk.speaker} (${meeting.public_talk.congregation})`}
              compact
            />
          </div>
        </div>

        {/* Watchtower Study */}
        <div className="px-4 md:px-5 py-3 bg-blue-50/30">
          <p className="text-blue-600 mb-2" style={{ fontSize: '0.75rem', letterSpacing: '0.05em' }}>ESTUDO DE A SENTINELA</p>
          <div className="space-y-2">
            <InfoRow label="Dirigente:" value={meeting.watchtower_study.conductor} compact />
            <InfoRow label="Leitor:" value={meeting.watchtower_study.reader} valueClass="text-red-600" compact />
          </div>
        </div>

        {/* Closing prayer */}
        <InfoRow label="Oração Final:" value={meeting.closing_prayer} icon={<Mic size={14} />} />
      </div>
    </div>
  );
}

function InfoRow({
  label,
  value,
  icon,
  valueClass = 'text-gray-800',
  compact = false,
}: {
  label: string;
  value: string;
  icon?: React.ReactNode;
  valueClass?: string;
  compact?: boolean;
}) {
  if (compact) {
    return (
      <div className="flex flex-col sm:flex-row sm:items-center gap-0.5 sm:gap-2">
        <span className="text-gray-500 shrink-0" style={{ fontSize: '0.85rem' }}>{label}</span>
        <span className={valueClass} style={{ fontSize: '0.85rem' }}>{value}</span>
      </div>
    );
  }

  return (
    <div className="px-4 md:px-5 py-3 flex items-center gap-3">
      {icon && <span className="text-gray-400 shrink-0">{icon}</span>}
      <div className="flex flex-col sm:flex-row sm:items-center gap-0.5 sm:gap-2 flex-1">
        <span className="text-gray-500 shrink-0" style={{ fontSize: '0.85rem' }}>{label}</span>
        <span className={`${valueClass}`} style={{ fontSize: '0.85rem' }}>{value}</span>
      </div>
    </div>
  );
}
