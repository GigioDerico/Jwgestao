import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { ChevronLeft, ChevronRight, X, Search, MapPin, Clock, Users, Plus } from 'lucide-react';
import { toast } from 'sonner';
import type { CartAssignment } from '../types';

const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

const WEEK_COLORS = [
  { bg: 'bg-orange-50/50', header: 'bg-orange-400/80', row: 'bg-orange-50/30', accent: 'border-l-orange-400' },
  { bg: 'bg-green-50/50', header: 'bg-green-400/80', row: 'bg-green-50/30', accent: 'border-l-green-400' },
  { bg: 'bg-blue-50/50', header: 'bg-blue-400/80', row: 'bg-blue-50/30', accent: 'border-l-blue-400' },
  { bg: 'bg-red-50/50', header: 'bg-red-400/80', row: 'bg-red-50/30', accent: 'border-l-red-400' },
  { bg: 'bg-purple-50/50', header: 'bg-purple-400/80', row: 'bg-purple-50/30', accent: 'border-l-purple-400' },
];

const WEEKDAY_COLORS: Record<string, string> = {
  'Terça-feira': 'bg-red-100 text-red-700',
  'Quarta-feira': 'bg-orange-100 text-orange-700',
  'Quinta-feira': 'bg-yellow-100 text-yellow-700',
  'Sexta-feira': 'bg-green-100 text-green-700',
  'Sábado': 'bg-blue-100 text-blue-700',
};

