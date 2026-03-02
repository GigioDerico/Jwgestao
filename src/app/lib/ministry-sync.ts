import { supabase } from './supabase';
import {
  ministryStore,
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

export function subscribeToOnline(callback: () => void): () => void {
  if (typeof window === 'undefined') return () => {};

  const handler = () => {
    if (navigator.onLine) callback();
  };

  window.addEventListener('online', handler);
  return () => window.removeEventListener('online', handler);
}
