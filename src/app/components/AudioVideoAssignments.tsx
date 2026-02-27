import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { ChevronLeft, ChevronRight, X, Search, Plus } from 'lucide-react';
import { toast } from 'sonner';
import type { AudioVideoAssignment } from '../types';

const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

export function AudioVideoAssignments() {
  const [currentMonth, setCurrentMonth] = useState(1); // Feb (0-indexed)
  const [currentYear, setCurrentYear] = useState(2026);
  const [data, setData] = useState<AudioVideoAssignment[]>([]);
  const [editModal, setEditModal] = useState<{ id: string; field: string; value: string } | null>(null);
  const [members, setMembers] = useState<{ id: string; full_name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newAssignment, setNewAssignment] = useState({
    date: '',
    weekday: 'Domingo',
    sound: '',
    image: '',
    stage: '',
    rovingMic1: '',
    rovingMic2: '',
    attendants: '',
  });

  const fetchAssignments = async () => {
    try {
      setLoading(true);
      const rows = await api.getAudioVideoAssignments(currentMonth, currentYear);
      setData(rows);
    } catch (err) {
      console.error(err);
      toast.error('Erro ao carregar designações de áudio e vídeo.');
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

  const filteredData = data;

  // Group by week pairs (Sunday + Thursday)
  const weekPairs: AudioVideoAssignment[][] = [];
  for (let i = 0; i < filteredData.length; i += 2) {
    weekPairs.push(filteredData.slice(i, i + 2));
  }

  const handleEdit = (id: string, field: string, value: string) => {
    setEditModal({ id, field, value });
  };

  const handleSave = async (newValue: string) => {
    if (!editModal) return;

    const fieldMap: Record<string, string> = {
      sound: 'sound',
      image: 'image',
      stage: 'stage',
      rovingMic1: 'roving_mic_1',
      rovingMic2: 'roving_mic_2',
    };

    try {
      const updated = await api.updateAudioVideoAssignment(editModal.id, {
        [fieldMap[editModal.field] || editModal.field]: newValue,
      } as any);
      setData(prev => prev.map(item => (item.id === editModal.id ? updated : item)));
      setEditModal(null);
      toast.success('Designação atualizada!');
    } catch (err: any) {
      toast.error(err.message || 'Erro ao atualizar designação.');
    }
  };

  const handleCreate = async () => {
    if (!newAssignment.date || !newAssignment.sound || !newAssignment.image || !newAssignment.stage) {
      toast.error('Preencha data, som, imagem e palco.');
      return;
    }

    try {
      const created = await api.createAudioVideoAssignment({
        date: newAssignment.date,
        weekday: newAssignment.weekday,
        sound: newAssignment.sound,
        image: newAssignment.image,
        stage: newAssignment.stage,
        roving_mic_1: newAssignment.rovingMic1 || 'A definir',
        roving_mic_2: newAssignment.rovingMic2 || 'A definir',
        attendants: newAssignment.attendants
          .split(',')
          .map(item => item.trim())
          .filter(Boolean),
      });

      const createdDate = new Date(`${created.date}T12:00:00`);
      if (createdDate.getMonth() !== currentMonth || createdDate.getFullYear() !== currentYear) {
        setCurrentMonth(createdDate.getMonth());
        setCurrentYear(createdDate.getFullYear());
      } else {
        setData(prev => [...prev, created].sort((a, b) => a.date.localeCompare(b.date)));
      }
      setNewAssignment({
        date: '',
        weekday: 'Domingo',
        sound: '',
        image: '',
        stage: '',
        rovingMic1: '',
        rovingMic2: '',
        attendants: '',
      });
      setShowCreateForm(false);
      toast.success('Nova designação de Áudio e Vídeo salva no banco.');
    } catch (err: any) {
      toast.error(err.message || 'Erro ao criar designação de áudio e vídeo.');
    }
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr + 'T12:00:00');
    return `${d.getDate()}-${MONTHS[d.getMonth()].substring(0, 3).toLowerCase()}.`;
  };

  const roleColors: Record<string, string> = {
    sound: 'bg-sky-500',
    image: 'bg-indigo-500',
    stage: 'bg-emerald-500',
    rovingMic1: 'bg-amber-500',
    rovingMic2: 'bg-amber-500',
    attendants: 'bg-slate-500',
  };

  const roleLabels: Record<string, string> = {
    sound: 'Som',
    image: 'Imagem',
    stage: 'Palco',
    rovingMic1: 'Mic. Volante 1',
    rovingMic2: 'Mic. Volante 2',
    attendants: 'Entradas / Auditório',
  };

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
            <h4 className="text-foreground" style={{ fontSize: '0.95rem' }}>Criar nova escala</h4>
            <p className="text-muted-foreground" style={{ fontSize: '0.8rem' }}>Cadastre uma nova linha de A/V seguindo o mesmo padrao da tabela.</p>
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
              <label className="mb-1 block text-muted-foreground" style={{ fontSize: '0.8rem' }}>Data</label>
              <input
                type="date"
                value={newAssignment.date}
                onChange={e => setNewAssignment(prev => ({ ...prev, date: e.target.value }))}
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
                <option value="Domingo">Domingo</option>
                <option value="Quinta">Quinta</option>
              </select>
            </div>
            {[
              { key: 'sound', label: 'Som' },
              { key: 'image', label: 'Imagem' },
              { key: 'stage', label: 'Palco' },
              { key: 'rovingMic1', label: 'Mic. Volante 1' },
              { key: 'rovingMic2', label: 'Mic. Volante 2' },
            ].map(field => (
              <div key={field.key}>
                <label className="mb-1 block text-muted-foreground" style={{ fontSize: '0.8rem' }}>{field.label}</label>
                <select
                  value={newAssignment[field.key as keyof typeof newAssignment] as string}
                  onChange={e => setNewAssignment(prev => ({ ...prev, [field.key]: e.target.value }))}
                  className="w-full rounded-lg border border-border bg-card px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">Selecione...</option>
                  {members.map(member => (
                    <option key={`${field.key}-${member.id}`} value={member.full_name}>{member.full_name}</option>
                  ))}
                </select>
              </div>
            ))}
            <div className="md:col-span-2">
              <label className="mb-1 block text-muted-foreground" style={{ fontSize: '0.8rem' }}>Entradas / Auditório</label>
              <input
                type="text"
                value={newAssignment.attendants}
                onChange={e => setNewAssignment(prev => ({ ...prev, attendants: e.target.value }))}
                placeholder="Separe por vírgula"
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

      {loading ? (
        <div className="bg-card rounded-xl border border-border p-12 text-center">
          <p className="text-muted-foreground" style={{ fontSize: '0.9rem' }}>Carregando designações...</p>
        </div>
      ) : filteredData.length === 0 ? (
        <div className="bg-card rounded-xl border border-border p-12 text-center">
          <p className="text-muted-foreground" style={{ fontSize: '0.9rem' }}>Nenhuma designação para este mês.</p>
        </div>
      ) : (
        <div>
          {/* Desktop Table View */}
          <div className="hidden md:block bg-white rounded-xl border border-gray-100 overflow-hidden">
            <div className="bg-[#4a9bc7] px-4 py-3">
              <h4 className="text-white text-center tracking-wide" style={{ fontSize: '0.9rem' }}>
                Áudio e Vídeo / Indicadores — {MONTHS[currentMonth]} {currentYear}
              </h4>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full" style={{ fontSize: '0.82rem' }}>
                <thead>
                  <tr className="bg-[#5badd4] text-white">
                    <th className="px-3 py-2.5 text-left" style={{ width: '12%' }}>Data</th>
                    <th className="px-3 py-2.5 text-center" style={{ width: '12%' }}>Som</th>
                    <th className="px-3 py-2.5 text-center" style={{ width: '12%' }}>Imagem</th>
                    <th className="px-3 py-2.5 text-center" style={{ width: '12%' }}>Palco</th>
                    <th className="px-3 py-2.5 text-center" colSpan={2} style={{ width: '20%' }}>Microfone Volante</th>
                    <th className="px-3 py-2.5 text-center" style={{ width: '20%' }}>Entradas / Auditório</th>
                  </tr>
                </thead>
                <tbody>
                  {weekPairs.map((pair, wIdx) => (
                    <React.Fragment key={wIdx}>
                      {pair.map((item, rIdx) => (
                        <tr
                          key={item.id}
                          className={`border-b border-gray-100 ${wIdx % 2 === 0 ? 'bg-blue-50/40' : 'bg-white'} hover:bg-blue-50/70 transition-colors`}
                        >
                          <td className="px-3 py-2.5 text-gray-700">
                            <div>{formatDate(item.date)}</div>
                            <div className="text-gray-400" style={{ fontSize: '0.75rem' }}>{item.weekday}</div>
                          </td>
                          <td className="px-2 py-2.5 text-center">
                            <button
                              onClick={() => handleEdit(item.id, 'sound', item.sound)}
                              className="w-full px-2 py-1 rounded hover:bg-sky-50 text-gray-700 transition-colors"
                            >
                              {item.sound}
                            </button>
                          </td>
                          <td className="px-2 py-2.5 text-center">
                            <button
                              onClick={() => handleEdit(item.id, 'image', item.image)}
                              className="w-full px-2 py-1 rounded hover:bg-indigo-50 text-gray-700 transition-colors"
                            >
                              {item.image}
                            </button>
                          </td>
                          <td className="px-2 py-2.5 text-center">
                            <button
                              onClick={() => handleEdit(item.id, 'stage', item.stage)}
                              className="w-full px-2 py-1 rounded hover:bg-emerald-50 text-gray-700 transition-colors"
                            >
                              {item.stage}
                            </button>
                          </td>
                          <td className="px-2 py-2.5 text-center">
                            <button
                              onClick={() => handleEdit(item.id, 'rovingMic1', item.rovingMic1)}
                              className="w-full px-2 py-1 rounded hover:bg-amber-50 text-gray-700 transition-colors"
                            >
                              {item.rovingMic1}
                            </button>
                          </td>
                          <td className="px-2 py-2.5 text-center">
                            <button
                              onClick={() => handleEdit(item.id, 'rovingMic2', item.rovingMic2)}
                              className="w-full px-2 py-1 rounded hover:bg-amber-50 text-gray-700 transition-colors"
                            >
                              {item.rovingMic2}
                            </button>
                          </td>
                          <td className="px-2 py-2.5 text-center text-gray-700">
                            {item.attendants.join(' / ')}
                          </td>
                        </tr>
                      ))}
                      {wIdx < weekPairs.length - 1 && (
                        <tr><td colSpan={7} className="h-1 bg-[#4a9bc7]/10"></td></tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile Card View */}
          <div className="md:hidden space-y-3">
            {filteredData.map(item => (
              <div key={item.id} className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                <div className="bg-[#4a9bc7] px-4 py-2 flex items-center justify-between">
                  <span className="text-white" style={{ fontSize: '0.85rem' }}>
                    {formatDate(item.date)} — {item.weekday}
                  </span>
                </div>
                <div className="p-3 space-y-2">
                  {[
                    { key: 'sound', label: 'Som', value: item.sound, color: 'bg-sky-100 text-sky-700' },
                    { key: 'image', label: 'Imagem', value: item.image, color: 'bg-indigo-100 text-indigo-700' },
                    { key: 'stage', label: 'Palco', value: item.stage, color: 'bg-emerald-100 text-emerald-700' },
                    { key: 'rovingMic1', label: 'Mic. Volante', value: `${item.rovingMic1} / ${item.rovingMic2}`, color: 'bg-amber-100 text-amber-700' },
                    { key: 'attendants', label: 'Entradas', value: item.attendants.join(' / '), color: 'bg-slate-100 text-slate-700' },
                  ].map(role => (
                    <button
                      key={role.key}
                      onClick={() => role.key !== 'attendants' ? handleEdit(item.id, role.key, role.key === 'rovingMic1' ? item.rovingMic1 : (role.value as string)) : undefined}
                      className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors text-left"
                    >
                      <span className={`px-2 py-0.5 rounded-full ${role.color}`} style={{ fontSize: '0.7rem' }}>
                        {role.label}
                      </span>
                      <span className="text-gray-700 flex-1 text-right" style={{ fontSize: '0.82rem' }}>
                        {role.value}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editModal && (
        <MemberSelectModal
          label={roleLabels[editModal.field] || editModal.field}
          currentValue={editModal.value}
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
