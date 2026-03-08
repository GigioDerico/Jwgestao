import React, { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Plus, Search, X } from 'lucide-react';
import { toast } from 'sonner';
import { api, type FieldServiceGroupOption } from '../lib/api';
import { downloadElementAsImage, downloadElementAsPdf } from '../lib/dom-export';
import { getSaturdaysForMonth } from '../lib/field-service-calendar';
import { filterMembersEligibleForAssignments } from '../lib/assignment-member-eligibility';
import { ExportActions } from './ExportActions';
import type { FieldServiceAssignment } from '../types';

const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

type FieldServiceCategory =
  | 'Segunda-feira'
  | 'Terça-feira'
  | 'Quarta-feira'
  | 'Sexta-feira'
  | 'Sábado'
  | 'Domingo'
  | 'Sábado - Rural';

interface FieldServiceTemplateRow {
  key: string;
  category: FieldServiceCategory;
  assignment: FieldServiceAssignment | null;
  dayLabel: string;
  displayTime: string;
  displayResponsible: string;
  displayLocation: string;
  groupName?: string;
}

const CATEGORY_COLORS: Record<FieldServiceCategory, { bg: string; header: string; border: string }> = {
  'Segunda-feira': { bg: 'bg-emerald-50/40', header: 'bg-emerald-500', border: 'border-emerald-200' },
  'Terça-feira': { bg: 'bg-emerald-50/50', header: 'bg-emerald-600', border: 'border-emerald-200' },
  'Quarta-feira': { bg: 'bg-teal-50/50', header: 'bg-teal-600', border: 'border-teal-200' },
  'Sexta-feira': { bg: 'bg-cyan-50/50', header: 'bg-cyan-600', border: 'border-cyan-200' },
  'Sábado': { bg: 'bg-green-50/50', header: 'bg-green-600', border: 'border-green-200' },
  'Sábado - Rural': { bg: 'bg-lime-50/50', header: 'bg-lime-600', border: 'border-lime-200' },
  'Domingo': { bg: 'bg-emerald-50/50', header: 'bg-emerald-700', border: 'border-emerald-200' },
};

const FIXED_DEFAULTS: Record<'Segunda-feira' | 'Terça-feira' | 'Quarta-feira' | 'Sexta-feira', { time: string; location: string }> = {
  'Segunda-feira': { time: '08:45', location: 'Salão do Reino' },
  'Terça-feira': { time: '16:30', location: 'Salão do Reino' },
  'Quarta-feira': { time: '08:45', location: 'Salão do Reino' },
  'Sexta-feira': { time: '08:45', location: 'Salão do Reino' },
};

const FIXED_CATEGORIES: Array<'Segunda-feira' | 'Terça-feira' | 'Quarta-feira' | 'Sexta-feira'> = [
  'Segunda-feira',
  'Terça-feira',
  'Quarta-feira',
  'Sexta-feira',
];

const FIXED_RESPONSIBLE_OPTIONS = ['Irmãs Pioneiras'] as const;
const FIELD_SERVICE_FONT_FAMILY = 'Calibri, Arial, sans-serif';
const MIN_FONT_SIZE = '0.875rem';

