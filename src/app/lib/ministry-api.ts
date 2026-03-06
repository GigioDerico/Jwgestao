import {
  ministryStore,
  type GoalPlannerActivityType,
  type GoalPlannerSourceType,
  type LocalFieldRecord,
  type LocalGoalPlannerMonthItem,
  type LocalGoalPlannerTemplateItem,
  type LocalMonthlyGoal,
  type LocalReturnVisit,
  type LocalTerritoryLog,
  type LocalSpiritualJournal,
  type ReturnVisitStatus,
  type TerritoryType,
} from './ministry-store';
import {
  comparePlannerItems,
  getDatesForMonth,
  getGoalPlannerWeekdayFromDate,
  hasPlannerConflict,
  validatePlannerItemInput,
} from './goal-planner';
import { syncIfOnline as doSync, pullFromSupabase, subscribeToOnline, type SyncResult } from './ministry-sync';

export type {
  GoalPlannerActivityType,
  GoalPlannerSourceType,
  LocalFieldRecord,
  LocalGoalPlannerMonthItem,
  LocalGoalPlannerTemplateItem,
  LocalMonthlyGoal,
  LocalReturnVisit,
  LocalTerritoryLog,
  LocalSpiritualJournal,
  ReturnVisitStatus,
  TerritoryType,
};

export interface CreateFieldRecordInput {
  date: string;
  hours: number;
  publications?: number;
  videos?: number;
  return_visits?: number;
  bible_studies?: number;
  notes?: string;
}

export interface CreateMonthlyGoalInput {
  year: number;
  month: number;
  hours_goal: number;
}

export interface CreateGoalPlannerTemplateItemInput {
  weekday: number;
  start_time: string;
  duration_minutes: number;
  activity_type: GoalPlannerActivityType;
  note?: string;
  position?: number;
  is_active?: boolean;
}

export interface CreateGoalPlannerMonthItemInput {
  year: number;
  month: number;
  planned_date: string;
  start_time: string;
  duration_minutes: number;
  activity_type: GoalPlannerActivityType;
  note?: string;
  source_type?: GoalPlannerSourceType;
  template_origin_local_id?: string;
  position?: number;
  is_active?: boolean;
}

export interface CreateReturnVisitInput {
  name_or_initials?: string;
  phone?: string;
  address?: string;
  topic?: string;
  bible_text?: string;
  next_step?: string;
  return_date?: string;
  status?: ReturnVisitStatus;
  is_active?: boolean;
  deactivation_reason?: string;
  deactivated_at?: string;
}

export interface CreateTerritoryLogInput {
  name?: string;
  street_area?: string;
  lat?: number;
  lng?: number;
  approximate_address?: string;
  territory_type: TerritoryType;
  date_worked: string;
  time_spent_minutes?: number;
  notes?: string;
}

export interface CreateJournalEntryInput {
  entry_type: string;
  content: string;
}

function getNextPlannerPosition(items: Array<{ position: number }>): number {
  if (items.length === 0) return 0;
  return Math.max(...items.map((item) => item.position)) + 1;
}

async function assertValidTemplateItem(
  userId: string,
  input: Pick<CreateGoalPlannerTemplateItemInput, 'weekday' | 'start_time' | 'duration_minutes'>,
  existingLocalId?: string,
): Promise<void> {
  if (input.weekday < 1 || input.weekday > 7) {
    throw new Error('Informe um dia da semana válido.');
  }

  const validationError = validatePlannerItemInput(input);
  if (validationError) throw new Error(validationError);

  const items = await ministryStore.getGoalPlannerTemplate(userId);
  const sameDayItems = items.filter((item) => item.is_active && item.weekday === input.weekday && item.local_id !== existingLocalId);
  if (hasPlannerConflict({ ...input, is_active: true }, sameDayItems)) {
    throw new Error('Este horário conflita com outra atividade planejada.');
  }
}

async function assertValidMonthItem(
  userId: string,
  input: Pick<CreateGoalPlannerMonthItemInput, 'year' | 'month' | 'planned_date' | 'start_time' | 'duration_minutes'>,
  existingLocalId?: string,
): Promise<void> {
  const validationError = validatePlannerItemInput(input);
  if (validationError) throw new Error(validationError);

  const items = await ministryStore.getGoalPlannerMonthItems(userId, input.year, input.month);
  const sameDateItems = items.filter((item) => item.is_active && item.planned_date === input.planned_date && item.local_id !== existingLocalId);
  if (hasPlannerConflict({ ...input, is_active: true }, sameDateItems)) {
    throw new Error('Este horário conflita com outra atividade planejada.');
  }
}

