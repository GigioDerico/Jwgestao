import { useState, useEffect, useMemo } from 'react';
import { Plus, Clock, ChevronRight, User, RefreshCw, ChevronLeft } from 'lucide-react';
import { Link } from 'react-router';
import { api } from '../lib/api';

const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

const parseMeetingDate = (date: string) => {
  const parsed = new Date(`${date}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed;
};

export default function Meetings() {
  const [meetings, setMeetings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const today = new Date();
  const [selectedMonth, setSelectedMonth] = useState(today.getMonth());
  const [selectedYear, setSelectedYear] = useState(today.getFullYear());

  const fetchMeetings = async () => {
    try {
      setLoading(true);
      const midweek = await api.getMidweekMeetings();
      const weekend = await api.getWeekendMeetings();

      const combined = [
        ...midweek.map(m => ({
          ...m,
          _type: 'Midweek',
          _title: m.bible_reading || 'Tesouros da Palavra de Deus',
          _presidentName: m.president?.full_name || 'Não designado',
          _partsCount: 3 // To be dynamic later when joining parts tables
        })),
        ...weekend.map(w => ({
          ...w,
          _type: 'Weekend',
          _title: w.talk_theme || 'Reunião Pública',
          _presidentName: w.president?.full_name || 'Não designado',
          _partsCount: 2
        }))
      ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      setMeetings(combined);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMeetings();
  }, []);

  const filteredMeetings = useMemo(() => {
    return meetings.filter(meeting => {
      const parsedDate = parseMeetingDate(meeting.date);
      if (!parsedDate) {
        return false;
      }
      return parsedDate.getMonth() === selectedMonth && parsedDate.getFullYear() === selectedYear;
    });
  }, [meetings, selectedMonth, selectedYear]);

  const moveMonth = (direction: -1 | 1) => {
    if (direction === -1) {
      if (selectedMonth === 0) {
        setSelectedMonth(11);
        setSelectedYear(current => current - 1);
        return;
      }
      setSelectedMonth(current => current - 1);
      return;
    }

    if (selectedMonth === 11) {
      setSelectedMonth(0);
      setSelectedYear(current => current + 1);
      return;
    }
    setSelectedMonth(current => current + 1);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Programação de Reuniões</h1>
          <p className="text-gray-500 mt-1">Veja as próximas reuniões e gerencie designações.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchMeetings}
            className="p-2.5 bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 rounded-lg transition-colors shadow-sm"
            title="Recarregar Dados"
            disabled={loading}
          >
            <RefreshCw size={18} className={loading ? 'animate-spin opacity-50' : ''} />
          </button>
          <Link
            to="/meetings/new"
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-colors shadow-sm"
          >
            <Plus size={18} />
            Nova Reunião
          </Link>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 p-3">
        <div className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-gray-50 px-1 py-1">
          <button
            onClick={() => moveMonth(-1)}
            className="rounded-md p-1.5 text-gray-600 transition-colors hover:bg-white"
            aria-label="Mês anterior"
          >
            <ChevronLeft size={16} />
          </button>
          <span className="px-2 text-gray-800 font-medium" style={{ fontSize: '0.9rem' }}>
            {MONTHS[selectedMonth]} {selectedYear}
          </span>
          <button
            onClick={() => moveMonth(1)}
            className="rounded-md p-1.5 text-gray-600 transition-colors hover:bg-white"
            aria-label="Próximo mês"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full py-12 text-center text-gray-500 border border-dashed border-gray-200 rounded-xl">
            Carregando reuniões da nuvem...
          </div>
        ) : meetings.length === 0 ? (
          <div className="col-span-full py-12 text-center text-gray-500 border border-dashed border-gray-200 rounded-xl">
            Nenhuma reunião agendada na base de dados.
          </div>
        ) : filteredMeetings.length === 0 ? (
          <div className="col-span-full py-12 text-center text-gray-500 border border-dashed border-gray-200 rounded-xl">
            Não há reuniões em {MONTHS[selectedMonth]} de {selectedYear}.
          </div>
        ) : (
          filteredMeetings.map((meeting) => (
            <div key={meeting.id} className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden flex flex-col">
              <div className={`h-2 ${meeting._type === 'Midweek' ? 'bg-amber-500' : 'bg-blue-500'}`} />

              <div className="p-5 flex-1">
                <div className="flex items-start justify-between mb-4">
                  <div className="bg-gray-100 rounded-lg px-3 py-1.5 text-xs font-semibold text-gray-700 uppercase tracking-wide">
                    {meeting._type === 'Midweek' ? 'Vida e Ministério' : 'Fim de Semana'}
                  </div>
                  <div className="text-right">
                    <span className="block text-2xl font-bold text-gray-900 leading-none">
                      {/* Safe parsing for UI visualization */}
                      {new Date(meeting.date).getDate().toString().padStart(2, '0')}
                    </span>
                    <span className="text-xs text-gray-500 uppercase font-medium">
                      {/* Safe parsing for UI visualization */}
                      {new Date(meeting.date).toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '')}
                    </span>
                  </div>
                </div>

                <h3 className="text-lg font-bold text-gray-900 mb-2 line-clamp-2 min-h-[3.5rem]">
                  {meeting._title}
                </h3>

                <div className="space-y-3 mt-4">
                  <div className="flex items-center gap-3 text-sm text-gray-600">
                    <Clock size={16} className="text-gray-400 shrink-0" />
                    <span>{meeting._type === 'Midweek' ? '19:30 - 21:15' : '09:00 - 10:45'}</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-gray-600">
                    <User size={16} className="text-gray-400 shrink-0" />
                    <span className="truncate">Presidente: {meeting._presidentName}</span>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 px-5 py-3 border-t border-gray-100 flex items-center justify-between">
                <span className="text-xs font-medium text-gray-500">
                  {meeting._partsCount} partes listadas
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
          )))}
      </div>
    </div>
  );
}
