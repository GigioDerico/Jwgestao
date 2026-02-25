import React, { useState } from 'react';
import { fieldServiceAssignments, FieldServiceAssignment } from '../data/mechanicalData';
import { members } from '../data/mockData';
import { ChevronLeft, ChevronRight, X, Search, MapPin, Clock, User } from 'lucide-react';
import { toast } from 'sonner';

const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

const CATEGORY_COLORS: Record<string, { bg: string; header: string; border: string }> = {
  'Terça-feira': { bg: 'bg-emerald-50/50', header: 'bg-emerald-600', border: 'border-emerald-200' },
  'Quarta-feira': { bg: 'bg-teal-50/50', header: 'bg-teal-600', border: 'border-teal-200' },
  'Sexta-feira': { bg: 'bg-cyan-50/50', header: 'bg-cyan-600', border: 'border-cyan-200' },
  'Sábado': { bg: 'bg-green-50/50', header: 'bg-green-600', border: 'border-green-200' },
  'Sábado - Rural': { bg: 'bg-lime-50/50', header: 'bg-lime-600', border: 'border-lime-200' },
  'Domingo': { bg: 'bg-emerald-50/50', header: 'bg-emerald-700', border: 'border-emerald-200' },
};

export function FieldServiceAssignments() {
  const [currentMonth, setCurrentMonth] = useState(1);
  const [currentYear, setCurrentYear] = useState(2026);
  const [data, setData] = useState<FieldServiceAssignment[]>(fieldServiceAssignments);
  const [editModal, setEditModal] = useState<{ id: string; currentValue: string } | null>(null);

  const prevMonth = () => {
    if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear(y => y - 1); }
    else setCurrentMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear(y => y + 1); }
    else setCurrentMonth(m => m + 1);
  };

  const handleEdit = (id: string, currentValue: string) => {
    setEditModal({ id, currentValue });
  };

  const handleSave = (newValue: string) => {
    if (!editModal) return;
    setData(prev => prev.map(item =>
      item.id === editModal.id ? { ...item, responsible: newValue } : item
    ));
    setEditModal(null);
    toast.success('Designação atualizada!');
  };

  // Group by category
  const categories = ['Terça-feira', 'Quarta-feira', 'Sexta-feira', 'Sábado', 'Sábado - Rural', 'Domingo'];
  const grouped = categories
    .map(cat => ({
      category: cat,
      items: data.filter(d => d.category === cat),
    }))
    .filter(g => g.items.length > 0);

  return (
    <div className="space-y-4">
      {/* Month Navigator */}
      <div className="bg-white rounded-xl border border-gray-100 p-3 flex items-center justify-between">
        <button onClick={prevMonth} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
          <ChevronLeft size={18} className="text-gray-600" />
        </button>
        <h3 className="text-gray-900" style={{ fontSize: '1rem' }}>
          {MONTHS[currentMonth]} {currentYear}
        </h3>
        <button onClick={nextMonth} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
          <ChevronRight size={18} className="text-gray-600" />
        </button>
      </div>

      {/* Quote */}
      <div className="bg-gradient-to-r from-emerald-600 to-green-600 rounded-xl p-4 text-center">
        <p className="text-white/90 italic" style={{ fontSize: '0.82rem' }}>
          "Portanto, vão e façam discípulos de pessoas de todas as nações... ensinando-as a obedecer a todas as coisas que lhes ordenei."
        </p>
        <p className="text-white/70 mt-1" style={{ fontSize: '0.75rem' }}>— Mateus 28:19,20</p>
      </div>

      {/* Categories */}
      <div className="space-y-4">
        {grouped.map(group => {
          const colors = CATEGORY_COLORS[group.category] || CATEGORY_COLORS['Terça-feira'];
          return (
            <div key={group.category} className="bg-white rounded-xl border border-gray-100 overflow-hidden">
              <div className={`${colors.header} px-4 py-2.5`}>
                <h4 className="text-white text-center tracking-wide" style={{ fontSize: '0.85rem' }}>
                  {group.category}
                </h4>
              </div>

              {/* Desktop Table */}
              <div className="hidden sm:block">
                <table className="w-full" style={{ fontSize: '0.82rem' }}>
                  <thead>
                    <tr className="bg-gray-50 text-gray-500 border-b border-gray-100">
                      <th className="px-4 py-2 text-left" style={{ width: '25%' }}>Dia</th>
                      <th className="px-4 py-2 text-center" style={{ width: '20%' }}>Horário</th>
                      <th className="px-4 py-2 text-center" style={{ width: '30%' }}>Responsável</th>
                      <th className="px-4 py-2 text-center" style={{ width: '25%' }}>Local</th>
                    </tr>
                  </thead>
                  <tbody>
                    {group.items.map((item, idx) => (
                      <tr
                        key={item.id}
                        className={`border-b border-gray-50 ${idx % 2 === 0 ? colors.bg : 'bg-white'} hover:bg-green-50/60 transition-colors`}
                      >
                        <td className="px-4 py-2.5 text-gray-700">{item.weekday}</td>
                        <td className="px-4 py-2.5 text-center text-gray-600">{item.time}h</td>
                        <td className="px-4 py-2.5 text-center">
                          {item.responsible === 'Saída dos Grupos' ? (
                            <span className="text-gray-700">{item.responsible}</span>
                          ) : (
                            <button
                              onClick={() => handleEdit(item.id, item.responsible)}
                              className="px-3 py-1 rounded-lg hover:bg-green-100 text-gray-800 transition-colors"
                            >
                              {item.responsible}
                            </button>
                          )}
                        </td>
                        <td className="px-4 py-2.5 text-center text-gray-500">{item.location}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Cards */}
              <div className="sm:hidden divide-y divide-gray-50">
                {group.items.map(item => (
                  <button
                    key={item.id}
                    onClick={() => item.responsible !== 'Saída dos Grupos' ? handleEdit(item.id, item.responsible) : undefined}
                    className="w-full text-left p-3 hover:bg-green-50/40 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-gray-800" style={{ fontSize: '0.85rem' }}>{item.weekday}</span>
                      <span className="flex items-center gap-1 text-gray-500" style={{ fontSize: '0.78rem' }}>
                        <Clock size={12} />
                        {item.time}h
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-gray-700" style={{ fontSize: '0.82rem' }}>
                        <User size={12} className="text-green-600" />
                        {item.responsible}
                      </span>
                      {item.location && (
                        <span className="flex items-center gap-1 text-gray-400" style={{ fontSize: '0.75rem' }}>
                          <MapPin size={11} />
                          {item.location}
                        </span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Edit Modal */}
      {editModal && (
        <MemberSelectModal
          label="Responsável pela Saída de Campo"
          currentValue={editModal.currentValue}
          onClose={() => setEditModal(null)}
          onSave={handleSave}
        />
      )}
    </div>
  );
}

function MemberSelectModal({
  label,
  currentValue,
  onClose,
  onSave,
}: {
  label: string;
  currentValue: string;
  onClose: () => void;
  onSave: (value: string) => void;
}) {
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(currentValue);

  const filtered = members.filter(m =>
    m.full_name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md max-h-[80vh] flex flex-col">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between shrink-0">
          <div>
            <h3 className="text-gray-900">Editar Designação</h3>
            <p className="text-gray-500 mt-0.5" style={{ fontSize: '0.8rem' }}>{label}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>
        <div className="p-3 border-b border-gray-100 shrink-0">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar membro..."
              className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              style={{ fontSize: '0.9rem' }}
              autoFocus
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          {filtered.map(m => (
            <button
              key={m.id}
              onClick={() => setSelected(m.full_name)}
              className={`w-full text-left px-3 py-2.5 rounded-lg transition-colors ${
                selected === m.full_name ? 'bg-blue-50 text-blue-700' : 'hover:bg-gray-50 text-gray-700'
              }`}
              style={{ fontSize: '0.9rem' }}
            >
              {m.full_name}
            </button>
          ))}
        </div>
        <div className="p-3 border-t border-gray-100 flex gap-3 justify-end shrink-0">
          <button onClick={onClose} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition" style={{ fontSize: '0.9rem' }}>
            Cancelar
          </button>
          <button
            onClick={() => onSave(selected)}
            className="px-4 py-2 bg-[#1a1a2e] text-white rounded-lg hover:bg-[#16213e] transition"
            style={{ fontSize: '0.9rem' }}
          >
            Confirmar
          </button>
        </div>
      </div>
    </div>
  );
}
