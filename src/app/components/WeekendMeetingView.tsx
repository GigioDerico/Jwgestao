import React from 'react';
import { WeekendMeeting } from '../types';
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
    <div
      className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm"
      style={{ fontFamily: 'Calibri, Arial, sans-serif' }}
    >
      {/* Header */}
      <div className="bg-[#1a5fb4] px-3 py-2.5 sm:px-4 md:px-5 sm:py-3">
        <h3 className="text-center text-base font-semibold text-white sm:text-lg">{dateFormatted}</h3>
      </div>

      {/* Content */}
      <div className="divide-y divide-gray-100">
        {/* Presidente */}
        <InfoRow label="Presidente:" value={meeting.president} icon={<User size={14} />} />

        {/* Public Talk */}
        <div className="bg-blue-50/30 px-3 py-3 sm:px-4 md:px-5">
          <p className="mb-2 text-blue-600" style={{ fontSize: '0.9rem', letterSpacing: '0.05em' }}>CONFERÊNCIA PÚBLICA</p>
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
        <div className="bg-blue-50/30 px-3 py-3 sm:px-4 md:px-5">
          <p className="mb-2 text-blue-600" style={{ fontSize: '0.9rem', letterSpacing: '0.05em' }}>ESTUDO DE A SENTINELA</p>
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
      <div className="flex flex-col gap-0.5 sm:flex-row sm:items-center sm:gap-2">
        <span className="shrink-0 text-gray-500" style={{ fontSize: '0.92rem' }}>{label}</span>
        <span className={`${valueClass} break-words`} style={{ fontSize: '0.92rem' }}>{value}</span>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-3 px-3 py-3 sm:items-center sm:px-4 md:px-5">
      {icon && <span className="text-gray-400 shrink-0">{icon}</span>}
      <div className="flex flex-1 flex-col gap-0.5 sm:flex-row sm:items-center sm:gap-2">
        <span className="shrink-0 text-gray-500" style={{ fontSize: '0.96rem' }}>{label}</span>
        <span className={`${valueClass} break-words`} style={{ fontSize: '0.96rem' }}>{value}</span>
      </div>
    </div>
  );
}
