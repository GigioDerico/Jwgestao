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
  // Members (includes system_role from user_profiles via join)
  async getMembers() {
    const { data, error } = await supabase
      .from('members')
      .select('*, user_profiles(system_role)')
      .order('full_name');

    if (error) throw error;

    // Flatten system_role from the joined user_profiles onto each member
    return (data || []).map((m: any) => ({
      ...m,
      system_role: Array.isArray(m.user_profiles)
        ? m.user_profiles[0]?.system_role ?? 'publicador'
        : m.user_profiles?.system_role ?? 'publicador',
      user_profiles: undefined,
    }));
  },

  async createMember(input: CreateMemberInput): Promise<{ member_id: string; auth_user_id: string }> {
    const phoneDigits = (input.phone || '').replace(/\D/g, '');
    if (!phoneDigits || phoneDigits.length < 10) {
      throw new Error('Telefone é obrigatório para criar o acesso do membro.');
    }

    // Step 1: Insert into members table
    console.log('[createMember] Step 1: Inserting member...');
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

    console.log('[createMember] Step 1 done:', { id: member?.id, err: memberError?.message });
    if (memberError) {
      throw new Error(`Erro ao criar membro: ${memberError.message}`);
    }

    // Step 2: Create auth user with isolated client
    console.log('[createMember] Step 2: Creating auth user...');
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

    console.log('[createMember] Step 2 done:', { userId: authData?.user?.id, err: authError?.message });

    if (authError) {
      await supabase.from('members').delete().eq('id', member.id);
      throw new Error(`Erro ao criar acesso: ${authError.message}`);
    }
    if (!authData?.user) {
      await supabase.from('members').delete().eq('id', member.id);
      throw new Error('Erro inesperado: usuário auth não foi criado.');
    }

    // Step 3: Insert into user_profiles
    console.log('[createMember] Step 3: Creating user_profile...');
    const { error: profileError } = await supabase
      .from('user_profiles')
      .insert({
        id: authData.user.id,
        member_id: member.id,
        system_role: input.system_role || 'publicador',
      });

    console.log('[createMember] Step 3 done:', { err: profileError?.message });
    if (profileError) {
      console.error('[API] Falha ao criar user_profiles:', profileError.message);
    }

    await isolatedClient.auth.signOut();
    console.log('[createMember] ✅ Completed!');
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

