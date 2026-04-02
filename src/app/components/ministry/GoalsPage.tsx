import React, { useEffect, useRef, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  ministryApi,
  type GoalPlannerActivityType,
  type LocalGoalPlannerMonthItem,
  type LocalGoalPlannerTemplateItem,
} from '../../lib/ministry-api';
import {
  GOAL_PLANNER_ACTIVITY_OPTIONS,
  GOAL_PLANNER_WEEKDAYS,
  formatDecimalHours,
  formatPlannedDuration,
  getGoalPlannerActivityLabel,
  getGoalPlannerWeekdayLabel,
  sumPlannedHours,
} from '../../lib/goal-planner';
import { toast } from 'sonner';
import { Archive, CalendarDays, ChevronDown, ChevronLeft, ChevronRight, Clock3, MessageCircle, Pencil, Plus, RefreshCcw, Target } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Progress } from '../ui/progress';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { supabase } from '../../lib/supabase';
import { sendTextWhatsApp } from '../../lib/whatsapp';

const BIBLE_VERSES = [
  'O amor não busca seus próprios interesses. — 1 Coríntios 13:5',
  'Alegrai-vos sempre no Senhor. — Filipenses 4:4',
  'Procuremos promover o que contribui para a paz. — Romanos 14:19',
];

const DEFAULT_ACTIVITY_TYPE: GoalPlannerActivityType = 'dia_de_campo';

type PlannerEditorState =
  | {
    scope: 'template';
    weekday: number;
    item: LocalGoalPlannerTemplateItem | null;
  }
  | {
    scope: 'month';
    plannedDate: string;
    item: LocalGoalPlannerMonthItem | null;
  }
  | null;

const formatHours = formatDecimalHours;

function capitalizeText(value: string): string {
  if (!value) return value;
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function formatMonthDayLabel(date: string): string {
  const value = new Date(`${date}T12:00:00`).toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
  });
  return capitalizeText(value);
}

function buildMonthDates(year: number, month: number): string[] {
  const date = new Date(year, month - 1, 1);
  const dates: string[] = [];

  while (date.getMonth() === month - 1) {
    const yearPart = date.getFullYear();
    const monthPart = String(date.getMonth() + 1).padStart(2, '0');
    const dayPart = String(date.getDate()).padStart(2, '0');
    dates.push(`${yearPart}-${monthPart}-${dayPart}`);
    date.setDate(date.getDate() + 1);
  }

  return dates;
}

function formatDateKey(date: Date): string {
  const yearPart = date.getFullYear();
  const monthPart = String(date.getMonth() + 1).padStart(2, '0');
  const dayPart = String(date.getDate()).padStart(2, '0');
  return `${yearPart}-${monthPart}-${dayPart}`;
}

function buildMonthCalendarCells(dates: string[], items: LocalGoalPlannerMonthItem[]) {
  if (dates.length === 0) return [] as Array<{ date: string | null; items: LocalGoalPlannerMonthItem[] }>;

  const groupedItems = new Map<string, LocalGoalPlannerMonthItem[]>();
  for (const item of items) {
    const current = groupedItems.get(item.planned_date) ?? [];
    current.push(item);
    groupedItems.set(item.planned_date, current);
  }

  const firstDate = new Date(`${dates[0]}T12:00:00`);
  const nativeWeekday = firstDate.getDay();
  const leadingEmptyCells = nativeWeekday === 0 ? 6 : nativeWeekday - 1;

  const cells: Array<{ date: string | null; items: LocalGoalPlannerMonthItem[] }> = [];

  for (let index = 0; index < leadingEmptyCells; index += 1) {
    cells.push({ date: null, items: [] });
  }

  for (const date of dates) {
    const dayItems = (groupedItems.get(date) ?? []).sort(
      (left, right) => left.start_time.localeCompare(right.start_time) || left.position - right.position,
    );
    cells.push({ date, items: dayItems });
  }

  const trailingEmptyCells = (7 - (cells.length % 7)) % 7;
  for (let index = 0; index < trailingEmptyCells; index += 1) {
    cells.push({ date: null, items: [] });
  }

  return cells;
}

function createEditorDefaults() {
  return {
    start_time: '09:00',
    duration_minutes: 60,
    activity_type: DEFAULT_ACTIVITY_TYPE as GoalPlannerActivityType,
    note: '',
  };
}

