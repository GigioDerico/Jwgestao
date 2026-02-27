import { createClient } from '@supabase/supabase-js';
import { supabase } from './supabase';
import { Database } from './supabase-types';

const PHONE_EMAIL_DOMAIN = 'jwgestao.app';
const DEFAULT_PASSWORD = '001914';

export interface CreateMemberInput {
  full_name: string;
  phone?: string;
  email?: string;
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
  image: string;
  stage: string;
  roving_mic_1: string;
  roving_mic_2: string;
  attendants: string[];
}

export interface CreateFieldServiceAssignmentInput {
  month: number;
  year: number;
  weekday: string;
  time: string;
  responsible: string;
  location: string;
  category: string;
}

export interface CreateCartAssignmentInput {
  month: number;
  year: number;
  day: number;
  weekday: string;
  time: string;
  location: string;
  publisher1: string;
  publisher2: string;
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
    image: row.image,
    stage: row.stage,
    rovingMic1: row.roving_mic_1,
    rovingMic2: row.roving_mic_2,
    attendants: Array.isArray(row.attendants) ? row.attendants : [],
  };
}

function mapFieldServiceAssignment(row: any) {
  return {
    id: row.id,
    weekday: row.weekday,
    time: row.time,
    responsible: row.responsible,
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
    publisher2: row.publisher2,
    week: row.week,
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
    const normalizedEmail = input.email?.trim() || null;
    const normalizedEmergencyContactName = input.emergency_contact_name?.trim() || null;
    const normalizedEmergencyContactPhone = input.emergency_contact_phone?.replace(/\D/g, '') || null;

    const { error } = await supabase
      .from('members')
      .update({
        full_name: input.full_name,
        phone: input.phone ? input.phone.replace(/\D/g, '') : undefined,
        email: normalizedEmail,
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

  async createMember(input: CreateMemberInput): Promise<{ member_id: string; auth_user_id: string }> {
    const phoneDigits = (input.phone || '').replace(/\D/g, '');
    if (!phoneDigits || phoneDigits.length < 10) {
      throw new Error('Telefone é obrigatório para criar o acesso do membro.');
    }

    // Step 1: Insert into members table
    const { data: member, error: memberError } = await supabase
      .from('members')
      .insert({
        full_name: input.full_name,
        phone: phoneDigits,
        email: input.email || null,
        emergency_contact_name: input.emergency_contact_name || null,
        emergency_contact_phone: input.emergency_contact_phone || null,
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
    try {
      const signUpPromise = isolatedClient.auth.signUp({
        email: authEmail,
        password: DEFAULT_PASSWORD,
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
        const signInResult = await isolatedClient.auth.signInWithPassword({ email: authEmail, password: DEFAULT_PASSWORD });
        if (signInResult.data?.user) {
          const { error: profileErr } = await supabase.from('user_profiles').insert({
            id: signInResult.data.user.id,
            member_id: existingMember.id,
            system_role: input.system_role || 'publicador',
          });
          await isolatedClient.auth.signOut();
          if (profileErr) throw new Error(`Erro ao vincular acesso: ${profileErr.message}`);
          return { member_id: existingMember.id, auth_user_id: signInResult.data.user.id };
        }
        throw new Error('Este telefone já está cadastrado. O membro pode já existir na lista.');
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
    return { member_id: member.id, auth_user_id: authData.user.id };
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

    if (error) throw new Error(`Erro ao buscar designações de áudio e vídeo: ${error.message}`);
    return (data || []).map(mapAudioVideoAssignment);
  },

  async createAudioVideoAssignment(input: CreateAudioVideoAssignmentInput) {
    const { data, error } = await supabase
      .from('audio_video_assignments')
      .insert({
        date: input.date,
        weekday: input.weekday,
        sound: input.sound,
        image: input.image,
        stage: input.stage,
        roving_mic_1: input.roving_mic_1,
        roving_mic_2: input.roving_mic_2,
        attendants: input.attendants,
      })
      .select('*')
      .single();

    if (error) throw new Error(formatDatabaseWriteError('Erro ao criar designação de áudio e vídeo', error));
    return mapAudioVideoAssignment(data);
  },

  async updateAudioVideoAssignment(id: string, input: Partial<CreateAudioVideoAssignmentInput>) {
    const payload: Record<string, any> = {};
    if (input.date !== undefined) payload.date = input.date;
    if (input.weekday !== undefined) payload.weekday = input.weekday;
    if (input.sound !== undefined) payload.sound = input.sound;
    if (input.image !== undefined) payload.image = input.image;
    if (input.stage !== undefined) payload.stage = input.stage;
    if (input.roving_mic_1 !== undefined) payload.roving_mic_1 = input.roving_mic_1;
    if (input.roving_mic_2 !== undefined) payload.roving_mic_2 = input.roving_mic_2;
    if (input.attendants !== undefined) payload.attendants = input.attendants;

    const { data, error } = await supabase
      .from('audio_video_assignments')
      .update(payload)
      .eq('id', id)
      .select('*')
      .single();

    if (error) throw new Error(formatDatabaseWriteError('Erro ao atualizar designação de áudio e vídeo', error));
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

    if (error) throw new Error(`Erro ao buscar saídas de campo: ${error.message}`);
    return (data || []).map(mapFieldServiceAssignment);
  },

  async createFieldServiceAssignment(input: CreateFieldServiceAssignmentInput) {
    const { data, error } = await supabase
      .from('field_service_assignments')
      .insert(input)
      .select('*')
      .single();

    if (error) throw new Error(formatDatabaseWriteError('Erro ao criar saída de campo', error));
    return mapFieldServiceAssignment(data);
  },

  async updateFieldServiceAssignment(id: string, input: Partial<CreateFieldServiceAssignmentInput>) {
    const { data, error } = await supabase
      .from('field_service_assignments')
      .update(input)
      .eq('id', id)
      .select('*')
      .single();

    if (error) throw new Error(formatDatabaseWriteError('Erro ao atualizar saída de campo', error));
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

    if (error) throw new Error(`Erro ao buscar designações de carrinho: ${error.message}`);
    return (data || []).map(mapCartAssignment);
  },

  async createCartAssignment(input: CreateCartAssignmentInput) {
    const { data, error } = await supabase
      .from('cart_assignments')
      .insert(input)
      .select('*')
      .single();

    if (error) throw new Error(formatDatabaseWriteError('Erro ao criar designação de carrinho', error));
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
        president:members!midweek_meetings_president_id_fkey(full_name),
        opening_prayer:members!midweek_meetings_opening_prayer_id_fkey(full_name),
        closing_prayer:members!midweek_meetings_closing_prayer_id_fkey(full_name),
        treasure_talk_speaker:members!midweek_meetings_treasure_talk_speaker_id_fkey(full_name),
        treasure_gems_speaker:members!midweek_meetings_treasure_gems_speaker_id_fkey(full_name),
        treasure_reading_student:members!midweek_meetings_treasure_reading_student_id_fkey(full_name),
        cbs_conductor:members!midweek_meetings_cbs_conductor_id_fkey(full_name),
        cbs_reader:members!midweek_meetings_cbs_reader_id_fkey(full_name),
        ministry_parts:midweek_ministry_parts(*, student:members!midweek_ministry_parts_student_id_fkey(full_name), assistant:members!midweek_ministry_parts_assistant_id_fkey(full_name)),
        christian_life_parts:midweek_christian_life_parts(*, speaker:members!midweek_christian_life_parts_speaker_id_fkey(full_name))
      `)
      .eq('id', createdMeeting.id)
      .single();

    if (fetchError) throw new Error(`Erro ao carregar reunião criada: ${fetchError.message}`);
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
        president:members!weekend_meetings_president_id_fkey(full_name),
        closing_prayer:members!weekend_meetings_closing_prayer_id_fkey(full_name),
        watchtower_conductor:members!weekend_meetings_watchtower_conductor_id_fkey(full_name),
        watchtower_reader:members!weekend_meetings_watchtower_reader_id_fkey(full_name)
      `)
      .single();

    if (error) throw new Error(formatDatabaseWriteError('Erro ao criar reunião de fim de semana', error));
    return data;
  },

  async updateMidweekMeeting(meetingId: string, input: CreateMidweekMeetingInput) {
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
        president:members!midweek_meetings_president_id_fkey(full_name),
        opening_prayer:members!midweek_meetings_opening_prayer_id_fkey(full_name),
        closing_prayer:members!midweek_meetings_closing_prayer_id_fkey(full_name),
        treasure_talk_speaker:members!midweek_meetings_treasure_talk_speaker_id_fkey(full_name),
        treasure_gems_speaker:members!midweek_meetings_treasure_gems_speaker_id_fkey(full_name),
        treasure_reading_student:members!midweek_meetings_treasure_reading_student_id_fkey(full_name),
        cbs_conductor:members!midweek_meetings_cbs_conductor_id_fkey(full_name),
        cbs_reader:members!midweek_meetings_cbs_reader_id_fkey(full_name),
        ministry_parts:midweek_ministry_parts(*, student:members!midweek_ministry_parts_student_id_fkey(full_name), assistant:members!midweek_ministry_parts_assistant_id_fkey(full_name)),
        christian_life_parts:midweek_christian_life_parts(*, speaker:members!midweek_christian_life_parts_speaker_id_fkey(full_name))
      `)
      .eq('id', meetingId)
      .single();

    if (fetchError) throw new Error(`Erro ao carregar reunião atualizada: ${fetchError.message}`);
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
        president:members!weekend_meetings_president_id_fkey(full_name),
        closing_prayer:members!weekend_meetings_closing_prayer_id_fkey(full_name),
        watchtower_conductor:members!weekend_meetings_watchtower_conductor_id_fkey(full_name),
        watchtower_reader:members!weekend_meetings_watchtower_reader_id_fkey(full_name)
      `)
      .single();

    if (error) throw new Error(formatDatabaseWriteError('Erro ao atualizar reunião de fim de semana', error));
    return data;
  },

  // Midweek Meetings 
  async getMidweekMeetings() {
    const { data, error } = await supabase
      .from('midweek_meetings')
      .select(`
        *,
        president:members!midweek_meetings_president_id_fkey(full_name),
        opening_prayer:members!midweek_meetings_opening_prayer_id_fkey(full_name),
        closing_prayer:members!midweek_meetings_closing_prayer_id_fkey(full_name),
        treasure_talk_speaker:members!midweek_meetings_treasure_talk_speaker_id_fkey(full_name),
        treasure_gems_speaker:members!midweek_meetings_treasure_gems_speaker_id_fkey(full_name),
        treasure_reading_student:members!midweek_meetings_treasure_reading_student_id_fkey(full_name),
        cbs_conductor:members!midweek_meetings_cbs_conductor_id_fkey(full_name),
        cbs_reader:members!midweek_meetings_cbs_reader_id_fkey(full_name),
        ministry_parts:midweek_ministry_parts(*, student:members!midweek_ministry_parts_student_id_fkey(full_name), assistant:members!midweek_ministry_parts_assistant_id_fkey(full_name)),
        christian_life_parts:midweek_christian_life_parts(*, speaker:members!midweek_christian_life_parts_speaker_id_fkey(full_name))
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
        president:members!weekend_meetings_president_id_fkey(full_name),
        closing_prayer:members!weekend_meetings_closing_prayer_id_fkey(full_name),
        watchtower_conductor:members!weekend_meetings_watchtower_conductor_id_fkey(full_name),
        watchtower_reader:members!weekend_meetings_watchtower_reader_id_fkey(full_name)
      `)
      .order('date', { ascending: true });

    if (error) throw error;
    return data;
  }
};
