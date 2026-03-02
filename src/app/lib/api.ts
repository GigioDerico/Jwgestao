import { createClient } from '@supabase/supabase-js';
import { supabase } from './supabase';
import { Database } from './supabase-types';
import { getMeetingDatesForMonth } from './audio-video-calendar';
import { getSaturdaysForMonth } from './field-service-calendar';
import { buildPublicAppUrl } from './public-url';
import type { AssignmentNotification } from '../types';

const PHONE_EMAIL_DOMAIN = 'jwgestao.app';

function buildPasswordSetupLink(email: string, password: string) {
  const params = new URLSearchParams({
    e: email,
    p: password,
  });

  return `${buildPublicAppUrl('/auth/setup-password')}?${params.toString()}`;
}

function normalizeOptionalText(value?: string) {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

function normalizeOptionalState(value?: string) {
  const normalized = value?.trim().slice(0, 2).toUpperCase();
  return normalized ? normalized : null;
}

function normalizeOptionalZipCode(value?: string) {
  const normalized = value?.replace(/\D/g, '');
  return normalized ? normalized : null;
}

export interface CreateMemberInput {
  full_name: string;
  phone?: string;
  email?: string;
  address_street?: string;
  address_number?: string;
  address_neighborhood?: string;
  address_city?: string;
  address_state?: string;
  address_zip_code?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  spiritual_status?: string;
  gender: Database['public']['Enums']['gender_enum'];
  group_id?: string;
  is_family_head?: boolean;
  family_head_id?: string;
  approved_audio_video?: boolean;
  approved_indicadores?: boolean;
  approved_carrinho?: boolean;
  approved_pioneiro_auxiliar?: boolean;
  approved_pioneiro_regular?: boolean;
  system_role?: Database['public']['Enums']['system_role_enum'];
}

export interface CreateMidweekMeetingInput {
  date: string;
  bible_reading: string;
  president_id?: string;
  opening_prayer_id?: string;
  closing_prayer_id?: string;
  opening_song?: number | null;
  opening_song_time?: string | null;
  opening_comments_time?: string | null;
  opening_comments_duration?: number | null;
  middle_song?: number | null;
  middle_song_time?: string | null;
  closing_song?: number | null;
  closing_song_time?: string | null;
  treasure_talk_title?: string;
  treasure_talk_time?: string | null;
  treasure_talk_duration?: number | null;
  treasure_talk_speaker_id?: string;
  treasure_gems_time?: string | null;
  treasure_gems_duration?: number | null;
  treasure_gems_speaker_id?: string;
  treasure_reading_time?: string | null;
  treasure_reading_duration?: number | null;
  treasure_reading_student_id?: string;
  treasure_reading_room?: string;
  cbs_time?: string | null;
  cbs_duration?: number | null;
  cbs_conductor_id?: string;
  cbs_reader_id?: string;
  closing_comments_time?: string | null;
  closing_comments_duration?: number | null;
  ministry_parts?: {
    title: string;
    duration: number;
    scheduled_time?: string | null;
    student_id?: string;
    assistant_id?: string;
    room?: string;
  }[];
  christian_life_parts?: {
    title: string;
    duration: number;
    scheduled_time?: string | null;
    speaker_id?: string;
  }[];
}

export interface CreateWeekendMeetingInput {
  date: string;
  president_id?: string;
  closing_prayer_id?: string;
  talk_theme?: string;
  talk_speaker_name: string;
  talk_congregation?: string;
  watchtower_conductor_id?: string;
  watchtower_reader_id?: string;
}

export interface CreateAudioVideoAssignmentInput {
  date: string;
  weekday: string;
  sound: string;
  sound_member_id?: string | null;
  image: string;
  image_member_id?: string | null;
  stage: string;
  stage_member_id?: string | null;
  roving_mic_1: string;
  roving_mic_1_member_id?: string | null;
  roving_mic_2: string;
  roving_mic_2_member_id?: string | null;
  attendants: string[];
  attendants_member_ids?: string[];
}

export interface CreateFieldServiceAssignmentInput {
  month: number;
  year: number;
  weekday: string;
  time: string;
  responsible: string;
  responsible_member_id?: string | null;
  location: string;
  category: string;
}

export interface FieldServiceGroupOption {
  id: string;
  name: string;
}

export interface CreateCartAssignmentInput {
  month: number;
  year: number;
  day: number;
  weekday: string;
  time: string;
  location: string;
  publisher1: string;
  publisher1_member_id?: string | null;
  publisher2: string;
  publisher2_member_id?: string | null;
  week: number;
}

function formatMonthBounds(monthIndex: number, year: number) {
  const month = monthIndex + 1;
  const start = `${year}-${String(month).padStart(2, '0')}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const end = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
  return { start, end };
}

function mapAudioVideoAssignment(row: any) {
  return {
    id: row.id,
    date: row.date,
    weekday: row.weekday,
    sound: row.sound,
    soundMemberId: row.sound_member_id || null,
    image: row.image,
    imageMemberId: row.image_member_id || null,
    stage: row.stage,
    stageMemberId: row.stage_member_id || null,
    rovingMic1: row.roving_mic_1,
    rovingMic1MemberId: row.roving_mic_1_member_id || null,
    rovingMic2: row.roving_mic_2,
    rovingMic2MemberId: row.roving_mic_2_member_id || null,
    attendants: Array.isArray(row.attendants) ? row.attendants : [],
    attendantsMemberIds: Array.isArray(row.attendants_member_ids) ? row.attendants_member_ids : [],
  };
}

function mapFieldServiceAssignment(row: any) {
  return {
    id: row.id,
    weekday: row.weekday,
    time: row.time,
    responsible: row.responsible,
    responsibleMemberId: row.responsible_member_id || null,
    location: row.location,
    category: row.category,
  };
}

function mapCartAssignment(row: any) {
  return {
    id: row.id,
    day: row.day,
    weekday: row.weekday,
    time: row.time,
    location: row.location,
    publisher1: row.publisher1,
    publisher1MemberId: row.publisher1_member_id || null,
    publisher2: row.publisher2,
    publisher2MemberId: row.publisher2_member_id || null,
    week: row.week,
  };
}

function mapAssignmentNotification(row: any): AssignmentNotification {
  return {
    id: row.id,
    memberId: row.member_id,
    category: row.category,
    sourceType: row.source_type,
    sourceId: row.source_id,
    slotKey: row.slot_key,
    title: row.title,
    message: row.message,
    assignmentDate: row.assignment_date,
    status: row.status,
    isRead: Boolean(row.is_read),
    createdAt: row.created_at,
    confirmedAt: row.confirmed_at,
  };
}

function formatDatabaseWriteError(context: string, error: any) {
  const isPermissionError =
    error?.code === '42501' ||
    error?.status === 403 ||
    /row-level security|permission denied|forbidden/i.test(error?.message || '');

  if (isPermissionError) {
    return `${context}: o banco remoto ainda não tem permissão de escrita para esta tabela. Aplique a migration mais recente do Supabase.`;
  }

  return `${context}: ${error.message}`;
}

function formatShortDate(date: string | null | undefined) {
  if (!date) return '';
  const dateObj = new Date(`${date}T12:00:00`);
  return dateObj.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
  });
}

function preserveNotificationState(existing: any, payload: {
  title: string;
  message: string;
  assignment_date: string | null;
}) {
  const metadataChanged =
    existing?.title !== payload.title ||
    existing?.message !== payload.message ||
    existing?.assignment_date !== payload.assignment_date ||
    existing?.status === 'revoked';

  if (metadataChanged) {
    return {
      status: 'pending_confirmation',
      is_read: false,
      read_at: null,
      confirmed_at: null,
      revoked_at: null,
    };
  }

  return {
    status: existing.status || 'pending_confirmation',
    is_read: Boolean(existing.is_read),
    read_at: existing.read_at || null,
    confirmed_at: existing.confirmed_at || null,
    revoked_at: null,
  };
}

// Isolated client for signUp — must include noOpLock to avoid NavigatorLockAcquireTimeoutError
function createIsolatedAuthClient() {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      storageKey: 'sb-isolated-signup',
      storage: {
        getItem: () => null,
        setItem: () => { },
        removeItem: () => { },
      },
      lock: async <R>(_name: string, _acquireTimeout: number, fn: () => Promise<R>): Promise<R> => {
        return await fn();
      },
    },
  });
}

async function revokeNotificationsForSourceIds(sourceType: string, sourceIds: string[]) {
  if (sourceIds.length === 0) {
    return;
  }

  const { error } = await supabase
    .from('member_assignment_notifications')
    .update({
      status: 'revoked',
      revoked_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('source_type', sourceType)
    .in('source_id', sourceIds)
    .neq('status', 'revoked');

  if (error) {
    throw new Error(formatDatabaseWriteError('Erro ao revogar notificações antigas', error));
  }
}

async function upsertAssignmentNotificationSlot(input: {
  memberId?: string | null;
  sourceType: string;
  sourceId: string;
  slotKey: string;
  category: AssignmentNotification['category'];
  assignmentDate?: string | null;
  title: string;
  message: string;
}) {
  const timestamp = new Date().toISOString();

  if (!input.memberId) {
    const { error } = await supabase
      .from('member_assignment_notifications')
      .update({
        status: 'revoked',
        revoked_at: timestamp,
        updated_at: timestamp,
      })
      .eq('source_type', input.sourceType)
      .eq('source_id', input.sourceId)
      .eq('slot_key', input.slotKey)
      .neq('status', 'revoked');

    if (error) {
      throw new Error(formatDatabaseWriteError('Erro ao revogar notificação sem membro', error));
    }
    return;
  }

  const { error: revokeOtherError } = await supabase
    .from('member_assignment_notifications')
    .update({
      status: 'revoked',
      revoked_at: timestamp,
      updated_at: timestamp,
    })
    .eq('source_type', input.sourceType)
    .eq('source_id', input.sourceId)
    .eq('slot_key', input.slotKey)
    .neq('member_id', input.memberId)
    .neq('status', 'revoked');

  if (revokeOtherError) {
    throw new Error(formatDatabaseWriteError('Erro ao revogar notificações antigas da mesma vaga', revokeOtherError));
  }

  const { data: existing, error: existingError } = await supabase
    .from('member_assignment_notifications')
    .select('id, title, message, assignment_date, status, is_read, read_at, confirmed_at')
    .eq('member_id', input.memberId)
    .eq('source_type', input.sourceType)
    .eq('source_id', input.sourceId)
    .eq('slot_key', input.slotKey)
    .maybeSingle();

  if (existingError) {
    throw new Error(formatDatabaseWriteError('Erro ao buscar notificação existente', existingError));
  }

  const persistedState = preserveNotificationState(existing, {
    title: input.title,
    message: input.message,
    assignment_date: input.assignmentDate || null,
  });

  const { error: upsertError } = await supabase
    .from('member_assignment_notifications')
    .upsert(
      {
        member_id: input.memberId,
        source_type: input.sourceType,
        source_id: input.sourceId,
        slot_key: input.slotKey,
        category: input.category,
        assignment_date: input.assignmentDate || null,
        title: input.title,
        message: input.message,
        status: persistedState.status,
        is_read: persistedState.is_read,
        read_at: persistedState.read_at,
        confirmed_at: persistedState.confirmed_at,
        revoked_at: persistedState.revoked_at,
        updated_at: timestamp,
      },
      {
        onConflict: 'member_id,source_type,source_id,slot_key',
      }
    );

  if (upsertError) {
    throw new Error(formatDatabaseWriteError('Erro ao sincronizar notificação da designação', upsertError));
  }
}

export const api = {
  async getAppSetting(key: string) {
    const { data, error } = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', key)
      .maybeSingle();

    if (error) throw new Error(`Erro ao buscar configuração: ${error.message}`);
    return data?.value || null;
  },

  async setAppSetting(key: string, value: string) {
    const { error } = await supabase
      .from('app_settings')
      .upsert(
        {
          key,
          value,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'key' }
      );

    if (error) throw new Error(formatDatabaseWriteError('Erro ao salvar configuração', error));
  },

  async getMyAssignmentNotifications(memberId: string) {
    const { data, error } = await supabase
      .from('member_assignment_notifications')
      .select('*')
      .eq('member_id', memberId)
      .neq('status', 'revoked')
      .order('assignment_date', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: false });

    if (error) throw new Error(`Erro ao carregar notificações: ${error.message}`);

    return (data || [])
      .map(mapAssignmentNotification)
      .sort((a, b) => {
        if (a.status !== b.status) {
          return a.status === 'pending_confirmation' ? -1 : 1;
        }
        const aDate = a.assignmentDate || '';
        const bDate = b.assignmentDate || '';
        if (aDate !== bDate) {
          return aDate.localeCompare(bDate);
        }
        return b.createdAt.localeCompare(a.createdAt);
      });
  },

  async getUnreadAssignmentNotificationsCount(memberId: string) {
    const { count, error } = await supabase
      .from('member_assignment_notifications')
      .select('id', { count: 'exact', head: true })
      .eq('member_id', memberId)
      .eq('is_read', false)
      .neq('status', 'revoked');

    if (error) throw new Error(`Erro ao contar notificações: ${error.message}`);
    return count || 0;
  },

  async markAssignmentNotificationRead(notificationId: string) {
    const { error } = await supabase
      .from('member_assignment_notifications')
      .update({
        is_read: true,
        read_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', notificationId);

    if (error) throw new Error(formatDatabaseWriteError('Erro ao marcar notificação como lida', error));
  },

  async markAllAssignmentNotificationsRead(memberId: string) {
    const { error } = await supabase
      .from('member_assignment_notifications')
      .update({
        is_read: true,
        read_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('member_id', memberId)
      .eq('is_read', false)
      .neq('status', 'revoked');

    if (error) throw new Error(formatDatabaseWriteError('Erro ao marcar todas as notificações como lidas', error));
  },

  async confirmAssignmentNotification(notificationId: string) {
    const now = new Date().toISOString();
    const { error } = await supabase
      .from('member_assignment_notifications')
      .update({
        status: 'confirmed',
        is_read: true,
        read_at: now,
        confirmed_at: now,
        revoked_at: null,
        updated_at: now,
      })
      .eq('id', notificationId);

    if (error) throw new Error(formatDatabaseWriteError('Erro ao confirmar designação', error));
  },

  async syncMidweekMeetingNotifications(meetingId: string) {
    const { data, error } = await supabase
      .from('midweek_meetings')
      .select(`
        id,
        date,
        president_id,
        opening_prayer_id,
        closing_prayer_id,
        treasure_talk_title,
        treasure_talk_speaker_id,
        treasure_gems_speaker_id,
        treasure_reading_student_id,
        cbs_conductor_id,
        cbs_reader_id
      `)
      .eq('id', meetingId)
      .maybeSingle();

    if (error) throw new Error(formatDatabaseWriteError('Erro ao carregar reunião para notificação', error));
    if (!data) return;

    const dateLabel = formatShortDate(data.date);
    const slots = [
      {
        slotKey: 'president_id',
        memberId: data.president_id,
        title: 'Nova designação na reunião do meio de semana',
        message: `Você foi designado para Presidente em ${dateLabel}.`,
      },
      {
        slotKey: 'opening_prayer_id',
        memberId: data.opening_prayer_id,
        title: 'Nova designação na reunião do meio de semana',
        message: `Você foi designado para Oração inicial em ${dateLabel}.`,
      },
      {
        slotKey: 'closing_prayer_id',
        memberId: data.closing_prayer_id,
        title: 'Nova designação na reunião do meio de semana',
        message: `Você foi designado para Oração final em ${dateLabel}.`,
      },
      {
        slotKey: 'treasure_talk_speaker_id',
        memberId: data.treasure_talk_speaker_id,
        title: 'Nova designação na reunião do meio de semana',
        message: `Você foi designado para ${data.treasure_talk_title || 'Tesouros da Palavra de Deus'} em ${dateLabel}.`,
      },
      {
        slotKey: 'treasure_gems_speaker_id',
        memberId: data.treasure_gems_speaker_id,
        title: 'Nova designação na reunião do meio de semana',
        message: `Você foi designado para Joias espirituais em ${dateLabel}.`,
      },
      {
        slotKey: 'treasure_reading_student_id',
        memberId: data.treasure_reading_student_id,
        title: 'Nova designação na reunião do meio de semana',
        message: `Você foi designado para Leitura da Bíblia em ${dateLabel}.`,
      },
      {
        slotKey: 'cbs_conductor_id',
        memberId: data.cbs_conductor_id,
        title: 'Nova designação na reunião do meio de semana',
        message: `Você foi designado para Dirigente do estudo bíblico em ${dateLabel}.`,
      },
      {
        slotKey: 'cbs_reader_id',
        memberId: data.cbs_reader_id,
        title: 'Nova designação na reunião do meio de semana',
        message: `Você foi designado para Leitor do estudo bíblico em ${dateLabel}.`,
      },
    ];

    for (const slot of slots) {
      await upsertAssignmentNotificationSlot({
        memberId: slot.memberId,
        sourceType: 'midweek_meeting_role',
        sourceId: data.id,
        slotKey: slot.slotKey,
        category: 'midweek',
        assignmentDate: data.date,
        title: slot.title,
        message: slot.message,
      });
    }
  },

  async syncMidweekMinistryPartNotifications(partId: string) {
    const { data, error } = await supabase
      .from('midweek_ministry_parts')
      .select(`
        id,
        title,
        student_id,
        assistant_id,
        meeting:midweek_meetings(date)
      `)
      .eq('id', partId)
      .maybeSingle();

    if (error) throw new Error(formatDatabaseWriteError('Erro ao carregar parte do ministério para notificação', error));
    if (!data) return;

    const meetingDate = Array.isArray(data.meeting) ? (data.meeting[0] as any)?.date : (data.meeting as any)?.date;
    const dateLabel = formatShortDate(meetingDate);

    await upsertAssignmentNotificationSlot({
      memberId: data.student_id,
      sourceType: 'midweek_ministry_part',
      sourceId: data.id,
      slotKey: 'student_id',
      category: 'midweek',
      assignmentDate: meetingDate,
      title: 'Nova designação na reunião do meio de semana',
      message: `Você foi designado para Estudante em ${data.title} em ${dateLabel}.`,
    });

    await upsertAssignmentNotificationSlot({
      memberId: data.assistant_id,
      sourceType: 'midweek_ministry_part',
      sourceId: data.id,
      slotKey: 'assistant_id',
      category: 'midweek',
      assignmentDate: meetingDate,
      title: 'Nova designação na reunião do meio de semana',
      message: `Você foi designado para Ajudante em ${data.title} em ${dateLabel}.`,
    });
  },

  async syncMidweekChristianLifePartNotifications(partId: string) {
    const { data, error } = await supabase
      .from('midweek_christian_life_parts')
      .select(`
        id,
        title,
        speaker_id,
        meeting:midweek_meetings(date)
      `)
      .eq('id', partId)
      .maybeSingle();

    if (error) throw new Error(formatDatabaseWriteError('Erro ao carregar parte de nossa vida cristã para notificação', error));
    if (!data) return;

    const meetingDate = Array.isArray(data.meeting) ? (data.meeting[0] as any)?.date : (data.meeting as any)?.date;
    const dateLabel = formatShortDate(meetingDate);

    await upsertAssignmentNotificationSlot({
      memberId: data.speaker_id,
      sourceType: 'midweek_christian_life_part',
      sourceId: data.id,
      slotKey: 'speaker_id',
      category: 'midweek',
      assignmentDate: meetingDate,
      title: 'Nova designação na reunião do meio de semana',
      message: `Você foi designado para ${data.title} em ${dateLabel}.`,
    });
  },

  async syncWeekendMeetingNotifications(meetingId: string) {
    const { data, error } = await supabase
      .from('weekend_meetings')
      .select(`
        id,
        date,
        president_id,
        watchtower_conductor_id,
        watchtower_reader_id,
        closing_prayer_id
      `)
      .eq('id', meetingId)
      .maybeSingle();

    if (error) throw new Error(formatDatabaseWriteError('Erro ao carregar reunião de fim de semana para notificação', error));
    if (!data) return;

    const dateLabel = formatShortDate(data.date);
    const slots = [
      {
        slotKey: 'president_id',
        memberId: data.president_id,
        message: `Você foi designado para Presidente em ${dateLabel}.`,
      },
      {
        slotKey: 'watchtower_conductor_id',
        memberId: data.watchtower_conductor_id,
        message: `Você foi designado para Dirigente da Sentinela em ${dateLabel}.`,
      },
      {
        slotKey: 'watchtower_reader_id',
        memberId: data.watchtower_reader_id,
        message: `Você foi designado para Leitor da Sentinela em ${dateLabel}.`,
      },
      {
        slotKey: 'closing_prayer_id',
        memberId: data.closing_prayer_id,
        message: `Você foi designado para Oração final em ${dateLabel}.`,
      },
    ];

    for (const slot of slots) {
      await upsertAssignmentNotificationSlot({
        memberId: slot.memberId,
        sourceType: 'weekend_meeting_role',
        sourceId: data.id,
        slotKey: slot.slotKey,
        category: 'weekend',
        assignmentDate: data.date,
        title: 'Nova designação na reunião do fim de semana',
        message: slot.message,
      });
    }
  },

  async syncAudioVideoAssignmentNotifications(assignmentId: string) {
    const { data, error } = await supabase
      .from('audio_video_assignments')
      .select('*')
      .eq('id', assignmentId)
      .maybeSingle();

    if (error) throw new Error(formatDatabaseWriteError('Erro ao carregar designação de áudio e vídeo para notificação', error));
    if (!data) return;

    const dateLabel = formatShortDate(data.date);
    const weekdayLabel = data.weekday ? ` (${data.weekday})` : '';
    const slots = [
      { slotKey: 'sound', memberId: data.sound_member_id, role: 'Som' },
      { slotKey: 'image', memberId: data.image_member_id, role: 'Imagem' },
      { slotKey: 'stage', memberId: data.stage_member_id, role: 'Palco' },
      { slotKey: 'roving_mic_1', memberId: data.roving_mic_1_member_id, role: 'Mic. Volante 1' },
      { slotKey: 'roving_mic_2', memberId: data.roving_mic_2_member_id, role: 'Mic. Volante 2' },
    ];

    for (const slot of slots) {
      await upsertAssignmentNotificationSlot({
        memberId: slot.memberId,
        sourceType: 'audio_video_role',
        sourceId: data.id,
        slotKey: slot.slotKey,
        category: 'audio_video',
        assignmentDate: data.date,
        title: 'Nova designação de áudio e vídeo',
        message: `Você foi designado para ${slot.role} em ${dateLabel}${weekdayLabel}.`,
      });
    }

    const attendantsIds = Array.isArray(data.attendants_member_ids) ? data.attendants_member_ids : [];
    const attendantsNames = Array.isArray(data.attendants) ? data.attendants : [];

    for (let index = 0; index < Math.max(attendantsIds.length, attendantsNames.length); index += 1) {
      await upsertAssignmentNotificationSlot({
        memberId: attendantsIds[index] || null,
        sourceType: 'audio_video_role',
        sourceId: data.id,
        slotKey: `attendant:${index}`,
        category: 'audio_video',
        assignmentDate: data.date,
        title: 'Nova designação de áudio e vídeo',
        message: `Você foi designado para Entradas / Auditório em ${dateLabel}${weekdayLabel}.`,
      });
    }
  },

  async syncFieldServiceAssignmentNotifications(assignmentId: string) {
    const { data, error } = await supabase
      .from('field_service_assignments')
      .select('*')
      .eq('id', assignmentId)
      .maybeSingle();

    if (error) throw new Error(formatDatabaseWriteError('Erro ao carregar saída de campo para notificação', error));
    if (!data) return;

    await upsertAssignmentNotificationSlot({
      memberId: data.responsible_member_id,
      sourceType: 'field_service_assignment',
      sourceId: data.id,
      slotKey: 'responsible',
      category: 'field_service',
      assignmentDate: null,
      title: 'Nova designação de saída de campo',
      message: `Você foi designado para responsável em ${data.weekday} às ${data.time}.`,
    });
  },

  async syncCartAssignmentNotifications(assignmentId: string) {
    const { data, error } = await supabase
      .from('cart_assignments')
      .select('*')
      .eq('id', assignmentId)
      .maybeSingle();

    if (error) throw new Error(formatDatabaseWriteError('Erro ao carregar designação de carrinho para notificação', error));
    if (!data) return;

    const monthDate = `${data.year}-${String(data.month).padStart(2, '0')}-${String(data.day).padStart(2, '0')}`;
    const dateLabel = formatShortDate(monthDate);

    await upsertAssignmentNotificationSlot({
      memberId: data.publisher1_member_id,
      sourceType: 'cart_assignment',
      sourceId: data.id,
      slotKey: 'publisher1',
      category: 'cart',
      assignmentDate: monthDate,
      title: 'Nova designação de carrinho',
      message: `Você foi designado para Publicador 1 no dia ${dateLabel}.`,
    });

    await upsertAssignmentNotificationSlot({
      memberId: data.publisher2_member_id,
      sourceType: 'cart_assignment',
      sourceId: data.id,
      slotKey: 'publisher2',
      category: 'cart',
      assignmentDate: monthDate,
      title: 'Nova designação de carrinho',
      message: `Você foi designado para Publicador 2 no dia ${dateLabel}.`,
    });
  },

  // Members (includes system_role from user_profiles via join)
  async getMembers() {
    const { data, error } = await supabase
      .from('members')
      .select('*, user_profiles(system_role), member_privileges(role)')
      .order('full_name');

    if (error) throw error;

    // Flatten system_role from the joined user_profiles onto each member
    return (data || []).map((m: any) => ({
      ...m,
      roles: Array.isArray(m.member_privileges)
        ? m.member_privileges.map((p: any) => p.role).filter(Boolean)
        : [],
      system_role: Array.isArray(m.user_profiles)
        ? m.user_profiles[0]?.system_role ?? 'publicador'
        : m.user_profiles?.system_role ?? 'publicador',
      member_privileges: undefined,
      user_profiles: undefined,
    }));
  },

  async updateMember(memberId: string, input: Partial<CreateMemberInput>) {
    const normalizedEmail = normalizeOptionalText(input.email);
    const normalizedEmergencyContactName = normalizeOptionalText(input.emergency_contact_name);
    const normalizedEmergencyContactPhone = input.emergency_contact_phone?.replace(/\D/g, '') || null;
    const normalizedAddressStreet = normalizeOptionalText(input.address_street);
    const normalizedAddressNumber = normalizeOptionalText(input.address_number);
    const normalizedAddressNeighborhood = normalizeOptionalText(input.address_neighborhood);
    const normalizedAddressCity = normalizeOptionalText(input.address_city);
    const normalizedAddressState = normalizeOptionalState(input.address_state);
    const normalizedAddressZipCode = normalizeOptionalZipCode(input.address_zip_code);

    const { error } = await supabase
      .from('members')
      .update({
        full_name: input.full_name,
        phone: input.phone ? input.phone.replace(/\D/g, '') : undefined,
        email: normalizedEmail,
        address_street: normalizedAddressStreet,
        address_number: normalizedAddressNumber,
        address_neighborhood: normalizedAddressNeighborhood,
        address_city: normalizedAddressCity,
        address_state: normalizedAddressState,
        address_zip_code: normalizedAddressZipCode,
        emergency_contact_name: normalizedEmergencyContactName,
        emergency_contact_phone: normalizedEmergencyContactPhone,
        spiritual_status: input.spiritual_status as any,
        gender: input.gender,
        group_id: input.group_id || null,
        is_family_head: input.is_family_head,
        family_head_id: input.family_head_id || null,
        approved_audio_video: input.approved_audio_video,
        approved_indicadores: input.approved_indicadores,
        approved_carrinho: input.approved_carrinho,
        approved_pioneiro_auxiliar: input.approved_pioneiro_auxiliar,
        approved_pioneiro_regular: input.approved_pioneiro_regular,
      } as any)
      .eq('id', memberId);

    if (error) throw new Error(`Erro ao atualizar membro: ${error.message}`);
  },

  async createMember(input: CreateMemberInput): Promise<{ member_id: string; auth_user_id: string; email_auth?: string; temp_password?: string; magicLink?: string }> {
    const phoneDigits = (input.phone || '').replace(/\D/g, '');
    const normalizedEmail = normalizeOptionalText(input.email);
    const normalizedEmergencyContactName = normalizeOptionalText(input.emergency_contact_name);
    const normalizedEmergencyContactPhone = input.emergency_contact_phone?.replace(/\D/g, '') || null;
    const normalizedAddressStreet = normalizeOptionalText(input.address_street);
    const normalizedAddressNumber = normalizeOptionalText(input.address_number);
    const normalizedAddressNeighborhood = normalizeOptionalText(input.address_neighborhood);
    const normalizedAddressCity = normalizeOptionalText(input.address_city);
    const normalizedAddressState = normalizeOptionalState(input.address_state);
    const normalizedAddressZipCode = normalizeOptionalZipCode(input.address_zip_code);

    if (!phoneDigits || phoneDigits.length < 10) {
      throw new Error('Telefone é obrigatório para criar o acesso do membro.');
    }

    // Step 1: Insert into members table
    const { data: member, error: memberError } = await supabase
      .from('members')
      .insert({
        full_name: input.full_name,
        phone: phoneDigits,
        email: normalizedEmail,
        address_street: normalizedAddressStreet,
        address_number: normalizedAddressNumber,
        address_neighborhood: normalizedAddressNeighborhood,
        address_city: normalizedAddressCity,
        address_state: normalizedAddressState,
        address_zip_code: normalizedAddressZipCode,
        emergency_contact_name: normalizedEmergencyContactName,
        emergency_contact_phone: normalizedEmergencyContactPhone,
        spiritual_status: (input.spiritual_status || 'publicador') as any,
        gender: input.gender,
        group_id: input.group_id || null,
        is_family_head: input.is_family_head || false,
        family_head_id: input.family_head_id || null,
        approved_audio_video: input.approved_audio_video || false,
        approved_indicadores: input.approved_indicadores || false,
        approved_carrinho: input.approved_carrinho || false,
        approved_pioneiro_auxiliar: input.approved_pioneiro_auxiliar || false,
        approved_pioneiro_regular: input.approved_pioneiro_regular || false,
      } as any)
      .select('id')
      .single();

    if (memberError) {
      throw new Error(`Erro ao criar membro: ${memberError.message}`);
    }

    // Step 2: Create auth user with isolated client
    const authEmail = `${phoneDigits}@${PHONE_EMAIL_DOMAIN}`;
    const isolatedClient = createIsolatedAuthClient();

    let authData: any;
    let authError: any;
    let randomSecurePass = '';
    try {
      // Cria a conta do Supabase usando uma senha pseudo-aleatoria forte que o admin *nunca* verá
      // Logo depois emitimos o MagicLink de reset/recovery pelo servidor
      randomSecurePass = `Pw${crypto.randomUUID()}-${Date.now()}`;
      const signUpPromise = isolatedClient.auth.signUp({
        email: authEmail,
        password: randomSecurePass,
      });
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('signUp timeout (15s)')), 15000)
      );
      const result = await Promise.race([signUpPromise, timeoutPromise]);
      authData = result.data;
      authError = result.error;
    } catch (e: any) {
      await supabase.from('members').delete().eq('id', member.id);
      throw new Error(`Erro ao criar acesso: ${e.message}`);
    }

    if (authError) {
      const isUserExists = authError.code === 'user_already_exists' || authError.code === 'email_exists' || /already exists|already registered/i.test(authError.message || '');
      if (isUserExists) {
        await supabase.from('members').delete().eq('id', member.id);
        const { data: existingMember } = await supabase.from('members').select('id').eq('phone', phoneDigits).maybeSingle();
        if (!existingMember) {
          throw new Error('Este telefone já está cadastrado no sistema. Use outro número ou entre em contato com o administrador.');
        }
        const { data: existingProfile } = await supabase.from('user_profiles').select('id').eq('member_id', existingMember.id).maybeSingle();
        if (existingProfile) {
          throw new Error('Este telefone já está cadastrado. O membro já existe na lista.');
        }

        // Se a role estivesse linkada à profile mas vazou... vamos forçar nova requisição de recuperação
        // Não podemos logar passivamente.
        throw new Error('Este usuário já possui conta autenticável, porém falta o perfil. Contate o suporte para sincronizar manualmente.');
      }
      await supabase.from('members').delete().eq('id', member.id);
      throw new Error(`Erro ao criar acesso: ${authError.message}`);
    }
    if (!authData?.user) {
      await supabase.from('members').delete().eq('id', member.id);
      throw new Error('Erro inesperado: usuário auth não foi criado.');
    }

    // Step 3: Insert into user_profiles
    const { error: profileError } = await supabase
      .from('user_profiles')
      .insert({
        id: authData.user.id,
        member_id: member.id,
        system_role: input.system_role || 'publicador',
      });

    if (profileError) {
      const isDuplicateProfile = profileError.code === '23505' || /duplicate|unique|already exists/i.test(profileError.message || '');
      if (isDuplicateProfile) {
        await supabase.from('members').delete().eq('id', member.id);
        await isolatedClient.auth.signOut();
        throw new Error('Este telefone já está cadastrado. O membro pode já existir na lista.');
      }
      console.error('[API] Falha ao criar user_profiles:', profileError.message);
    }

    await isolatedClient.auth.signOut();

    // Step 4: Gerar Magic Link localmente através de Edge Function Cloud ou DB Function (se aplicável),
    // Como estamos restritos no cliente, pedimos ao servidor um link de recovery.
    try {
      await supabase.auth.resetPasswordForEmail(authEmail, {
        redirectTo: buildPublicAppUrl('/auth/update-password'),
      });
    } catch (err: any) {
      console.warn('Erro ao emitir aviso de boas vindas', err);
    }

    const magicLink = buildPasswordSetupLink(authEmail, randomSecurePass);

    return {
      member_id: member.id,
      auth_user_id: authData.user.id,
      email_auth: authEmail,
      temp_password: randomSecurePass,
      magicLink,
    };
  },

  /**
   * Força a redefinição de Senha do Auth vinculada a este membro, via RPC.
   * Útil para revogar acessos ou recuperar senhas perdidas.
   */
  async generateMemberMagicLink(memberId: string, phone: string) {
    // Buscar a autênticão (profile) do membro
    const { data: profile, error: profileErr } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('member_id', memberId)
      .maybeSingle();

    if (profileErr) {
      throw new Error(`Falha ao buscar perfil do membro: ${profileErr.message}`);
    }

    const { data: userData } = await supabase.auth.getUser();
    if (!userData?.user) throw new Error('Administrador não autenticado.');

    const tempPassword = `Pw${crypto.randomUUID()}-${Date.now()}`;
    const authEmail = `${phone.replace(/\D/g, '')}@${PHONE_EMAIL_DOMAIN}`;

    if (!profile) {
      const isolatedClient = createIsolatedAuthClient();
      try {
        const { data: signUpData, error: signUpError } = await isolatedClient.auth.signUp({
          email: authEmail,
          password: tempPassword,
        });

        if (signUpError) {
          throw new Error(`Falha ao gerar credenciais Auth para perfil legado: ${signUpError.message}`);
        }

        if (!signUpData?.user) throw new Error('Erro inesperado: conta não foi criada pelo provedor.');

        const { error: insertErr } = await supabase.from('user_profiles').insert({
          id: signUpData.user.id,
          member_id: memberId,
          system_role: 'publicador',
        });

        if (insertErr) {
          throw new Error(`Erro ao vincular perfil gerado: ${insertErr.message}`);
        }

        return {
          success: true,
          email_auth: authEmail,
          temp_password: tempPassword,
          magicLink: buildPasswordSetupLink(authEmail, tempPassword),
        };
      } finally {
        await isolatedClient.auth.signOut();
      }
    }

    // Sobrescrever a senha usando o RPC impositivo
    const { error: rpcError } = await supabase.rpc('admin_reset_user_password', {
      target_auth_id: profile.id,
      target_member_id: memberId,
      temp_password: tempPassword,
    });

    if (rpcError) {
      throw new Error(`Sem permissão ou falha ao resetar acesso. ${rpcError.message}`);
    }

    return {
      success: true,
      email_auth: authEmail,
      temp_password: tempPassword,
      magicLink: buildPasswordSetupLink(authEmail, tempPassword),
    };
  },

  // Get System Role
  async getMemberSystemRole(memberId: string) {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('system_role')
      .eq('member_id', memberId)
      .maybeSingle();

    if (error) throw error;
    return data?.system_role || 'publicador';
  },

  // Update System Role via RPC (bypasses RLS with SECURITY DEFINER)
  async updateMemberSystemRole(memberId: string, role: string) {
    const { error } = await supabase.rpc('update_member_system_role', {
      p_member_id: memberId,
      p_role: role,
    });

    if (error) throw new Error(error.message);
  },

  async getAudioVideoAssignments(monthIndex: number, year: number) {
    const { start, end } = formatMonthBounds(monthIndex, year);
    const { data, error } = await supabase
      .from('audio_video_assignments')
      .select('*')
      .gte('date', start)
      .lte('date', end)
      .order('date', { ascending: true });

    if (error) throw new Error(`Erro ao buscar designações de áudio e vídeo: ${error.message} `);
    return (data || []).map(mapAudioVideoAssignment);
  },

  async createAudioVideoAssignment(input: CreateAudioVideoAssignmentInput) {
    const { data, error } = await supabase
      .from('audio_video_assignments')
      .insert({
        date: input.date,
        weekday: input.weekday,
        sound: input.sound,
        sound_member_id: input.sound_member_id || null,
        image: input.image,
        image_member_id: input.image_member_id || null,
        stage: input.stage,
        stage_member_id: input.stage_member_id || null,
        roving_mic_1: input.roving_mic_1,
        roving_mic_1_member_id: input.roving_mic_1_member_id || null,
        roving_mic_2: input.roving_mic_2,
        roving_mic_2_member_id: input.roving_mic_2_member_id || null,
        attendants: input.attendants,
        attendants_member_ids: input.attendants_member_ids || [],
      })
      .select('*')
      .single();

    if (error) throw new Error(formatDatabaseWriteError('Erro ao criar designação de áudio e vídeo', error));
    await this.syncAudioVideoAssignmentNotifications(data.id);
    return mapAudioVideoAssignment(data);
  },

  async ensureAudioVideoAssignmentsForMonth(monthIndex: number, year: number) {
    const meetingDates = getMeetingDatesForMonth(monthIndex, year);
    const existingAssignments = await this.getAudioVideoAssignments(monthIndex, year);
    const existingDates = new Set(existingAssignments.map(assignment => assignment.date));
    let createdCount = 0;

    for (const meetingDate of meetingDates) {
      if (existingDates.has(meetingDate.date)) {
        continue;
      }

      await this.createAudioVideoAssignment({
        date: meetingDate.date,
        weekday: meetingDate.weekday,
        sound: 'A definir',
        image: 'A definir',
        stage: 'A definir',
        roving_mic_1: 'A definir',
        roving_mic_2: 'A definir',
        attendants: [],
      });
      existingDates.add(meetingDate.date);
      createdCount += 1;
    }

    const assignments = await this.getAudioVideoAssignments(monthIndex, year);
    return {
      assignments,
      createdCount,
    };
  },

  async updateAudioVideoAssignment(id: string, input: Partial<CreateAudioVideoAssignmentInput>) {
    const payload: Record<string, any> = {};
    if (input.date !== undefined) payload.date = input.date;
    if (input.weekday !== undefined) payload.weekday = input.weekday;
    if (input.sound !== undefined) payload.sound = input.sound;
    if (input.sound_member_id !== undefined) payload.sound_member_id = input.sound_member_id;
    if (input.image !== undefined) payload.image = input.image;
    if (input.image_member_id !== undefined) payload.image_member_id = input.image_member_id;
    if (input.stage !== undefined) payload.stage = input.stage;
    if (input.stage_member_id !== undefined) payload.stage_member_id = input.stage_member_id;
    if (input.roving_mic_1 !== undefined) payload.roving_mic_1 = input.roving_mic_1;
    if (input.roving_mic_1_member_id !== undefined) payload.roving_mic_1_member_id = input.roving_mic_1_member_id;
    if (input.roving_mic_2 !== undefined) payload.roving_mic_2 = input.roving_mic_2;
    if (input.roving_mic_2_member_id !== undefined) payload.roving_mic_2_member_id = input.roving_mic_2_member_id;
    if (input.attendants !== undefined) payload.attendants = input.attendants;
    if (input.attendants_member_ids !== undefined) payload.attendants_member_ids = input.attendants_member_ids;

    const { data, error } = await supabase
      .from('audio_video_assignments')
      .update(payload)
      .eq('id', id)
      .select('*')
      .single();

    if (error) throw new Error(formatDatabaseWriteError('Erro ao atualizar designação de áudio e vídeo', error));
    await this.syncAudioVideoAssignmentNotifications(data.id);
    return mapAudioVideoAssignment(data);
  },

  async getFieldServiceAssignments(monthIndex: number, year: number) {
    const { data, error } = await supabase
      .from('field_service_assignments')
      .select('*')
      .eq('month', monthIndex + 1)
      .eq('year', year)
      .order('category', { ascending: true })
      .order('weekday', { ascending: true });

    if (error) throw new Error(`Erro ao buscar saídas de campo: ${error.message} `);
    return (data || []).map(mapFieldServiceAssignment);
  },

  async getFieldServiceGroups(): Promise<FieldServiceGroupOption[]> {
    const { data, error } = await supabase
      .from('field_service_groups')
      .select('id, name')
      .order('name', { ascending: true });

    if (error) throw new Error(`Erro ao buscar grupos de serviço: ${error.message} `);
    return data || [];
  },

  async createFieldServiceAssignment(input: CreateFieldServiceAssignmentInput) {
    const { data, error } = await supabase
      .from('field_service_assignments')
      .insert(input)
      .select('*')
      .single();

    if (error) throw new Error(formatDatabaseWriteError('Erro ao criar saída de campo', error));
    await this.syncFieldServiceAssignmentNotifications(data.id);
    return mapFieldServiceAssignment(data);
  },

  async ensureFieldServiceAssignmentsForMonth(monthIndex: number, year: number) {
    const existingAssignments = await this.getFieldServiceAssignments(monthIndex, year);
    const groups = await this.getFieldServiceGroups();
    const expectedRows: CreateFieldServiceAssignmentInput[] = [
      {
        month: monthIndex + 1,
        year,
        weekday: 'Segunda-feira',
        time: '08:45',
        responsible: 'A definir',
        location: 'Salão do Reino',
        category: 'Segunda-feira',
      },
      {
        month: monthIndex + 1,
        year,
        weekday: 'Terça-feira',
        time: '16:30',
        responsible: 'A definir',
        location: 'Salão do Reino',
        category: 'Terça-feira',
      },
      {
        month: monthIndex + 1,
        year,
        weekday: 'Quarta-feira',
        time: '08:45',
        responsible: 'A definir',
        location: 'Salão do Reino',
        category: 'Quarta-feira',
      },
      {
        month: monthIndex + 1,
        year,
        weekday: 'Sexta-feira',
        time: '08:45',
        responsible: 'A definir',
        location: 'Salão do Reino',
        category: 'Sexta-feira',
      },
      ...getSaturdaysForMonth(monthIndex, year).map(saturday => ({
        month: monthIndex + 1,
        year,
        weekday: saturday.label,
        time: '16:30',
        responsible: 'A definir',
        location: 'Salão do Reino',
        category: 'Sábado',
      })),
      ...groups.map(group => ({
        month: monthIndex + 1,
        year,
        weekday: 'Domingo',
        time: '08:30 / 08:45',
        responsible: group.name,
        location: '',
        category: 'Domingo',
      })),
    ];

    const fixedCategories = new Set(['Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Sexta-feira']);
    let createdCount = 0;

    for (const row of expectedRows) {
      const exists = existingAssignments.some(assignment => {
        if (fixedCategories.has(row.category)) {
          return assignment.category === row.category;
        }

        if (row.category === 'Sábado') {
          return assignment.category === 'Sábado' && assignment.weekday === row.weekday;
        }

        if (row.category === 'Domingo') {
          return assignment.category === 'Domingo' && assignment.responsible === row.responsible;
        }

        return false;
      });

      if (exists) {
        continue;
      }

      await this.createFieldServiceAssignment(row);
      createdCount += 1;
    }

    const assignments = await this.getFieldServiceAssignments(monthIndex, year);
    return {
      assignments,
      createdCount,
    };
  },

  async updateFieldServiceAssignment(id: string, input: Partial<CreateFieldServiceAssignmentInput>) {
    const { data, error } = await supabase
      .from('field_service_assignments')
      .update(input)
      .eq('id', id)
      .select('*')
      .single();

    if (error) throw new Error(formatDatabaseWriteError('Erro ao atualizar saída de campo', error));
    await this.syncFieldServiceAssignmentNotifications(data.id);
    return mapFieldServiceAssignment(data);
  },

  async getCartAssignments(monthIndex: number, year: number) {
    const { data, error } = await supabase
      .from('cart_assignments')
      .select('*')
      .eq('month', monthIndex + 1)
      .eq('year', year)
      .order('week', { ascending: true })
      .order('day', { ascending: true });

    if (error) throw new Error(`Erro ao buscar designações de carrinho: ${error.message} `);
    return (data || []).map(mapCartAssignment);
  },

  async createCartAssignment(input: CreateCartAssignmentInput) {
    const { data, error } = await supabase
      .from('cart_assignments')
      .insert(input)
      .select('*')
      .single();

    if (error) throw new Error(formatDatabaseWriteError('Erro ao criar designação de carrinho', error));
    await this.syncCartAssignmentNotifications(data.id);
    return mapCartAssignment(data);
  },

  async updateCartAssignment(id: string, input: Partial<CreateCartAssignmentInput>) {
    const { data, error } = await supabase
      .from('cart_assignments')
      .update(input)
      .eq('id', id)
      .select('*')
      .single();

    if (error) throw new Error(formatDatabaseWriteError('Erro ao atualizar designação de carrinho', error));
    await this.syncCartAssignmentNotifications(data.id);
    return mapCartAssignment(data);
  },

  async createMidweekMeeting(input: CreateMidweekMeetingInput) {
    const { data: createdMeeting, error } = await supabase
      .from('midweek_meetings')
      .insert({
        date: input.date,
        bible_reading: input.bible_reading,
        president_id: input.president_id || null,
        opening_prayer_id: input.opening_prayer_id || null,
        closing_prayer_id: input.closing_prayer_id || null,
        opening_song: input.opening_song ?? null,
        opening_song_time: input.opening_song_time || null,
        opening_comments_time: input.opening_comments_time || null,
        opening_comments_duration: input.opening_comments_duration ?? null,
        middle_song: input.middle_song ?? null,
        middle_song_time: input.middle_song_time || null,
        closing_song: input.closing_song ?? null,
        closing_song_time: input.closing_song_time || null,
        treasure_talk_title: input.treasure_talk_title || null,
        treasure_talk_time: input.treasure_talk_time || null,
        treasure_talk_duration: input.treasure_talk_duration ?? null,
        treasure_talk_speaker_id: input.treasure_talk_speaker_id || null,
        treasure_gems_time: input.treasure_gems_time || null,
        treasure_gems_duration: input.treasure_gems_duration ?? null,
        treasure_gems_speaker_id: input.treasure_gems_speaker_id || null,
        treasure_reading_time: input.treasure_reading_time || null,
        treasure_reading_duration: input.treasure_reading_duration ?? null,
        treasure_reading_student_id: input.treasure_reading_student_id || null,
        treasure_reading_room: input.treasure_reading_room || null,
        cbs_time: input.cbs_time || null,
        cbs_duration: input.cbs_duration ?? null,
        cbs_conductor_id: input.cbs_conductor_id || null,
        cbs_reader_id: input.cbs_reader_id || null,
        closing_comments_time: input.closing_comments_time || null,
        closing_comments_duration: input.closing_comments_duration ?? null,
      })
      .select('id')
      .single();

    if (error) throw new Error(formatDatabaseWriteError('Erro ao criar reunião de meio de semana', error));

    const ministryParts = (input.ministry_parts || []).filter(part => part.title.trim());
    if (ministryParts.length > 0) {
      const { error: ministryError } = await supabase
        .from('midweek_ministry_parts')
        .insert(
          ministryParts.map((part, index) => ({
            meeting_id: createdMeeting.id,
            part_number: index + 1,
            title: part.title.trim(),
            duration: part.duration,
            student_id: part.student_id || null,
            assistant_id: part.assistant_id || null,
            room: part.room || null,
            scheduled_time: part.scheduled_time || null,
          }))
        );

      if (ministryError) {
        await supabase.from('midweek_meetings').delete().eq('id', createdMeeting.id);
        throw new Error(formatDatabaseWriteError('Erro ao criar partes do ministério', ministryError));
      }
    }

    const christianLifeParts = (input.christian_life_parts || []).filter(part => part.title.trim());
    if (christianLifeParts.length > 0) {
      const { error: christianLifeError } = await supabase
        .from('midweek_christian_life_parts')
        .insert(
          christianLifeParts.map((part, index) => ({
            meeting_id: createdMeeting.id,
            part_number: index + 1,
            title: part.title.trim(),
            duration: part.duration,
            speaker_id: part.speaker_id || null,
            scheduled_time: part.scheduled_time || null,
          }))
        );

      if (christianLifeError) {
        await supabase.from('midweek_meetings').delete().eq('id', createdMeeting.id);
        throw new Error(formatDatabaseWriteError('Erro ao criar partes de nossa vida cristã', christianLifeError));
      }
    }

    const { data: hydratedMeeting, error: fetchError } = await supabase
      .from('midweek_meetings')
      .select(`
        *,
        president: members!midweek_meetings_president_id_fkey(full_name, phone),
          opening_prayer: members!midweek_meetings_opening_prayer_id_fkey(full_name),
            closing_prayer: members!midweek_meetings_closing_prayer_id_fkey(full_name),
              treasure_talk_speaker: members!midweek_meetings_treasure_talk_speaker_id_fkey(full_name),
                treasure_gems_speaker: members!midweek_meetings_treasure_gems_speaker_id_fkey(full_name),
                  treasure_reading_student: members!midweek_meetings_treasure_reading_student_id_fkey(full_name, phone),
                    cbs_conductor: members!midweek_meetings_cbs_conductor_id_fkey(full_name),
                      cbs_reader: members!midweek_meetings_cbs_reader_id_fkey(full_name),
                        ministry_parts: midweek_ministry_parts(*, student: members!midweek_ministry_parts_student_id_fkey(full_name, phone), assistant: members!midweek_ministry_parts_assistant_id_fkey(full_name)),
                          christian_life_parts: midweek_christian_life_parts(*, speaker: members!midweek_christian_life_parts_speaker_id_fkey(full_name))
      `)
      .eq('id', createdMeeting.id)
      .single();

    if (fetchError) throw new Error(`Erro ao carregar reunião criada: ${fetchError.message} `);
    await this.syncMidweekMeetingNotifications(createdMeeting.id);
    for (const part of hydratedMeeting.ministry_parts || []) {
      await this.syncMidweekMinistryPartNotifications(part.id);
    }
    for (const part of hydratedMeeting.christian_life_parts || []) {
      await this.syncMidweekChristianLifePartNotifications(part.id);
    }
    return hydratedMeeting;
  },

  async createWeekendMeeting(input: CreateWeekendMeetingInput) {
    const { data, error } = await supabase
      .from('weekend_meetings')
      .insert({
        date: input.date,
        president_id: input.president_id || null,
        closing_prayer_id: input.closing_prayer_id || null,
        talk_theme: input.talk_theme || null,
        talk_speaker_name: input.talk_speaker_name,
        talk_congregation: input.talk_congregation || null,
        watchtower_conductor_id: input.watchtower_conductor_id || null,
        watchtower_reader_id: input.watchtower_reader_id || null,
      })
      .select(`
        *,
        president: members!weekend_meetings_president_id_fkey(full_name, phone),
          closing_prayer: members!weekend_meetings_closing_prayer_id_fkey(full_name),
            watchtower_conductor: members!weekend_meetings_watchtower_conductor_id_fkey(full_name),
              watchtower_reader: members!weekend_meetings_watchtower_reader_id_fkey(full_name, phone)
                `)
      .single();

    if (error) throw new Error(formatDatabaseWriteError('Erro ao criar reunião de fim de semana', error));
    await this.syncWeekendMeetingNotifications(data.id);
    return data;
  },

  async updateMidweekMeeting(meetingId: string, input: CreateMidweekMeetingInput) {
    const [
      { data: previousMinistryParts, error: previousMinistryPartsError },
      { data: previousChristianLifeParts, error: previousChristianLifePartsError },
    ] = await Promise.all([
      supabase.from('midweek_ministry_parts').select('id').eq('meeting_id', meetingId),
      supabase.from('midweek_christian_life_parts').select('id').eq('meeting_id', meetingId),
    ]);

    if (previousMinistryPartsError) {
      throw new Error(formatDatabaseWriteError('Erro ao carregar partes antigas do ministério', previousMinistryPartsError));
    }

    if (previousChristianLifePartsError) {
      throw new Error(formatDatabaseWriteError('Erro ao carregar partes antigas de nossa vida cristã', previousChristianLifePartsError));
    }

    const { error } = await supabase
      .from('midweek_meetings')
      .update({
        date: input.date,
        bible_reading: input.bible_reading,
        president_id: input.president_id || null,
        opening_prayer_id: input.opening_prayer_id || null,
        closing_prayer_id: input.closing_prayer_id || null,
        opening_song: input.opening_song ?? null,
        opening_song_time: input.opening_song_time || null,
        opening_comments_time: input.opening_comments_time || null,
        opening_comments_duration: input.opening_comments_duration ?? null,
        middle_song: input.middle_song ?? null,
        middle_song_time: input.middle_song_time || null,
        closing_song: input.closing_song ?? null,
        closing_song_time: input.closing_song_time || null,
        treasure_talk_title: input.treasure_talk_title || null,
        treasure_talk_time: input.treasure_talk_time || null,
        treasure_talk_duration: input.treasure_talk_duration ?? null,
        treasure_talk_speaker_id: input.treasure_talk_speaker_id || null,
        treasure_gems_time: input.treasure_gems_time || null,
        treasure_gems_duration: input.treasure_gems_duration ?? null,
        treasure_gems_speaker_id: input.treasure_gems_speaker_id || null,
        treasure_reading_time: input.treasure_reading_time || null,
        treasure_reading_duration: input.treasure_reading_duration ?? null,
        treasure_reading_student_id: input.treasure_reading_student_id || null,
        treasure_reading_room: input.treasure_reading_room || null,
        cbs_time: input.cbs_time || null,
        cbs_duration: input.cbs_duration ?? null,
        cbs_conductor_id: input.cbs_conductor_id || null,
        cbs_reader_id: input.cbs_reader_id || null,
        closing_comments_time: input.closing_comments_time || null,
        closing_comments_duration: input.closing_comments_duration ?? null,
      })
      .eq('id', meetingId);

    if (error) throw new Error(formatDatabaseWriteError('Erro ao atualizar reunião de meio de semana', error));

    const { error: deletePartsError } = await supabase
      .from('midweek_ministry_parts')
      .delete()
      .eq('meeting_id', meetingId);

    if (deletePartsError) throw new Error(formatDatabaseWriteError('Erro ao atualizar partes do ministério', deletePartsError));

    const { error: deleteChristianLifePartsError } = await supabase
      .from('midweek_christian_life_parts')
      .delete()
      .eq('meeting_id', meetingId);

    if (deleteChristianLifePartsError) {
      throw new Error(formatDatabaseWriteError('Erro ao atualizar partes de nossa vida cristã', deleteChristianLifePartsError));
    }

    const ministryParts = (input.ministry_parts || []).filter(part => part.title.trim());
    if (ministryParts.length > 0) {
      const { error: insertPartsError } = await supabase
        .from('midweek_ministry_parts')
        .insert(
          ministryParts.map((part, index) => ({
            meeting_id: meetingId,
            part_number: index + 1,
            title: part.title.trim(),
            duration: part.duration,
            student_id: part.student_id || null,
            assistant_id: part.assistant_id || null,
            room: part.room || null,
            scheduled_time: part.scheduled_time || null,
          }))
        );

      if (insertPartsError) throw new Error(formatDatabaseWriteError('Erro ao recriar partes do ministério', insertPartsError));
    }

    const christianLifeParts = (input.christian_life_parts || []).filter(part => part.title.trim());
    if (christianLifeParts.length > 0) {
      const { error: insertChristianLifePartsError } = await supabase
        .from('midweek_christian_life_parts')
        .insert(
          christianLifeParts.map((part, index) => ({
            meeting_id: meetingId,
            part_number: index + 1,
            title: part.title.trim(),
            duration: part.duration,
            speaker_id: part.speaker_id || null,
            scheduled_time: part.scheduled_time || null,
          }))
        );

      if (insertChristianLifePartsError) {
        throw new Error(formatDatabaseWriteError('Erro ao recriar partes de nossa vida cristã', insertChristianLifePartsError));
      }
    }

    const { data, error: fetchError } = await supabase
      .from('midweek_meetings')
      .select(`
                *,
                president: members!midweek_meetings_president_id_fkey(full_name, phone),
                  opening_prayer: members!midweek_meetings_opening_prayer_id_fkey(full_name),
                    closing_prayer: members!midweek_meetings_closing_prayer_id_fkey(full_name),
                      treasure_talk_speaker: members!midweek_meetings_treasure_talk_speaker_id_fkey(full_name),
                        treasure_gems_speaker: members!midweek_meetings_treasure_gems_speaker_id_fkey(full_name),
                          treasure_reading_student: members!midweek_meetings_treasure_reading_student_id_fkey(full_name, phone),
                            cbs_conductor: members!midweek_meetings_cbs_conductor_id_fkey(full_name),
                              cbs_reader: members!midweek_meetings_cbs_reader_id_fkey(full_name),
                                ministry_parts: midweek_ministry_parts(*, student: members!midweek_ministry_parts_student_id_fkey(full_name, phone), assistant: members!midweek_ministry_parts_assistant_id_fkey(full_name)),
                                  christian_life_parts: midweek_christian_life_parts(*, speaker: members!midweek_christian_life_parts_speaker_id_fkey(full_name))
      `)
      .eq('id', meetingId)
      .single();

    if (fetchError) throw new Error(`Erro ao carregar reunião atualizada: ${fetchError.message} `);

    await this.syncMidweekMeetingNotifications(meetingId);
    await revokeNotificationsForSourceIds(
      'midweek_ministry_part',
      (previousMinistryParts || []).map(part => part.id)
    );
    await revokeNotificationsForSourceIds(
      'midweek_christian_life_part',
      (previousChristianLifeParts || []).map(part => part.id)
    );
    for (const part of data.ministry_parts || []) {
      await this.syncMidweekMinistryPartNotifications(part.id);
    }
    for (const part of data.christian_life_parts || []) {
      await this.syncMidweekChristianLifePartNotifications(part.id);
    }
    return data;
  },

  async updateWeekendMeeting(meetingId: string, input: CreateWeekendMeetingInput) {
    const { data, error } = await supabase
      .from('weekend_meetings')
      .update({
        date: input.date,
        president_id: input.president_id || null,
        closing_prayer_id: input.closing_prayer_id || null,
        talk_theme: input.talk_theme || null,
        talk_speaker_name: input.talk_speaker_name,
        talk_congregation: input.talk_congregation || null,
        watchtower_conductor_id: input.watchtower_conductor_id || null,
        watchtower_reader_id: input.watchtower_reader_id || null,
      })
      .eq('id', meetingId)
      .select(`
        *,
        president: members!weekend_meetings_president_id_fkey(full_name, phone),
          closing_prayer: members!weekend_meetings_closing_prayer_id_fkey(full_name),
            watchtower_conductor: members!weekend_meetings_watchtower_conductor_id_fkey(full_name),
              watchtower_reader: members!weekend_meetings_watchtower_reader_id_fkey(full_name, phone)
                `)
      .single();

    if (error) throw new Error(formatDatabaseWriteError('Erro ao atualizar reunião de fim de semana', error));
    await this.syncWeekendMeetingNotifications(meetingId);
    return data;
  },

  // Midweek Meetings 
  async getMidweekMeetings() {
    const { data, error } = await supabase
      .from('midweek_meetings')
      .select(`
                *,
                president: members!midweek_meetings_president_id_fkey(full_name, phone),
                  opening_prayer: members!midweek_meetings_opening_prayer_id_fkey(full_name),
                    closing_prayer: members!midweek_meetings_closing_prayer_id_fkey(full_name),
                      treasure_talk_speaker: members!midweek_meetings_treasure_talk_speaker_id_fkey(full_name),
                        treasure_gems_speaker: members!midweek_meetings_treasure_gems_speaker_id_fkey(full_name),
                          treasure_reading_student: members!midweek_meetings_treasure_reading_student_id_fkey(full_name, phone),
                            cbs_conductor: members!midweek_meetings_cbs_conductor_id_fkey(full_name),
                              cbs_reader: members!midweek_meetings_cbs_reader_id_fkey(full_name),
                                ministry_parts: midweek_ministry_parts(*, student: members!midweek_ministry_parts_student_id_fkey(full_name, phone), assistant: members!midweek_ministry_parts_assistant_id_fkey(full_name)),
                                  christian_life_parts: midweek_christian_life_parts(*, speaker: members!midweek_christian_life_parts_speaker_id_fkey(full_name))
                                    `)
      .order('date', { ascending: true });

    if (error) throw error;
    return data;
  },

  // Weekend Meetings
  async getWeekendMeetings() {
    const { data, error } = await supabase
      .from('weekend_meetings')
      .select(`
                                    *,
                                    president: members!weekend_meetings_president_id_fkey(full_name, phone),
                                      closing_prayer: members!weekend_meetings_closing_prayer_id_fkey(full_name),
                                        watchtower_conductor: members!weekend_meetings_watchtower_conductor_id_fkey(full_name),
                                          watchtower_reader: members!weekend_meetings_watchtower_reader_id_fkey(full_name, phone)
                                            `)
      .order('date', { ascending: true });

    if (error) throw error;
    return data;
  }
};
