import React, { useEffect, useRef, useState } from 'react';
import { api } from '../lib/api';
import { ChevronLeft, ChevronRight, X, Search, MapPin, Clock, Users, Plus, Copy, Edit2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { downloadElementAsImage, downloadElementAsPdf } from '../lib/dom-export';
import { filterMembersEligibleForAssignments } from '../lib/assignment-member-eligibility';
import { ExportActions } from './ExportActions';
import type { CartAssignment } from '../types';
import { useAuth } from '../context/AuthContext';

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

const WEEKDAY_INDEX_BY_KEY: Record<string, number> = {
  domingo: 0,
  segundafeira: 1,
  tercafeira: 2,
  quartafeira: 3,
  quintafeira: 4,
  sextafeira: 5,
  sabado: 6,
};

function normalizeWeekdayKey(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z]/g, '');
}

function getMonthDaysForWeekday(monthIndex: number, year: number, weekday: string): number[] {
  const key = normalizeWeekdayKey(weekday);
  const weekdayIndex = WEEKDAY_INDEX_BY_KEY[key];
  if (typeof weekdayIndex !== 'number') {
    return [];
  }

  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const days: number[] = [];

  for (let day = 1; day <= daysInMonth; day += 1) {
    if (new Date(year, monthIndex, day).getDay() === weekdayIndex) {
      days.push(day);
    }
  }

  return days;
}

