import React, { createContext, useContext, useState, ReactNode } from 'react';
import { UserProfile, userProfiles, members as allMembers, Member } from '../data/mockData';

interface AuthContextType {
  user: UserProfile | null;
  member: Member | null;
  login: (email: string, password: string) => boolean;
  logout: () => void;
  isAdmin: boolean;
  updateMember: (data: Partial<Member>) => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  member: null,
  login: () => false,
  logout: () => {},
  isAdmin: false,
  updateMember: () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [member, setMember] = useState<Member | null>(null);

  const login = (email: string, _password: string) => {
    const demoAccounts: Record<string, string> = {
      'admin@congregacao.com': 'u1',
      'secretario@congregacao.com': 'u2',
      'designador@congregacao.com': 'u3',
      'publicador@congregacao.com': 'u4',
    };

    const userId = demoAccounts[email];
    if (userId) {
      const profile = userProfiles.find(u => u.id === userId);
      if (profile) {
        setUser(profile);
        const linkedMember = allMembers.find(m => m.id === profile.memberId) || null;
        setMember(linkedMember);
        return true;
      }
    }
    return false;
  };

  const logout = () => {
    setUser(null);
    setMember(null);
  };

  const updateMember = (data: Partial<Member>) => {
    setMember(prev => prev ? { ...prev, ...data } : prev);
    if (data.full_name && user) {
      setUser(prev => prev ? { ...prev, name: data.full_name! } : prev);
    }
  };

  const isAdmin = user?.role === 'coordenador' || user?.role === 'secretario' || user?.role === 'designador';

  return (
    <AuthContext.Provider value={{ user, member, login, logout, isAdmin, updateMember }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);