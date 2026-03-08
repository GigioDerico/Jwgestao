import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import type { Session, User } from '@supabase/supabase-js';

const PHONE_EMAIL_DOMAIN = 'jwgestao.app';

export function phoneToEmail(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  return `${digits}@${PHONE_EMAIL_DOMAIN}`;
}

interface AuthUser {
  id: string;
  phone: string;
  role: string;
  name: string;
  gender?: string;
  spiritual_status?: string;
  member_id?: string;
  group_id?: string;
  avatar?: string;
  approved_audio_video?: boolean;
  approved_sound?: boolean;
  approved_image?: boolean;
  approved_stage?: boolean;
  approved_roving_mic?: boolean;
  approved_indicadores?: boolean;
  approved_carrinho?: boolean;
}

interface AuthContextType {
  user: AuthUser | null;
  session: Session | null;
  loading: boolean;
  login: (phone: string, password: string) => Promise<string | null>;
  logout: () => Promise<void>;
  isAdmin: boolean;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  login: async () => 'not initialized',
  logout: async () => { },
  isAdmin: false,
  refreshUser: async () => { },
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const buildAuthUser = useCallback(async (supaUser: User): Promise<AuthUser> => {
    const phoneDigits = supaUser.email?.replace(`@${PHONE_EMAIL_DOMAIN}`, '') || '';
    try {
      const { data: profileRows, error: profileError } = await supabase
        .from('user_profiles')
        .select('system_role, member_id')
        .eq('id', supaUser.id)
        .limit(1);

      if (profileError) {
        throw profileError;
      }

      const profile = profileRows?.[0];
      const baseUser: AuthUser = {
        id: supaUser.id,
        phone: phoneDigits,
        role: profile?.system_role || 'publicador',
        name: 'Usuário',
        member_id: profile?.member_id || undefined,
      };

      if (profile?.member_id) {
        const { data: memberRows, error: memberError } = await supabase
          .from('members')
          .select('full_name, gender, spiritual_status, group_id, avatar_url, approved_audio_video, approved_sound, approved_image, approved_stage, approved_roving_mic, approved_indicadores, approved_carrinho')
          .eq('id', profile.member_id)
          .limit(1);

        if (memberError) {
          console.warn('[Auth] Falha ao buscar membro do usuario autenticado:', memberError);
          return baseUser;
        }

        const member = memberRows?.[0];

        return {
          ...baseUser,
          name: member?.full_name || baseUser.name,
          gender: member?.gender || undefined,
          spiritual_status: member?.spiritual_status || undefined,
          group_id: (member as any)?.group_id || undefined,
          avatar: (member as any)?.avatar_url || undefined,
          approved_audio_video: Boolean((member as any)?.approved_audio_video),
          approved_sound: Boolean((member as any)?.approved_sound),
          approved_image: Boolean((member as any)?.approved_image),
          approved_stage: Boolean((member as any)?.approved_stage),
          approved_roving_mic: Boolean((member as any)?.approved_roving_mic),
          approved_indicadores: Boolean((member as any)?.approved_indicadores),
          approved_carrinho: Boolean((member as any)?.approved_carrinho),
        };
      }

      return baseUser;
    } catch {
      return {
        id: supaUser.id,
        phone: phoneDigits,
        role: 'publicador',
        name: 'Usuário',
      };
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    const initSession = async () => {
      try {
        const sessionResult = await Promise.race([
          supabase.auth.getSession(),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('SESSION_TIMEOUT')), 3000),
          ),
        ]);

        const { data: { session: s } } = sessionResult;

        if (cancelled) return;

        setSession(s);
        if (s?.user) {
          const authUser = await buildAuthUser(s.user);
          if (!cancelled) setUser(authUser);
        }
      } catch (err) {
        if (err instanceof Error && err.message === 'SESSION_TIMEOUT') {
          console.warn('[Auth] Timeout ao restaurar sessão. Prosseguindo sem sessão ativa.');
        } else {
          console.warn('[Auth] Falha ao restaurar sessão:', err);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    initSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, s) => {
        setSession(s);

        if (!s?.user) {
          setUser(null);
          setLoading(false);
          return;
        }

        // Avoid Supabase calls directly inside the auth callback.
        // Doing so can deadlock calls like auth.updateUser().
        setTimeout(() => {
          void (async () => {
            try {
              const authUser = await buildAuthUser(s.user);
              if (!cancelled) {
                setUser(authUser);
              }
            } finally {
              if (!cancelled) {
                setLoading(false);
              }
            }
          })();
        }, 0);
      }
    );

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [buildAuthUser]);

  const login = async (phone: string, password: string): Promise<string | null> => {
    const email = phoneToEmail(phone);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return error.message;

    setSession(data.session ?? null);

    if (data.user) {
      const authUser = await buildAuthUser(data.user);
      setUser(authUser);
    }

    setLoading(false);

    return null;
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
  };

  const isAdmin = user?.role === 'coordenador' || user?.role === 'secretario' || user?.role === 'designador';

  const refreshUser = async () => {
    if (!session?.user) return;
    const updated = await buildAuthUser(session.user);
    setUser(updated);
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, login, logout, isAdmin, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
