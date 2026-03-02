import Dexie, { type EntityTable } from 'dexie';

export type SyncStatus = 'pending' | 'synced' | 'conflict';

export interface LocalFieldRecord {
  id?: number;
  local_id: string;
  supabase_id?: string;
  user_id: string;
  date: string;
  hours: number;
  publications: number;
  videos: number;
  return_visits: number;
  bible_studies: number;
  notes?: string;
  sync_status: SyncStatus;
  created_at: string;
  updated_at: string;
}

export interface LocalMonthlyGoal {
  id?: number;
  local_id: string;
  supabase_id?: string;
  user_id: string;
  year: number;
  month: number;
  hours_goal: number;
  sync_status: SyncStatus;
  created_at: string;
  updated_at: string;
}

export type ReturnVisitStatus = 'ativa' | 'estudo_iniciado' | 'encerrada';

export interface LocalReturnVisit {
  id?: number;
  local_id: string;
  supabase_id?: string;
  user_id: string;
  name_or_initials?: string;
  phone?: string;
  address?: string;
  topic?: string;
  bible_text?: string;
  next_step?: string;
  return_date?: string;
  status: ReturnVisitStatus;
  sync_status: SyncStatus;
  created_at: string;
  updated_at: string;
}

export type TerritoryType = 'residencial' | 'comercial' | 'rural' | 'publico';

export interface LocalTerritoryLog {
  id?: number;
  local_id: string;
  supabase_id?: string;
  user_id: string;
  name?: string;
  street_area?: string;
  lat?: number;
  lng?: number;
  approximate_address?: string;
  territory_type: TerritoryType;
  date_worked: string;
  time_spent_minutes: number;
  notes?: string;
  sync_status: SyncStatus;
  created_at: string;
  updated_at: string;
}

export interface LocalSpiritualJournal {
  id?: number;
  local_id: string;
  supabase_id?: string;
  user_id: string;
  entry_type: string;
  content: string;
  sync_status: SyncStatus;
  created_at: string;
  updated_at: string;
}

class MinistryDatabase extends Dexie {
  field_records!: EntityTable<LocalFieldRecord, 'id'>;
  monthly_goals!: EntityTable<LocalMonthlyGoal, 'id'>;
  return_visits!: EntityTable<LocalReturnVisit, 'id'>;
  territory_logs!: EntityTable<LocalTerritoryLog, 'id'>;
  spiritual_journal!: EntityTable<LocalSpiritualJournal, 'id'>;

  constructor() {
    super('JWGestaoMinistry');
    this.version(1).stores({
      field_records: '++id, local_id, supabase_id, user_id, date, sync_status',
      monthly_goals: '++id, local_id, supabase_id, [user_id+year+month], sync_status',
      return_visits: '++id, local_id, supabase_id, user_id, status, sync_status',
      territory_logs: '++id, local_id, supabase_id, user_id, date_worked, sync_status',
      spiritual_journal: '++id, local_id, supabase_id, user_id, created_at, sync_status',
    });
  }
}

export const ministryDb = new MinistryDatabase();

function generateLocalId(): string {
  return crypto.randomUUID();
}

function nowISO(): string {
  return new Date().toISOString();
}

