import React from 'react';
import { MidweekMeeting } from '../types';
import { Music, User, BookOpen } from 'lucide-react';

interface Props {
  meeting: MidweekMeeting;
}

export function MidweekMeetingView({ meeting }: Props) {
  const dateObj = new Date(meeting.date + 'T12:00:00');
  const dateFormatted = dateObj.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
  }).toUpperCase();

  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden shadow-sm">
      {/* Header */}
      <div className="bg-[#4a2828] px-4 md:px-5 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 border-b border-black/10">
        <div>
          <h3 className="text-white font-bold">{dateFormatted} | {meeting.bible_reading.toUpperCase()}</h3>
        </div>
        <div className="text-white/80" style={{ fontSize: '0.85rem' }}>
          <span className="text-white/50">Presidente: </span>
          <span className="text-white font-medium">{meeting.president}</span>
        </div>
      </div>

      {/* Opening */}
      <div className="px-4 md:px-5 py-3 bg-muted/30 border-b border-border">
        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 text-muted-foreground" style={{ fontSize: '0.85rem' }}>
              <Music size={14} className="text-primary" />
              Cântico {meeting.opening_song}
            </div>
            <span className="text-border">•</span>
            <span className="text-muted-foreground" style={{ fontSize: '0.85rem' }}>Comentários iniciais (1 min)</span>
          </div>
          <div className="sm:ml-auto text-muted-foreground" style={{ fontSize: '0.85rem' }}>
            <span className="text-muted-foreground/60">Oração: </span>
            <span className="text-foreground font-medium">{meeting.opening_prayer}</span>
          </div>
        </div>
      </div>

      {/* TESOUROS DA PALAVRA DE DEUS */}
      <div>
        <div className="bg-[#5b2c2c] px-4 md:px-5 py-2">
          <h4 className="text-white tracking-wide font-bold" style={{ fontSize: '0.85rem' }}>TESOUROS DA PALAVRA DE DEUS</h4>
        </div>
        <div className="divide-y divide-border/50">
          <PartRow
            time=""
            number={1}
            title={`${meeting.treasures.talk.title} (${meeting.treasures.talk.duration} min)`}
            person={meeting.treasures.talk.speaker}
            room="Salão principal"
          />
          <PartRow
            time=""
            number={2}
            title={`Joias espirituais (${meeting.treasures.spiritual_gems.duration} min)`}
            person={meeting.treasures.spiritual_gems.speaker}
          />
          <PartRow
            time=""
            number={3}
            title={`Leitura da Bíblia (${meeting.treasures.bible_reading.duration} min)`}
            label="Estudante:"
            person={meeting.treasures.bible_reading.student}
            room={meeting.treasures.bible_reading.room}
          />
        </div>
      </div>

      {/* FAÇA SEU MELHOR NO MINISTÉRIO */}
      <div>
        <div className="bg-[#c4972a] px-4 md:px-5 py-2">
          <h4 className="text-white tracking-wide font-bold" style={{ fontSize: '0.85rem' }}>FAÇA SEU MELHOR NO MINISTÉRIO</h4>
        </div>
        <div className="divide-y divide-border/50">
          {meeting.ministry.parts.map((part, idx) => (
            <PartRow
              key={idx}
              number={part.number}
              title={`${part.title} (${part.duration} min)`}
              label={part.assistant ? 'Estudante/ajudante:' : 'Estudante:'}
              person={part.assistant ? `${part.student}/${part.assistant}` : part.student}
              room={part.room}
            />
          ))}
        </div>
      </div>

      {/* NOSSA VIDA CRISTÃ */}
      <div>
        <div className="bg-[#5b2c2c] px-4 md:px-5 py-2">
          <h4 className="text-white tracking-wide font-bold" style={{ fontSize: '0.85rem' }}>NOSSA VIDA CRISTÃ</h4>
        </div>
        <div className="divide-y divide-border/50">
          <div className="px-4 md:px-5 py-2.5 flex items-center gap-2 text-muted-foreground" style={{ fontSize: '0.85rem' }}>
            <Music size={14} className="text-primary" />
            Cântico {meeting.middle_song}
          </div>
          {meeting.christian_life.parts.map((part, idx) => (
            <PartRow
              key={idx}
              number={part.number}
              title={`${part.title} (${part.duration} min)`}
              person={part.speaker}
            />
          ))}
          <div className="px-4 md:px-5 py-3 bg-muted/10">
            <div className="flex flex-col sm:flex-row sm:items-center gap-1">
              <div className="flex-1">
                <span className="text-foreground font-medium" style={{ fontSize: '0.85rem' }}>
                  Estudo bíblico de congregação ({meeting.christian_life.congregation_bible_study.duration} min)
                </span>
              </div>
              <div style={{ fontSize: '0.85rem' }}>
                <span className="text-muted-foreground/60">Dirigente/leitor: </span>
                <span className="text-foreground font-bold">
                  {meeting.christian_life.congregation_bible_study.conductor}/{meeting.christian_life.congregation_bible_study.reader}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Closing */}
      <div className="px-4 md:px-5 py-3 bg-muted/30 border-t border-border">
        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground" style={{ fontSize: '0.85rem' }}>Comentários finais (3 min)</span>
            <span className="text-border">•</span>
            <div className="flex items-center gap-1.5 text-muted-foreground" style={{ fontSize: '0.85rem' }}>
              <Music size={14} className="text-primary" />
              Cântico {meeting.closing_song}
            </div>
          </div>
          <div className="sm:ml-auto text-muted-foreground" style={{ fontSize: '0.85rem' }}>
            <span className="text-muted-foreground/60">Oração: </span>
            <span className="text-foreground font-medium">{meeting.closing_prayer}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function PartRow({
  number,
  title,
  label,
  person,
  room,
  time,
}: {
  number?: number;
  title: string;
  label?: string;
  person?: string;
  room?: string;
  time?: string;
}) {
  return (
    <div className="px-4 md:px-5 py-2.5 flex flex-col sm:flex-row sm:items-center gap-1 hover:bg-muted/10 transition-colors">
      <div className="flex-1 flex items-start gap-2">
        {number && (
          <span className="text-muted-foreground/50 shrink-0 font-medium" style={{ fontSize: '0.85rem' }}>{number}.</span>
        )}
        <span className="text-foreground font-medium" style={{ fontSize: '0.85rem' }}>
          {title}
          {label && <span className="text-muted-foreground/60 ml-2 font-normal italic">{label}</span>}
        </span>
      </div>
      {(person || room) && (
        <div className="sm:text-right" style={{ fontSize: '0.85rem' }}>
          {room && <p className="text-muted-foreground/60" style={{ fontSize: '0.75rem' }}>{room}</p>}
          {person && <p className="text-foreground font-bold">{person}</p>}
        </div>
      )}
    </div>
  );
}
