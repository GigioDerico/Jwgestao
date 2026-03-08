import React, { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Search, X } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '../lib/api';
import { supabase } from '../lib/supabase';
import { getMeetingDatesForMonth, type AudioVideoMeetingDate } from '../lib/audio-video-calendar';
import { downloadElementAsImage, downloadElementAsPdf } from '../lib/dom-export';
import { isMemberEligibleForAssignments } from '../lib/assignment-member-eligibility';
import { ExportActions } from './ExportActions';
import type { AudioVideoAssignment } from '../types';
import { useAuth } from '../context/AuthContext';

const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

type AudioVideoRoleKey = 'sound' | 'image' | 'stage' | 'rovingMic1' | 'rovingMic2';
type AudioVideoFilterRoleKey = AudioVideoRoleKey | 'attendants';

interface MemberOption {
  id: string;
  full_name: string;
  approved_audio_video?: boolean;
  approved_sound?: boolean;
  approved_image?: boolean;
  approved_stage?: boolean;
  approved_roving_mic?: boolean;
  approved_indicadores?: boolean;
}

interface CalendarRow extends AudioVideoMeetingDate {
  assignment: AudioVideoAssignment | null;
}

type RestrictedFieldKey = AudioVideoRoleKey | 'attendants';
type AssignmentSummaryKey = AudioVideoRoleKey | 'attendants';

const SUMMARY_DISPLAY_GROUPS = [
  { label: 'Som', getCount: (item: Record<AssignmentSummaryKey | 'total', number>) => item.sound },
  { label: 'Imagem', getCount: (item: Record<AssignmentSummaryKey | 'total', number>) => item.image },
  { label: 'Palco', getCount: (item: Record<AssignmentSummaryKey | 'total', number>) => item.stage },
  { label: 'Mic.', getCount: (item: Record<AssignmentSummaryKey | 'total', number>) => item.rovingMic1 + item.rovingMic2 },
  { label: 'Indic.', getCount: (item: Record<AssignmentSummaryKey | 'total', number>) => item.attendants },
] as const;

const SINGLE_ROLE_CONFIG: {
  key: AudioVideoRoleKey;
  label: string;
  group: 'audioVideo';
  hoverClass: string;
}[] = [
  { key: 'sound', label: 'Som', group: 'audioVideo', hoverClass: 'hover:bg-sky-50' },
  { key: 'image', label: 'Imagem', group: 'audioVideo', hoverClass: 'hover:bg-indigo-50' },
  { key: 'stage', label: 'Palco', group: 'audioVideo', hoverClass: 'hover:bg-emerald-50' },
  { key: 'rovingMic1', label: 'Mic. Volante 1', group: 'audioVideo', hoverClass: 'hover:bg-amber-50' },
  { key: 'rovingMic2', label: 'Mic. Volante 2', group: 'audioVideo', hoverClass: 'hover:bg-amber-50' },
];

const SINGLE_ROLE_LABELS = SINGLE_ROLE_CONFIG.reduce<Record<AudioVideoRoleKey, string>>((acc, role) => {
  acc[role.key] = role.label;
  return acc;
}, {} as Record<AudioVideoRoleKey, string>);

function hasPrivilegeForRole(member: MemberOption, role: AudioVideoFilterRoleKey): boolean {
  if (role === 'sound') {
    return Boolean(member.approved_sound || member.approved_audio_video);
  }

  if (role === 'image') {
    return Boolean(member.approved_image || member.approved_audio_video);
  }

  if (role === 'stage') {
    return Boolean(member.approved_stage || member.approved_audio_video);
  }

  if (role === 'rovingMic1' || role === 'rovingMic2') {
    return Boolean(member.approved_roving_mic || member.approved_audio_video);
  }

  return Boolean(member.approved_indicadores);
}

