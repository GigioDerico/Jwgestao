import { supabase } from './supabase';
import {
  ministryStore,
  ministryDb,
  generateLocalId,
  nowISO,
  type LocalFieldRecord,
  type LocalMonthlyGoal,
  type LocalReturnVisit,
  type LocalTerritoryLog,
  type LocalSpiritualJournal,
} from './ministry-store';

export interface SyncResult {
  synced: number;
  errors: string[];
}

function isOnline(): boolean {
  return typeof navigator !== 'undefined' && navigator.onLine;
}

export async function syncIfOnline(userId: string): Promise<SyncResult> {
  if (!isOnline() || !userId) {
    return { synced: 0, errors: [] };
  }

  const errors: string[] = [];
  let synced = 0;

  try {
    const session = await supabase.auth.getSession();
    if (!session.data?.session) {
      return { synced: 0, errors: ['Usuário não autenticado'] };
    }

    const pendingRecords = await ministryStore.getPendingFieldRecords(userId);
    for (const r of pendingRecords) {
      try {
        const { data, error } = await supabase
          .from('personal_field_records')
          .insert({
            user_id: userId,
            date: r.date,
            hours: Number(r.hours),
            publications: r.publications,
            videos: r.videos,
            return_visits: r.return_visits,
            bible_studies: r.bible_studies,
            notes: r.notes || null,
          })
          .select('id')
          .single();

        if (error) throw error;
        if (data?.id) {
          await ministryStore.setFieldRecordSynced(r.local_id, data.id);
          synced += 1;
        }
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        errors.push(`Registro de campo: ${msg}`);
      }
    }

    const pendingGoals = await ministryStore.getPendingMonthlyGoals(userId);
    for (const g of pendingGoals) {
      try {
        const { data, error } = await supabase
          .from('personal_monthly_goals')
          .upsert(
            {
              user_id: userId,
              year: g.year,
              month: g.month,
              hours_goal: Number(g.hours_goal),
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'user_id,year,month' }
          )
          .select('id')
          .single();

        if (error) throw error;
        if (data?.id) {
          await ministryStore.setMonthlyGoalSynced(g.local_id, data.id);
          synced += 1;
        }
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        errors.push(`Meta mensal: ${msg}`);
      }
    }

    const pendingTemplateItems = await ministryStore.getPendingGoalPlannerTemplateItems(userId);
    for (const item of pendingTemplateItems) {
      try {
        const payload = {
          ...(item.supabase_id ? { id: item.supabase_id } : {}),
          user_id: userId,
          client_id: item.local_id,
          weekday: item.weekday,
          start_time: item.start_time,
          duration_minutes: item.duration_minutes,
          activity_type: item.activity_type,
          note: item.note || null,
          position: item.position,
          is_active: item.is_active,
          updated_at: new Date().toISOString(),
        };
        const { data, error } = await supabase
          .from('personal_goal_planner_template')
          .upsert(payload, { onConflict: 'client_id' })
          .select('id')
          .single();

        if (error) throw error;
        if (data?.id) {
          await ministryStore.setGoalPlannerTemplateItemSynced(item.local_id, data.id);
          synced += 1;
        }
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        errors.push(`Semana base: ${msg}`);
      }
    }

    const pendingMonthItems = await ministryStore.getPendingGoalPlannerMonthItems(userId);
    for (const item of pendingMonthItems) {
      try {
        const payload = {
          ...(item.supabase_id ? { id: item.supabase_id } : {}),
          user_id: userId,
          client_id: item.local_id,
          year: item.year,
          month: item.month,
          planned_date: item.planned_date,
          start_time: item.start_time,
          duration_minutes: item.duration_minutes,
          activity_type: item.activity_type,
          note: item.note || null,
          source_type: item.source_type,
          template_origin_client_id: item.template_origin_local_id || null,
          position: item.position,
          is_active: item.is_active,
          updated_at: new Date().toISOString(),
        };
        const { data, error } = await supabase
          .from('personal_goal_planner_month_items')
          .upsert(payload, { onConflict: 'client_id' })
          .select('id')
          .single();

        if (error) throw error;
        if (data?.id) {
          await ministryStore.setGoalPlannerMonthItemSynced(item.local_id, data.id);
          synced += 1;
        }
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        errors.push(`Plano do mês: ${msg}`);
      }
    }

    const pendingVisits = await ministryStore.getPendingReturnVisits(userId);
    for (const v of pendingVisits) {
      try {
        const payload = {
          ...(v.supabase_id ? { id: v.supabase_id } : {}),
          user_id: userId,
          name_or_initials: v.name_or_initials || null,
          phone: v.phone || null,
          address: v.address || null,
          topic: v.topic || null,
          bible_text: v.bible_text || null,
          next_step: v.next_step || null,
          return_date: v.return_date || null,
          status: v.status,
          is_active: v.is_active ?? true,
          deactivation_reason: v.deactivation_reason || null,
          deactivated_at: v.deactivated_at || null,
          updated_at: new Date().toISOString(),
        };
        const { data, error } = await supabase
          .from('personal_return_visits')
          .upsert(payload, { onConflict: 'id' })
          .select('id')
          .single();

        if (error) throw error;
        if (data?.id) {
          await ministryStore.setReturnVisitSynced(v.local_id, data.id);
          synced += 1;
        }
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        errors.push(`Revisita: ${msg}`);
      }
    }

    const pendingTerritories = await ministryStore.getPendingTerritoryLogs(userId);
    for (const t of pendingTerritories) {
      try {
        const { data, error } = await supabase
          .from('personal_territory_logs')
          .insert({
            user_id: userId,
            name: t.name || null,
            street_area: t.street_area || null,
            lat: t.lat ?? null,
            lng: t.lng ?? null,
            approximate_address: t.approximate_address || null,
            territory_type: t.territory_type,
            date_worked: t.date_worked,
            time_spent_minutes: t.time_spent_minutes ?? 0,
            notes: t.notes || null,
          })
          .select('id')
          .single();

        if (error) throw error;
        if (data?.id) {
          await ministryStore.setTerritoryLogSynced(t.local_id, data.id);
          synced += 1;
        }
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        errors.push(`Território: ${msg}`);
      }
    }

    const pendingJournal = await ministryStore.getPendingJournalEntries(userId);
    for (const j of pendingJournal) {
      try {
        const { data, error } = await supabase
          .from('personal_spiritual_journal')
          .insert({
            user_id: userId,
            entry_type: j.entry_type,
            content: j.content,
          })
          .select('id')
          .single();

        if (error) throw error;
        if (data?.id) {
          await ministryStore.setJournalEntrySynced(j.local_id, data.id);
          synced += 1;
        }
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        errors.push(`Diário: ${msg}`);
      }
    }
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    errors.push(msg);
  }

  return { synced, errors };
}