export function CartAssignments({
  canCreate = true,
  canEdit = true,
  canExportImage = true,
  canExportPdf = true,
}: {
  canCreate?: boolean;
  canEdit?: boolean;
  canExportImage?: boolean;
  canExportPdf?: boolean;
}) {
  const { user } = useAuth();
  const today = new Date();
  const readOnly = !canEdit;
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [data, setData] = useState<CartAssignment[]>([]);
  const [nameFilter, setNameFilter] = useState('');
  const [editModal, setEditModal] = useState<{ id: string; field: 'publisher1' | 'publisher2'; currentValue: string } | null>(null);
  const [editRowModal, setEditRowModal] = useState<CartAssignment | null>(null);
  const [members, setMembers] = useState<{ id: string; full_name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [copyingFromPreviousMonth, setCopyingFromPreviousMonth] = useState(false);
  const [exporting, setExporting] = useState<'image' | 'pdf' | null>(null);
  const exportRef = useRef<HTMLDivElement>(null);
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
    api
      .getMembers()
      .then(data =>
        setMembers(
          filterMembersEligibleForAssignments(data || []).map((m: any) => ({
            id: m.id,
            full_name: m.full_name,
          })),
        ),
      )
      .catch(console.error);
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

  const getPreviousPeriod = () => {
    if (currentMonth === 0) {
      return { month: 11, year: currentYear - 1 };
    }

    return { month: currentMonth - 1, year: currentYear };
  };

  const handleEdit = (id: string, field: 'publisher1' | 'publisher2', currentValue: string) => {
    if (!canEdit) {
      return;
    }

    setEditModal({ id, field, currentValue });
  };

  const findMemberIdByName = (fullName: string) => {
    if (!fullName) {
      return null;
    }

    return members.find(member => member.full_name === fullName)?.id || null;
  };

  const handleSave = async (newValue: string) => {
    if (!editModal) return;

    try {
      const updated = await api.updateCartAssignment(editModal.id, {
        [editModal.field]: newValue,
        [`${editModal.field}_member_id`]: findMemberIdByName(newValue),
      } as any);
      setData(prev => prev.map(item => (item.id === editModal.id ? updated : item)));
      setEditModal(null);
      toast.success('Designação atualizada!');
    } catch (err: any) {
      toast.error(err.message || 'Erro ao atualizar designação de carrinho.');
    }
  };

  const handleDeleteRow = async (id: string) => {
    if (!canEdit) return;
    if (!window.confirm('Excluir esta designação de carrinho?')) return;
    try {
      await api.deleteCartAssignment(id);
      setData(prev => prev.filter(item => item.id !== id));
      toast.success('Designação excluída.');
    } catch (err: any) {
      toast.error(err.message || 'Erro ao excluir designação.');
    }
  };

  const handleSaveRow = async (updated: CartAssignment) => {
    try {
      const saved = await api.updateCartAssignment(updated.id, {
        week: updated.week,
        time: updated.time,
        location: updated.location,
        publisher1: updated.publisher1,
        publisher1_member_id: findMemberIdByName(updated.publisher1),
        publisher2: updated.publisher2,
        publisher2_member_id: findMemberIdByName(updated.publisher2),
      } as any);
      setData(prev => prev.map(item => (item.id === saved.id ? saved : item)).sort((a, b) => a.week - b.week || a.day - b.day));
      setEditRowModal(null);
      toast.success('Designação atualizada!');
    } catch (err: any) {
      toast.error(err.message || 'Erro ao atualizar designação.');
    }
  };

  const handleCreate = async () => {
    if (!canCreate) {
      return;
    }

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
        publisher1_member_id: findMemberIdByName(newAssignment.publisher1),
        publisher2: newAssignment.publisher2,
        publisher2_member_id: findMemberIdByName(newAssignment.publisher2),
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

  const handleCopyPreviousMonth = async () => {
    if (!canCreate || copyingFromPreviousMonth) {
      return;
    }

    const previousPeriod = getPreviousPeriod();
    const previousLabel = `${MONTHS[previousPeriod.month]} ${previousPeriod.year}`;

    try {
      setCopyingFromPreviousMonth(true);

      const previousRows = await api.getCartAssignments(previousPeriod.month, previousPeriod.year);
      if (previousRows.length === 0) {
        toast.error(`Não há designações em ${previousLabel}.`);
        return;
      }

      if (data.length > 0) {
        const shouldReplace = window.confirm(
          `O mês atual já possui ${data.length} designação(ões). Deseja substituir tudo por uma cópia de ${previousLabel}?`,
        );

        if (!shouldReplace) {
          return;
        }

        await api.deleteCartAssignmentsForMonth(currentMonth, currentYear);
      }

      const sourceDaysByWeekday = new Map<string, number[]>();
      for (const row of previousRows) {
        const key = normalizeWeekdayKey(row.weekday);
        if (!key) {
          continue;
        }

        const currentDays = sourceDaysByWeekday.get(key) || [];
        if (!currentDays.includes(row.day)) {
          currentDays.push(row.day);
          currentDays.sort((a, b) => a - b);
          sourceDaysByWeekday.set(key, currentDays);
        }
      }

      const targetDaysByWeekday = new Map<string, number[]>();
      const rowsToCreate: Parameters<typeof api.createCartAssignment>[0][] = [];
      let skippedRows = 0;

      const sortedPreviousRows = [...previousRows].sort(
        (a, b) => a.week - b.week || a.day - b.day || a.time.localeCompare(b.time),
      );

      for (const row of sortedPreviousRows) {
        const key = normalizeWeekdayKey(row.weekday);
        if (!key) {
          skippedRows += 1;
          continue;
        }

        const sourceDays = sourceDaysByWeekday.get(key) || [];
        if (sourceDays.length === 0) {
          skippedRows += 1;
          continue;
        }

        let occurrenceIndex = sourceDays.indexOf(row.day);
        if (occurrenceIndex < 0) {
          occurrenceIndex = sourceDays.filter(sourceDay => sourceDay < row.day).length;
        }

        let targetDays = targetDaysByWeekday.get(key);
        if (!targetDays) {
          targetDays = getMonthDaysForWeekday(currentMonth, currentYear, row.weekday);
          targetDaysByWeekday.set(key, targetDays);
        }

        if (occurrenceIndex < 0 || occurrenceIndex >= targetDays.length) {
          skippedRows += 1;
          continue;
        }

        rowsToCreate.push({
          month: currentMonth + 1,
          year: currentYear,
          day: targetDays[occurrenceIndex],
          weekday: row.weekday,
          time: row.time,
          location: row.location,
          publisher1: row.publisher1,
          publisher1_member_id: findMemberIdByName(row.publisher1),
          publisher2: row.publisher2,
          publisher2_member_id: findMemberIdByName(row.publisher2),
          week: occurrenceIndex + 1,
        });
      }

      if (rowsToCreate.length === 0) {
        toast.error('Não foi possível copiar as designações do mês anterior.');
        return;
      }

      const createdRows: CartAssignment[] = [];
      for (const rowInput of rowsToCreate) {
        const created = await api.createCartAssignment(rowInput);
        createdRows.push(created);
      }

      setData(createdRows.sort((a, b) => a.week - b.week || a.day - b.day || a.time.localeCompare(b.time)));

      if (skippedRows > 0) {
        toast.warning(`${skippedRows} designação(ões) não couberam no mês atual e foram ignoradas.`);
      }

      toast.success(`${createdRows.length} designação(ões) copiadas de ${previousLabel}.`);
    } catch (err: any) {
      toast.error(err.message || 'Erro ao copiar designações do mês anterior.');
    } finally {
      setCopyingFromPreviousMonth(false);
    }
  };

  const normalizeFilterText = (value: string) =>
    value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();
  const normalizedNameFilter = normalizeFilterText(nameFilter.trim());
  const currentUserName = (user?.name || '').trim();
  const filteredData = normalizedNameFilter
    ? data.filter(item =>
      normalizeFilterText(item.publisher1).includes(normalizedNameFilter) ||
      normalizeFilterText(item.publisher2).includes(normalizedNameFilter)
    )
    : data;

  // Group by week
  const weeks = [1, 2, 3, 4, 5];
  const grouped = weeks
    .map(w => ({
      week: w,
      items: filteredData.filter(d => d.week === w),
    }))
    .filter(g => g.items.length > 0);

  const handleExport = async (type: 'image' | 'pdf') => {
    if (!exportRef.current) {
      toast.error('Não foi possível preparar a exportação.');
      return;
    }

    const baseFilename = `carrinho-${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`;

    setExporting(type);
    try {
      if (type === 'image') {
        await downloadElementAsImage(exportRef.current, `${baseFilename}.jpg`);
        toast.success('Imagem JPG gerada com sucesso.');
      } else {
        await downloadElementAsPdf(exportRef.current, `${baseFilename}.pdf`);
        toast.success('PDF gerado com sucesso.');
      }
    } catch (error: any) {
      toast.error(error?.message || 'Não foi possível exportar a escala de carrinho.');
    } finally {
      setExporting(null);
    }
  };

  const previousPeriod = getPreviousPeriod();
  const previousPeriodLabel = `${MONTHS[previousPeriod.month]} ${previousPeriod.year}`;

  return (
    <div className="relative space-y-4">
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

      {canCreate && (
        <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-foreground font-medium" style={{ fontSize: '0.9rem' }}>
              Preenchimento automático
            </p>
            <p className="text-muted-foreground" style={{ fontSize: '0.82rem' }}>
              Copia a escala de {previousPeriodLabel} e ajusta os dias para o mês atual.
            </p>
          </div>
          <button
            onClick={handleCopyPreviousMonth}
            disabled={loading || copyingFromPreviousMonth}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-border px-3 py-2 text-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
            style={{ fontSize: '0.85rem' }}
          >
            <Copy size={14} />
            {copyingFromPreviousMonth ? 'Copiando mês anterior...' : 'Copiar mês anterior'}
          </button>
        </div>
      )}

      {(canExportImage || canExportPdf) && (
        <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-foreground font-medium" style={{ fontSize: '0.9rem' }}>
              Exportação do mês visível
            </p>
            <p className="text-muted-foreground" style={{ fontSize: '0.82rem' }}>
              Exporta todas as semanas do mês atualmente selecionado.
            </p>
          </div>
          <ExportActions
            onExportImage={() => handleExport('image')}
            onExportPdf={() => handleExport('pdf')}
            exporting={exporting}
            disabled={loading}
            imageDisabled={!canExportImage}
            pdfDisabled={!canExportPdf}
          />
        </div>
      )}

      <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="relative flex-1">
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={nameFilter}
              onChange={e => setNameFilter(e.target.value)}
              placeholder="Filtrar por nome do publicador..."
              className="w-full rounded-lg border border-border bg-card py-2 pl-9 pr-3 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              style={{ fontSize: '0.88rem' }}
            />
          </div>
          <button
            type="button"
            onClick={() => {
              if (!currentUserName) {
                toast.error('Não foi possível identificar seu nome de usuário.');
                return;
              }
              setNameFilter(prev => prev.trim() === currentUserName ? '' : currentUserName);
            }}
            disabled={!currentUserName}
            className="rounded-lg border border-border px-3 py-2 text-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
            style={{ fontSize: '0.85rem' }}
          >
            {nameFilter.trim() === currentUserName ? 'Limpar minhas designações' : 'Minhas designações'}
          </button>
        </div>
      </div>

      {canCreate && (
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
                  <option value="">A definir</option>
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
                  <option value="">A definir</option>
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
      )}

      {loading ? (
        <div className="bg-card rounded-xl border border-border p-12 text-center">
          <p className="text-muted-foreground" style={{ fontSize: '0.9rem' }}>Carregando designações de carrinho...</p>
        </div>
      ) : grouped.length === 0 ? (
        <div className="bg-card rounded-xl border border-border p-12 text-center">
          <p className="text-muted-foreground" style={{ fontSize: '0.9rem' }}>
            {nameFilter.trim() ? 'Nenhuma designação encontrada para este nome.' : 'Nenhuma designação de carrinho para este mês.'}
          </p>
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
                        <th className="px-3 py-2 text-center" style={{ width: '7%' }}>Dia</th>
                        <th className="px-3 py-2 text-center" style={{ width: '13%' }}>Dia da Semana</th>
                        <th className="px-3 py-2 text-center" style={{ width: '17%' }}>Hora</th>
                        <th className="px-3 py-2 text-center" style={{ width: '20%' }}>Local</th>
                        <th className="px-3 py-2 text-center" colSpan={2} style={{ width: '35%' }}>Publicadores</th>
                        {!readOnly && <th className="px-2 py-2" style={{ width: '8%' }} />}
                      </tr>
                    </thead>
                    <tbody>
                      {group.items.map((item, rIdx) => (
                        <tr
                          key={item.id}
                          className={`border-b border-gray-200 ${rIdx % 2 === 0 ? colors.row : 'bg-white'} hover:bg-gray-50/80 transition-colors`}
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
                            {readOnly ? (
                              <span className="px-2 py-0.5 text-gray-800">{item.publisher1}</span>
                            ) : (
                              <button
                                onClick={() => handleEdit(item.id, 'publisher1', item.publisher1)}
                                className="px-2 py-0.5 rounded hover:bg-amber-50 text-gray-800 transition-colors"
                              >
                                {item.publisher1}
                              </button>
                            )}
                          </td>
                          <td className="px-2 py-2 text-center">
                            {readOnly ? (
                              <span className="px-2 py-0.5 text-gray-800">{item.publisher2}</span>
                            ) : (
                              <button
                                onClick={() => handleEdit(item.id, 'publisher2', item.publisher2)}
                                className="px-2 py-0.5 rounded hover:bg-amber-50 text-gray-800 transition-colors"
                              >
                                {item.publisher2}
                              </button>
                            )}
                          </td>
                          {!readOnly && (
                            <td className="px-2 py-2 text-center">
                              <div className="flex items-center justify-center gap-1">
                                <button
                                  onClick={() => setEditRowModal(item)}
                                  className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                                  title="Editar linha"
                                >
                                  <Edit2 size={14} />
                                </button>
                                <button
                                  onClick={() => handleDeleteRow(item.id)}
                                  className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                                  title="Excluir linha"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </td>
                          )}
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
            <div className="overflow-hidden rounded-xl border border-amber-200 bg-white">
              <div className="bg-gradient-to-r from-amber-500 to-orange-500 px-4 py-3 text-center">
                <h4 className="text-white tracking-wide" style={{ fontSize: '0.86rem', lineHeight: 1.15 }}>
                  Arranjo de Trabalho com Carrinho
                </h4>
                <p className="mt-0.5 text-white/90" style={{ fontSize: '0.76rem', lineHeight: 1.1 }}>
                  {MONTHS[currentMonth]} {currentYear}
                </p>
              </div>
            </div>

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
                          <div className="flex items-center gap-2">
                            <span className="flex items-center gap-1 text-gray-500" style={{ fontSize: '0.78rem' }}>
                              <Clock size={12} />
                              {item.time}
                            </span>
                            {!readOnly && (
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => setEditRowModal(item)}
                                  className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                                >
                                  <Edit2 size={14} />
                                </button>
                                <button
                                  onClick={() => handleDeleteRow(item.id)}
                                  className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 mb-2 text-gray-500" style={{ fontSize: '0.78rem' }}>
                          <MapPin size={12} />
                          {item.location}
                        </div>
                        <div className="flex gap-2">
                          {readOnly ? (
                            <>
                              <div className="flex-1 flex items-center gap-1.5 px-3 py-2 bg-gray-50 rounded-lg">
                                <Users size={12} className="text-amber-600 shrink-0" />
                                <span className="text-gray-700 truncate" style={{ fontSize: '0.8rem' }}>{item.publisher1}</span>
                              </div>
                              <div className="flex-1 flex items-center gap-1.5 px-3 py-2 bg-gray-50 rounded-lg">
                                <Users size={12} className="text-amber-600 shrink-0" />
                                <span className="text-gray-700 truncate" style={{ fontSize: '0.8rem' }}>{item.publisher2}</span>
                              </div>
                            </>
                          ) : (
                            <>
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
                            </>
                          )}
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

      {/* Edit publisher modal */}
      {!readOnly && editModal && (
        <MemberSelectModal
          label={editModal.field === 'publisher1' ? 'Publicador 1' : 'Publicador 2'}
          currentValue={editModal.currentValue}
          onClose={() => setEditModal(null)}
          onSave={handleSave}
          members={members}
        />
      )}

      {/* Edit full row modal */}
      {!readOnly && editRowModal && (
        <EditRowModal
          assignment={editRowModal}
          members={members}
          onClose={() => setEditRowModal(null)}
          onSave={handleSaveRow}
        />
      )}

      <div className="pointer-events-none absolute -left-[10000px] top-0 w-[1000px]" aria-hidden="true">
        <div
          ref={exportRef}
          data-export-pdf-page="a4-portrait"
          data-export-pdf-mode="single-page"
          className="w-[1000px] bg-white px-0 py-0 text-[#141414]"
          style={{ fontFamily: 'Calibri, Arial, sans-serif' }}
        >
          <div className="overflow-hidden border border-gray-200 bg-white">
            <div className="px-4 py-2.5" style={{ backgroundColor: '#d97706' }}>
              <h4 className="text-center tracking-wide text-white" style={{ fontSize: '15px', lineHeight: 1.15 }}>
                Arranjo de Trabalho com Carrinho — {MONTHS[currentMonth]} {currentYear}
              </h4>
            </div>

            {grouped.length > 0 ? (
              grouped.map((group, gIdx) => {
                const colors = WEEK_COLORS[gIdx % WEEK_COLORS.length];
                return (
                  <table key={`export-week-${group.week}`} className="w-full table-fixed" style={{ fontSize: '14px', lineHeight: 1.1 }}>
                    <thead>
                      <tr className={`${colors.header} text-white`}>
                        <th className="px-2 py-1 text-center" style={{ width: '7%', fontSize: '14px' }}>Dia</th>
                        <th className="px-2 py-1 text-center" style={{ width: '14%', fontSize: '14px' }}>Dia da Semana</th>
                        <th className="px-2 py-1 text-center" style={{ width: '15%', fontSize: '14px' }}>Hora</th>
                        <th className="px-2 py-1 text-center" style={{ width: '24%', fontSize: '14px' }}>Local</th>
                        <th className="px-2 py-1 text-center" style={{ width: '20%', fontSize: '14px' }}>Publicador 1</th>
                        <th className="px-2 py-1 text-center" style={{ width: '20%', fontSize: '14px' }}>Publicador 2</th>
                      </tr>
                    </thead>
                    <tbody>
                      {group.items.map((item, index) => (
                        <tr
                          key={`export-item-${item.id}`}
                          className={`${index % 2 === 0 ? colors.row : 'bg-white'} border-b border-gray-200`}
                        >
                          <td className="px-2 py-1 text-center text-gray-800 whitespace-nowrap" style={{ fontSize: '14px' }}>{item.day}</td>
                          <td className="px-2 py-1 text-center whitespace-nowrap">
                            <span className={`inline-block rounded-full px-1.5 py-0.5 ${WEEKDAY_COLORS[item.weekday] || 'bg-gray-100 text-gray-600'}`} style={{ fontSize: '11px', lineHeight: 1 }}>
                              {item.weekday.toUpperCase()}
                            </span>
                          </td>
                          <td className="px-2 py-1 text-center text-gray-600 whitespace-nowrap" style={{ fontSize: '14px' }}>{item.time}</td>
                          <td className="px-2 py-1 text-center text-gray-600" style={{ fontSize: '14px' }}>{item.location}</td>
                          <td className="px-2 py-1 text-center text-gray-800" style={{ fontSize: '14px' }}>{item.publisher1}</td>
                          <td className="px-2 py-1 text-center text-gray-800" style={{ fontSize: '14px' }}>{item.publisher2}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                );
              })
            ) : (
              <div className="px-4 py-8 text-center text-gray-500" style={{ fontSize: '14px' }}>
                Nenhuma designação de carrinho para este mês.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function EditRowModal({
  assignment,
  members,
  onClose,
  onSave,
}: {
  assignment: CartAssignment;
  members: { id: string; full_name: string }[];
  onClose: () => void;
  onSave: (updated: CartAssignment) => void;
}) {
  const [form, setForm] = useState({ ...assignment });
  const [pub1Search, setPub1Search] = useState('');
  const [pub2Search, setPub2Search] = useState('');
  const [pub1Open, setPub1Open] = useState(false);
  const [pub2Open, setPub2Open] = useState(false);

  const filteredPub1 = members.filter(m => m.full_name.toLowerCase().includes(pub1Search.toLowerCase()));
  const filteredPub2 = members.filter(m => m.full_name.toLowerCase().includes(pub2Search.toLowerCase()));

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md flex flex-col max-h-[90vh]">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between shrink-0">
          <div>
            <h3 className="text-gray-900">Editar Designação</h3>
            <p className="text-gray-500 mt-0.5" style={{ fontSize: '0.8rem' }}>Dia {assignment.day} — {assignment.weekday}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Semana */}
          <div>
            <label className="block text-gray-600 mb-1" style={{ fontSize: '0.82rem' }}>Semana</label>
            <select
              value={form.week}
              onChange={e => setForm(f => ({ ...f, week: Number(e.target.value) }))}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-gray-800 focus:outline-none focus:ring-2 focus:ring-amber-400"
              style={{ fontSize: '0.9rem' }}
            >
              {[1, 2, 3, 4, 5].map(w => (
                <option key={w} value={w}>Semana {w}</option>
              ))}
            </select>
          </div>

          {/* Horário */}
          <div>
            <label className="block text-gray-600 mb-1" style={{ fontSize: '0.82rem' }}>Horário</label>
            <input
              type="text"
              value={form.time}
              onChange={e => setForm(f => ({ ...f, time: e.target.value }))}
              placeholder="Ex: 09:00 ÀS 11:00"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-gray-800 focus:outline-none focus:ring-2 focus:ring-amber-400"
              style={{ fontSize: '0.9rem' }}
            />
          </div>

          {/* Local */}
          <div>
            <label className="block text-gray-600 mb-1" style={{ fontSize: '0.82rem' }}>Local</label>
            <input
              type="text"
              value={form.location}
              onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
              placeholder="Ex: HOSPITAL"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-gray-800 focus:outline-none focus:ring-2 focus:ring-amber-400"
              style={{ fontSize: '0.9rem' }}
            />
          </div>

          {/* Publicador 1 */}
          <div>
            <label className="block text-gray-600 mb-1" style={{ fontSize: '0.82rem' }}>Publicador 1</label>
            <div className="relative">
              <input
                type="text"
                value={pub1Open ? pub1Search : form.publisher1}
                onFocus={() => { setPub1Open(true); setPub1Search(''); }}
                onChange={e => setPub1Search(e.target.value)}
                placeholder="Buscar publicador..."
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-gray-800 focus:outline-none focus:ring-2 focus:ring-amber-400"
                style={{ fontSize: '0.9rem' }}
              />
              {pub1Open && (
                <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                  {filteredPub1.map(m => (
                    <button
                      key={m.id}
                      onMouseDown={() => { setForm(f => ({ ...f, publisher1: m.full_name })); setPub1Open(false); }}
                      className={`w-full text-left px-3 py-2 transition-colors ${form.publisher1 === m.full_name ? 'bg-amber-50 text-amber-700' : 'hover:bg-gray-50 text-gray-700'}`}
                      style={{ fontSize: '0.88rem' }}
                    >
                      {m.full_name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Publicador 2 */}
          <div>
            <label className="block text-gray-600 mb-1" style={{ fontSize: '0.82rem' }}>Publicador 2</label>
            <div className="relative">
              <input
                type="text"
                value={pub2Open ? pub2Search : form.publisher2}
                onFocus={() => { setPub2Open(true); setPub2Search(''); }}
                onChange={e => setPub2Search(e.target.value)}
                placeholder="Buscar publicador..."
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-gray-800 focus:outline-none focus:ring-2 focus:ring-amber-400"
                style={{ fontSize: '0.9rem' }}
              />
              {pub2Open && (
                <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                  {filteredPub2.map(m => (
                    <button
                      key={m.id}
                      onMouseDown={() => { setForm(f => ({ ...f, publisher2: m.full_name })); setPub2Open(false); }}
                      className={`w-full text-left px-3 py-2 transition-colors ${form.publisher2 === m.full_name ? 'bg-amber-50 text-amber-700' : 'hover:bg-gray-50 text-gray-700'}`}
                      style={{ fontSize: '0.88rem' }}
                    >
                      {m.full_name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-gray-100 flex gap-3 justify-end shrink-0">
          <button onClick={onClose} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition" style={{ fontSize: '0.9rem' }}>
            Cancelar
          </button>
          <button
            onClick={() => onSave(form)}
            className="px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition"
            style={{ fontSize: '0.9rem' }}
          >
            Salvar
          </button>
        </div>
      </div>
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