export function AudioVideoAssignments({
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
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [data, setData] = useState<AudioVideoAssignment[]>([]);
  const [members, setMembers] = useState<MemberOption[]>([]);
  const [editModal, setEditModal] = useState<{ id: string; field: AudioVideoRoleKey; value: string } | null>(null);
  const [attendantsModal, setAttendantsModal] = useState<{ id: string; values: string[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState<'image' | 'pdf' | null>(null);
  const [nameFilter, setNameFilter] = useState('');
  const exportRef = useRef<HTMLDivElement>(null);

  const meetingDates = getMeetingDatesForMonth(currentMonth, currentYear);
  const meetingDateSet = new Set(meetingDates.map(item => item.date));
  const assignmentByDate = new Map<string, AudioVideoAssignment>();

  for (const assignment of data) {
    if (!meetingDateSet.has(assignment.date) || assignmentByDate.has(assignment.date)) {
      continue;
    }
    assignmentByDate.set(assignment.date, assignment);
  }

  const calendarRows: CalendarRow[] = meetingDates.map(meetingDate => ({
    ...meetingDate,
    assignment: assignmentByDate.get(meetingDate.date) || null,
  }));
  const normalizeFilterText = (value: string) =>
    value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();
  const normalizedNameFilter = normalizeFilterText(nameFilter.trim());
  const currentUserName = (user?.name || '').trim();
  const filteredCalendarRows = normalizedNameFilter
    ? calendarRows.filter(row => {
      if (!row.assignment) {
        return false;
      }

      const fields = [
        row.assignment.sound,
        row.assignment.image,
        row.assignment.stage,
        row.assignment.rovingMic1,
        row.assignment.rovingMic2,
        ...row.assignment.attendants,
      ];

      return fields.some(value => normalizeFilterText(value || '').includes(normalizedNameFilter));
    })
    : calendarRows;
  const isMonthGenerated = calendarRows.length > 0 && calendarRows.every(row => Boolean(row.assignment));

  const currentEditAssignment = editModal ? data.find(item => item.id === editModal.id) || null : null;
  const currentAttendantsAssignment = attendantsModal ? data.find(item => item.id === attendantsModal.id) || null : null;
  const assignmentCounts = new Map<string, Record<AssignmentSummaryKey | 'total', number>>();

  for (const member of members) {
    assignmentCounts.set(member.full_name, {
      total: 0,
      sound: 0,
      image: 0,
      stage: 0,
      rovingMic1: 0,
      rovingMic2: 0,
      attendants: 0,
    });
  }

  const incrementAssignmentCount = (name: string, key: AssignmentSummaryKey) => {
    const current = assignmentCounts.get(name) || {
      total: 0,
      sound: 0,
      image: 0,
      stage: 0,
      rovingMic1: 0,
      rovingMic2: 0,
      attendants: 0,
    };

    current[key] += 1;
    current.total += 1;
    assignmentCounts.set(name, current);
  };

  const singleRoleSummaryKeys: AudioVideoRoleKey[] = [
    'sound',
    'image',
    'stage',
    'rovingMic1',
    'rovingMic2',
  ];

  for (const roleKey of singleRoleSummaryKeys) {
    for (const row of calendarRows) {
      const assignedName = normalizeAssignedValue(row.assignment?.[roleKey]);
      if (!assignedName) {
        continue;
      }

      incrementAssignmentCount(assignedName, roleKey);
    }
  }

  for (const row of calendarRows) {
    if (!row.assignment) {
      continue;
    }

    for (const name of row.assignment.attendants) {
      const normalized = normalizeAssignedValue(name);
      if (normalized) {
        incrementAssignmentCount(normalized, 'attendants');
      }
    }
  }

  const assignmentSummary = Array.from(assignmentCounts.entries())
    .map(([name, counts]) => ({ name, ...counts }))
    .sort((a, b) => {
      if (b.total !== a.total) {
        return b.total - a.total;
      }

      return a.name.localeCompare(b.name, 'pt-BR');
    });

  const loadEligibleMembers = async () => {
    const { data: rows, error } = await supabase
      .from('members')
      .select('id, full_name, spiritual_status, approved_audio_video, approved_sound, approved_image, approved_stage, approved_roving_mic, approved_indicadores')
      .or('approved_audio_video.eq.true,approved_sound.eq.true,approved_image.eq.true,approved_stage.eq.true,approved_roving_mic.eq.true,approved_indicadores.eq.true')
      .order('full_name');

    if (error) {
      throw error;
    }

    setMembers(
      (rows || [])
        .filter((member: any) => isMemberEligibleForAssignments(member?.spiritual_status ?? member?.spiritualStatus))
        .map((member: any) => ({
        id: member.id,
        full_name: member.full_name,
        approved_audio_video: Boolean(
          member.approved_audio_video ?? member.approvedAudioVideo
        ),
        approved_sound: Boolean(
          member.approved_sound ?? member.approvedSound
        ),
        approved_image: Boolean(
          member.approved_image ?? member.approvedImage
        ),
        approved_stage: Boolean(
          member.approved_stage ?? member.approvedStage
        ),
        approved_roving_mic: Boolean(
          member.approved_roving_mic ?? member.approvedRovingMic
        ),
        approved_indicadores: Boolean(
          member.approved_indicadores ?? member.approvedIndicadores
        ),
      }))
    );
  };

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
    loadEligibleMembers().catch(error => {
        console.error(error);
        toast.error('Erro ao carregar membros para a escala.');
      });
  }, []);

  useEffect(() => {
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

  const formatDate = (dateStr: string) => {
    const date = new Date(`${dateStr}T12:00:00`);
    return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}`;
  };

  const getRoleValue = (assignment: AudioVideoAssignment, roleKey: AudioVideoRoleKey) => {
    return assignment[roleKey] || 'A definir';
  };

  function normalizeAssignedValue(value: string | undefined) {
    if (!value || value === 'A definir') {
      return null;
    }

    return value;
  }

  const findMemberIdByName = (fullName: string) => {
    if (!fullName || fullName === 'A definir') {
      return null;
    }

    return members.find(member => member.full_name === fullName)?.id || null;
  };

  const getCurrentRoleMemberId = (
    assignment: AudioVideoAssignment | null,
    roleKey: AudioVideoRoleKey
  ) => {
    if (!assignment) {
      return null;
    }

    const fieldMap: Record<AudioVideoRoleKey, keyof AudioVideoAssignment> = {
      sound: 'soundMemberId',
      image: 'imageMemberId',
      stage: 'stageMemberId',
      rovingMic1: 'rovingMic1MemberId',
      rovingMic2: 'rovingMic2MemberId',
    };

    return (assignment[fieldMap[roleKey]] as string | null | undefined) || null;
  };

  const getResolvedAttendantsMemberIds = (values: string[]) => {
    const existingIdsByName = new Map<string, string>();

    if (currentAttendantsAssignment) {
      currentAttendantsAssignment.attendants.forEach((name, index) => {
        const currentId = currentAttendantsAssignment.attendantsMemberIds?.[index];
        if (name && currentId) {
          existingIdsByName.set(name, currentId);
        }
      });
    }

    return values
      .map(value => findMemberIdByName(value) || existingIdsByName.get(value) || null)
      .filter((value): value is string => Boolean(value));
  };

  const getUsedNamesForAssignment = (
    assignment: AudioVideoAssignment,
    excludeField?: RestrictedFieldKey
  ) => {
    const usedNames = new Set<string>();
    const fields: Array<{ key: RestrictedFieldKey; value: string | string[] }> = [
      { key: 'sound', value: assignment.sound },
      { key: 'image', value: assignment.image },
      { key: 'stage', value: assignment.stage },
      { key: 'rovingMic1', value: assignment.rovingMic1 },
      { key: 'rovingMic2', value: assignment.rovingMic2 },
      { key: 'attendants', value: assignment.attendants },
    ];

    for (const field of fields) {
      if (field.key === excludeField) {
        continue;
      }

      if (Array.isArray(field.value)) {
        for (const item of field.value) {
          const normalized = normalizeAssignedValue(item);
          if (normalized) {
            usedNames.add(normalized);
          }
        }
        continue;
      }

      const normalized = normalizeAssignedValue(field.value);
      if (normalized) {
        usedNames.add(normalized);
      }
    }

    return usedNames;
  };

  const ensureRowExists = (assignment: AudioVideoAssignment | null) => {
    if (assignment) {
      return true;
    }

    toast.error('Clique em "Gerar mês" para criar os dias deste mês.');
    return false;
  };

  const handleGenerateMonth = async () => {
    if (!canCreate) {
      return;
    }

    try {
      setGenerating(true);
      const result = await api.ensureAudioVideoAssignmentsForMonth(currentMonth, currentYear);
      setData(result.assignments);

      if (result.createdCount > 0) {
        toast.success(`${result.createdCount} dia(s) criado(s) para ${MONTHS[currentMonth]} ${currentYear}.`);
      } else {
        toast.success('Este mês já estava completo.');
      }
    } catch (err: any) {
      toast.error(err.message || 'Erro ao gerar a escala do mês.');
    } finally {
      setGenerating(false);
    }
  };

  const handleEditRole = async (assignment: AudioVideoAssignment | null, field: AudioVideoRoleKey) => {
    if (!canEdit) {
      return;
    }

    if (!ensureRowExists(assignment)) {
      return;
    }

    try {
      await loadEligibleMembers();
    } catch (error) {
      console.error(error);
      toast.error('Erro ao atualizar a lista de membros elegíveis.');
      return;
    }

    setEditModal({
      id: assignment.id,
      field,
      value: getRoleValue(assignment, field),
    });
  };

  const handleEditAttendants = async (assignment: AudioVideoAssignment | null) => {
    if (!canEdit) {
      return;
    }

    if (!ensureRowExists(assignment)) {
      return;
    }

    try {
      await loadEligibleMembers();
    } catch (error) {
      console.error(error);
      toast.error('Erro ao atualizar a lista de membros elegíveis.');
      return;
    }

    setAttendantsModal({
      id: assignment.id,
      values: assignment.attendants,
    });
  };

  const handleSaveRole = async (newValue: string) => {
    if (!editModal) {
      return;
    }

    const fieldMap: Record<AudioVideoRoleKey, keyof Pick<
      Parameters<typeof api.updateAudioVideoAssignment>[1],
      'sound' | 'image' | 'stage' | 'roving_mic_1' | 'roving_mic_2'
    >> = {
      sound: 'sound',
      image: 'image',
      stage: 'stage',
      rovingMic1: 'roving_mic_1',
      rovingMic2: 'roving_mic_2',
    };

    if (currentEditAssignment) {
      const usedNames = getUsedNamesForAssignment(currentEditAssignment, editModal.field);
      const normalizedNewValue = normalizeAssignedValue(newValue);
      const normalizedCurrentValue = normalizeAssignedValue(editModal.value);

      if (
        normalizedNewValue &&
        normalizedNewValue !== normalizedCurrentValue &&
        usedNames.has(normalizedNewValue)
      ) {
        toast.error('Este membro já está designado em outra função nesta data.');
        return;
      }
    }

    try {
      setSaving(true);
      const currentMemberId = getCurrentRoleMemberId(currentEditAssignment, editModal.field);
      const resolvedMemberId = newValue && newValue !== 'A definir'
        ? findMemberIdByName(newValue) || (
          normalizeAssignedValue(newValue) === normalizeAssignedValue(editModal.value)
            ? currentMemberId
            : null
        )
        : null;

      const updated = await api.updateAudioVideoAssignment(editModal.id, {
        [fieldMap[editModal.field]]: newValue || 'A definir',
        [`${fieldMap[editModal.field]}_member_id`]: resolvedMemberId,
      } as any);
      setData(prev => prev.map(item => (item.id === editModal.id ? updated : item)));
      setEditModal(null);
      toast.success('Designação atualizada!');
    } catch (err: any) {
      toast.error(err.message || 'Erro ao atualizar designação.');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAttendants = async (values: string[]) => {
    if (!attendantsModal) {
      return;
    }

    if (currentAttendantsAssignment) {
      const usedNames = getUsedNamesForAssignment(currentAttendantsAssignment, 'attendants');
      const hasConflict = values.some(value => usedNames.has(value));

      if (hasConflict) {
        toast.error('Um dos membros escolhidos já está designado em outra função nesta data.');
        return;
      }
    }

    try {
      setSaving(true);
      const updated = await api.updateAudioVideoAssignment(attendantsModal.id, {
        attendants: values,
        attendants_member_ids: getResolvedAttendantsMemberIds(values),
      });
      setData(prev => prev.map(item => (item.id === attendantsModal.id ? updated : item)));
      setAttendantsModal(null);
      toast.success('Indicadores atualizados!');
    } catch (err: any) {
      toast.error(err.message || 'Erro ao atualizar indicadores.');
    } finally {
      setSaving(false);
    }
  };

  const renderSingleRoleButton = (row: CalendarRow, roleKey: AudioVideoRoleKey) => {
    const roleConfig = SINGLE_ROLE_CONFIG.find(role => role.key === roleKey);
    const value = row.assignment ? getRoleValue(row.assignment, roleKey) : 'A definir';
    const isGenerated = Boolean(row.assignment);
    const isPending = !isGenerated || value === 'A definir';

    if (!canEdit) {
      return (
        <div
          className={`w-full rounded-lg px-3 py-2 text-left ${isPending ? 'bg-red-50 text-red-700' : isGenerated ? 'text-gray-700' : 'text-gray-400'}`}
        >
          <span className={isGenerated ? '' : 'italic'}>{value}</span>
        </div>
      );
    }

    return (
      <button
        type="button"
        onClick={() => handleEditRole(row.assignment, roleKey)}
        disabled={loading || generating || saving}
        className={`w-full rounded-lg px-3 py-2 text-left transition-colors ${
          isPending
            ? 'bg-red-50 text-red-700 hover:bg-red-100'
            : isGenerated
              ? `${roleConfig?.hoverClass || 'hover:bg-gray-50'} text-gray-700`
              : 'text-gray-400 hover:bg-gray-50'
        } disabled:cursor-not-allowed disabled:opacity-60`}
      >
        <span className={isGenerated ? '' : 'italic'}>{value}</span>
      </button>
    );
  };

  const renderAttendantsButton = (row: CalendarRow) => {
    const value =
      row.assignment && row.assignment.attendants.length > 0
        ? row.assignment.attendants.join(' / ')
        : 'A definir';
    const isPending = !row.assignment || row.assignment.attendants.length === 0;

    if (!canEdit) {
      return (
        <div
          className={`w-full rounded-lg px-3 py-2 text-left ${isPending ? 'bg-red-50 text-red-700' : row.assignment ? 'text-gray-700' : 'text-gray-400'}`}
        >
          <span className={row.assignment && row.assignment.attendants.length > 0 ? '' : 'italic'}>{value}</span>
        </div>
      );
    }

    return (
      <button
        type="button"
        onClick={() => handleEditAttendants(row.assignment)}
        disabled={loading || generating || saving}
        className={`w-full rounded-lg px-3 py-2 text-left transition-colors ${
          isPending
            ? 'bg-red-50 text-red-700 hover:bg-red-100'
            : row.assignment
              ? 'text-gray-700 hover:bg-slate-50'
              : 'text-gray-400 hover:bg-gray-50'
        } disabled:cursor-not-allowed disabled:opacity-60`}
      >
        <span className={row.assignment && row.assignment.attendants.length > 0 ? '' : 'italic'}>{value}</span>
      </button>
    );
  };

  const handleExport = async (type: 'image' | 'pdf') => {
    if (!exportRef.current) {
      toast.error('Não foi possível preparar a exportação.');
      return;
    }

    const baseFilename = `audio-video-${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`;

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
      toast.error(error?.message || 'Não foi possível exportar a escala.');
    } finally {
      setExporting(null);
    }
  };

  return (
    <div
      className="relative space-y-4"
      style={{ fontFamily: 'Calibri, Arial, sans-serif' }}
    >
      <div className="bg-card rounded-xl border border-border p-3 shadow-sm">
        <div className="flex items-center justify-between">
          <button onClick={prevMonth} className="rounded-lg p-2 transition-colors hover:bg-gray-100">
            <ChevronLeft size={18} className="text-gray-600" />
          </button>
          <h3 className="text-foreground" style={{ fontSize: '1rem' }}>
            {MONTHS[currentMonth]} {currentYear}
          </h3>
          <button onClick={nextMonth} className="rounded-lg p-2 transition-colors hover:bg-gray-100">
            <ChevronRight size={18} className="text-gray-600" />
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="relative flex-1">
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={nameFilter}
              onChange={event => setNameFilter(event.target.value)}
              placeholder="Filtrar por nome do designado..."
              className="w-full rounded-lg border border-border bg-card py-2 pl-9 pr-3 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              style={{ fontSize: '14px' }}
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
            style={{ fontSize: '14px' }}
          >
            {nameFilter.trim() === currentUserName ? 'Limpar minhas designações' : 'Minhas designações'}
          </button>
        </div>
      </div>

      {(canExportImage || canExportPdf) && (
        <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-foreground font-medium" style={{ fontSize: '0.9rem' }}>
              Exportação do mês visível
            </p>
            <p className="text-muted-foreground" style={{ fontSize: '14px' }}>
              Exporta a grade de quinta e domingo do mês atualmente selecionado.
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
        <div className="bg-card rounded-xl border border-border shadow-sm">
          <div className="border-b border-border px-4 py-3 md:flex md:items-center md:justify-between">
            <div>
              <h4 className="text-foreground" style={{ fontSize: '0.95rem' }}>Gerar escala do mês</h4>
              <p className="text-muted-foreground" style={{ fontSize: '14px' }}>
                Serão considerados apenas os dias de quinta e domingo do mês selecionado.
              </p>
            </div>
            <button
              type="button"
              onClick={handleGenerateMonth}
              disabled={loading || generating || saving}
              className="mt-3 inline-flex items-center rounded-lg bg-primary px-4 py-2 text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60 md:mt-0"
              style={{ fontSize: '14px' }}
            >
              {generating ? 'Gerando...' : 'Gerar mês'}
            </button>
          </div>
          <div className="px-4 py-3">
            <p className="text-muted-foreground" style={{ fontSize: '14px' }}>
              {loading
                ? 'Carregando dados salvos do mês...'
                : 'Clique em cada cargo para escolher os membros habilitados. Dias ainda não gerados aparecem vazios.'}
            </p>
          </div>
        </div>
      )}

      <div className="hidden md:block bg-white rounded-xl border border-gray-100 overflow-hidden shadow-sm">
        <div className="bg-[#4a9bc7] px-4 py-3">
          <h4 className="text-center tracking-wide text-white" style={{ fontSize: '14px' }}>
            Áudio e Vídeo / Indicadores
          </h4>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full" style={{ fontSize: '14px' }}>
            <thead>
              <tr className="bg-[#5badd4] text-white">
                <th className="px-3 py-2.5 text-left" style={{ width: '14%' }}>Data</th>
                <th className="px-3 py-2.5 text-left" style={{ width: '14%' }}>Som</th>
                <th className="px-3 py-2.5 text-left" style={{ width: '14%' }}>Imagem</th>
                <th className="px-3 py-2.5 text-left" style={{ width: '14%' }}>Palco</th>
                <th className="px-3 py-2.5 text-left" style={{ width: '14%' }}>Mic. Volante 1</th>
                <th className="px-3 py-2.5 text-left" style={{ width: '14%' }}>Mic. Volante 2</th>
                <th className="px-3 py-2.5 text-left" style={{ width: '16%' }}>Entradas / Auditório</th>
              </tr>
            </thead>
            <tbody>
              {filteredCalendarRows.length > 0 ? (
                filteredCalendarRows.map((row, index) => (
                  <tr
                    key={row.date}
                    className={`${index % 2 === 0 ? 'bg-blue-50/40' : 'bg-white'} border-b border-gray-200 transition-colors hover:bg-blue-50/70`}
                  >
                    <td className="px-3 py-2.5 text-gray-700">
                      <div className="font-medium">{formatDate(row.date)}</div>
                      <div className="text-gray-400" style={{ fontSize: '14px' }}>
                        {row.weekday} {row.assignment ? '' : '• não gerada'}
                      </div>
                    </td>
                    <td className="px-2 py-2.5">{renderSingleRoleButton(row, 'sound')}</td>
                    <td className="px-2 py-2.5">{renderSingleRoleButton(row, 'image')}</td>
                    <td className="px-2 py-2.5">{renderSingleRoleButton(row, 'stage')}</td>
                    <td className="px-2 py-2.5">{renderSingleRoleButton(row, 'rovingMic1')}</td>
                    <td className="px-2 py-2.5">{renderSingleRoleButton(row, 'rovingMic2')}</td>
                    <td className="px-2 py-2.5">{renderAttendantsButton(row)}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                    {nameFilter.trim()
                      ? 'Nenhuma designação encontrada para este nome.'
                      : 'Nenhuma linha disponível para este mês.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="space-y-3 md:hidden">
        {filteredCalendarRows.length > 0 ? (
          filteredCalendarRows.map(row => (
            <div key={row.date} className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
              <div className="bg-[#4a9bc7] px-4 py-2 flex items-center justify-between">
                <span className="text-white" style={{ fontSize: '14px' }}>
                  {formatDate(row.date)} • {row.weekday}
                </span>
                <span className="text-white/90" style={{ fontSize: '14px' }}>
                  {row.assignment ? 'gerada' : 'não gerada'}
                </span>
              </div>
              <div className="space-y-3 p-3">
                <section className="space-y-2">
                  <h5 className="text-gray-500" style={{ fontSize: '14px' }}>Áudio e Vídeo</h5>
                  {SINGLE_ROLE_CONFIG.filter(role => role.group === 'audioVideo').map(role => (
                    <div key={role.key} className="flex items-center gap-3">
                      <span className="w-24 shrink-0 text-gray-500" style={{ fontSize: '14px' }}>
                        {role.label}
                      </span>
                      <div className="flex-1">{renderSingleRoleButton(row, role.key)}</div>
                    </div>
                  ))}
                </section>
                <section className="space-y-2 border-t border-gray-100 pt-3">
                  <h5 className="text-gray-500" style={{ fontSize: '14px' }}>Indicadores</h5>
                  <div className="flex items-center gap-3">
                    <span className="w-24 shrink-0 text-gray-500" style={{ fontSize: '14px' }}>
                      Entradas
                    </span>
                    <div className="flex-1">{renderAttendantsButton(row)}</div>
                  </div>
                </section>
              </div>
            </div>
          ))
        ) : (
          <div className="rounded-xl border border-gray-100 bg-white px-4 py-8 text-center text-gray-500 shadow-sm">
            {nameFilter.trim()
              ? 'Nenhuma designação encontrada para este nome.'
              : 'Nenhuma linha disponível para este mês.'}
          </div>
        )}
      </div>

      {assignmentSummary.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <h4 className="text-foreground" style={{ fontSize: '0.92rem' }}>
                Resumo de Designações do Mês
              </h4>
              <p className="text-muted-foreground" style={{ fontSize: '14px' }}>
                Total de vezes que cada membro apareceu na escala visível.
              </p>
            </div>
            <span
              className="rounded-full bg-primary/10 px-2.5 py-1 text-primary"
              style={{ fontSize: '14px' }}
            >
              {assignmentSummary.reduce((sum, item) => sum + item.total, 0)} designações
            </span>
          </div>

          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {assignmentSummary.map(item => (
              <div
                key={item.name}
                className="rounded-xl border border-border/70 bg-background px-3 py-2.5"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="truncate text-foreground" style={{ fontSize: '14px' }}>
                    {item.name}
                  </span>
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-0.5 font-medium ${
                      item.total > 0
                        ? 'bg-primary/10 text-primary'
                        : 'bg-muted text-muted-foreground'
                    }`}
                    style={{ fontSize: '14px' }}
                  >
                    {item.total}x
                  </span>
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {SUMMARY_DISPLAY_GROUPS.map(group => {
                    const count = group.getCount(item);

                    return (
                      <span
                        key={`${item.name}-${group.label}`}
                        className={`rounded-full px-2 py-0.5 ${
                        count > 0
                          ? 'bg-white text-foreground border border-border'
                          : 'bg-muted/70 text-muted-foreground'
                        }`}
                        style={{ fontSize: '14px' }}
                      >
                        {group.label} {count}x
                      </span>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {canEdit && editModal && (
        <MemberSelectModal
          label={SINGLE_ROLE_LABELS[editModal.field]}
          role={editModal.field}
          currentValue={editModal.value}
          onClose={() => setEditModal(null)}
          onSave={handleSaveRole}
          members={members}
          unavailableNames={currentEditAssignment ? getUsedNamesForAssignment(currentEditAssignment, editModal.field) : new Set<string>()}
          saving={saving}
        />
      )}

      {canEdit && attendantsModal && (
        <AttendantsSelectModal
          role="attendants"
          currentValues={attendantsModal.values}
          onClose={() => setAttendantsModal(null)}
          onSave={handleSaveAttendants}
          members={members}
          blockedNames={currentAttendantsAssignment ? getUsedNamesForAssignment(currentAttendantsAssignment, 'attendants') : new Set<string>()}
          saving={saving}
        />
      )}

      <div className="pointer-events-none absolute -left-[10000px] top-0 w-[760px]" aria-hidden="true">
        <div
          ref={exportRef}
          data-export-pdf-page="a4-portrait"
          data-export-pdf-mode="single-page"
          className="w-[760px] bg-white px-3 py-4 text-[#141414]"
          style={{ fontFamily: 'Calibri, Arial, sans-serif' }}
        >
          <div className="overflow-hidden rounded-xl border border-gray-200">
            <div className="bg-[#4a9bc7] px-4 py-3">
              <h4 className="text-center tracking-wide text-white" style={{ fontSize: '14px', lineHeight: 1.15 }}>
                Áudio e Vídeo / Indicadores — {MONTHS[currentMonth]} {currentYear}
              </h4>
            </div>
            <table className="w-full table-fixed" style={{ fontSize: '13px', lineHeight: 1.15 }}>
              <thead>
                <tr className="bg-[#5badd4] text-white">
                  <th className="px-1.5 py-2 text-center" style={{ width: '10%' }}>Data</th>
                  <th className="px-1.5 py-2 text-center" style={{ width: '12%' }}>Som</th>
                  <th className="px-1.5 py-2 text-center" style={{ width: '12%' }}>Imagem</th>
                  <th className="px-1.5 py-2 text-center" style={{ width: '12%' }}>Palco</th>
                  <th className="px-1.5 py-2 text-center" style={{ width: '16%' }}>Mic. Volante 1</th>
                  <th className="px-1.5 py-2 text-center" style={{ width: '16%' }}>Mic. Volante 2</th>
                  <th className="px-1.5 py-2 text-center" style={{ width: '22%' }}>Entradas / Auditório</th>
                </tr>
              </thead>
              <tbody>
                {calendarRows.length > 0 ? (
                  calendarRows.map((row, index) => (
                    <tr
                      key={`export-${row.date}`}
                      className={`${index % 2 === 0 ? 'bg-blue-50/40' : 'bg-white'} border-b border-gray-200`}
                    >
                      <td className="px-1.5 py-2 text-center text-gray-700">
                        <div className="font-medium">{formatDate(row.date)}</div>
                        <div className="text-gray-400" style={{ fontSize: '11px', lineHeight: 1.05 }}>
                          {row.weekday.toUpperCase()}
                        </div>
                      </td>
                      <td className="px-1.5 py-2 text-center text-gray-700 break-words">{row.assignment ? getRoleValue(row.assignment, 'sound') : 'A definir'}</td>
                      <td className="px-1.5 py-2 text-center text-gray-700 break-words">{row.assignment ? getRoleValue(row.assignment, 'image') : 'A definir'}</td>
                      <td className="px-1.5 py-2 text-center text-gray-700 break-words">{row.assignment ? getRoleValue(row.assignment, 'stage') : 'A definir'}</td>
                      <td className="px-1.5 py-2 text-center text-gray-700 break-words">{row.assignment ? getRoleValue(row.assignment, 'rovingMic1') : 'A definir'}</td>
                      <td className="px-1.5 py-2 text-center text-gray-700 break-words">{row.assignment ? getRoleValue(row.assignment, 'rovingMic2') : 'A definir'}</td>
                      <td className="px-1.5 py-2 text-center text-gray-700 break-words">
                        {row.assignment && row.assignment.attendants.length > 0
                          ? row.assignment.attendants.join(' / ')
                          : 'A definir'}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                      Nenhuma linha disponível para este mês.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

function MemberSelectModal({
  label,
  role,
  currentValue,
  onClose,
  onSave,
  members,
  unavailableNames,
  saving,
}: {
  label: string;
  role: AudioVideoFilterRoleKey;
  currentValue: string;
  onClose: () => void;
  onSave: (value: string) => void;
  members: MemberOption[];
  unavailableNames: Set<string>;
  saving: boolean;
}) {
  const [search, setSearch] = useState('');
  const [onlyPrivileged, setOnlyPrivileged] = useState(true);
  const [selected, setSelected] = useState(currentValue === 'A definir' ? '' : currentValue);

  const filteredMembers = members.filter(member => {
    const matchesSearch = member.full_name.toLowerCase().includes(search.toLowerCase());
    const isUnavailable = unavailableNames.has(member.full_name) && member.full_name !== selected;
    const hasPrivilege = hasPrivilegeForRole(member, role);
    const passesPrivilegeFilter = !onlyPrivileged || hasPrivilege || member.full_name === selected;
    return matchesSearch && !isUnavailable && passesPrivilegeFilter;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="flex max-h-[80vh] w-full max-w-md flex-col rounded-2xl bg-white">
        <div className="shrink-0 border-b border-gray-100 p-4 flex items-center justify-between">
          <div>
            <h3 className="text-gray-900">Editar Designação</h3>
            <p className="mt-0.5 text-gray-500" style={{ fontSize: '14px' }}>{label}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 transition-colors hover:text-gray-600">
            <X size={20} />
          </button>
        </div>
        <div className="shrink-0 border-b border-gray-100 p-3">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={event => setSearch(event.target.value)}
              placeholder="Buscar membro..."
              className="w-full rounded-lg border border-gray-200 bg-gray-50 py-2 pl-9 pr-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
              style={{ fontSize: '0.9rem' }}
              autoFocus
            />
          </div>
          <label className="mt-2 flex items-center gap-2 text-gray-600" style={{ fontSize: '0.85rem' }}>
            <input
              type="checkbox"
              checked={onlyPrivileged}
              onChange={event => setOnlyPrivileged(event.target.checked)}
              className="h-4 w-4 rounded accent-[#35bdf8]"
            />
            Somente membros com privilégio para {label.toLowerCase()}
          </label>
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          <button
            type="button"
            onClick={() => setSelected('')}
            className={`w-full rounded-lg px-3 py-2.5 text-left transition-colors ${selected === '' ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-50'}`}
            style={{ fontSize: '0.9rem' }}
          >
            A definir
          </button>
          {filteredMembers.map(member => (
            <button
              key={member.id}
              type="button"
              onClick={() => setSelected(member.full_name)}
              className={`w-full rounded-lg px-3 py-2.5 text-left transition-colors ${selected === member.full_name ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-50'}`}
              style={{ fontSize: '0.9rem' }}
            >
              {member.full_name}
            </button>
          ))}
          {filteredMembers.length === 0 && (
            <p className="px-3 py-4 text-gray-500" style={{ fontSize: '14px' }}>
              Nenhum membro encontrado.
            </p>
          )}
        </div>
        <div className="shrink-0 border-t border-gray-100 p-3 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-gray-600 transition hover:bg-gray-100"
            style={{ fontSize: '0.9rem' }}
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => onSave(selected)}
            disabled={saving}
            className="rounded-lg bg-[#1a1a2e] px-4 py-2 text-white transition hover:bg-[#16213e] disabled:cursor-not-allowed disabled:opacity-60"
            style={{ fontSize: '0.9rem' }}
          >
            {saving ? 'Salvando...' : 'Confirmar'}
          </button>
        </div>
      </div>
    </div>
  );
}

function AttendantsSelectModal({
  role,
  currentValues,
  onClose,
  onSave,
  members,
  blockedNames,
  saving,
}: {
  role: AudioVideoFilterRoleKey;
  currentValues: string[];
  onClose: () => void;
  onSave: (values: string[]) => void;
  members: MemberOption[];
  blockedNames: Set<string>;
  saving: boolean;
}) {
  const [search, setSearch] = useState('');
  const [onlyPrivileged, setOnlyPrivileged] = useState(true);
  const [selected, setSelected] = useState<string[]>(currentValues);

  const filteredMembers = members.filter(member => {
    const matchesSearch = member.full_name.toLowerCase().includes(search.toLowerCase());
    const isBlocked = blockedNames.has(member.full_name) && !selected.includes(member.full_name);
    const hasPrivilege = hasPrivilegeForRole(member, role);
    const passesPrivilegeFilter = !onlyPrivileged || hasPrivilege || selected.includes(member.full_name);
    return matchesSearch && !isBlocked && passesPrivilegeFilter;
  });

  const toggleMember = (fullName: string) => {
    setSelected(prev =>
      prev.includes(fullName)
        ? prev.filter(value => value !== fullName)
        : [...prev, fullName]
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="flex max-h-[80vh] w-full max-w-lg flex-col rounded-2xl bg-white">
        <div className="shrink-0 border-b border-gray-100 p-4 flex items-center justify-between">
          <div>
            <h3 className="text-gray-900">Entradas / Auditório</h3>
            <p className="mt-0.5 text-gray-500" style={{ fontSize: '14px' }}>
              Selecione um ou mais membros com privilégio de indicadores.
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 transition-colors hover:text-gray-600">
            <X size={20} />
          </button>
        </div>
        <div className="shrink-0 border-b border-gray-100 p-3">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={event => setSearch(event.target.value)}
              placeholder="Buscar membro..."
              className="w-full rounded-lg border border-gray-200 bg-gray-50 py-2 pl-9 pr-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
              style={{ fontSize: '0.9rem' }}
              autoFocus
            />
          </div>
          <label className="mt-2 flex items-center gap-2 text-gray-600" style={{ fontSize: '0.85rem' }}>
            <input
              type="checkbox"
              checked={onlyPrivileged}
              onChange={event => setOnlyPrivileged(event.target.checked)}
              className="h-4 w-4 rounded accent-[#35bdf8]"
            />
            Somente membros com privilégio para indicadores
          </label>
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          {filteredMembers.map(member => {
            const isSelected = selected.includes(member.full_name);

            return (
              <button
                key={member.id}
                type="button"
                onClick={() => toggleMember(member.full_name)}
                className={`flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left transition-colors ${isSelected ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-50'}`}
                style={{ fontSize: '0.9rem' }}
              >
                <span>{member.full_name}</span>
                <span className={`rounded-full px-2 py-0.5 ${isSelected ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'}`} style={{ fontSize: '14px' }}>
                  {isSelected ? 'Selecionado' : 'Selecionar'}
                </span>
              </button>
            );
          })}
          {filteredMembers.length === 0 && (
            <p className="px-3 py-4 text-gray-500" style={{ fontSize: '14px' }}>
              Nenhum membro encontrado.
            </p>
          )}
        </div>
        <div className="shrink-0 border-t border-gray-100 p-3">
          <div className="mb-3">
            <p className="text-gray-500" style={{ fontSize: '14px' }}>Selecionados</p>
            <p className="text-gray-700" style={{ fontSize: '14px' }}>
              {selected.length > 0 ? selected.join(' / ') : 'A definir'}
            </p>
          </div>
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-4 py-2 text-gray-600 transition hover:bg-gray-100"
              style={{ fontSize: '0.9rem' }}
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={() => onSave(selected)}
              disabled={saving}
              className="rounded-lg bg-[#1a1a2e] px-4 py-2 text-white transition hover:bg-[#16213e] disabled:cursor-not-allowed disabled:opacity-60"
              style={{ fontSize: '0.9rem' }}
            >
              {saving ? 'Salvando...' : 'Confirmar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