function templateItemWasEdited(record: LocalGoalPlannerMonthItem, input: Partial<CreateGoalPlannerMonthItemInput>): boolean {
  if (record.source_type !== 'template') return false;

  return (
    (input.planned_date !== undefined && input.planned_date !== record.planned_date) ||
    (input.start_time !== undefined && input.start_time !== record.start_time) ||
    (input.duration_minutes !== undefined && input.duration_minutes !== record.duration_minutes) ||
    (input.activity_type !== undefined && input.activity_type !== record.activity_type) ||
    (input.note !== undefined && input.note !== (record.note ?? undefined))
  );
}

export const ministryApi = {
  async getFieldRecords(userId: string, month?: number, year?: number): Promise<LocalFieldRecord[]> {
    return ministryStore.getFieldRecords(userId, month, year);
  },

  async createFieldRecord(userId: string, input: CreateFieldRecordInput): Promise<LocalFieldRecord> {
    const record = await ministryStore.addFieldRecord(userId, {
      date: input.date,
      hours: input.hours,
      publications: input.publications ?? 0,
      videos: input.videos ?? 0,
      return_visits: input.return_visits ?? 0,
      bible_studies: input.bible_studies ?? 0,
      notes: input.notes,
    });
    await doSync(userId);
    return record;
  },

  async updateFieldRecord(id: string, userId: string, input: Partial<CreateFieldRecordInput>): Promise<void> {
    const rec = await ministryStore.getFieldRecordById(id, userId);
    if (!rec) throw new Error('Registro não encontrado');
    await ministryStore.updateFieldRecord(rec.local_id, userId, {
      date: input.date ?? rec.date,
      hours: input.hours ?? rec.hours,
      publications: input.publications ?? rec.publications,
      videos: input.videos ?? rec.videos,
      return_visits: input.return_visits ?? rec.return_visits,
      bible_studies: input.bible_studies ?? rec.bible_studies,
      notes: input.notes !== undefined ? input.notes : rec.notes,
    });
    await doSync(userId);
  },

  async deleteFieldRecord(id: string, userId: string): Promise<void> {
    await ministryStore.deleteFieldRecord(id, userId);
    await doSync(userId);
  },

  async getMonthlyGoal(userId: string, year: number, month: number): Promise<LocalMonthlyGoal | undefined> {
    return ministryStore.getMonthlyGoal(userId, year, month);
  },

  async setMonthlyGoal(userId: string, year: number, month: number, hours_goal: number): Promise<LocalMonthlyGoal> {
    const goal = await ministryStore.upsertMonthlyGoal(userId, year, month, hours_goal);
    await doSync(userId);
    return goal;
  },

  async getMonthlyGoals(userId: string, year?: number): Promise<LocalMonthlyGoal[]> {
    return ministryStore.getMonthlyGoals(userId, year);
  },

  async getGoalPlannerTemplate(userId: string): Promise<LocalGoalPlannerTemplateItem[]> {
    return ministryStore.getGoalPlannerTemplate(userId);
  },

  async createGoalPlannerTemplateItem(userId: string, input: CreateGoalPlannerTemplateItemInput): Promise<LocalGoalPlannerTemplateItem> {
    await assertValidTemplateItem(userId, input);

    const existing = await ministryStore.getGoalPlannerTemplate(userId);
    const sameWeekdayItems = existing.filter((item) => item.weekday === input.weekday);
    const item = await ministryStore.addGoalPlannerTemplateItem(userId, {
      weekday: input.weekday,
      start_time: input.start_time,
      duration_minutes: input.duration_minutes,
      activity_type: input.activity_type,
      note: input.note,
      position: input.position ?? getNextPlannerPosition(sameWeekdayItems),
      is_active: input.is_active ?? true,
    });
    await doSync(userId);
    return item;
  },

  async updateGoalPlannerTemplateItem(id: string, userId: string, input: Partial<CreateGoalPlannerTemplateItemInput>): Promise<void> {
    const record = await ministryStore.getGoalPlannerTemplateItemById(id, userId);
    if (!record) throw new Error('Atividade da semana base não encontrada');

    const merged = {
      weekday: input.weekday ?? record.weekday,
      start_time: input.start_time ?? record.start_time,
      duration_minutes: input.duration_minutes ?? record.duration_minutes,
      activity_type: input.activity_type ?? record.activity_type,
      note: input.note !== undefined ? input.note : record.note,
      position: input.position ?? record.position,
      is_active: input.is_active ?? record.is_active,
    };

    await assertValidTemplateItem(userId, merged, record.local_id);
    await ministryStore.updateGoalPlannerTemplateItem(record.local_id, userId, merged);
    await doSync(userId);
  },

  async archiveGoalPlannerTemplateItem(id: string, userId: string): Promise<void> {
    const record = await ministryStore.getGoalPlannerTemplateItemById(id, userId);
    if (!record) throw new Error('Atividade da semana base não encontrada');
    await ministryStore.updateGoalPlannerTemplateItem(record.local_id, userId, { is_active: false });
    await doSync(userId);
  },

  async getGoalPlannerMonthItems(userId: string, year: number, month: number): Promise<LocalGoalPlannerMonthItem[]> {
    return ministryStore.getGoalPlannerMonthItems(userId, year, month);
  },

  async createGoalPlannerMonthItem(userId: string, input: CreateGoalPlannerMonthItemInput): Promise<LocalGoalPlannerMonthItem> {
    await assertValidMonthItem(userId, input);

    const existing = await ministryStore.getGoalPlannerMonthItems(userId, input.year, input.month);
    const sameDateItems = existing.filter((item) => item.planned_date === input.planned_date);
    const item = await ministryStore.addGoalPlannerMonthItem(userId, {
      year: input.year,
      month: input.month,
      planned_date: input.planned_date,
      start_time: input.start_time,
      duration_minutes: input.duration_minutes,
      activity_type: input.activity_type,
      note: input.note,
      source_type: input.source_type ?? 'manual',
      template_origin_local_id: input.template_origin_local_id,
      position: input.position ?? getNextPlannerPosition(sameDateItems),
      is_active: input.is_active ?? true,
    });
    await doSync(userId);
    return item;
  },

  async updateGoalPlannerMonthItem(id: string, userId: string, input: Partial<CreateGoalPlannerMonthItemInput>): Promise<void> {
    const record = await ministryStore.getGoalPlannerMonthItemById(id, userId);
    if (!record) throw new Error('Atividade do mês não encontrada');

    const merged = {
      year: input.year ?? record.year,
      month: input.month ?? record.month,
      planned_date: input.planned_date ?? record.planned_date,
      start_time: input.start_time ?? record.start_time,
      duration_minutes: input.duration_minutes ?? record.duration_minutes,
      activity_type: input.activity_type ?? record.activity_type,
      note: input.note !== undefined ? input.note : record.note,
      source_type: input.source_type
        ?? (templateItemWasEdited(record, input) ? 'manual' : record.source_type),
      template_origin_local_id: input.template_origin_local_id !== undefined
        ? input.template_origin_local_id
        : record.template_origin_local_id,
      position: input.position ?? record.position,
      is_active: input.is_active ?? record.is_active,
    } satisfies Omit<LocalGoalPlannerMonthItem, 'id' | 'local_id' | 'supabase_id' | 'user_id' | 'sync_status' | 'created_at' | 'updated_at'>;

    await assertValidMonthItem(userId, merged, record.local_id);
    await ministryStore.updateGoalPlannerMonthItem(record.local_id, userId, merged);
    await doSync(userId);
  },

  async archiveGoalPlannerMonthItem(id: string, userId: string): Promise<void> {
    const record = await ministryStore.getGoalPlannerMonthItemById(id, userId);
    if (!record) throw new Error('Atividade do mês não encontrada');
    await ministryStore.updateGoalPlannerMonthItem(record.local_id, userId, { is_active: false });
    await doSync(userId);
  },

  async applyWeeklyTemplateToMonth(userId: string, year: number, month: number): Promise<void> {
    const templateItems = (await ministryStore.getGoalPlannerTemplate(userId))
      .filter((item) => item.is_active)
      .sort(comparePlannerItems);
    const monthItems = await ministryStore.getGoalPlannerMonthItems(userId, year, month);
    const activeManualItems = monthItems.filter((item) => item.is_active && item.source_type === 'manual');
    const monthTemplateByKey = new Map<string, LocalGoalPlannerMonthItem>();

    for (const item of monthItems.filter((entry) => entry.source_type === 'template')) {
      const key = `${item.planned_date}|${item.template_origin_local_id ?? ''}`;
      const existing = monthTemplateByKey.get(key);
      if (!existing || (!existing.is_active && item.is_active)) {
        monthTemplateByKey.set(key, item);
      }
    }

    const keptTemplateLocalIds = new Set<string>();

    for (const date of getDatesForMonth(year, month)) {
      const weekday = getGoalPlannerWeekdayFromDate(date);
      const itemsForWeekday = templateItems.filter((item) => item.weekday === weekday);

      for (const template of itemsForWeekday) {
        const key = `${date}|${template.local_id}`;
        const manualItemsForDay = activeManualItems.filter((item) => item.planned_date === date);
        const takenOverByManual = manualItemsForDay.some((item) => item.template_origin_local_id === template.local_id);
        const overlapsManual = hasPlannerConflict(template, manualItemsForDay);

        if (takenOverByManual || overlapsManual) {
          continue;
        }

        const payload = {
          year,
          month,
          planned_date: date,
          start_time: template.start_time,
          duration_minutes: template.duration_minutes,
          activity_type: template.activity_type,
          note: template.note,
          source_type: 'template' as const,
          template_origin_local_id: template.local_id,
          position: template.position,
          is_active: true,
        };
        const existing = monthTemplateByKey.get(key);

        if (existing) {
          await ministryStore.updateGoalPlannerMonthItem(existing.local_id, userId, payload);
          keptTemplateLocalIds.add(existing.local_id);
        } else {
          const created = await ministryStore.addGoalPlannerMonthItem(userId, payload);
          keptTemplateLocalIds.add(created.local_id);
        }
      }
    }

    for (const item of monthItems.filter((entry) => entry.is_active && entry.source_type === 'template')) {
      if (!keptTemplateLocalIds.has(item.local_id)) {
        await ministryStore.updateGoalPlannerMonthItem(item.local_id, userId, { is_active: false });
      }
    }

    await doSync(userId);
  },

  async getReturnVisits(userId: string, status?: ReturnVisitStatus): Promise<LocalReturnVisit[]> {
    return ministryStore.getReturnVisits(userId, status);
  },

  async createReturnVisit(userId: string, input: CreateReturnVisitInput): Promise<LocalReturnVisit> {
    const visit = await ministryStore.addReturnVisit(userId, {
      name_or_initials: input.name_or_initials,
      phone: input.phone,
      address: input.address,
      topic: input.topic,
      bible_text: input.bible_text,
      next_step: input.next_step,
      return_date: input.return_date,
      status: input.status ?? 'ativa',
      is_active: input.is_active ?? true,
      deactivation_reason: input.deactivation_reason,
      deactivated_at: input.deactivated_at,
    });
    await doSync(userId);
    return visit;
  },

  async updateReturnVisit(id: string, userId: string, input: Partial<CreateReturnVisitInput>): Promise<void> {
    const rec = await ministryStore.getReturnVisitById(id, userId);
    if (!rec) throw new Error('Revisita não encontrada');
    await ministryStore.updateReturnVisit(rec.local_id, userId, input);
    await doSync(userId);
  },

  async deleteReturnVisit(id: string, userId: string): Promise<void> {
    await ministryStore.deleteReturnVisit(id, userId);
    await doSync(userId);
  },

  async getTerritoryLogs(userId: string, dateFrom?: string, dateTo?: string): Promise<LocalTerritoryLog[]> {
    return ministryStore.getTerritoryLogs(userId, dateFrom, dateTo);
  },

  async createTerritoryLog(userId: string, input: CreateTerritoryLogInput): Promise<LocalTerritoryLog> {
    const log = await ministryStore.addTerritoryLog(userId, {
      name: input.name,
      street_area: input.street_area,
      lat: input.lat,
      lng: input.lng,
      approximate_address: input.approximate_address,
      territory_type: input.territory_type,
      date_worked: input.date_worked,
      time_spent_minutes: input.time_spent_minutes ?? 0,
      notes: input.notes,
    });
    await doSync(userId);
    return log;
  },

  async updateTerritoryLog(id: string, userId: string, input: Partial<CreateTerritoryLogInput>): Promise<void> {
    const rec = await ministryStore.getTerritoryLogById(id, userId);
    if (!rec) throw new Error('Território não encontrado');
    await ministryStore.updateTerritoryLog(rec.local_id, userId, input);
    await doSync(userId);
  },

  async deleteTerritoryLog(id: string, userId: string): Promise<void> {
    await ministryStore.deleteTerritoryLog(id, userId);
    await doSync(userId);
  },

  async getJournalEntries(userId: string): Promise<LocalSpiritualJournal[]> {
    return ministryStore.getJournalEntries(userId);
  },

  async createJournalEntry(userId: string, input: CreateJournalEntryInput): Promise<LocalSpiritualJournal> {
    const entry = await ministryStore.addJournalEntry(userId, {
      entry_type: input.entry_type,
      content: input.content,
    });
    await doSync(userId);
    return entry;
  },

  async updateJournalEntry(id: string, userId: string, input: Partial<CreateJournalEntryInput>): Promise<void> {
    const rec = await ministryStore.getJournalEntryById(id, userId);
    if (!rec) throw new Error('Entrada não encontrada');
    await ministryStore.updateJournalEntry(rec.local_id, userId, input);
    await doSync(userId);
  },

  async deleteJournalEntry(id: string, userId: string): Promise<void> {
    await ministryStore.deleteJournalEntry(id, userId);
    await doSync(userId);
  },

  async syncIfOnline(userId: string): Promise<SyncResult> {
    return doSync(userId);
  },

  subscribeToOnline(callback: () => void): () => void {
    return subscribeToOnline(callback);
  },

  async pullFromCloud(userId: string): Promise<{ pulled: number; errors: string[] }> {
    return pullFromSupabase(userId);
  },

  async clearAllData(userId: string): Promise<void> {
    await ministryStore.clearAllForUser(userId);
  },
};