export const ministryStore = {
  async addFieldRecord(userId: string, record: Omit<LocalFieldRecord, 'local_id' | 'user_id' | 'sync_status' | 'created_at' | 'updated_at'>): Promise<LocalFieldRecord> {
    const local: LocalFieldRecord = {
      ...record,
      local_id: generateLocalId(),
      user_id: userId,
      sync_status: 'pending',
      created_at: nowISO(),
      updated_at: nowISO(),
    };
    await ministryDb.field_records.add(local);
    return local;
  },

  async updateFieldRecord(localId: string, userId: string, updates: Partial<Omit<LocalFieldRecord, 'local_id' | 'user_id' | 'created_at'>>): Promise<void> {
    await ministryDb.field_records.where({ local_id: localId, user_id: userId }).modify({
      ...updates,
      updated_at: nowISO(),
      sync_status: 'pending',
    });
  },

  async getFieldRecords(userId: string, month?: number, year?: number): Promise<LocalFieldRecord[]> {
    let q = ministryDb.field_records.where('user_id').equals(userId);
    const all = await q.sortBy('date');
    if (month !== undefined && year !== undefined) {
      const prefix = `${year}-${String(month).padStart(2, '0')}`;
      return all.filter((r) => r.date.startsWith(prefix));
    }
    return all.sort((a, b) => b.date.localeCompare(a.date));
  },

  async getFieldRecordById(id: string, userId: string): Promise<LocalFieldRecord | undefined> {
    const byLocal = await ministryDb.field_records.where({ local_id: id, user_id: userId }).first();
    if (byLocal) return byLocal;
    return ministryDb.field_records.where({ supabase_id: id, user_id: userId }).first();
  },

  async deleteFieldRecord(id: string, userId: string): Promise<void> {
    const rec = await this.getFieldRecordById(id, userId);
    if (rec?.id) await ministryDb.field_records.delete(rec.id);
  },

  async getPendingFieldRecords(userId: string): Promise<LocalFieldRecord[]> {
    return ministryDb.field_records.where({ user_id: userId, sync_status: 'pending' }).toArray();
  },

  async setFieldRecordSynced(localId: string, supabaseId: string): Promise<void> {
    await ministryDb.field_records.where('local_id').equals(localId).modify({
      supabase_id: supabaseId,
      sync_status: 'synced',
      updated_at: nowISO(),
    });
  },

  // Monthly goals
  async addMonthlyGoal(userId: string, goal: Omit<LocalMonthlyGoal, 'local_id' | 'user_id' | 'sync_status' | 'created_at' | 'updated_at'>): Promise<LocalMonthlyGoal> {
    const local: LocalMonthlyGoal = {
      ...goal,
      local_id: generateLocalId(),
      user_id: userId,
      sync_status: 'pending',
      created_at: nowISO(),
      updated_at: nowISO(),
    };
    await ministryDb.monthly_goals.add(local);
    return local;
  },

  async upsertMonthlyGoal(userId: string, year: number, month: number, hours_goal: number): Promise<LocalMonthlyGoal> {
    const existing = await ministryDb.monthly_goals.where({ user_id: userId, year, month }).first();
    const now = nowISO();
    if (existing) {
      await ministryDb.monthly_goals.update(existing.id!, {
        hours_goal,
        sync_status: 'pending',
        updated_at: now,
      });
      return { ...existing, hours_goal, sync_status: 'pending' as SyncStatus, updated_at: now };
    }
    const local: LocalMonthlyGoal = {
      local_id: generateLocalId(),
      user_id: userId,
      year,
      month,
      hours_goal,
      sync_status: 'pending',
      created_at: now,
      updated_at: now,
    };
    await ministryDb.monthly_goals.add(local);
    return local;
  },

  async getMonthlyGoal(userId: string, year: number, month: number): Promise<LocalMonthlyGoal | undefined> {
    return ministryDb.monthly_goals.where({ user_id: userId, year, month }).first();
  },

  async getMonthlyGoals(userId: string, year?: number): Promise<LocalMonthlyGoal[]> {
    let q = ministryDb.monthly_goals.where('user_id').equals(userId);
    const all = await q.toArray();
    if (year !== undefined) return all.filter((g) => g.year === year);
    return all;
  },

  async getPendingMonthlyGoals(userId: string): Promise<LocalMonthlyGoal[]> {
    return ministryDb.monthly_goals.where({ user_id: userId, sync_status: 'pending' }).toArray();
  },

  async setMonthlyGoalSynced(localId: string, supabaseId: string): Promise<void> {
    await ministryDb.monthly_goals.where('local_id').equals(localId).modify({
      supabase_id: supabaseId,
      sync_status: 'synced',
      updated_at: nowISO(),
    });
  },

  // Return visits
  async addReturnVisit(userId: string, visit: Omit<LocalReturnVisit, 'local_id' | 'user_id' | 'sync_status' | 'created_at' | 'updated_at'>): Promise<LocalReturnVisit> {
    const local: LocalReturnVisit = {
      ...visit,
      local_id: generateLocalId(),
      user_id: userId,
      sync_status: 'pending',
      created_at: nowISO(),
      updated_at: nowISO(),
    };
    await ministryDb.return_visits.add(local);
    return local;
  },

  async updateReturnVisit(localId: string, userId: string, updates: Partial<Omit<LocalReturnVisit, 'local_id' | 'user_id' | 'created_at'>>): Promise<void> {
    await ministryDb.return_visits.where({ local_id: localId, user_id: userId }).modify({
      ...updates,
      updated_at: nowISO(),
      sync_status: 'pending',
    });
  },

  async getReturnVisits(userId: string, status?: ReturnVisitStatus): Promise<LocalReturnVisit[]> {
    let q = ministryDb.return_visits.where('user_id').equals(userId);
    const all = await q.toArray();
    if (status) return all.filter((v) => v.status === status);
    return all;
  },

  async getReturnVisitById(id: string, userId: string): Promise<LocalReturnVisit | undefined> {
    const byLocal = await ministryDb.return_visits.where({ local_id: id, user_id: userId }).first();
    if (byLocal) return byLocal;
    return ministryDb.return_visits.where({ supabase_id: id, user_id: userId }).first();
  },

  async deleteReturnVisit(id: string, userId: string): Promise<void> {
    const rec = await this.getReturnVisitById(id, userId);
    if (rec?.id) await ministryDb.return_visits.delete(rec.id);
  },

  async getPendingReturnVisits(userId: string): Promise<LocalReturnVisit[]> {
    return ministryDb.return_visits.where({ user_id: userId, sync_status: 'pending' }).toArray();
  },

  async setReturnVisitSynced(localId: string, supabaseId: string): Promise<void> {
    await ministryDb.return_visits.where('local_id').equals(localId).modify({
      supabase_id: supabaseId,
      sync_status: 'synced',
      updated_at: nowISO(),
    });
  },

  // Territory logs
  async addTerritoryLog(userId: string, log: Omit<LocalTerritoryLog, 'local_id' | 'user_id' | 'sync_status' | 'created_at' | 'updated_at'>): Promise<LocalTerritoryLog> {
    const local: LocalTerritoryLog = {
      ...log,
      local_id: generateLocalId(),
      user_id: userId,
      sync_status: 'pending',
      created_at: nowISO(),
      updated_at: nowISO(),
    };
    await ministryDb.territory_logs.add(local);
    return local;
  },

  async updateTerritoryLog(localId: string, userId: string, updates: Partial<Omit<LocalTerritoryLog, 'local_id' | 'user_id' | 'created_at'>>): Promise<void> {
    await ministryDb.territory_logs.where({ local_id: localId, user_id: userId }).modify({
      ...updates,
      updated_at: nowISO(),
      sync_status: 'pending',
    });
  },

  async getTerritoryLogs(userId: string, dateFrom?: string, dateTo?: string): Promise<LocalTerritoryLog[]> {
    const all = await ministryDb.territory_logs.where('user_id').equals(userId).reverse().sortBy('date_worked');
    if (!dateFrom && !dateTo) return all;
    return all.filter((l) => {
      if (dateFrom && l.date_worked < dateFrom) return false;
      if (dateTo && l.date_worked > dateTo) return false;
      return true;
    });
  },

  async getTerritoryLogById(id: string, userId: string): Promise<LocalTerritoryLog | undefined> {
    const byLocal = await ministryDb.territory_logs.where({ local_id: id, user_id: userId }).first();
    if (byLocal) return byLocal;
    return ministryDb.territory_logs.where({ supabase_id: id, user_id: userId }).first();
  },

  async deleteTerritoryLog(id: string, userId: string): Promise<void> {
    const rec = await this.getTerritoryLogById(id, userId);
    if (rec?.id) await ministryDb.territory_logs.delete(rec.id);
  },

  async getPendingTerritoryLogs(userId: string): Promise<LocalTerritoryLog[]> {
    return ministryDb.territory_logs.where({ user_id: userId, sync_status: 'pending' }).toArray();
  },

  async setTerritoryLogSynced(localId: string, supabaseId: string): Promise<void> {
    await ministryDb.territory_logs.where('local_id').equals(localId).modify({
      supabase_id: supabaseId,
      sync_status: 'synced',
      updated_at: nowISO(),
    });
  },

  // Spiritual journal
  async addJournalEntry(userId: string, entry: Omit<LocalSpiritualJournal, 'local_id' | 'user_id' | 'sync_status' | 'created_at' | 'updated_at'>): Promise<LocalSpiritualJournal> {
    const local: LocalSpiritualJournal = {
      ...entry,
      local_id: generateLocalId(),
      user_id: userId,
      sync_status: 'pending',
      created_at: nowISO(),
      updated_at: nowISO(),
    };
    await ministryDb.spiritual_journal.add(local);
    return local;
  },

  async updateJournalEntry(localId: string, userId: string, updates: Partial<Omit<LocalSpiritualJournal, 'local_id' | 'user_id' | 'created_at'>>): Promise<void> {
    await ministryDb.spiritual_journal.where({ local_id: localId, user_id: userId }).modify({
      ...updates,
      updated_at: nowISO(),
      sync_status: 'pending',
    });
  },

  async getJournalEntries(userId: string): Promise<LocalSpiritualJournal[]> {
    return ministryDb.spiritual_journal.where('user_id').equals(userId).reverse().sortBy('created_at');
  },

  async getJournalEntryById(id: string, userId: string): Promise<LocalSpiritualJournal | undefined> {
    const byLocal = await ministryDb.spiritual_journal.where({ local_id: id, user_id: userId }).first();
    if (byLocal) return byLocal;
    return ministryDb.spiritual_journal.where({ supabase_id: id, user_id: userId }).first();
  },

  async deleteJournalEntry(id: string, userId: string): Promise<void> {
    const rec = await this.getJournalEntryById(id, userId);
    if (rec?.id) await ministryDb.spiritual_journal.delete(rec.id);
  },

  async getPendingJournalEntries(userId: string): Promise<LocalSpiritualJournal[]> {
    return ministryDb.spiritual_journal.where({ user_id: userId, sync_status: 'pending' }).toArray();
  },

  async setJournalEntrySynced(localId: string, supabaseId: string): Promise<void> {
    await ministryDb.spiritual_journal.where('local_id').equals(localId).modify({
      supabase_id: supabaseId,
      sync_status: 'synced',
      updated_at: nowISO(),
    });
  },

  async clearAllForUser(userId: string): Promise<void> {
    await ministryDb.field_records.where('user_id').equals(userId).delete();
    await ministryDb.monthly_goals.where('user_id').equals(userId).delete();
    await ministryDb.return_visits.where('user_id').equals(userId).delete();
    await ministryDb.territory_logs.where('user_id').equals(userId).delete();
    await ministryDb.spiritual_journal.where('user_id').equals(userId).delete();
  },
};
