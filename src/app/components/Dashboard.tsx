import React from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '../context/AuthContext';
import { members, midweekMeetings, weekendMeetings, getStatusLabel, getStatusColor } from '../data/mockData';
import {
  Users,
  CalendarDays,
  BookOpen,
  UserCheck,
  Clock,
  ChevronRight,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';

export function Dashboard() {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();

  // Find user's upcoming assignments
  const myAssignments = findMyAssignments(user?.name || '');

  const stats = [
    { label: 'Membros', value: members.length, icon: Users, color: 'bg-blue-500', path: '/members' },
    { label: 'Reuniões Meio de Semana', value: midweekMeetings.length, icon: CalendarDays, color: 'bg-amber-500', path: '/meetings' },
    { label: 'Reuniões Fim de Semana', value: weekendMeetings.length, icon: BookOpen, color: 'bg-green-500', path: '/meetings' },
    { label: 'Anciãos', value: members.filter(m => m.roles.includes('anciao')).length, icon: UserCheck, color: 'bg-purple-500', path: '/members' },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Welcome */}
      <div>
        <h1 className="text-foreground">Olá, {user?.name.split(' ')[0]}!</h1>
        <p className="text-muted-foreground mt-1" style={{ fontSize: '0.9rem' }}>
          Bem-vindo ao sistema de gestão da congregação.
        </p>
      </div>

      {/* Stats cards */}
      {isAdmin && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          {stats.map((stat) => (
            <button
              key={stat.label}
              onClick={() => navigate(stat.path)}
              className="bg-card rounded-xl p-4 border border-border hover:shadow-md hover:border-primary/20 transition-all text-left group"
            >
              <div className={`w-10 h-10 ${stat.color} rounded-lg flex items-center justify-center mb-3 shadow-sm`}>
                <stat.icon size={20} className="text-white" />
              </div>
              <p className="text-foreground font-bold" style={{ fontSize: '1.5rem' }}>{stat.value}</p>
              <p className="text-muted-foreground flex items-center gap-1" style={{ fontSize: '0.8rem' }}>
                {stat.label}
                <ChevronRight size={12} className="opacity-0 group-hover:opacity-100 transition-opacity text-primary" />
              </p>
            </button>
          ))}
        </div>
      )}

      {/* My Assignments */}
      <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
        <div className="p-4 md:p-5 border-b border-border bg-muted/30">
          <h3 className="text-foreground flex items-center gap-2 font-semibold">
            <Clock size={18} className="text-primary" />
            Minhas Designações
          </h3>
        </div>

        {myAssignments.length > 0 ? (
          <div className="divide-y divide-border">
            {myAssignments.map((assignment, idx) => (
              <div key={idx} className="px-4 md:px-5 py-3.5 flex items-start gap-3 hover:bg-muted/30 transition-colors">
                <div className={`mt-0.5 shrink-0 ${assignment.confirmed ? 'text-green-500' : 'text-amber-500'}`}>
                  {assignment.confirmed ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-foreground font-medium" style={{ fontSize: '0.9rem' }}>{assignment.part}</p>
                  <p className="text-muted-foreground" style={{ fontSize: '0.8rem' }}>{assignment.meeting} — {assignment.date}</p>
                </div>
                <button
                  onClick={() => {
                    assignment.confirmed = !assignment.confirmed;
                    navigate('/dashboard');
                  }}
                  className={`shrink-0 px-3 py-1 rounded-full transition-colors font-medium ${
                    assignment.confirmed
                      ? 'bg-green-50 text-green-700 hover:bg-green-100'
                      : 'bg-primary/10 text-primary hover:bg-primary/20'
                  }`}
                  style={{ fontSize: '0.75rem' }}
                >
                  {assignment.confirmed ? 'Confirmado ✓' : 'Confirmar'}
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 text-center bg-card">
            <CalendarDays size={32} className="text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-muted-foreground" style={{ fontSize: '0.9rem' }}>Nenhuma designação pendente</p>
          </div>
        )}
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <button
          onClick={() => navigate('/meetings')}
          className="bg-gradient-to-r from-[#082c45] to-[#0a3d62] text-white rounded-xl p-5 text-left hover:shadow-lg transition-all border border-white/5 group"
        >
          <CalendarDays size={24} className="mb-2 text-primary group-hover:scale-110 transition-transform" />
          <h3 className="text-white font-bold">Reunião do Meio de Semana</h3>
          <p className="text-white/60 mt-1" style={{ fontSize: '0.85rem' }}>Vida e Ministério Cristão</p>
        </button>

        <button
          onClick={() => navigate('/meetings')}
          className="bg-gradient-to-r from-[#35bdf8] to-[#29abe2] text-[#082c45] rounded-xl p-5 text-left hover:shadow-lg transition-all border border-[#082c45]/5 group"
        >
          <BookOpen size={24} className="mb-2 text-[#082c45] group-hover:scale-110 transition-transform" />
          <h3 className="text-[#082c45] font-bold">Reunião do Fim de Semana</h3>
          <p className="text-[#082c45]/70 mt-1" style={{ fontSize: '0.85rem' }}>Conferência Pública e A Sentinela</p>
        </button>
      </div>

      {/* Recent Members Preview */}
      {isAdmin && (
        <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
          <div className="p-4 md:p-5 border-b border-border flex items-center justify-between bg-muted/30">
            <h3 className="text-foreground font-semibold">Membros Recentes</h3>
            <button
              onClick={() => navigate('/members')}
              className="text-primary hover:underline flex items-center gap-1 font-medium"
              style={{ fontSize: '0.85rem' }}
            >
              Ver todos <ChevronRight size={14} />
            </button>
          </div>
          <div className="divide-y divide-border">
            {members.slice(0, 5).map((member) => (
              <div key={member.id} className="px-4 md:px-5 py-3 flex items-center gap-3 hover:bg-muted/30 transition-colors">
                <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center shrink-0 border border-primary/10">
                  <span className="text-accent-foreground font-bold" style={{ fontSize: '0.75rem' }}>
                    {member.full_name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-foreground truncate font-medium" style={{ fontSize: '0.9rem' }}>{member.full_name}</p>
                  <p className="text-muted-foreground truncate" style={{ fontSize: '0.75rem' }}>{member.phone}</p>
                </div>
                <span className={`px-2 py-0.5 rounded-full font-medium ${getStatusColor(member.spiritual_status)}`} style={{ fontSize: '0.7rem' }}>
                  {getStatusLabel(member.spiritual_status)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

interface Assignment {
  part: string;
  meeting: string;
  date: string;
  confirmed: boolean;
}

function findMyAssignments(name: string): Assignment[] {
  const assignments: Assignment[] = [];

  midweekMeetings.forEach(m => {
    const dateFormatted = new Date(m.date + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' });

    if (m.president === name) assignments.push({ part: 'Presidente', meeting: 'Meio de Semana', date: dateFormatted, confirmed: false });
    if (m.opening_prayer === name) assignments.push({ part: 'Oração Inicial', meeting: 'Meio de Semana', date: dateFormatted, confirmed: false });
    if (m.closing_prayer === name) assignments.push({ part: 'Oração Final', meeting: 'Meio de Semana', date: dateFormatted, confirmed: false });
    if (m.treasures.talk.speaker === name) assignments.push({ part: `Discurso: ${m.treasures.talk.title}`, meeting: 'Meio de Semana', date: dateFormatted, confirmed: false });
    if (m.treasures.spiritual_gems.speaker === name) assignments.push({ part: 'Joias Espirituais', meeting: 'Meio de Semana', date: dateFormatted, confirmed: false });
    if (m.treasures.bible_reading.student === name) assignments.push({ part: 'Leitura da Bíblia', meeting: 'Meio de Semana', date: dateFormatted, confirmed: false });
    m.ministry.parts.forEach(p => {
      if (p.student === name) assignments.push({ part: `${p.title} (Estudante)`, meeting: 'Meio de Semana', date: dateFormatted, confirmed: false });
      if (p.assistant === name) assignments.push({ part: `${p.title} (Ajudante)`, meeting: 'Meio de Semana', date: dateFormatted, confirmed: false });
    });
    m.christian_life.parts.forEach(p => {
      if (p.speaker === name) assignments.push({ part: p.title, meeting: 'Meio de Semana', date: dateFormatted, confirmed: false });
    });
    if (m.christian_life.congregation_bible_study.conductor === name) assignments.push({ part: 'Dirigente - Estudo Bíblico de Congregação', meeting: 'Meio de Semana', date: dateFormatted, confirmed: false });
    if (m.christian_life.congregation_bible_study.reader === name) assignments.push({ part: 'Leitor - Estudo Bíblico de Congregação', meeting: 'Meio de Semana', date: dateFormatted, confirmed: false });
  });

  weekendMeetings.forEach(m => {
    const dateFormatted = new Date(m.date + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' });

    if (m.president === name) assignments.push({ part: 'Presidente', meeting: 'Fim de Semana', date: dateFormatted, confirmed: false });
    if (m.public_talk.speaker === name) assignments.push({ part: `Orador: ${m.public_talk.theme}`, meeting: 'Fim de Semana', date: dateFormatted, confirmed: false });
    if (m.watchtower_study.conductor === name) assignments.push({ part: 'Dirigente - A Sentinela', meeting: 'Fim de Semana', date: dateFormatted, confirmed: false });
    if (m.watchtower_study.reader === name) assignments.push({ part: 'Leitor - A Sentinela', meeting: 'Fim de Semana', date: dateFormatted, confirmed: false });
    if (m.closing_prayer === name) assignments.push({ part: 'Oração Final', meeting: 'Fim de Semana', date: dateFormatted, confirmed: false });
  });

  return assignments;
}
