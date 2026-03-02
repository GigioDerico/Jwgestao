import type { GoalPlannerActivityType } from './ministry-store';

type PlannerTimeLike = {
  start_time: string;
  duration_minutes: number;
  is_active?: boolean;
};

export const GOAL_PLANNER_ACTIVITY_OPTIONS: { value: GoalPlannerActivityType; label: string }[] = [
  { value: 'dia_de_campo', label: 'Dia de campo' },
  { value: 'revisita', label: 'Revisita' },
  { value: 'estudo', label: 'Estudo' },
  { value: 'testemunho_informal', label: 'Testemunho informal' },
  { value: 'cartas_mensagens', label: 'Cartas/Mensagens' },
];

export const GOAL_PLANNER_WEEKDAYS = [
  { value: 1, label: 'Segunda-feira', shortLabel: 'Seg' },
  { value: 2, label: 'Terça-feira', shortLabel: 'Ter' },
  { value: 3, label: 'Quarta-feira', shortLabel: 'Qua' },
  { value: 4, label: 'Quinta-feira', shortLabel: 'Qui' },
  { value: 5, label: 'Sexta-feira', shortLabel: 'Sex' },
  { value: 6, label: 'Sábado', shortLabel: 'Sáb' },
  { value: 7, label: 'Domingo', shortLabel: 'Dom' },
];

export function getGoalPlannerActivityLabel(activityType: GoalPlannerActivityType): string {
  return GOAL_PLANNER_ACTIVITY_OPTIONS.find((option) => option.value === activityType)?.label ?? activityType;
}

export function getGoalPlannerWeekdayLabel(weekday: number): string {
  return GOAL_PLANNER_WEEKDAYS.find((day) => day.value === weekday)?.label ?? `Dia ${weekday}`;
}

export function getGoalPlannerWeekdayFromDate(date: string): number {
  const nativeDay = new Date(`${date}T12:00:00`).getDay();
  return nativeDay === 0 ? 7 : nativeDay;
}

export function getDatesForMonth(year: number, month: number): string[] {
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

export function isValidPlannerTimeValue(value: string): boolean {
  if (!/^\d{2}:\d{2}$/.test(value)) return false;

  const [hoursText, minutesText] = value.split(':');
  const hours = Number(hoursText);
  const minutes = Number(minutesText);

  return Number.isInteger(hours) && Number.isInteger(minutes) && hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59;
}

export function timeToMinutes(value: string): number {
  if (!isValidPlannerTimeValue(value)) return NaN;
  const [hoursText, minutesText] = value.split(':');
  return Number(hoursText) * 60 + Number(minutesText);
}

export function formatPlannedDuration(durationMinutes: number): string {
  const hours = Math.floor(durationMinutes / 60);
  const minutes = durationMinutes % 60;

  if (hours === 0) return `${minutes}min`;
  if (minutes === 0) return `${hours}h`;
  return `${hours}h ${minutes}min`;
}

export function sumPlannedHours(items: Array<{ duration_minutes: number; is_active?: boolean }>): number {
  return items
    .filter((item) => item.is_active ?? true)
    .reduce((sum, item) => sum + item.duration_minutes / 60, 0);
}

export function comparePlannerItems<T extends { start_time: string; position?: number }>(left: T, right: T): number {
  const timeDiff = timeToMinutes(left.start_time) - timeToMinutes(right.start_time);
  if (timeDiff !== 0) return timeDiff;
  return (left.position ?? 0) - (right.position ?? 0);
}

export function validatePlannerItemInput(input: { start_time: string; duration_minutes: number }): string | null {
  if (!isValidPlannerTimeValue(input.start_time)) {
    return 'Informe um horário válido.';
  }

  if (!Number.isFinite(input.duration_minutes) || input.duration_minutes < 15 || input.duration_minutes > 480) {
    return 'A duração deve estar entre 15 e 480 minutos.';
  }

  if (input.duration_minutes % 15 !== 0) {
    return 'A duração deve ser em blocos de 15 minutos.';
  }

  const startMinutes = timeToMinutes(input.start_time);
  if (startMinutes + input.duration_minutes > 24 * 60) {
    return 'A atividade precisa terminar até 23:59.';
  }

  return null;
}

export function hasPlannerConflict<T extends PlannerTimeLike>(candidate: T, items: T[]): boolean {
  const candidateStart = timeToMinutes(candidate.start_time);
  const candidateEnd = candidateStart + candidate.duration_minutes;

  return items
    .filter((item) => item.is_active ?? true)
    .some((item) => {
      const start = timeToMinutes(item.start_time);
      const end = start + item.duration_minutes;
      return candidateStart < end && start < candidateEnd;
    });
}