export function GoalsPage() {
  const { user } = useAuth();
  const userId = user?.id ?? '';

  const [selectedMonthDate, setSelectedMonthDate] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const currentYear = selectedMonthDate.getFullYear();
  const currentMonth = selectedMonthDate.getMonth() + 1;

  const [goal, setGoal] = useState<number>(10);
  const [loading, setLoading] = useState(true);
  const [savingGoal, setSavingGoal] = useState(false);
  const [plannerSubmitting, setPlannerSubmitting] = useState(false);
  const [applyingTemplate, setApplyingTemplate] = useState(false);
  const [recordsThisMonth, setRecordsThisMonth] = useState<Array<{ hours: number; return_visits: number; bible_studies: number }>>([]);
  const [activeStudiesCount, setActiveStudiesCount] = useState(0);
  const [serviceOverseer, setServiceOverseer] = useState<{ name: string; phone: string } | null>(null);
  const [sendingReport, setSendingReport] = useState(false);
  const [templateItems, setTemplateItems] = useState<LocalGoalPlannerTemplateItem[]>([]);
  const [monthItems, setMonthItems] = useState<LocalGoalPlannerMonthItem[]>([]);
  const [lastGoalToast, setLastGoalToast] = useState<number | null>(null);
  const [editor, setEditor] = useState<PlannerEditorState>(null);
  const [editorForm, setEditorForm] = useState(createEditorDefaults);
  const [selectedMobileDate, setSelectedMobileDate] = useState('');
  const [isWeeklyTemplateExpanded, setIsWeeklyTemplateExpanded] = useState(false);
  const autoApplyAttemptedRef = useRef(false);

  const activeTemplateItems = templateItems.filter((item) => item.is_active);
  const activeMonthItems = monthItems.filter((item) => item.is_active);
  const hoursThisMonth = recordsThisMonth.reduce((sum, record) => sum + Number(record.hours), 0);
  const returnVisitsThisMonth = recordsThisMonth.reduce((sum, record) => sum + Number(record.return_visits || 0), 0);
  const bibleStudiesThisMonth = recordsThisMonth.reduce((sum, record) => sum + Number(record.bible_studies || 0), 0);
  const goalProgressPercent = goal > 0 ? Math.min(100, (hoursThisMonth / goal) * 100) : 0;
  const remainingHours = Math.max(goal - hoursThisMonth, 0);
  const plannedHours = sumPlannedHours(activeMonthItems);
  const coveragePercent = remainingHours === 0 ? 100 : Math.min(100, (plannedHours / remainingHours) * 100);
  const planningGap = remainingHours - plannedHours;
  const monthDates = buildMonthDates(currentYear, currentMonth);
  const monthCalendarCells = buildMonthCalendarCells(monthDates, activeMonthItems);
  const selectedMobileDateItems = activeMonthItems
    .filter((item) => item.planned_date === selectedMobileDate)
    .sort((left, right) => left.start_time.localeCompare(right.start_time) || left.position - right.position);

  const loadData = async () => {
    if (!userId) return;

    try {
      setLoading(true);
      const [goalData, records, plannerTemplateData, plannerMonthData, activeStudies] = await Promise.all([
        ministryApi.getMonthlyGoal(userId, currentYear, currentMonth),
        ministryApi.getFieldRecords(userId, currentMonth, currentYear),
        ministryApi.getGoalPlannerTemplate(userId),
        ministryApi.getGoalPlannerMonthItems(userId, currentYear, currentMonth),
        ministryApi.getReturnVisits(userId, 'estudo_iniciado'),
      ]);

      setGoal(goalData ? Number(goalData.hours_goal) : 10);
      setRecordsThisMonth(
        records.map((record) => ({
          hours: Number(record.hours || 0),
          return_visits: Number(record.return_visits || 0),
          bible_studies: Number(record.bible_studies || 0),
        })),
      );
      setActiveStudiesCount(activeStudies.length);
      setTemplateItems(plannerTemplateData);
      setMonthItems(plannerMonthData);
    } catch {
      toast.error('Erro ao carregar metas');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    autoApplyAttemptedRef.current = false;
    loadData();
  }, [userId, currentYear, currentMonth]);

  useEffect(() => {
    if (monthDates.length === 0) {
      setSelectedMobileDate('');
      return;
    }

    const today = formatDateKey(new Date());
    const defaultDate = monthDates.includes(today) ? today : monthDates[0];

    setSelectedMobileDate((current) => (
      current && monthDates.includes(current) ? current : defaultDate
    ));
  }, [currentYear, currentMonth]);

  useEffect(() => {
    if (goal <= 0) return;

    if (goalProgressPercent >= 100 && lastGoalToast !== 100) {
      toast.success('Parabéns! Meta de horas atingida!', { duration: 4000 });
      setLastGoalToast(100);
    } else if (goalProgressPercent >= 50 && goalProgressPercent < 100 && lastGoalToast !== 50) {
      toast.info('Você já atingiu 50% da meta. Continue assim!');
      setLastGoalToast(50);
    }

    if (goalProgressPercent < 50) {
      setLastGoalToast(null);
    }
  }, [goalProgressPercent, goal, lastGoalToast]);

  useEffect(() => {
    if (!userId || loading || autoApplyAttemptedRef.current) return;

    autoApplyAttemptedRef.current = true;

    if (activeTemplateItems.length === 0 || activeMonthItems.length > 0) {
      return;
    }

    const run = async () => {
      try {
        setApplyingTemplate(true);
        await ministryApi.applyWeeklyTemplateToMonth(userId, currentYear, currentMonth);
        toast.success('Semana base aplicada automaticamente neste mês');
        await loadData();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Erro ao aplicar a semana base');
      } finally {
        setApplyingTemplate(false);
      }
    };

    void run();
  }, [userId, loading, activeTemplateItems.length, activeMonthItems.length, currentMonth, currentYear]);

  useEffect(() => {
    if (!user?.member_id) {
      setServiceOverseer(null);
      return;
    }

    const loadServiceOverseer = async () => {
      try {
        let groupId = user.group_id || null;

        if (!groupId) {
          const { data: memberData, error: memberError } = await supabase
            .from('members')
            .select('group_id')
            .eq('id', user.member_id)
            .maybeSingle();

          if (memberError) throw memberError;
          groupId = memberData?.group_id || null;
        }

        if (!groupId) {
          setServiceOverseer(null);
          return;
        }

        const { data: groupData, error: groupError } = await supabase
          .from('field_service_groups')
          .select('overseer_id')
          .eq('id', groupId)
          .maybeSingle();

        if (groupError) throw groupError;
        if (!groupData?.overseer_id) {
          setServiceOverseer(null);
          return;
        }

        const { data: overseerData, error: overseerError } = await supabase
          .from('members')
          .select('full_name, phone')
          .eq('id', groupData.overseer_id)
          .maybeSingle();

        if (overseerError) throw overseerError;
        if (!overseerData?.phone) {
          setServiceOverseer(null);
          return;
        }

        setServiceOverseer({
          name: overseerData.full_name || 'Dirigente',
          phone: overseerData.phone,
        });
      } catch {
        setServiceOverseer(null);
      }
    };

    void loadServiceOverseer();
  }, [user?.member_id, user?.group_id]);

  const handleSaveGoal = async () => {
    if (!userId) return;

    try {
      setSavingGoal(true);
      await ministryApi.setMonthlyGoal(userId, currentYear, currentMonth, goal);
      toast.success('Meta salva');
      await loadData();
    } catch {
      toast.error('Erro ao salvar meta');
    } finally {
      setSavingGoal(false);
    }
  };

  const openTemplateEditor = (weekday: number, item?: LocalGoalPlannerTemplateItem) => {
    setEditor({
      scope: 'template',
      weekday,
      item: item ?? null,
    });
    setEditorForm({
      start_time: item?.start_time ?? '09:00',
      duration_minutes: item?.duration_minutes ?? 60,
      activity_type: item?.activity_type ?? DEFAULT_ACTIVITY_TYPE,
      note: item?.note ?? '',
    });
  };

  const openMonthEditor = (plannedDate: string, item?: LocalGoalPlannerMonthItem) => {
    setEditor({
      scope: 'month',
      plannedDate,
      item: item ?? null,
    });
    setEditorForm({
      start_time: item?.start_time ?? '09:00',
      duration_minutes: item?.duration_minutes ?? 60,
      activity_type: item?.activity_type ?? DEFAULT_ACTIVITY_TYPE,
      note: item?.note ?? '',
    });
  };

  const closeEditor = () => {
    setEditor(null);
    setEditorForm(createEditorDefaults());
  };

  const handleSavePlannerItem = async () => {
    if (!userId || !editor) return;

    try {
      setPlannerSubmitting(true);

      if (editor.scope === 'template') {
        if (editor.item) {
          const id = editor.item.supabase_id ?? editor.item.local_id;
          await ministryApi.updateGoalPlannerTemplateItem(id, userId, {
            weekday: editor.weekday,
            ...editorForm,
          });
          toast.success('Atividade da semana base atualizada');
        } else {
          await ministryApi.createGoalPlannerTemplateItem(userId, {
            weekday: editor.weekday,
            ...editorForm,
          });
          toast.success('Atividade adicionada à semana base');
        }
      } else {
        if (editor.item) {
          const id = editor.item.supabase_id ?? editor.item.local_id;
          await ministryApi.updateGoalPlannerMonthItem(id, userId, {
            planned_date: editor.plannedDate,
            ...editorForm,
          });
          toast.success('Atividade do mês atualizada');
        } else {
          await ministryApi.createGoalPlannerMonthItem(userId, {
            year: currentYear,
            month: currentMonth,
            planned_date: editor.plannedDate,
            ...editorForm,
            source_type: 'manual',
          });
          toast.success('Atividade adicionada ao mês');
        }
      }

      closeEditor();
      await loadData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao salvar atividade');
    } finally {
      setPlannerSubmitting(false);
    }
  };

  const handleArchiveTemplateItem = async (item: LocalGoalPlannerTemplateItem) => {
    if (!userId) return;
    if (!confirm(`Desativar esta atividade de ${getGoalPlannerWeekdayLabel(item.weekday)}?`)) return;

    try {
      const id = item.supabase_id ?? item.local_id;
      await ministryApi.archiveGoalPlannerTemplateItem(id, userId);
      toast.success('Atividade da semana base desativada');
      await loadData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao desativar atividade');
    }
  };

  const handleArchiveMonthItem = async (item: LocalGoalPlannerMonthItem) => {
    if (!userId) return;
    if (!confirm('Desativar esta atividade do plano mensal?')) return;

    try {
      const id = item.supabase_id ?? item.local_id;
      await ministryApi.archiveGoalPlannerMonthItem(id, userId);
      toast.success('Atividade do mês desativada');
      await loadData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao desativar atividade');
    }
  };

  const handleArchiveMonthItemFromDialog = async () => {
    if (!editor || editor.scope !== 'month' || !editor.item || !userId) return;
    if (!confirm('Desativar esta atividade do plano mensal?')) return;

    try {
      const id = editor.item.supabase_id ?? editor.item.local_id;
      await ministryApi.archiveGoalPlannerMonthItem(id, userId);
      toast.success('Atividade do mês desativada');
      closeEditor();
      await loadData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao desativar atividade');
    }
  };

  const handleApplyWeeklyTemplate = async () => {
    if (!userId) return;

    if (!confirm('Isso vai atualizar os itens automáticos deste mês e manter os manuais.')) {
      return;
    }

    try {
      setApplyingTemplate(true);
      await ministryApi.applyWeeklyTemplateToMonth(userId, currentYear, currentMonth);
      toast.success('Semana base aplicada ao mês');
      await loadData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao aplicar a semana base');
    } finally {
      setApplyingTemplate(false);
    }
  };

  const handlePreviousMonth = () => {
    setSelectedMonthDate((current) => new Date(current.getFullYear(), current.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setSelectedMonthDate((current) => new Date(current.getFullYear(), current.getMonth() + 1, 1));
  };

  const handleSendReport = async () => {
    if (!serviceOverseer?.phone) {
      toast.error('Não foi possível encontrar o WhatsApp do dirigente de serviço.');
      return;
    }

    const hoursLabel = formatDecimalHours(hoursThisMonth);

    const message = `Bom dia ${serviceOverseer.name}, tudo bem ?\n\nSegue abaixo meu relatório de serviço ministerial do mês de ${capitalizeText(monthName)}:\n\n${hoursLabel} Horas\n${returnVisitsThisMonth} Revisitas\n${bibleStudiesThisMonth} Estudos no mês\n${activeStudiesCount} Estudos em andamento`;

    try {
      setSendingReport(true);
      await sendTextWhatsApp({
        phone: serviceOverseer.phone,
        text: message,
      });
      toast.success('Relatório enviado com sucesso.');
    } catch (error) {
      const messageText = error instanceof Error ? error.message : 'Erro ao enviar relatório.';
      toast.error(messageText);
    } finally {
      setSendingReport(false);
    }
  };

  const monthName = new Date(currentYear, currentMonth - 1, 1).toLocaleDateString('pt-BR', { month: 'long' });

  let plannerMessage = 'Planejamento alinhado com o saldo restante.';
  if (remainingHours === 0) {
    plannerMessage = 'Você já cumpriu a meta do mês. O planejador agora é opcional.';
  } else if (planningGap > 0) {
    plannerMessage = `Faltam ${formatHours(planningGap)} para planejar.`;
  } else if (planningGap < 0) {
    plannerMessage = `Planejamento excede em ${formatHours(Math.abs(planningGap))}.`;
  }

  const verseOfTheDay = BIBLE_VERSES[Math.floor(Math.random() * BIBLE_VERSES.length)];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Metas Mensais</h2>
          <p className="text-sm text-muted-foreground">Acompanhe sua meta e organize um plano prático para cumpri-la</p>
        </div>
        <Button
          onClick={handleSendReport}
          disabled={loading || sendingReport}
          className="bg-[#1f7a45] text-white hover:bg-[#19673a]"
        >
          <MessageCircle size={14} className="mr-2" />
          {sendingReport ? 'Enviando...' : 'Enviar Relatório'}
        </Button>
      </div>

      <Card className="border border-border rounded-xl shadow-sm bg-card">
        <CardHeader className="gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
          <CardTitle className="text-base flex items-center gap-2">
            <Target size={18} />
            Meta de {monthName} {currentYear}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={handlePreviousMonth} disabled={loading} className="h-9 w-9">
              <ChevronLeft size={16} />
            </Button>
            <div className="min-w-[8.5rem] rounded-lg border border-border px-3 py-2 text-center text-sm font-medium text-foreground">
              {capitalizeText(monthName)} {currentYear}
            </div>
            <Button variant="outline" size="icon" onClick={handleNextMonth} disabled={loading} className="h-9 w-9">
              <ChevronRight size={16} />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-3 items-end">
            <div className="flex-1">
              <Label>Horas (meta)</Label>
              <Input
                type="number"
                step="0.5"
                min="0"
                value={goal}
                onChange={(event) => setGoal(parseFloat(event.target.value) || 0)}
                className="mt-1"
                disabled={loading}
              />
            </div>
            <Button onClick={handleSaveGoal} disabled={savingGoal || loading} className="bg-primary text-primary-foreground">
              {savingGoal ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>

          <div>
            <div className="flex justify-between text-sm text-muted-foreground mb-1">
              <span>{formatHours(hoursThisMonth)} de {formatHours(goal)}</span>
              <span>{goalProgressPercent.toFixed(0)}%</span>
            </div>
            <Progress value={goalProgressPercent} className="h-3" />
          </div>

          <p className="text-sm text-muted-foreground">
            {goalProgressPercent >= 100
              ? 'Meta concluída. Ótimo trabalho!'
              : goalProgressPercent >= 50
                ? 'Quase lá. Continue firme!'
                : 'Registre suas horas no Registro de Campo para acompanhar o progresso.'}
          </p>
        </CardContent>
      </Card>

      <Card className="border border-border rounded-xl shadow-sm bg-card">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Clock3 size={18} />
            Resumo do Planejamento
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            <div className="rounded-xl border border-border p-3">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Meta</p>
              <p className="text-lg font-semibold text-foreground">{formatHours(goal)}</p>
            </div>
            <div className="rounded-xl border border-border p-3">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Realizado</p>
              <p className="text-lg font-semibold text-foreground">{formatHours(hoursThisMonth)}</p>
            </div>
            <div className="rounded-xl border border-border p-3">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Saldo</p>
              <p className="text-lg font-semibold text-foreground">{formatHours(remainingHours)}</p>
            </div>
            <div className="rounded-xl border border-border p-3">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Planejado</p>
              <p className="text-lg font-semibold text-foreground">{formatHours(plannedHours)}</p>
            </div>
            <div className="rounded-xl border border-border p-3">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Cobertura</p>
              <p className="text-lg font-semibold text-foreground">{coveragePercent.toFixed(0)}%</p>
            </div>
          </div>

          <div>
            <div className="flex justify-between text-sm text-muted-foreground mb-1">
              <span>{formatHours(plannedHours)} planejadas para {formatHours(remainingHours)} restantes</span>
              <span>{coveragePercent.toFixed(0)}%</span>
            </div>
            <Progress value={coveragePercent} className="h-3" />
          </div>

          <p className="text-sm text-muted-foreground">{plannerMessage}</p>
        </CardContent>
      </Card>

      <Card className="border border-border rounded-xl shadow-sm bg-card">
        <CardHeader className={`gap-4 sm:grid-cols-[minmax(0,1fr)_auto] ${isWeeklyTemplateExpanded ? 'sm:items-start' : 'pb-6 sm:items-end'}`}>
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <RefreshCcw size={18} />
              Semana Base
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Monte uma semana-padrão e replique esse plano automaticamente no mês exibido.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 pt-2 sm:justify-self-end sm:pt-0">
            <Button
              variant="outline"
              onClick={() => setIsWeeklyTemplateExpanded((current) => !current)}
              className="gap-2"
            >
              {isWeeklyTemplateExpanded ? 'Recolher' : 'Expandir'}
              <ChevronDown size={16} className={`transition-transform ${isWeeklyTemplateExpanded ? 'rotate-180' : ''}`} />
            </Button>
            <Button
              onClick={handleApplyWeeklyTemplate}
              disabled={applyingTemplate || loading}
              className="bg-primary text-primary-foreground"
            >
              {applyingTemplate ? 'Aplicando...' : 'Aplicar semana ao mês'}
            </Button>
          </div>
        </CardHeader>
        {isWeeklyTemplateExpanded && (
          <CardContent className="space-y-4">
            {GOAL_PLANNER_WEEKDAYS.map((weekday) => {
              const items = activeTemplateItems
                .filter((item) => item.weekday === weekday.value)
                .sort((left, right) => left.start_time.localeCompare(right.start_time) || left.position - right.position);

              return (
                <div key={weekday.value} className="rounded-xl border border-border p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="font-medium text-foreground">{weekday.label}</p>
                      <p className="text-xs text-muted-foreground">
                        {items.length > 0 ? `${formatHours(sumPlannedHours(items))} planejadas` : 'Sem atividades planejadas'}
                      </p>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => openTemplateEditor(weekday.value)} disabled={loading}>
                      <Plus size={14} className="mr-1" />
                      Adicionar atividade
                    </Button>
                  </div>

                  {items.length === 0 ? (
                    <p className="text-sm text-muted-foreground mt-3">Nenhuma atividade configurada para este dia.</p>
                  ) : (
                    <div className="mt-3 space-y-2">
                      {items.map((item) => (
                        <div key={item.local_id} className="rounded-lg bg-muted/30 px-3 py-2">
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-foreground">
                                {item.start_time} • {formatPlannedDuration(item.duration_minutes)} • {getGoalPlannerActivityLabel(item.activity_type)}
                              </p>
                              {item.note && (
                                <p className="text-xs text-muted-foreground mt-0.5">{item.note}</p>
                              )}
                            </div>
                            <div className="flex gap-2 shrink-0">
                              <Button variant="ghost" size="sm" onClick={() => openTemplateEditor(weekday.value, item)}>
                                <Pencil size={14} className="mr-1" />
                                Editar
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => handleArchiveTemplateItem(item)} className="text-red-600 hover:text-red-700">
                                <Archive size={14} className="mr-1" />
                                Desativar
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </CardContent>
        )}
      </Card>

      <Card className="border border-border rounded-xl shadow-sm bg-card">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <CalendarDays size={18} />
            Plano do Mês
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Organize suas atividades dia a dia. Itens da semana base aparecem aqui e podem ser ajustados manualmente.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="lg:hidden space-y-4">
            <div>
              <div className="grid grid-cols-7 gap-1 mb-1">
                {GOAL_PLANNER_WEEKDAYS.map((weekday) => (
                  <div
                    key={weekday.value}
                    className="text-center text-[10px] font-medium uppercase tracking-wide text-muted-foreground"
                  >
                    {weekday.shortLabel}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-1">
                {monthCalendarCells.map((cell, index) => {
                  if (!cell.date) {
                    return (
                      <div
                        key={`mobile-empty-${index}`}
                        className="h-14 rounded-lg border border-dashed border-border/50 bg-muted/10"
                      />
                    );
                  }

                  const dayNumber = new Date(`${cell.date}T12:00:00`).getDate();
                  const isSelected = selectedMobileDate === cell.date;

                  return (
                    <button
                      key={`mobile-${cell.date}`}
                      type="button"
                      onClick={() => setSelectedMobileDate(cell.date)}
                      className={`h-14 rounded-lg border p-1 text-left transition-colors ${
                        isSelected
                          ? 'border-primary bg-primary/8'
                          : 'border-border bg-card hover:bg-muted/30'
                      }`}
                    >
                      <div className="flex h-full flex-col justify-between">
                        <span className={`text-xs font-semibold ${isSelected ? 'text-primary' : 'text-foreground'}`}>
                          {dayNumber}
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          {cell.items.length > 0 ? `${cell.items.length} ativ.` : 'Livre'}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {selectedMobileDate && (
              <div className="rounded-xl border border-border p-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-medium text-foreground">{formatMonthDayLabel(selectedMobileDate)}</p>
                    <p className="text-xs text-muted-foreground">
                      {selectedMobileDateItems.length > 0
                        ? `${formatHours(sumPlannedHours(selectedMobileDateItems))} planejadas`
                        : 'Sem atividades neste dia'}
                    </p>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => openMonthEditor(selectedMobileDate)} disabled={loading}>
                    Adicionar
                  </Button>
                </div>

                <div className="mt-3 space-y-2">
                  {selectedMobileDateItems.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Toque em adicionar para planejar uma atividade.</p>
                  ) : (
                    selectedMobileDateItems.map((item) => (
                      <button
                        key={`mobile-item-${item.local_id}`}
                        type="button"
                        onClick={() => openMonthEditor(selectedMobileDate, item)}
                        className="w-full rounded-lg border border-border/70 bg-muted/20 p-2 text-left transition-colors hover:bg-muted/35"
                      >
                        <div className="flex items-center gap-2">
                          <p className="text-xs font-medium text-foreground">
                            {item.start_time} • {getGoalPlannerActivityLabel(item.activity_type)}
                          </p>
                          {item.source_type === 'template' && (
                            <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[9px] font-medium text-primary">
                              Base
                            </span>
                          )}
                        </div>
                        <p className="mt-0.5 text-[11px] text-muted-foreground">
                          {formatPlannedDuration(item.duration_minutes)}
                        </p>
                        {item.note && (
                          <p className="mt-1 text-[11px] text-muted-foreground break-words">
                            {item.note}
                          </p>
                        )}
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="hidden lg:block">
            <div>
              <div className="grid grid-cols-7 gap-2 mb-2">
                {GOAL_PLANNER_WEEKDAYS.map((weekday) => (
                  <div
                    key={weekday.value}
                    className="rounded-xl border border-border bg-muted/20 px-2 py-2 text-center text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground"
                  >
                    {weekday.shortLabel}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-2">
                {monthCalendarCells.map((cell, index) => {
                  if (!cell.date) {
                    return (
                      <div
                        key={`empty-${index}`}
                        className="min-h-[11rem] rounded-xl border border-dashed border-border/70 bg-muted/10"
                      />
                    );
                  }

                  const dayNumber = new Date(`${cell.date}T12:00:00`).getDate();

                  return (
                    <div key={cell.date} className="flex min-h-[12.5rem] flex-col rounded-2xl border border-border bg-card p-2.5 shadow-sm">
                      <div className="flex items-center justify-between gap-1.5">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-muted text-xs font-semibold text-foreground">
                              {dayNumber}
                            </span>
                            <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                              {cell.items.length > 0 ? `${cell.items.length} ativ.` : 'Livre'}
                            </p>
                          </div>
                          <p className="mt-1 text-[11px] font-medium text-muted-foreground">
                            {cell.items.length > 0 ? formatHours(sumPlannedHours(cell.items)) : 'Livre'}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openMonthEditor(cell.date!)}
                          disabled={loading}
                          className="h-7 w-7 shrink-0 rounded-full"
                          title="Adicionar atividade"
                          aria-label="Adicionar atividade"
                        >
                          <Plus size={14} />
                        </Button>
                      </div>

                      <div className="mt-3 flex-1 space-y-1.5">
                        {cell.items.length === 0 ? (
                          <div className="rounded-xl border border-dashed border-border/70 bg-muted/10 px-2 py-3">
                            <p className="text-[11px] text-muted-foreground">Sem atividades planejadas</p>
                          </div>
                        ) : (
                          cell.items.map((item) => (
                            <button
                              key={item.local_id}
                              type="button"
                              onClick={() => openMonthEditor(cell.date!, item)}
                              className="w-full rounded-xl border border-border/70 bg-muted/20 px-2 py-2 text-left transition-colors hover:bg-muted/35"
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0 flex-1">
                                  <p className="text-[10px] font-semibold uppercase tracking-wide text-primary">
                                    {item.start_time}
                                  </p>
                                  <p className="mt-0.5 line-clamp-2 text-[11px] font-medium leading-tight text-foreground break-words">
                                    {getGoalPlannerActivityLabel(item.activity_type)}
                                  </p>
                                  <p className="mt-0.5 text-[10px] text-muted-foreground">
                                    {formatPlannedDuration(item.duration_minutes)}
                                  </p>
                                </div>
                                {item.source_type === 'template' && (
                                  <span className="shrink-0 rounded-full bg-primary/10 px-1.5 py-0.5 text-[9px] font-medium text-primary">
                                    Base
                                  </span>
                                )}
                              </div>
                              {item.note && (
                                <p className="mt-1 line-clamp-2 text-[10px] leading-tight text-muted-foreground break-words">
                                  {item.note}
                                </p>
                              )}
                            </button>
                          ))
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            Clique em uma atividade para visualizar ou editar. Use `Adicionar` em cada dia para incluir novos itens manuais.
          </p>
        </CardContent>
      </Card>

      <Card className="border border-border rounded-xl shadow-sm bg-card">
        <CardContent className="pt-4">
          <p className="text-sm text-muted-foreground italic">
            {verseOfTheDay}
          </p>
        </CardContent>
      </Card>

      <Dialog open={Boolean(editor)} onOpenChange={(open) => { if (!open) closeEditor(); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editor?.scope === 'template'
                ? (editor.item ? `Editar ${getGoalPlannerWeekdayLabel(editor.weekday)}` : `Nova atividade para ${getGoalPlannerWeekdayLabel(editor.weekday)}`)
                : editor
                  ? (editor.item ? `Editar atividade de ${formatMonthDayLabel(editor.plannedDate)}` : `Nova atividade em ${formatMonthDayLabel(editor.plannedDate)}`)
                  : 'Nova atividade'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Horário</Label>
                <Input
                  type="time"
                  value={editorForm.start_time}
                  onChange={(event) => setEditorForm((current) => ({ ...current, start_time: event.target.value }))}
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Duração (min)</Label>
                <Input
                  type="number"
                  min="15"
                  max="480"
                  step="15"
                  value={editorForm.duration_minutes}
                  onChange={(event) => setEditorForm((current) => ({ ...current, duration_minutes: parseInt(event.target.value, 10) || 0 }))}
                  className="mt-1"
                />
              </div>
            </div>

            <div>
              <Label>Tipo de atividade</Label>
              <Select
                value={editorForm.activity_type}
                onValueChange={(value) => setEditorForm((current) => ({ ...current, activity_type: value as GoalPlannerActivityType }))}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {GOAL_PLANNER_ACTIVITY_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Nota complementar</Label>
              <Input
                value={editorForm.note}
                onChange={(event) => setEditorForm((current) => ({ ...current, note: event.target.value }))}
                placeholder="Opcional"
                className="mt-1"
              />
            </div>
          </div>

          <DialogFooter>
            {editor?.scope === 'month' && editor.item && (
              <Button
                variant="outline"
                onClick={handleArchiveMonthItemFromDialog}
                className="mr-auto border-red-200 text-red-700 hover:bg-red-50 hover:text-red-800"
              >
                Desativar
              </Button>
            )}
            <Button variant="outline" onClick={closeEditor}>
              Cancelar
            </Button>
            <Button onClick={handleSavePlannerItem} disabled={plannerSubmitting} className="bg-primary text-primary-foreground">
              {plannerSubmitting ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