export function CartAssignments() {
  const [currentMonth, setCurrentMonth] = useState(0); // Jan
  const [currentYear, setCurrentYear] = useState(2026);
  const [data, setData] = useState<CartAssignment[]>([]);
  const [editModal, setEditModal] = useState<{ id: string; field: 'publisher1' | 'publisher2'; currentValue: string } | null>(null);
  const [members, setMembers] = useState<{ id: string; full_name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newAssignment, setNewAssignment] = useState({
    day: '',
    weekday: 'Terça-feira',
    time: '',
    location: '',
    publisher1: '',
    publisher2: '',
    week: '1',
  });

  const fetchAssignments = async () => {
    try {
      setLoading(true);
      const rows = await api.getCartAssignments(currentMonth, currentYear);
      setData(rows);
    } catch (err) {
      console.error(err);
      toast.error('Erro ao carregar designações de carrinho.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    api.getMembers().then(data => setMembers(data.map((m: any) => ({ id: m.id, full_name: m.full_name })))).catch(console.error);
  }, []);

  useEffect(() => {
    fetchAssignments();
  }, [currentMonth, currentYear]);

  const prevMonth = () => {
    if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear(y => y - 1); }
    else setCurrentMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear(y => y + 1); }
    else setCurrentMonth(m => m + 1);
  };

  const handleEdit = (id: string, field: 'publisher1' | 'publisher2', currentValue: string) => {
    setEditModal({ id, field, currentValue });
  };

  const handleSave = async (newValue: string) => {
    if (!editModal) return;

    try {
      const updated = await api.updateCartAssignment(editModal.id, {
        [editModal.field]: newValue,
      } as any);
      setData(prev => prev.map(item => (item.id === editModal.id ? updated : item)));
      setEditModal(null);
      toast.success('Designação atualizada!');
    } catch (err: any) {
      toast.error(err.message || 'Erro ao atualizar designação de carrinho.');
    }
  };

  const handleCreate = async () => {
    if (!newAssignment.day || !newAssignment.time.trim() || !newAssignment.location.trim() || !newAssignment.publisher1 || !newAssignment.publisher2) {
      toast.error('Preencha dia, horário, local e os dois publicadores.');
      return;
    }

    try {
      const created = await api.createCartAssignment({
        month: currentMonth + 1,
        year: currentYear,
        day: Number(newAssignment.day),
        weekday: newAssignment.weekday,
        time: newAssignment.time.trim(),
        location: newAssignment.location.trim(),
        publisher1: newAssignment.publisher1,
        publisher2: newAssignment.publisher2,
        week: Number(newAssignment.week),
      });

      setData(prev => [...prev, created].sort((a, b) => a.week - b.week || a.day - b.day));
      setNewAssignment({
        day: '',
        weekday: 'Terça-feira',
        time: '',
        location: '',
        publisher1: '',
        publisher2: '',
        week: '1',
      });
      setShowCreateForm(false);
      toast.success('Nova designação de carrinho salva no banco.');
    } catch (err: any) {
      toast.error(err.message || 'Erro ao criar designação de carrinho.');
    }
  };

  // Group by week
  const weeks = [1, 2, 3, 4, 5];
  const grouped = weeks
    .map(w => ({
      week: w,
      items: data.filter(d => d.week === w),
    }))
    .filter(g => g.items.length > 0);

  return (
    <div className="space-y-4">
      {/* Month Navigator */}
      <div className="bg-card rounded-xl border border-border p-3 flex items-center justify-between shadow-sm">
        <button onClick={prevMonth} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
          <ChevronLeft size={18} className="text-gray-600" />
        </button>
        <h3 className="text-foreground" style={{ fontSize: '1rem' }}>
          {MONTHS[currentMonth]} {currentYear}
        </h3>
        <button onClick={nextMonth} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
          <ChevronRight size={18} className="text-gray-600" />
        </button>
      </div>

      <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div>
            <h4 className="text-foreground" style={{ fontSize: '0.95rem' }}>Criar nova escala de carrinho</h4>
            <p className="text-muted-foreground" style={{ fontSize: '0.8rem' }}>Cadastre uma nova linha de trabalho com carrinho organizada por semana.</p>
          </div>
          <button
            onClick={() => setShowCreateForm(prev => !prev)}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-primary-foreground transition-colors hover:bg-primary/90"
            style={{ fontSize: '0.85rem' }}
          >
            <Plus size={14} />
            {showCreateForm ? 'Fechar' : 'Nova escala'}
          </button>
        </div>

        {showCreateForm && (
          <div className="grid gap-4 px-4 py-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-muted-foreground" style={{ fontSize: '0.8rem' }}>Semana</label>
              <select
                value={newAssignment.week}
                onChange={e => setNewAssignment(prev => ({ ...prev, week: e.target.value }))}
                className="w-full rounded-lg border border-border bg-card px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="1">Semana 1</option>
                <option value="2">Semana 2</option>
                <option value="3">Semana 3</option>
                <option value="4">Semana 4</option>
                <option value="5">Semana 5</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-muted-foreground" style={{ fontSize: '0.8rem' }}>Dia do mês</label>
              <input
                type="number"
                min="1"
                max="31"
                value={newAssignment.day}
                onChange={e => setNewAssignment(prev => ({ ...prev, day: e.target.value }))}
                className="w-full rounded-lg border border-border bg-card px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="mb-1 block text-muted-foreground" style={{ fontSize: '0.8rem' }}>Dia da semana</label>
              <select
                value={newAssignment.weekday}
                onChange={e => setNewAssignment(prev => ({ ...prev, weekday: e.target.value }))}
                className="w-full rounded-lg border border-border bg-card px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="Terça-feira">Terça-feira</option>
                <option value="Quarta-feira">Quarta-feira</option>
                <option value="Quinta-feira">Quinta-feira</option>
                <option value="Sexta-feira">Sexta-feira</option>
                <option value="Sábado">Sábado</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-muted-foreground" style={{ fontSize: '0.8rem' }}>Horário</label>
              <input
                type="text"
                value={newAssignment.time}
                onChange={e => setNewAssignment(prev => ({ ...prev, time: e.target.value }))}
                placeholder="09:00 às 11:00"
                className="w-full rounded-lg border border-border bg-card px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div className="md:col-span-2">
              <label className="mb-1 block text-muted-foreground" style={{ fontSize: '0.8rem' }}>Local</label>
              <input
                type="text"
                value={newAssignment.location}
                onChange={e => setNewAssignment(prev => ({ ...prev, location: e.target.value }))}
                className="w-full rounded-lg border border-border bg-card px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="mb-1 block text-muted-foreground" style={{ fontSize: '0.8rem' }}>Publicador 1</label>
              <select
                value={newAssignment.publisher1}
                onChange={e => setNewAssignment(prev => ({ ...prev, publisher1: e.target.value }))}
                className="w-full rounded-lg border border-border bg-card px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">Selecione...</option>
                {members.map(member => (
                  <option key={`p1-${member.id}`} value={member.full_name}>{member.full_name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-muted-foreground" style={{ fontSize: '0.8rem' }}>Publicador 2</label>
              <select
                value={newAssignment.publisher2}
                onChange={e => setNewAssignment(prev => ({ ...prev, publisher2: e.target.value }))}
                className="w-full rounded-lg border border-border bg-card px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">Selecione...</option>
                {members.map(member => (
                  <option key={`p2-${member.id}`} value={member.full_name}>{member.full_name}</option>
                ))}
              </select>
            </div>
            <div className="md:col-span-2 flex justify-end">
              <button
                onClick={handleCreate}
                className="rounded-lg bg-primary px-4 py-2 text-primary-foreground transition-colors hover:bg-primary/90"
                style={{ fontSize: '0.9rem' }}
              >
                Criar designação
              </button>
            </div>
          </div>
        )}
      </div>

      {loading ? (
        <div className="bg-card rounded-xl border border-border p-12 text-center">
          <p className="text-muted-foreground" style={{ fontSize: '0.9rem' }}>Carregando designações de carrinho...</p>
        </div>
      ) : grouped.length === 0 ? (
        <div className="bg-card rounded-xl border border-border p-12 text-center">
          <p className="text-muted-foreground" style={{ fontSize: '0.9rem' }}>Nenhuma designação de carrinho para este mês.</p>
        </div>
      ) : (
        <div>
          {/* Desktop Table */}
          <div className="hidden md:block bg-white rounded-xl border border-gray-100 overflow-hidden">
            <div className="bg-gradient-to-r from-amber-500 to-orange-500 px-4 py-3">
              <h4 className="text-white text-center tracking-wide" style={{ fontSize: '0.9rem' }}>
                Arranjo de Trabalho com Carrinho — {MONTHS[currentMonth]} {currentYear}
              </h4>
            </div>

            {grouped.map((group, gIdx) => {
              const colors = WEEK_COLORS[gIdx % WEEK_COLORS.length];
              return (
                <div key={group.week}>
                  {/* Week header */}
                  <table className="w-full" style={{ fontSize: '0.82rem' }}>
                    <thead>
                      <tr className={`${colors.header} text-white`}>
                        <th className="px-3 py-2 text-center" style={{ width: '8%' }}>Dia</th>
                        <th className="px-3 py-2 text-center" style={{ width: '14%' }}>Dia da Semana</th>
                        <th className="px-3 py-2 text-center" style={{ width: '18%' }}>Hora</th>
                        <th className="px-3 py-2 text-center" style={{ width: '22%' }}>Local</th>
                        <th className="px-3 py-2 text-center" colSpan={2} style={{ width: '38%' }}>Publicadores</th>
                      </tr>
                    </thead>
                    <tbody>
                      {group.items.map((item, rIdx) => (
                        <tr
                          key={item.id}
                          className={`border-b border-gray-50 ${rIdx % 2 === 0 ? colors.row : 'bg-white'} hover:bg-gray-50/80 transition-colors`}
                        >
                          <td className="px-3 py-2 text-center text-gray-800">{item.day}</td>
                          <td className="px-3 py-2 text-center">
                            <span className={`inline-block px-2 py-0.5 rounded-full ${WEEKDAY_COLORS[item.weekday] || 'bg-gray-100 text-gray-600'}`} style={{ fontSize: '0.72rem' }}>
                              {item.weekday.toUpperCase()}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-center text-gray-600">{item.time}</td>
                          <td className="px-3 py-2 text-center text-gray-600">{item.location}</td>
                          <td className="px-2 py-2 text-center">
                            <button
                              onClick={() => handleEdit(item.id, 'publisher1', item.publisher1)}
                              className="px-2 py-0.5 rounded hover:bg-amber-50 text-gray-800 transition-colors"
                            >
                              {item.publisher1}
                            </button>
                          </td>
                          <td className="px-2 py-2 text-center">
                            <button
                              onClick={() => handleEdit(item.id, 'publisher2', item.publisher2)}
                              className="px-2 py-0.5 rounded hover:bg-amber-50 text-gray-800 transition-colors"
                            >
                              {item.publisher2}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              );
            })}
          </div>

          {/* Mobile Card View */}
          <div className="md:hidden space-y-4">
            {grouped.map((group, gIdx) => {
              const colors = WEEK_COLORS[gIdx % WEEK_COLORS.length];
              const firstDay = group.items[0]?.day;
              const lastDay = group.items[group.items.length - 1]?.day;
              return (
                <div key={group.week} className="space-y-2">
                  <div className={`${colors.header} rounded-lg px-4 py-2`}>
                    <span className="text-white" style={{ fontSize: '0.82rem' }}>
                      Semana {group.week} — Dias {firstDay} a {lastDay}
                    </span>
                  </div>
                  {group.items.map(item => (
                    <div
                      key={item.id}
                      className={`bg-white rounded-xl border border-gray-100 overflow-hidden border-l-4 ${colors.accent}`}
                    >
                      <div className="p-3">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="text-gray-800" style={{ fontSize: '0.85rem' }}>
                              Dia {item.day}
                            </span>
                            <span className={`px-2 py-0.5 rounded-full ${WEEKDAY_COLORS[item.weekday] || 'bg-gray-100 text-gray-600'}`} style={{ fontSize: '0.68rem' }}>
                              {item.weekday.toUpperCase()}
                            </span>
                          </div>
                          <span className="flex items-center gap-1 text-gray-500" style={{ fontSize: '0.78rem' }}>
                            <Clock size={12} />
                            {item.time}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 mb-2 text-gray-500" style={{ fontSize: '0.78rem' }}>
                          <MapPin size={12} />
                          {item.location}
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleEdit(item.id, 'publisher1', item.publisher1)}
                            className="flex-1 flex items-center gap-1.5 px-3 py-2 bg-gray-50 rounded-lg hover:bg-amber-50 transition-colors"
                          >
                            <Users size={12} className="text-amber-600 shrink-0" />
                            <span className="text-gray-700 truncate" style={{ fontSize: '0.8rem' }}>{item.publisher1}</span>
                          </button>
                          <button
                            onClick={() => handleEdit(item.id, 'publisher2', item.publisher2)}
                            className="flex-1 flex items-center gap-1.5 px-3 py-2 bg-gray-50 rounded-lg hover:bg-amber-50 transition-colors"
                          >
                            <Users size={12} className="text-amber-600 shrink-0" />
                            <span className="text-gray-700 truncate" style={{ fontSize: '0.8rem' }}>{item.publisher2}</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editModal && (
        <MemberSelectModal
          label={editModal.field === 'publisher1' ? 'Publicador 1' : 'Publicador 2'}
          currentValue={editModal.currentValue}
          onClose={() => setEditModal(null)}
          onSave={handleSave}
          members={members}
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
  members,
}: {
  label: string;
  currentValue: string;
  onClose: () => void;
  onSave: (value: string) => void;
  members: { id: string; full_name: string }[];
}) {
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(currentValue);

  const filtered = members.filter((m: { full_name: string }) =>
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
              className={`w-full text-left px-3 py-2.5 rounded-lg transition-colors ${selected === m.full_name ? 'bg-blue-50 text-blue-700' : 'hover:bg-gray-50 text-gray-700'
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
