import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { ChevronLeft, ChevronRight, X, Search, MapPin, Clock, User, Plus } from 'lucide-react';
import { toast } from 'sonner';
import type { FieldServiceAssignment } from '../types';

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
  const [data, setData] = useState<FieldServiceAssignment[]>([]);
  const [editModal, setEditModal] = useState<{ id: string; currentValue: string } | null>(null);
  const [members, setMembers] = useState<{ id: string; full_name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newAssignment, setNewAssignment] = useState({
    weekday: '',
    time: '',
    responsible: '',
    location: 'Salão do Reino',
    category: 'Terça-feira',
  });

  const fetchAssignments = async () => {
    try {
      setLoading(true);
      const rows = await api.getFieldServiceAssignments(currentMonth, currentYear);
      setData(rows);
    } catch (err) {
      console.error(err);
      toast.error('Erro ao carregar saídas de campo.');
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

  const handleEdit = (id: string, currentValue: string) => {
    setEditModal({ id, currentValue });
  };

  const handleSave = async (newValue: string) => {
    if (!editModal) return;

    try {
      const updated = await api.updateFieldServiceAssignment(editModal.id, {
        responsible: newValue,
      });
      setData(prev => prev.map(item => (item.id === editModal.id ? updated : item)));
      setEditModal(null);
      toast.success('Designação atualizada!');
    } catch (err: any) {
      toast.error(err.message || 'Erro ao atualizar saída de campo.');
    }
  };

  const handleCreate = async () => {
    if (!newAssignment.weekday.trim() || !newAssignment.time.trim() || !newAssignment.responsible.trim()) {
      toast.error('Preencha dia, horário e responsável.');
      return;
    }

    try {
      const created = await api.createFieldServiceAssignment({
        month: currentMonth + 1,
        year: currentYear,
        weekday: newAssignment.weekday.trim(),
        time: newAssignment.time.trim(),
        responsible: newAssignment.responsible.trim(),
        location: newAssignment.location.trim(),
        category: newAssignment.category,
      });

      setData(prev => [...prev, created]);
      setNewAssignment({
        weekday: '',
        time: '',
        responsible: '',
        location: 'Salão do Reino',
        category: 'Terça-feira',
      });
      setShowCreateForm(false);
      toast.success('Nova designação de saída de campo salva no banco.');
    } catch (err: any) {
      toast.error(err.message || 'Erro ao criar saída de campo.');
    }
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
            <h4 className="text-foreground" style={{ fontSize: '0.95rem' }}>Criar nova saída de campo</h4>
            <p className="text-muted-foreground" style={{ fontSize: '0.8rem' }}>Cadastre um novo arranjo de saída mantendo o agrupamento por categoria.</p>
          </div>
          <button
            onClick={() => setShowCreateForm(prev => !prev)}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-primary-foreground transition-colors hover:bg-primary/90"
            style={{ fontSize: '0.85rem' }}
          >
            <Plus size={14} />
            {showCreateForm ? 'Fechar' : 'Nova saída'}
          </button>
        </div>

        {showCreateForm && (
          <div className="grid gap-4 px-4 py-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-muted-foreground" style={{ fontSize: '0.8rem' }}>Categoria</label>
              <select
                value={newAssignment.category}
                onChange={e => setNewAssignment(prev => ({ ...prev, category: e.target.value }))}
                className="w-full rounded-lg border border-border bg-card px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="Terça-feira">Terça-feira</option>
                <option value="Quarta-feira">Quarta-feira</option>
                <option value="Sexta-feira">Sexta-feira</option>
                <option value="Sábado">Sábado</option>
                <option value="Sábado - Rural">Sábado - Rural</option>
                <option value="Domingo">Domingo</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-muted-foreground" style={{ fontSize: '0.8rem' }}>Dia</label>
              <input
                type="text"
                value={newAssignment.weekday}
                onChange={e => setNewAssignment(prev => ({ ...prev, weekday: e.target.value }))}
                placeholder="Ex.: Sábado 14/03"
                className="w-full rounded-lg border border-border bg-card px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="mb-1 block text-muted-foreground" style={{ fontSize: '0.8rem' }}>Horário</label>
              <input
                type="text"
                value={newAssignment.time}
                onChange={e => setNewAssignment(prev => ({ ...prev, time: e.target.value }))}
                placeholder="08:45"
                className="w-full rounded-lg border border-border bg-card px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="mb-1 block text-muted-foreground" style={{ fontSize: '0.8rem' }}>Responsável</label>
              <select
                value={newAssignment.responsible}
                onChange={e => setNewAssignment(prev => ({ ...prev, responsible: e.target.value }))}
                className="w-full rounded-lg border border-border bg-card px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">Selecione...</option>
                <option value="Saída dos Grupos">Saída dos Grupos</option>
                {members.map(member => (
                  <option key={member.id} value={member.full_name}>{member.full_name}</option>
                ))}
              </select>
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

      {/* Quote */}
      <div className="bg-gradient-to-r from-emerald-600 to-green-600 rounded-xl p-4 text-center">
        <p className="text-white/90 italic" style={{ fontSize: '0.82rem' }}>
          "Portanto, vão e façam discípulos de pessoas de todas as nações... ensinando-as a obedecer a todas as coisas que lhes ordenei."
        </p>
        <p className="text-white/70 mt-1" style={{ fontSize: '0.75rem' }}>— Mateus 28:19,20</p>
      </div>

      {/* Categories */}
      {loading ? (
        <div className="rounded-xl border border-border bg-card p-12 text-center text-muted-foreground">
          Carregando saídas de campo...
        </div>
      ) : (
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
      )}

      {/* Edit Modal */}
      {editModal && (
        <MemberSelectModal
          label="Responsável pela Saída de Campo"
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