export function FieldServiceAssignments({
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
  const today = new Date();
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [data, setData] = useState<FieldServiceAssignment[]>([]);
  const [members, setMembers] = useState<{ id: string; full_name: string }[]>([]);
  const [groups, setGroups] = useState<FieldServiceGroupOption[]>([]);
  const [memberEditModal, setMemberEditModal] = useState<{ id: string; currentValue: string } | null>(null);
  const [textEditModal, setTextEditModal] = useState<{
    id: string;
    field: 'time' | 'location';
    label: string;
    currentValue: string;
  } | null>(null);
  const [addSundayGroupModal, setAddSundayGroupModal] = useState(false);
  const [addRuralSaturdayModal, setAddRuralSaturdayModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [groupsLoaded, setGroupsLoaded] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState<'image' | 'pdf' | null>(null);
  const exportRef = useRef<HTMLDivElement>(null);

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

  const fetchGroups = async () => {
    try {
      const rows = await api.getFieldServiceGroups();
      setGroups(rows);
    } catch (err) {
      console.error(err);
      toast.error('Erro ao carregar grupos de serviço.');
    } finally {
      setGroupsLoaded(true);
    }
  };

  useEffect(() => {
    api
      .getMembers()
      .then(rawMembers =>
        setMembers(
          filterMembersEligibleForAssignments(rawMembers || []).map((member: any) => ({
            id: member.id,
            full_name: member.full_name,
          })),
        ),
      )
      .catch(error => {
        console.error(error);
        toast.error('Erro ao carregar membros.');
      });
  }, []);

  useEffect(() => {
    fetchGroups();
    fetchAssignments();
  }, [currentMonth, currentYear]);

  const prevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(value => value - 1);
      return;
    }

    setCurrentMonth(value => value - 1);
  };

  const nextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(value => value + 1);
      return;
    }

    setCurrentMonth(value => value + 1);
  };

  const ensureAssignmentExists = (assignment: FieldServiceAssignment | null) => {
    if (assignment) {
      return true;
    }

    toast.error('Clique em "Gerar mês" para criar a estrutura deste mês.');
    return false;
  };

  const findMemberIdByName = (fullName: string) => {
    if (!fullName || fullName === 'A definir') {
      return null;
    }

    return members.find(member => member.full_name === fullName)?.id || null;
  };

  const handleGenerateMonth = async () => {
    if (!canCreate) {
      return;
    }

    try {
      setGenerating(true);
      const result = await api.ensureFieldServiceAssignmentsForMonth(currentMonth, currentYear);
      setData(result.assignments);

      if (result.createdCount > 0) {
        toast.success(`${result.createdCount} linha(s) criada(s) para ${MONTHS[currentMonth]} ${currentYear}.`);
      } else {
        toast.success('Este mês já estava completo.');
      }
    } catch (err: any) {
      toast.error(err.message || 'Erro ao gerar as saídas do mês.');
    } finally {
      setGenerating(false);
    }
  };

  const handleEditResponsible = (assignment: FieldServiceAssignment | null) => {
    if (!canEdit) {
      return;
    }

    if (!ensureAssignmentExists(assignment)) {
      return;
    }

    setMemberEditModal({
      id: assignment.id,
      currentValue: assignment.responsible === 'A definir' ? '' : assignment.responsible,
    });
  };

  const handleSaveResponsible = async (newValue: string) => {
    if (!memberEditModal) {
      return;
    }

    try {
      setSaving(true);
      const updated = await api.updateFieldServiceAssignment(memberEditModal.id, {
        responsible: newValue || 'A definir',
        responsible_member_id: newValue ? findMemberIdByName(newValue) : null,
      });
      setData(prev => prev.map(item => (item.id === memberEditModal.id ? updated : item)));
      setMemberEditModal(null);
      toast.success('Responsável atualizado!');
    } catch (err: any) {
      toast.error(err.message || 'Erro ao atualizar responsável.');
    } finally {
      setSaving(false);
    }
  };

  const handleEditText = (
    assignment: FieldServiceAssignment | null,
    field: 'time' | 'location',
    label: string
  ) => {
    if (!canEdit) {
      return;
    }

    if (!ensureAssignmentExists(assignment)) {
      return;
    }

    setTextEditModal({
      id: assignment.id,
      field,
      label,
      currentValue: assignment[field],
    });
  };

  const handleSaveText = async (newValue: string) => {
    if (!textEditModal) {
      return;
    }

    try {
      setSaving(true);
      const updated = await api.updateFieldServiceAssignment(textEditModal.id, {
        [textEditModal.field]: newValue,
      } as any);
      setData(prev => prev.map(item => (item.id === textEditModal.id ? updated : item)));
      setTextEditModal(null);
      toast.success(`${textEditModal.label} atualizado!`);
    } catch (err: any) {
      toast.error(err.message || `Erro ao atualizar ${textEditModal.label.toLowerCase()}.`);
    } finally {
      setSaving(false);
    }
  };

  const currentSundayNames = new Set(
    data
      .filter(item => item.category === 'Domingo')
      .map(item => item.responsible)
      .filter(Boolean)
  );
  const availableSundayGroups = groups.filter(group => !currentSundayNames.has(group.name));
  const saturdays = getSaturdaysForMonth(currentMonth, currentYear);
  const currentRuralSaturdayLabels = new Set(
    data
      .filter(item => item.category === 'Sábado - Rural')
      .map(item => item.weekday)
      .filter(Boolean)
  );
  const availableRuralSaturdays = saturdays.filter(saturday => !currentRuralSaturdayLabels.has(saturday.label));
  const hasFixedCategoriesGenerated = FIXED_CATEGORIES.every(category =>
    data.some(item => item.category === category)
  );
  const hasSaturdayRowsGenerated = saturdays.every(saturday =>
    data.some(item => item.category === 'Sábado' && item.weekday === saturday.label)
  );
  const hasSundayRowsGenerated = groupsLoaded && groups.every(group =>
    data.some(item => item.category === 'Domingo' && item.responsible === group.name)
  );
  const isMonthGenerated = hasFixedCategoriesGenerated && hasSaturdayRowsGenerated && hasSundayRowsGenerated;

  const handleAddSundayGroup = async (groupName: string) => {
    if (!canCreate) {
      return;
    }

    try {
      setSaving(true);
      const created = await api.createFieldServiceAssignment({
        month: currentMonth + 1,
        year: currentYear,
        weekday: 'Domingo',
        time: '08:30 / 08:45',
        responsible: groupName,
        responsible_member_id: null,
        location: '',
        category: 'Domingo',
      });
      setData(prev => [...prev, created]);
      setAddSundayGroupModal(false);
      toast.success('Grupo adicionado ao domingo.');
    } catch (err: any) {
      toast.error(err.message || 'Erro ao adicionar grupo no domingo.');
    } finally {
      setSaving(false);
    }
  };

  const handleAddRuralSaturday = async (weekday: string) => {
    if (!canCreate) {
      return;
    }

    try {
      setSaving(true);
      const created = await api.createFieldServiceAssignment({
        month: currentMonth + 1,
        year: currentYear,
        weekday,
        time: '08:00',
        responsible: 'A definir',
        responsible_member_id: null,
        location: 'Salão do Reino',
        category: 'Sábado - Rural',
      });
      setData(prev => [...prev, created]);
      setAddRuralSaturdayModal(false);
      toast.success('Linha de sábado rural adicionada.');
    } catch (err: any) {
      toast.error(err.message || 'Erro ao adicionar sábado rural.');
    } finally {
      setSaving(false);
    }
  };

  const buildRenderedGroups = () => {
    const renderedGroups: Array<{
      category: FieldServiceCategory;
      rows: FieldServiceTemplateRow[];
      emptyMessage?: string;
    }> = [];

    for (const category of FIXED_CATEGORIES) {
      const items = data.filter(item => item.category === category);
      const defaults = FIXED_DEFAULTS[category];

      renderedGroups.push({
        category,
        rows: items.length > 0
          ? items.map(item => ({
            key: item.id,
            category,
            assignment: item,
            dayLabel: item.weekday,
            displayTime: item.time,
            displayResponsible: item.responsible,
            displayLocation: item.location,
          }))
          : [{
            key: `placeholder-${category}`,
            category,
            assignment: null,
            dayLabel: category,
            displayTime: defaults.time,
            displayResponsible: 'A definir',
            displayLocation: defaults.location,
          }],
      });
    }

    const saturdayItems = data.filter(item => item.category === 'Sábado');
    const matchedSaturdayIds = new Set<string>();
    const saturdayRows: FieldServiceTemplateRow[] = saturdays.map(saturday => {
      const assignment = saturdayItems.find(item => item.weekday === saturday.label) || null;

      if (assignment) {
        matchedSaturdayIds.add(assignment.id);
      }

      return {
        key: assignment?.id || `placeholder-${saturday.label}`,
        category: 'Sábado',
        assignment,
        dayLabel: assignment?.weekday || saturday.label,
        displayTime: assignment?.time || '16:30',
        displayResponsible: assignment?.responsible || 'A definir',
        displayLocation: assignment?.location || 'Salão do Reino',
      };
    });

    saturdayItems
      .filter(item => !matchedSaturdayIds.has(item.id))
      .forEach(item => {
        saturdayRows.push({
          key: item.id,
          category: 'Sábado',
          assignment: item,
          dayLabel: item.weekday,
          displayTime: item.time,
          displayResponsible: item.responsible,
          displayLocation: item.location,
        });
      });

    renderedGroups.push({
      category: 'Sábado',
      rows: saturdayRows,
    });

    const ruralItems = data.filter(item => item.category === 'Sábado - Rural');
    renderedGroups.push({
      category: 'Sábado - Rural',
      rows: ruralItems.map(item => ({
        key: item.id,
        category: 'Sábado - Rural',
        assignment: item,
        dayLabel: item.weekday,
        displayTime: item.time,
        displayResponsible: item.responsible,
        displayLocation: item.location,
      })),
      emptyMessage: ruralItems.length === 0 ? 'Nenhuma linha de sábado rural adicionada neste mês.' : undefined,
    });

    const sundayItems = data.filter(item => item.category === 'Domingo');
    const matchedSundayIds = new Set<string>();
    const sundayRows: FieldServiceTemplateRow[] = groups.map(group => {
      const assignment = sundayItems.find(item => item.responsible === group.name) || null;

      if (assignment) {
        matchedSundayIds.add(assignment.id);
      }

      return {
        key: assignment?.id || `placeholder-sunday-${group.id}`,
        category: 'Domingo',
        assignment,
        dayLabel: 'Domingo',
        displayTime: assignment?.time || '08:30 / 08:45',
        displayResponsible: assignment?.responsible || group.name,
        displayLocation: assignment?.location || '',
        groupName: assignment?.responsible || group.name,
      };
    });

    sundayItems
      .filter(item => !matchedSundayIds.has(item.id))
      .sort((a, b) => a.responsible.localeCompare(b.responsible))
      .forEach(item => {
        sundayRows.push({
          key: item.id,
          category: 'Domingo',
          assignment: item,
          dayLabel: 'Domingo',
          displayTime: item.time,
          displayResponsible: item.responsible,
          displayLocation: item.location,
          groupName: item.responsible,
        });
      });

    renderedGroups.push({
      category: 'Domingo',
      rows: sundayRows,
      emptyMessage: groups.length === 0 ? 'Nenhum grupo de serviço cadastrado.' : undefined,
    });

    return renderedGroups;
  };

  const renderedGroups = buildRenderedGroups();

  const renderTextButton = (
    row: FieldServiceTemplateRow,
    field: 'time' | 'location',
    label: string,
    value: string,
    emptyFallback: string,
    textAlign: 'left' | 'center' = 'left'
  ) => {
    const alignmentClass =
      textAlign === 'center'
        ? 'flex w-full items-center justify-center'
        : 'w-full text-left';

    if (!canEdit) {
      return (
        <div className={`${alignmentClass} rounded-lg px-3 py-2 ${row.assignment ? 'text-gray-700' : 'text-gray-400'}`}>
          <span className={value ? '' : 'italic'}>{value || emptyFallback}</span>
        </div>
      );
    }

    return (
      <button
        type="button"
        onClick={() => handleEditText(row.assignment, field, label)}
        disabled={loading || generating || saving}
        className={`${alignmentClass} rounded-lg px-3 py-1.5 transition-colors ${row.assignment ? 'text-gray-700 hover:bg-green-100/70' : 'text-gray-400 hover:bg-gray-50'} disabled:cursor-not-allowed disabled:opacity-60`}
      >
        <span className={value ? '' : 'italic'}>{value || emptyFallback}</span>
      </button>
    );
  };

  const renderResponsibleButton = (row: FieldServiceTemplateRow) => {
    if (!canEdit) {
      return (
        <div className={`w-full rounded-lg px-3 py-2 text-left ${row.assignment ? 'text-gray-700' : 'text-gray-400'}`}>
          <span className={row.displayResponsible === 'A definir' ? 'italic' : ''}>{row.displayResponsible}</span>
        </div>
      );
    }

    return (
      <button
        type="button"
        onClick={() => handleEditResponsible(row.assignment)}
        disabled={loading || generating || saving}
        className={`w-full rounded-lg px-3 py-1.5 text-left transition-colors ${row.assignment ? 'text-gray-700 hover:bg-green-100/70' : 'text-gray-400 hover:bg-gray-50'} disabled:cursor-not-allowed disabled:opacity-60`}
      >
        <span className={row.displayResponsible === 'A definir' ? 'italic' : ''}>{row.displayResponsible}</span>
      </button>
    );
  };

  const handleExport = async (type: 'image' | 'pdf') => {
    if (!exportRef.current) {
      toast.error('Não foi possível preparar a exportação.');
      return;
    }

    const baseFilename = `saida-campo-${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`;

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
      toast.error(error?.message || 'Não foi possível exportar a saída de campo.');
    } finally {
      setExporting(null);
    }
  };

  return (
    <div className="relative space-y-4" style={{ fontFamily: FIELD_SERVICE_FONT_FAMILY }}>
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

      {(canExportImage || canExportPdf) && (
        <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-foreground font-medium" style={{ fontSize: '0.9rem' }}>
              Exportação do mês visível
            </p>
            <p className="text-muted-foreground" style={{ fontSize: MIN_FONT_SIZE }}>
              Exporta todas as seções da saída de campo do mês atualmente selecionado.
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

      {canCreate && !isMonthGenerated && (
        <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
          <div className="border-b border-border px-4 py-3 md:flex md:items-center md:justify-between">
            <div>
              <h4 className="text-foreground" style={{ fontSize: '0.95rem' }}>Gerar saídas do mês</h4>
              <p className="text-muted-foreground" style={{ fontSize: MIN_FONT_SIZE }}>
                Segunda, terça, quarta e sexta são fixos. Sábado segue o calendário real e domingo cria uma linha por grupo.
              </p>
            </div>
            <button
              type="button"
              onClick={handleGenerateMonth}
              disabled={loading || generating || saving}
              className="mt-3 inline-flex items-center rounded-lg bg-primary px-4 py-2 text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60 md:mt-0"
              style={{ fontSize: MIN_FONT_SIZE }}
            >
              {generating ? 'Gerando...' : 'Gerar mês'}
            </button>
          </div>
          <div className="px-4 py-3">
            <p className="text-muted-foreground" style={{ fontSize: MIN_FONT_SIZE }}>
              {loading
                ? 'Carregando saídas salvas deste mês...'
                : 'Antes da geração, a tela já mostra a estrutura esperada. Clique em uma linha não gerada para ver a orientação.'}
            </p>
          </div>
        </div>
      )}

      <div className="rounded-xl bg-gradient-to-r from-emerald-600 to-green-600 px-4 py-4 text-center shadow-sm">
        <h2 className="font-semibold uppercase text-white" style={{ fontSize: '1.35rem', lineHeight: 1.1 }}>
          Saída de Campo
        </h2>
        <p className="mt-1 font-semibold text-white/90" style={{ fontSize: '0.95rem', lineHeight: 1.1 }}>
          {MONTHS[currentMonth]}
        </p>
      </div>

      {loading ? (
        <div className="rounded-xl border border-border bg-card p-12 text-center text-muted-foreground">
          Carregando saídas de campo...
        </div>
      ) : (
        <div className="space-y-3">
          {renderedGroups.map(group => {
            const colors = CATEGORY_COLORS[group.category];
            const isSunday = group.category === 'Domingo';
            const isRural = group.category === 'Sábado - Rural';

            return (
              <div key={group.category} className={`bg-white rounded-xl border ${colors.border} overflow-hidden`}>
                <div className={`${colors.header} relative px-4 py-2`}>
                  <h4 className="text-center text-white tracking-wide" style={{ fontSize: MIN_FONT_SIZE }}>
                    {group.category}
                  </h4>
                  {canCreate && (isSunday || isRural) && (
                    <div className="absolute inset-y-0 right-4 flex items-center">
                      <button
                        type="button"
                        onClick={() => {
                          if (isSunday) {
                            if (availableSundayGroups.length === 0) {
                              toast.error('Não há grupos disponíveis para adicionar neste mês.');
                              return;
                            }
                            setAddSundayGroupModal(true);
                            return;
                          }

                          if (availableRuralSaturdays.length === 0) {
                            toast.error('Todos os sábados deste mês já foram usados no sábado rural.');
                            return;
                          }
                          setAddRuralSaturdayModal(true);
                        }}
                        disabled={saving || generating}
                        className="inline-flex items-center gap-1 rounded-lg bg-white/15 px-2.5 py-1 text-white transition-colors hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-60"
                        style={{ fontSize: MIN_FONT_SIZE }}
                      >
                        <Plus size={12} />
                        {isSunday ? 'Adicionar grupo' : 'Adicionar linha'}
                      </button>
                    </div>
                  )}
                </div>

                {group.emptyMessage && group.rows.length === 0 ? (
                  <div className="px-4 py-4 text-gray-500" style={{ fontSize: MIN_FONT_SIZE }}>
                    {group.emptyMessage}
                  </div>
                ) : (
                  <>
                    <div className="hidden sm:block">
                      <table className="w-full" style={{ fontSize: MIN_FONT_SIZE }}>
                        <thead>
                          {isSunday ? (
                            <tr className="bg-gray-50 text-gray-500 border-b border-gray-200">
                              <th className="px-4 py-1.5 text-left" style={{ width: '33.33%' }}>
                                Grupo
                              </th>
                              <th className="px-3 py-1.5 text-center" style={{ width: '33.33%' }}>
                                Horário
                              </th>
                              <th className="px-3 py-1.5 text-center" style={{ width: '33.33%' }}>
                                Local
                              </th>
                            </tr>
                          ) : (
                            <tr className="bg-gray-50 text-gray-500 border-b border-gray-200">
                              <th className="px-4 py-1.5 text-left" style={{ width: '25%' }}>
                                Dia
                              </th>
                              <th className="px-3 py-1.5 text-center" style={{ width: '25%' }}>
                                Horário
                              </th>
                              <th className="px-3 py-1.5 text-left" style={{ width: '25%' }}>
                                Responsável
                              </th>
                              <th className="px-3 py-1.5 text-left" style={{ width: '25%' }}>
                                Local
                              </th>
                            </tr>
                          )}
                        </thead>
                        <tbody>
                          {group.rows.map((row, index) => (
                            <tr
                              key={row.key}
                              className={`border-b border-gray-200 ${index % 2 === 0 ? colors.bg : 'bg-white'} transition-colors hover:bg-green-50/60`}
                            >
                              {isSunday ? (
                                <>
                                  <td className="px-4 py-1.5 text-gray-700">
                                    {row.groupName}
                                    {!row.assignment && (
                                      <span className="ml-2 text-gray-400" style={{ fontSize: MIN_FONT_SIZE }}>
                                        • não gerada
                                      </span>
                                    )}
                                  </td>
                                  <td className="px-3 py-1.5 text-center">
                                    {renderTextButton(row, 'time', 'Horário', row.displayTime, 'A definir', 'center')}
                                  </td>
                                  <td className="px-3 py-1.5 text-center">
                                    {renderTextButton(row, 'location', 'Local', row.displayLocation, 'Sem local', 'center')}
                                  </td>
                                </>
                              ) : (
                                <>
                                  <td className="px-4 py-1.5 text-gray-700">
                                    {row.dayLabel}
                                    {!row.assignment && (
                                      <span className="ml-2 text-gray-400" style={{ fontSize: MIN_FONT_SIZE }}>
                                        • não gerada
                                      </span>
                                    )}
                                  </td>
                                  <td className="px-3 py-1.5 text-center">
                                    {renderTextButton(row, 'time', 'Horário', row.displayTime, 'A definir', 'center')}
                                  </td>
                                  <td className="px-3 py-1.5">
                                    {renderResponsibleButton(row)}
                                  </td>
                                  <td className="px-3 py-1.5">
                                    {renderTextButton(row, 'location', 'Local', row.displayLocation, 'Sem local')}
                                  </td>
                                </>
                              )}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div className="sm:hidden divide-y divide-gray-50">
                      {group.rows.map(row => (
                        <div key={row.key} className="p-2.5">
                          <div className="mb-1.5 flex items-center justify-between">
                            <span className="text-gray-800" style={{ fontSize: MIN_FONT_SIZE }}>
                              {isSunday ? row.groupName : row.dayLabel}
                            </span>
                            {!row.assignment && (
                              <span className="text-gray-400" style={{ fontSize: MIN_FONT_SIZE }}>
                                não gerada
                              </span>
                            )}
                          </div>
                          <div className="space-y-1.5">
                            <div className="flex items-center gap-2">
                              <span className="w-20 shrink-0 text-gray-500" style={{ fontSize: MIN_FONT_SIZE }}>Horário</span>
                              <div className="flex-1">
                                {renderTextButton(row, 'time', 'Horário', row.displayTime, 'A definir', 'center')}
                              </div>
                            </div>
                            {!isSunday && (
                              <div className="flex items-center gap-2">
                                <span className="w-20 shrink-0 text-gray-500" style={{ fontSize: MIN_FONT_SIZE }}>Responsável</span>
                                <div className="flex-1">
                                  {renderResponsibleButton(row)}
                                </div>
                              </div>
                            )}
                            <div className="flex items-center gap-2">
                              <span className="w-20 shrink-0 text-gray-500" style={{ fontSize: MIN_FONT_SIZE }}>Local</span>
                              <div className="flex-1">
                                {renderTextButton(row, 'location', 'Local', row.displayLocation, 'Sem local')}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}

      <div className="bg-gradient-to-r from-emerald-600 to-green-600 rounded-xl p-4 text-center">
        <p className="text-white/90 italic" style={{ fontSize: MIN_FONT_SIZE }}>
          "Portanto, vão e façam discípulos de pessoas de todas as nações... ensinando-as a obedecer a todas as coisas que lhes ordenei."
        </p>
        <p className="text-white/70 mt-1" style={{ fontSize: MIN_FONT_SIZE }}>— Mateus 28:19,20</p>
      </div>

      {canEdit && memberEditModal && (
        <MemberSelectModal
          label="Responsável pela Saída de Campo"
          currentValue={memberEditModal.currentValue}
          onClose={() => setMemberEditModal(null)}
          onSave={handleSaveResponsible}
          members={members}
          saving={saving}
        />
      )}

      {canEdit && textEditModal && (
        <TextEditModal
          label={textEditModal.label}
          currentValue={textEditModal.currentValue}
          onClose={() => setTextEditModal(null)}
          onSave={handleSaveText}
          saving={saving}
        />
      )}

      {canCreate && addSundayGroupModal && (
        <GroupSelectModal
          groups={availableSundayGroups}
          onClose={() => setAddSundayGroupModal(false)}
          onSave={handleAddSundayGroup}
          saving={saving}
        />
      )}

      {canCreate && addRuralSaturdayModal && (
        <SaturdaySelectModal
          options={availableRuralSaturdays.map(saturday => saturday.label)}
          onClose={() => setAddRuralSaturdayModal(false)}
          onSave={handleAddRuralSaturday}
          saving={saving}
        />
      )}

      <div className="pointer-events-none absolute -left-[10000px] top-0 w-[840px]" aria-hidden="true">
        <div
          ref={exportRef}
          data-export-pdf-mode="single-page"
          className="w-[840px] bg-white px-4 py-4 text-[#141414]"
          style={{ fontFamily: FIELD_SERVICE_FONT_FAMILY }}
        >
          <div className="overflow-hidden rounded-xl border border-green-700 bg-white">
            <div className="px-4 py-3 text-center" style={{ backgroundColor: '#047857' }}>
              <h2 className="font-semibold uppercase text-white" style={{ fontSize: '1.35rem', lineHeight: 1.1 }}>
                Saída de Campo
              </h2>
              <p className="mt-1 font-semibold text-white/90" style={{ fontSize: '0.98rem', lineHeight: 1.05 }}>
                {MONTHS[currentMonth]} {currentYear}
              </p>
            </div>
          </div>

          <div className="mt-3 space-y-2.5">
            {renderedGroups.map(group => {
              const colors = CATEGORY_COLORS[group.category];
              const isSunday = group.category === 'Domingo';

              return (
                <div key={`export-${group.category}`} className={`overflow-hidden rounded-xl border ${colors.border} bg-white`}>
                  <div className={`${colors.header} px-4 py-1.5`}>
                    <h4 className="text-center text-white tracking-wide" style={{ fontSize: '0.88rem', lineHeight: 1.1 }}>
                      {group.category}
                    </h4>
                  </div>

                  {group.emptyMessage && group.rows.length === 0 ? (
                    <div className="px-4 py-3 text-gray-500" style={{ fontSize: '0.84rem', lineHeight: 1.15 }}>
                      {group.emptyMessage}
                    </div>
                  ) : (
                    <table className="w-full" style={{ fontSize: '0.82rem' }}>
                      <thead>
                        {isSunday ? (
                          <tr className="bg-gray-50 text-gray-500 border-b border-gray-200">
                            <th className="px-3 py-1 text-left" style={{ width: '33.33%' }}>
                              Grupo
                            </th>
                            <th className="px-2.5 py-1 text-center" style={{ width: '33.33%' }}>
                              Horário
                            </th>
                            <th className="px-2.5 py-1 text-center" style={{ width: '33.33%' }}>
                              Local
                            </th>
                          </tr>
                        ) : (
                          <tr className="bg-gray-50 text-gray-500 border-b border-gray-200">
                            <th className="px-3 py-1 text-left" style={{ width: '25%' }}>
                              Dia
                            </th>
                            <th className="px-2.5 py-1 text-center" style={{ width: '25%' }}>
                              Horário
                            </th>
                            <th className="px-2.5 py-1 text-left" style={{ width: '25%' }}>
                              Responsável
                            </th>
                            <th className="px-2.5 py-1 text-left" style={{ width: '25%' }}>
                              Local
                            </th>
                          </tr>
                        )}
                      </thead>
                      <tbody>
                        {group.rows.map((row, index) => (
                          <tr
                            key={`export-row-${row.key}`}
                            className={`${index % 2 === 0 ? colors.bg : 'bg-white'} border-b border-gray-200`}
                          >
                            {isSunday ? (
                              <>
                                <td className="px-3 py-1 text-gray-700" style={{ lineHeight: 1.05 }}>
                                  {row.groupName}
                                  {!row.assignment && (
                                    <span className="ml-1.5 text-gray-400" style={{ fontSize: '0.74rem' }}>
                                      • não gerada
                                    </span>
                                  )}
                                </td>
                                <td className="px-2.5 py-1 text-center text-gray-700" style={{ lineHeight: 1.05 }}>{row.displayTime || 'A definir'}</td>
                                <td className="px-2.5 py-1 text-center text-gray-700" style={{ lineHeight: 1.05 }}>{row.displayLocation || 'Sem local'}</td>
                              </>
                            ) : (
                              <>
                                <td className="px-3 py-1 text-gray-700" style={{ lineHeight: 1.05 }}>
                                  {row.dayLabel}
                                  {!row.assignment && (
                                    <span className="ml-1.5 text-gray-400" style={{ fontSize: '0.74rem' }}>
                                      • não gerada
                                    </span>
                                  )}
                                </td>
                                <td className="px-2.5 py-1 text-center text-gray-700" style={{ lineHeight: 1.05 }}>{row.displayTime || 'A definir'}</td>
                                <td className="px-2.5 py-1 text-gray-700" style={{ lineHeight: 1.05 }}>{row.displayResponsible || 'A definir'}</td>
                                <td className="px-2.5 py-1 text-gray-700" style={{ lineHeight: 1.05 }}>{row.displayLocation || 'Sem local'}</td>
                              </>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              );
            })}
          </div>

          <div className="mt-3 rounded-xl px-4 py-3 text-center" style={{ backgroundColor: '#047857' }}>
            <p className="text-white/90 italic" style={{ fontSize: '0.84rem', lineHeight: 1.2 }}>
              "Portanto, vão e façam discípulos de pessoas de todas as nações... ensinando-as a obedecer a todas as coisas que lhes ordenei."
            </p>
            <p className="mt-0.5 text-white/70" style={{ fontSize: '0.76rem', lineHeight: 1.05 }}>— Mateus 28:19,20</p>
          </div>
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
  saving,
}: {
  label: string;
  currentValue: string;
  onClose: () => void;
  onSave: (value: string) => void;
  members: { id: string; full_name: string }[];
  saving: boolean;
}) {
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(currentValue);
  const filteredFixedOptions = FIXED_RESPONSIBLE_OPTIONS.filter(option =>
    option.toLowerCase().includes(search.toLowerCase())
  );

  const filtered = members.filter(member =>
    member.full_name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md max-h-[80vh] flex flex-col" style={{ fontFamily: FIELD_SERVICE_FONT_FAMILY }}>
        <div className="p-4 border-b border-gray-100 flex items-center justify-between shrink-0">
          <div>
            <h3 className="text-gray-900">Editar Designação</h3>
            <p className="text-gray-500 mt-0.5" style={{ fontSize: MIN_FONT_SIZE }}>{label}</p>
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
              onChange={event => setSearch(event.target.value)}
              placeholder="Buscar membro..."
              className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              style={{ fontSize: '0.9rem' }}
              autoFocus
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          <button
            type="button"
            onClick={() => setSelected('')}
            className={`w-full text-left px-3 py-2.5 rounded-lg transition-colors ${selected === '' ? 'bg-blue-50 text-blue-700' : 'hover:bg-gray-50 text-gray-700'}`}
            style={{ fontSize: '0.9rem' }}
          >
            A definir
          </button>
          {filteredFixedOptions.map(option => (
            <button
              key={option}
              type="button"
              onClick={() => setSelected(option)}
              className={`w-full text-left px-3 py-2.5 rounded-lg transition-colors ${selected === option ? 'bg-blue-50 text-blue-700' : 'hover:bg-gray-50 text-gray-700'}`}
              style={{ fontSize: '0.9rem' }}
            >
              {option}
            </button>
          ))}
          {filtered.map(member => (
            <button
              key={member.id}
              type="button"
              onClick={() => setSelected(member.full_name)}
              className={`w-full text-left px-3 py-2.5 rounded-lg transition-colors ${selected === member.full_name ? 'bg-blue-50 text-blue-700' : 'hover:bg-gray-50 text-gray-700'}`}
              style={{ fontSize: '0.9rem' }}
            >
              {member.full_name}
            </button>
          ))}
        </div>
        <div className="p-3 border-t border-gray-100 flex gap-3 justify-end shrink-0">
          <button onClick={onClose} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition" style={{ fontSize: '0.9rem' }}>
            Cancelar
          </button>
          <button
            onClick={() => onSave(selected)}
            disabled={saving}
            className="px-4 py-2 bg-[#1a1a2e] text-white rounded-lg hover:bg-[#16213e] transition disabled:cursor-not-allowed disabled:opacity-60"
            style={{ fontSize: '0.9rem' }}
          >
            {saving ? 'Salvando...' : 'Confirmar'}
          </button>
        </div>
      </div>
    </div>
  );
}

function TextEditModal({
  label,
  currentValue,
  onClose,
  onSave,
  saving,
}: {
  label: string;
  currentValue: string;
  onClose: () => void;
  onSave: (value: string) => void;
  saving: boolean;
}) {
  const [value, setValue] = useState(currentValue);

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md flex flex-col" style={{ fontFamily: FIELD_SERVICE_FONT_FAMILY }}>
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h3 className="text-gray-900">Editar</h3>
            <p className="text-gray-500 mt-0.5" style={{ fontSize: MIN_FONT_SIZE }}>{label}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>
        <div className="p-4">
          <input
            type="text"
            value={value}
            onChange={event => setValue(event.target.value)}
            className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            style={{ fontSize: '0.9rem' }}
            autoFocus
          />
        </div>
        <div className="p-3 border-t border-gray-100 flex gap-3 justify-end">
          <button onClick={onClose} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition" style={{ fontSize: '0.9rem' }}>
            Cancelar
          </button>
          <button
            onClick={() => onSave(value)}
            disabled={saving}
            className="px-4 py-2 bg-[#1a1a2e] text-white rounded-lg hover:bg-[#16213e] transition disabled:cursor-not-allowed disabled:opacity-60"
            style={{ fontSize: '0.9rem' }}
          >
            {saving ? 'Salvando...' : 'Confirmar'}
          </button>
        </div>
      </div>
    </div>
  );
}

function GroupSelectModal({
  groups,
  onClose,
  onSave,
  saving,
}: {
  groups: FieldServiceGroupOption[];
  onClose: () => void;
  onSave: (groupName: string) => void;
  saving: boolean;
}) {
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(groups[0]?.name || '');

  const filtered = groups.filter(group => group.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md max-h-[80vh] flex flex-col" style={{ fontFamily: FIELD_SERVICE_FONT_FAMILY }}>
        <div className="p-4 border-b border-gray-100 flex items-center justify-between shrink-0">
          <div>
            <h3 className="text-gray-900">Adicionar Grupo</h3>
            <p className="text-gray-500 mt-0.5" style={{ fontSize: MIN_FONT_SIZE }}>
              Selecione um grupo que ainda não tem linha de domingo neste mês.
            </p>
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
              onChange={event => setSearch(event.target.value)}
              placeholder="Buscar grupo..."
              className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              style={{ fontSize: '0.9rem' }}
              autoFocus
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          {filtered.map(group => (
            <button
              key={group.id}
              type="button"
              onClick={() => setSelected(group.name)}
              className={`w-full text-left px-3 py-2.5 rounded-lg transition-colors ${selected === group.name ? 'bg-blue-50 text-blue-700' : 'hover:bg-gray-50 text-gray-700'}`}
              style={{ fontSize: '0.9rem' }}
            >
              {group.name}
            </button>
          ))}
          {filtered.length === 0 && (
            <p className="px-3 py-4 text-gray-500" style={{ fontSize: MIN_FONT_SIZE }}>
              Nenhum grupo disponível.
            </p>
          )}
        </div>
        <div className="p-3 border-t border-gray-100 flex gap-3 justify-end shrink-0">
          <button onClick={onClose} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition" style={{ fontSize: '0.9rem' }}>
            Cancelar
          </button>
          <button
            onClick={() => {
              if (!selected) {
                toast.error('Selecione um grupo.');
                return;
              }
              onSave(selected);
            }}
            disabled={saving}
            className="px-4 py-2 bg-[#1a1a2e] text-white rounded-lg hover:bg-[#16213e] transition disabled:cursor-not-allowed disabled:opacity-60"
            style={{ fontSize: '0.9rem' }}
          >
            {saving ? 'Salvando...' : 'Confirmar'}
          </button>
        </div>
      </div>
    </div>
  );
}

function SaturdaySelectModal({
  options,
  onClose,
  onSave,
  saving,
}: {
  options: string[];
  onClose: () => void;
  onSave: (weekday: string) => void;
  saving: boolean;
}) {
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(options[0] || '');

  const filtered = options.filter(option => option.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md max-h-[80vh] flex flex-col" style={{ fontFamily: FIELD_SERVICE_FONT_FAMILY }}>
        <div className="p-4 border-b border-gray-100 flex items-center justify-between shrink-0">
          <div>
            <h3 className="text-gray-900">Adicionar Sábado Rural</h3>
            <p className="text-gray-500 mt-0.5" style={{ fontSize: MIN_FONT_SIZE }}>
              Selecione um sábado ainda não usado neste mês.
            </p>
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
              onChange={event => setSearch(event.target.value)}
              placeholder="Buscar sábado..."
              className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              style={{ fontSize: '0.9rem' }}
              autoFocus
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          {filtered.map(option => (
            <button
              key={option}
              type="button"
              onClick={() => setSelected(option)}
              className={`w-full text-left px-3 py-2.5 rounded-lg transition-colors ${selected === option ? 'bg-blue-50 text-blue-700' : 'hover:bg-gray-50 text-gray-700'}`}
              style={{ fontSize: '0.9rem' }}
            >
              {option}
            </button>
          ))}
          {filtered.length === 0 && (
            <p className="px-3 py-4 text-gray-500" style={{ fontSize: MIN_FONT_SIZE }}>
              Nenhum sábado disponível.
            </p>
          )}
        </div>
        <div className="p-3 border-t border-gray-100 flex gap-3 justify-end shrink-0">
          <button onClick={onClose} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition" style={{ fontSize: '0.9rem' }}>
            Cancelar
          </button>
          <button
            onClick={() => {
              if (!selected) {
                toast.error('Selecione um sábado.');
                return;
              }
              onSave(selected);
            }}
            disabled={saving}
            className="px-4 py-2 bg-[#1a1a2e] text-white rounded-lg hover:bg-[#16213e] transition disabled:cursor-not-allowed disabled:opacity-60"
            style={{ fontSize: '0.9rem' }}
          >
            {saving ? 'Salvando...' : 'Confirmar'}
          </button>
        </div>
      </div>
    </div>
  );
}
