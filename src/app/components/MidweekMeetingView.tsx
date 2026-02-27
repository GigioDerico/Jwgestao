import React from 'react';
import { MidweekMeeting } from '../types';
import { MIDWEEK_PRIMARY_ROOM } from '../lib/midweek-schedule';

interface Props {
  meeting: MidweekMeeting;
}

export function MidweekMeetingView({ meeting }: Props) {
  const dateObj = new Date(`${meeting.date}T12:00:00`);
  const dateFormatted = dateObj.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
  }).toUpperCase();

  const ministryOffset = 3;
  const lifeOffset = ministryOffset + meeting.ministry.parts.length;
  const cbsNumber = lifeOffset + meeting.christian_life.parts.length + 1;

  return (
    <div className="text-[#141414]">
      <div className="grid gap-3 md:grid-cols-[minmax(0,1.55fr)_minmax(250px,1fr)] md:items-start">
        <div>
          <p className="text-sm font-semibold md:text-[1.2rem]">
            {dateFormatted} | {meeting.bible_reading.toUpperCase()}
          </p>
        </div>
        <div className="space-y-1 md:text-right">
          <MetaPair label="Presidente:" value={meeting.president} />
          <MetaPair label="Oração:" value={meeting.opening_prayer} />
        </div>
      </div>

      <div className="mt-4 space-y-1">
        <OpeningLine time={meeting.opening_song_time} text={`Cântico ${meeting.opening_song || '-'}`} />
        <OpeningLine
          time={meeting.opening_comments.time}
          text={`Comentários iniciais (${meeting.opening_comments.duration} min)`}
        />
      </div>

      <div className="mt-4">
        <SectionHeader color="bg-[#616366]" title="TESOUROS DA PALAVRA DE DEUS" rightLabel={MIDWEEK_PRIMARY_ROOM} />
        <div className="mt-1.5 space-y-1">
          <ProgramRow
            time={meeting.treasures.talk.time}
            title={`1. ${meeting.treasures.talk.title} (${meeting.treasures.talk.duration} min)`}
            mainAssignee={meeting.treasures.talk.speaker}
          />
          <ProgramRow
            time={meeting.treasures.spiritual_gems.time}
            title={`2. Joias espirituais (${meeting.treasures.spiritual_gems.duration} min)`}
            mainAssignee={meeting.treasures.spiritual_gems.speaker}
          />
          <ProgramRow
            time={meeting.treasures.bible_reading.time}
            title={`3. Leitura da Bíblia (${meeting.treasures.bible_reading.duration} min)`}
            label="Estudante:"
            mainAssignee={meeting.treasures.bible_reading.student}
          />
        </div>
      </div>

      <div className="mt-4">
        <SectionHeader color="bg-[#bf8a00]" title="FAÇA SEU MELHOR NO MINISTÉRIO" rightLabel={MIDWEEK_PRIMARY_ROOM} />
        <div className="mt-1.5 space-y-1">
          {meeting.ministry.parts.map((part, index) => (
            <ProgramRow
              key={`${part.number}-${index}`}
              time={part.time}
              title={`${ministryOffset + index + 1}. ${part.title} (${part.duration} min)`}
              label="Estudante/ajudante:"
              mainAssignee={part.assistant ? `${part.student}/${part.assistant}` : part.student}
            />
          ))}
        </div>
      </div>

      <div className="mt-4">
        <SectionHeader color="bg-[#8d0027]" title="NOSSA VIDA CRISTÃ" />
        <div className="mt-1.5 space-y-1">
          <SimpleProgramLine time={meeting.middle_song_time} text={`Cântico ${meeting.middle_song || '-'}`} />

          {meeting.christian_life.parts.map((part, index) => (
            <ProgramRow
              key={`${part.number}-${index}`}
              time={part.time}
              title={`${lifeOffset + index + 1}. ${part.title} (${part.duration} min)`}
              mainAssignee={part.speaker}
            />
          ))}

          <ProgramRow
            time={meeting.christian_life.congregation_bible_study.time}
            title={`${cbsNumber}. Estudo bíblico de congregação (${meeting.christian_life.congregation_bible_study.duration} min)`}
            label="Dirigente/leitor:"
            mainAssignee={`${meeting.christian_life.congregation_bible_study.conductor}/${meeting.christian_life.congregation_bible_study.reader}`}
          />

          <SimpleProgramLine
            time={meeting.christian_life.closing_comments.time}
            text={`Comentários finais (${meeting.christian_life.closing_comments.duration} min)`}
          />
          <SimpleProgramLine time={meeting.closing_song_time} text={`Cântico ${meeting.closing_song || '-'}`} />
        </div>

        <div className="mt-3 flex justify-end">
          <MetaPair label="Oração:" value={meeting.closing_prayer} />
        </div>
      </div>
    </div>
  );
}

function SectionHeader({
  color,
  title,
  rightLabel,
}: {
  color: string;
  title: string;
  rightLabel?: string;
}) {
  return (
      <div className="flex items-center gap-1.5">
        <div className={`${color} min-w-0 flex-[0_0_58%] px-2.5 py-1`}>
          <h4 className="truncate text-[0.7rem] font-semibold tracking-tight text-white md:text-[1.05rem]">{title}</h4>
        </div>
      {rightLabel ? (
        <div className="flex min-w-0 flex-1 items-center justify-end text-[0.68rem] font-semibold text-[#575757] md:text-[0.82rem]">
          <span className="whitespace-nowrap">{rightLabel}</span>
        </div>
      ) : null}
    </div>
  );
}

function MetaPair({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-[0.72rem] md:text-[0.95rem]">
      <span className="font-semibold text-[#575757]">{label} </span>
      <span>{value}</span>
    </div>
  );
}

function OpeningLine({ time, text }: { time: string; text: string }) {
  return (
    <div className="grid gap-2 md:grid-cols-[42px_minmax(0,1fr)] md:items-start">
      <div className="text-[0.72rem] font-semibold text-[#575757] md:text-[0.95rem]">{time}</div>
      <div className="text-[0.8rem] md:text-[1rem]">
        <span className="mr-2 text-[#575757]">&bull;</span>
        <span>{text}</span>
      </div>
    </div>
  );
}

function SimpleProgramLine({ time, text }: { time: string; text: string }) {
  return (
    <div className="grid gap-2 md:grid-cols-[42px_minmax(0,1fr)] md:items-start">
      <div className="text-[0.72rem] font-semibold text-[#575757] md:text-[0.95rem]">{time}</div>
      <div className="text-[0.8rem] md:text-[1rem]">
        <span className="mr-2 text-[#8d0027]">&bull;</span>
        <span>{text}</span>
      </div>
    </div>
  );
}

function ProgramRow({
  time,
  title,
  label,
  mainAssignee,
}: {
  time: string;
  title: string;
  label?: string;
  mainAssignee?: string;
}) {
  return (
    <div className="grid gap-2 md:grid-cols-[42px_minmax(0,1.55fr)_minmax(0,1fr)_minmax(130px,1fr)] md:items-start">
      <div className="text-[0.72rem] font-semibold text-[#575757] md:text-[0.95rem]">{time}</div>
      <div className="text-[0.8rem] md:text-[1rem]">{title}</div>
      <div className="text-[0.68rem] font-semibold text-[#575757] md:text-[0.85rem]">{label || ''}</div>
      <div className="text-right">
        <p className="text-[0.8rem] md:text-[1rem]">{mainAssignee || ''}</p>
      </div>
    </div>
  );
}