/**
 * Puxa dados do Supabase para o store local (IndexedDB).
 * Registros que já existem localmente (identificados via supabase_id) são ignorados.
 * Isso garante que dados criados em outros dispositivos apareçam aqui.
 */
export async function pullFromSupabase(userId: string): Promise<{ pulled: number; errors: string[] }> {
  if (!isOnline() || !userId) {
    return { pulled: 0, errors: [] };
  }

  const errors: string[] = [];
  let pulled = 0;

  try {
    const session = await supabase.auth.getSession();
    if (!session.data?.session) {
      return { pulled: 0, errors: ['Usuário não autenticado'] };
    }

    // Helper: retorna set de supabase_ids já no store local
    const getExistingSupabaseIds = async (
      table: 'field_records' | 'monthly_goals' | 'return_visits' | 'territory_logs' | 'spiritual_journal' | 'goal_planner_template' | 'goal_planner_month_items',
    ): Promise<Set<string>> => {
      const records = await (ministryStore as any)[`get${capitalize(table)}`]?.(userId);
      // Fallback: ler direto do Dexie
      const all = records ?? await (ministryDb as any)[table]?.where('user_id').equals(userId).toArray() ?? [];
      return new Set(all.filter((r: any) => r.supabase_id).map((r: any) => r.supabase_id));
    };

    // 1. Field Records
    try {
      const { data, error } = await supabase
        .from('personal_field_records')
        .select('*')
        .eq('user_id', userId)
        .order('date', { ascending: false });

      if (error) throw error;
      if (data?.length) {
        const existing = await getExistingSupabaseIdsFromDexie('field_records', userId);
        for (const row of data) {
          if (existing.has(row.id)) continue;
          await ministryDb.field_records.add({
            local_id: generateLocalId(),
            supabase_id: row.id,
            user_id: userId,
            date: row.date,
            hours: row.hours ?? 0,
            publications: row.publications ?? 0,
            videos: row.videos ?? 0,
            return_visits: row.return_visits ?? 0,
            bible_studies: row.bible_studies ?? 0,
            notes: row.notes ?? undefined,
            sync_status: 'synced',
            created_at: row.created_at ?? nowISO(),
            updated_at: row.updated_at ?? nowISO(),
          });
          pulled += 1;
        }
      }
    } catch (e: unknown) {
      errors.push(`Pull field_records: ${e instanceof Error ? e.message : String(e)}`);
    }

    // 2. Monthly Goals
    try {
      const { data, error } = await supabase
        .from('personal_monthly_goals')
        .select('*')
        .eq('user_id', userId);

      if (error) throw error;
      if (data?.length) {
        const existing = await getExistingSupabaseIdsFromDexie('monthly_goals', userId);
        for (const row of data) {
          if (existing.has(row.id)) continue;
          await ministryDb.monthly_goals.add({
            local_id: generateLocalId(),
            supabase_id: row.id,
            user_id: userId,
            year: row.year,
            month: row.month,
            hours_goal: row.hours_goal ?? 0,
            sync_status: 'synced',
            created_at: row.created_at ?? nowISO(),
            updated_at: row.updated_at ?? nowISO(),
          });
          pulled += 1;
        }
      }
    } catch (e: unknown) {
      errors.push(`Pull monthly_goals: ${e instanceof Error ? e.message : String(e)}`);
    }

    // 3. Return Visits
    try {
      const { data, error } = await supabase
        .from('personal_return_visits')
        .select('*')
        .eq('user_id', userId);

      if (error) throw error;
      if (data?.length) {
        const existing = await getExistingSupabaseIdsFromDexie('return_visits', userId);
        for (const row of data) {
          if (existing.has(row.id)) continue;
          await ministryDb.return_visits.add({
            local_id: generateLocalId(),
            supabase_id: row.id,
            user_id: userId,
            name_or_initials: row.name_or_initials ?? undefined,
            phone: row.phone ?? undefined,
            address: row.address ?? undefined,
            topic: row.topic ?? undefined,
            bible_text: row.bible_text ?? undefined,
            next_step: row.next_step ?? undefined,
            return_date: row.return_date ?? undefined,
            status: row.status ?? 'ativa',
            is_active: row.is_active ?? true,
            deactivation_reason: row.deactivation_reason ?? undefined,
            deactivated_at: row.deactivated_at ?? undefined,
            sync_status: 'synced',
            created_at: row.created_at ?? nowISO(),
            updated_at: row.updated_at ?? nowISO(),
          });
          pulled += 1;
        }
      }
    } catch (e: unknown) {
      errors.push(`Pull return_visits: ${e instanceof Error ? e.message : String(e)}`);
    }

    // 4. Territory Logs
    try {
      const { data, error } = await supabase
        .from('personal_territory_logs')
        .select('*')
        .eq('user_id', userId);

      if (error) throw error;
      if (data?.length) {
        const existing = await getExistingSupabaseIdsFromDexie('territory_logs', userId);
        for (const row of data) {
          if (existing.has(row.id)) continue;
          await ministryDb.territory_logs.add({
            local_id: generateLocalId(),
            supabase_id: row.id,
            user_id: userId,
            name: row.name ?? undefined,
            street_area: row.street_area ?? undefined,
            lat: row.lat ?? undefined,
            lng: row.lng ?? undefined,
            approximate_address: row.approximate_address ?? undefined,
            territory_type: row.territory_type,
            date_worked: row.date_worked,
            time_spent_minutes: row.time_spent_minutes ?? 0,
            notes: row.notes ?? undefined,
            sync_status: 'synced',
            created_at: row.created_at ?? nowISO(),
            updated_at: row.updated_at ?? nowISO(),
          });
          pulled += 1;
        }
      }
    } catch (e: unknown) {
      errors.push(`Pull territory_logs: ${e instanceof Error ? e.message : String(e)}`);
    }

    // 5. Spiritual Journal
    try {
      const { data, error } = await supabase
        .from('personal_spiritual_journal')
        .select('*')
        .eq('user_id', userId);

      if (error) throw error;
      if (data?.length) {
        const existing = await getExistingSupabaseIdsFromDexie('spiritual_journal', userId);
        for (const row of data) {
          if (existing.has(row.id)) continue;
          await ministryDb.spiritual_journal.add({
            local_id: generateLocalId(),
            supabase_id: row.id,
            user_id: userId,
            entry_type: row.entry_type,
            content: row.content,
            sync_status: 'synced',
            created_at: row.created_at ?? nowISO(),
            updated_at: row.updated_at ?? nowISO(),
          });
          pulled += 1;
        }
      }
    } catch (e: unknown) {
      errors.push(`Pull spiritual_journal: ${e instanceof Error ? e.message : String(e)}`);
    }

    // 6. Goal Planner Template
    try {
      const { data, error } = await supabase
        .from('personal_goal_planner_template')
        .select('*')
        .eq('user_id', userId);

      if (error) throw error;
      if (data?.length) {
        const existing = await getExistingSupabaseIdsFromDexie('goal_planner_template', userId);
        for (const row of data) {
          if (existing.has(row.id)) continue;
          await ministryDb.goal_planner_template.add({
            local_id: row.client_id ?? generateLocalId(),
            supabase_id: row.id,
            user_id: userId,
            weekday: row.weekday,
            start_time: row.start_time,
            duration_minutes: row.duration_minutes,
            activity_type: row.activity_type,
            note: row.note ?? undefined,
            position: row.position ?? 0,
            is_active: row.is_active ?? true,
            sync_status: 'synced',
            created_at: row.created_at ?? nowISO(),
            updated_at: row.updated_at ?? nowISO(),
          });
          pulled += 1;
        }
      }
    } catch (e: unknown) {
      errors.push(`Pull goal_planner_template: ${e instanceof Error ? e.message : String(e)}`);
    }

    // 7. Goal Planner Month Items
    try {
      const { data, error } = await supabase
        .from('personal_goal_planner_month_items')
        .select('*')
        .eq('user_id', userId);

      if (error) throw error;
      if (data?.length) {
        const existing = await getExistingSupabaseIdsFromDexie('goal_planner_month_items', userId);
        for (const row of data) {
          if (existing.has(row.id)) continue;
          await ministryDb.goal_planner_month_items.add({
            local_id: row.client_id ?? generateLocalId(),
            supabase_id: row.id,
            user_id: userId,
            year: row.year,
            month: row.month,
            planned_date: row.planned_date,
            start_time: row.start_time,
            duration_minutes: row.duration_minutes,
            activity_type: row.activity_type,
            note: row.note ?? undefined,
            source_type: row.source_type ?? 'manual',
            template_origin_local_id: row.template_origin_client_id ?? undefined,
            position: row.position ?? 0,
            is_active: row.is_active ?? true,
            sync_status: 'synced',
            created_at: row.created_at ?? nowISO(),
            updated_at: row.updated_at ?? nowISO(),
          });
          pulled += 1;
        }
      }
    } catch (e: unknown) {
      errors.push(`Pull goal_planner_month_items: ${e instanceof Error ? e.message : String(e)}`);
    }
  } catch (e: unknown) {
    errors.push(e instanceof Error ? e.message : String(e));
  }

  return { pulled, errors };
}

/** Helper: lê os supabase_ids já presentes no Dexie para uma tabela */
async function getExistingSupabaseIdsFromDexie(
  table: string,
  userId: string,
): Promise<Set<string>> {
  try {
    const all = await (ministryDb as any)[table]
      .where('user_id')
      .equals(userId)
      .toArray();
    return new Set(
      all
        .filter((r: any) => r.supabase_id)
        .map((r: any) => r.supabase_id)
    );
  } catch {
    return new Set();
  }
}

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export function subscribeToOnline(callback: () => void): () => void {
  if (typeof window === 'undefined') return () => { };

  const handler = () => {
    if (navigator.onLine) callback();
  };

  window.addEventListener('online', handler);
  return () => window.removeEventListener('online', handler);
}
