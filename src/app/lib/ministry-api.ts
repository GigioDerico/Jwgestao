import { ministryStore, type LocalFieldRecord, type LocalMonthlyGoal, type LocalReturnVisit, type LocalTerritoryLog, type LocalSpiritualJournal, type ReturnVisitStatus, type TerritoryType } from './ministry-store';
import { syncIfOnline as doSync, subscribeToOnline, type SyncResult } from './ministry-sync';

export type { LocalFieldRecord, LocalMonthlyGoal, LocalReturnVisit, LocalTerritoryLog, LocalSpiritualJournal, ReturnVisitStatus, TerritoryType };

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

export interface CreateReturnVisitInput {
  name_or_initials?: string;
  phone?: string;
  address?: string;
  topic?: string;
  bible_text?: string;
  next_step?: string;
  return_date?: string;
  status?: ReturnVisitStatus;
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

  async clearAllData(userId: string): Promise<void> {
    await ministryStore.clearAllForUser(userId);
  },
};
