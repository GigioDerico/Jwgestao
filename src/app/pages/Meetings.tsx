import { Plus, Calendar, Clock, MapPin, ChevronRight, User } from 'lucide-react';
import { Link } from 'react-router';
import { meetings, publishers } from '../data/mock';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function Meetings() {
  const getPersonName = (id: string | undefined) => {
    if (!id) return 'Não designado';
    const person = publishers.find(p => p.id === id);
    return person ? person.name : 'Desconhecido';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Programação de Reuniões</h1>
          <p className="text-gray-500 mt-1">Veja as próximas reuniões e gerencie designações.</p>
        </div>
        <Link 
          to="/meetings/new"
          className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-colors shadow-sm"
        >
          <Plus size={18} />
          Nova Reunião
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {meetings.map((meeting) => (
          <div key={meeting.id} className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden flex flex-col">
            <div className={`h-2 ${meeting.type === 'Midweek' ? 'bg-amber-500' : 'bg-blue-500'}`} />
            
            <div className="p-5 flex-1">
              <div className="flex items-start justify-between mb-4">
                <div className="bg-gray-100 rounded-lg px-3 py-1.5 text-xs font-semibold text-gray-700 uppercase tracking-wide">
                  {meeting.type === 'Midweek' ? 'Vida e Ministério' : 'Fim de Semana'}
                </div>
                <div className="text-right">
                  <span className="block text-2xl font-bold text-gray-900 leading-none">
                    {format(new Date(meeting.date), 'dd', { locale: ptBR })}
                  </span>
                  <span className="text-xs text-gray-500 uppercase font-medium">
                    {format(new Date(meeting.date), 'MMM', { locale: ptBR })}
                  </span>
                </div>
              </div>

              <h3 className="text-lg font-bold text-gray-900 mb-2 line-clamp-2 min-h-[3.5rem]">
                {meeting.type === 'Midweek' 
                  ? 'Tesouros da Palavra de Deus' 
                  : (meeting.theme || 'Reunião Pública')}
              </h3>

              <div className="space-y-3 mt-4">
                <div className="flex items-center gap-3 text-sm text-gray-600">
                  <Clock size={16} className="text-gray-400 shrink-0" />
                  <span>19:30 - 21:15</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-gray-600">
                  <User size={16} className="text-gray-400 shrink-0" />
                  <span className="truncate">Presidente: {getPersonName(meeting.presidentId)}</span>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 px-5 py-3 border-t border-gray-100 flex items-center justify-between">
              <span className="text-xs font-medium text-gray-500">
                {meeting.parts.length} partes programadas
              </span>
              <Link 
                to={`/meetings/${meeting.id}`}
                className="text-sm font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1 group"
              >
                Ver Detalhes
                <ChevronRight size={16} className="group-hover:translate-x-0.5 transition-transform" />
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
