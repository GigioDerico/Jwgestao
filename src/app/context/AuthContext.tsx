import React, { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
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
}

interface AuthContextType {
  user: AuthUser | null;
  session: Session | null;
  loading: boolean;
  login: (phone: string, password: string) => Promise<string | null>;
  logout: () => Promise<void>;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  login: async () => 'not initialized',
  logout: async () => { },
  isAdmin: false,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const loginResolverRef = useRef<((user: AuthUser | null) => void) | null>(null);

  const buildAuthUser = useCallback(async (supaUser: User): Promise<AuthUser> => {
    const phoneDigits = supaUser.email?.replace(`@${PHONE_EMAIL_DOMAIN}`, '') || '';
    try {
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('system_role, member_id')
        .eq('id', supaUser.id)
        .single();

      if (profile?.member_id) {
        const { data: member } = await supabase
          .from('members')
          .select('full_name')
          .eq('id', profile.member_id)
          .single();

        return {
          id: supaUser.id,
          phone: phoneDigits,
          role: profile.system_role || 'publicador',
          name: member?.full_name || 'Usuário',
        };
      }

      return {
        id: supaUser.id,
        phone: phoneDigits,
        role: profile?.system_role || 'publicador',
        name: 'Usuário',
      };
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
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000);

        const { data: { session: s } } = await supabase.auth.getSession();
        clearTimeout(timeoutId);

        if (cancelled) return;

        setSession(s);
        if (s?.user) {
          const authUser = await buildAuthUser(s.user);
          if (!cancelled) setUser(authUser);
        }
      } catch (err) {
        console.warn('[Auth] Falha ao restaurar sessão:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    initSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, s) => {
        setSession(s);
        if (s?.user) {
          const authUser = await buildAuthUser(s.user);
          setUser(authUser);
          // Resolve pending login promise if exists
          if (loginResolverRef.current) {
            loginResolverRef.current(authUser);
            loginResolverRef.current = null;
          }
        } else {
          setUser(null);
          if (loginResolverRef.current) {
            loginResolverRef.current(null);
            loginResolverRef.current = null;
          }
        }
        setLoading(false);
      }
    );

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [buildAuthUser]);

  const login = async (phone: string, password: string): Promise<string | null> => {
    const email = phoneToEmail(phone);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return error.message;

    // Wait for onAuthStateChange to finish building the user (max 8s)
    try {
      await Promise.race([
        new Promise<AuthUser | null>((resolve) => {
          loginResolverRef.current = resolve;
        }),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Login timeout')), 8000)
        ),
      ]);
    } catch {
      console.warn('[Auth] Timeout aguardando construção do perfil pós-login');
    }

    return null;
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
  };

  const isAdmin = user?.role === 'coordenador' || user?.role === 'secretario' || user?.role === 'designador';

  return (
    <AuthContext.Provider value={{ user, session, loading, login, logout, isAdmin }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);