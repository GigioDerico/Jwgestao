import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
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

  const buildAuthUser = async (supaUser: User): Promise<AuthUser | null> => {
    try {
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('system_role, member_id')
        .eq('id', supaUser.id)
        .single();

      const phoneDigits = supaUser.email?.replace(`@${PHONE_EMAIL_DOMAIN}`, '') || '';

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
        phone: supaUser.email?.replace(`@${PHONE_EMAIL_DOMAIN}`, '') || '',
        role: 'publicador',
        name: 'Usuário',
      };
    }
  };

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session: s } }) => {
      setSession(s);
      if (s?.user) {
        const authUser = await buildAuthUser(s.user);
        setUser(authUser);
      }
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, s) => {
        setSession(s);
        if (s?.user) {
          const authUser = await buildAuthUser(s.user);
          setUser(authUser);
        } else {
          setUser(null);
        }
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const login = async (phone: string, password: string): Promise<string | null> => {
    const email = phoneToEmail(phone);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return error.message;
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