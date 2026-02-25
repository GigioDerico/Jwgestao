import React, { useState } from 'react';
import { Outlet, useNavigate, useLocation, Navigate } from 'react-router';
import { useAuth } from '../context/AuthContext';
import { ProfileDrawer } from './ProfileDrawer';
import {
  LayoutDashboard,
  Users,
  CalendarDays,
  Settings,
  LogOut,
  Menu,
  X,
  BookOpen,
  ChevronRight,
  ChevronDown,
} from 'lucide-react';

export function Layout() {
  const { user, member, logout, isAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  if (!user) {
    return <Navigate to="/" replace />;
  }

  const navItems = [
    { path: '/dashboard', label: 'Painel', icon: LayoutDashboard, roles: ['coordenador', 'secretario', 'designador', 'publicador'] },
    { path: '/meetings', label: 'Reuniões', icon: CalendarDays, roles: ['coordenador', 'secretario', 'designador', 'publicador'] },
    { path: '/members', label: 'Membros', icon: Users, roles: ['coordenador', 'secretario'] },
    { path: '/assignments', label: 'Designações', icon: BookOpen, roles: ['coordenador', 'designador'] },
    { path: '/settings', label: 'Configurações', icon: Settings, roles: ['coordenador'] },
  ];

  const filteredNav = navItems.filter(item => item.roles.includes(user.role));

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const roleLabels: Record<string, string> = {
    coordenador: 'Coordenador',
    secretario: 'Secretário',
    designador: 'Designador',
    publicador: 'Publicador',
  };

  return (
    <div className="flex h-screen bg-background text-foreground">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-50 w-64 bg-primary-foreground text-white transform transition-transform duration-200 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        } flex flex-col`}
      >
        <div className="p-5 border-b border-white/10">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-white tracking-wide" style={{ fontSize: '1.1rem' }}>Salão do Reino</h2>
              <p className="text-white/50 mt-0.5" style={{ fontSize: '0.75rem' }}>Congregação Vicente Nunes</p>
            </div>
            <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-white/70 hover:text-white">
              <X size={20} />
            </button>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {filteredNav.map((item) => {
            const isActive = location.pathname.startsWith(item.path);
            return (
              <button
                key={item.path}
                onClick={() => { navigate(item.path); setSidebarOpen(false); }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-white/60 hover:bg-white/8 hover:text-white/90'
                }`}
              >
                <item.icon size={18} />
                <span style={{ fontSize: '0.9rem' }}>{item.label}</span>
                {isActive && <ChevronRight size={14} className="ml-auto" />}
              </button>
            );
          })}
        </nav>

        {/* User card — clickable to open profile */}
        <div className="p-4 border-t border-white/10">
          <button
            onClick={() => { setProfileOpen(true); setSidebarOpen(false); }}
            className="w-full flex items-center gap-3 mb-3 px-3 py-2.5 rounded-xl hover:bg-white/8 transition-colors group text-left"
          >
            <div className="w-9 h-9 rounded-full overflow-hidden bg-primary flex items-center justify-center shrink-0 group-hover:ring-2 group-hover:ring-[#35bdf8]/40 transition-all">
              {member?.avatar ? (
                <img src={member.avatar} alt={user.name} className="w-full h-full object-cover" />
              ) : (
                <span className="text-primary-foreground font-bold" style={{ fontSize: '0.8rem' }}>
                  {user.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                </span>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-white truncate group-hover:text-[#35bdf8] transition-colors" style={{ fontSize: '0.85rem' }}>{user.name}</p>
              <p className="text-white/50" style={{ fontSize: '0.7rem' }}>{roleLabels[user.role]}</p>
            </div>
            <ChevronDown size={13} className="text-white/30 group-hover:text-[#35bdf8]/70 transition-colors shrink-0 -rotate-90" />
          </button>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-white/50 hover:text-white hover:bg-white/8 transition-colors"
          >
            <LogOut size={16} />
            <span style={{ fontSize: '0.85rem' }}>Sair</span>
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="bg-card border-b border-border px-4 py-3 flex items-center gap-3 shrink-0">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden text-foreground hover:text-primary"
          >
            <Menu size={22} />
          </button>
          <div className="flex-1" />
          {/* Top-bar user pill — also clickable */}
          <button
            onClick={() => setProfileOpen(true)}
            className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full hover:bg-muted/50 transition-colors group"
          >
            <div className="w-6 h-6 rounded-full overflow-hidden bg-primary flex items-center justify-center shrink-0">
              {member?.avatar ? (
                <img src={member.avatar} alt={user.name} className="w-full h-full object-cover" />
              ) : (
                <span className="text-primary-foreground font-bold" style={{ fontSize: '0.65rem' }}>
                  {user.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                </span>
              )}
            </div>
            <span className="text-foreground group-hover:text-primary transition-colors" style={{ fontSize: '0.82rem' }}>{user.name}</span>
          </button>
          <div className="flex items-center gap-2">
            
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <Outlet />
        </main>
      </div>

      {/* Profile Drawer */}
      <ProfileDrawer open={profileOpen} onClose={() => setProfileOpen(false)} />
    </div>
  );
}