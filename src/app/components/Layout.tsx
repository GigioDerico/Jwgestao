import React, { useEffect, useState } from 'react';
import { Outlet, useNavigate, useLocation, Navigate } from 'react-router';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationsContext';
import { usePermissions } from '../hooks/usePermissions';
import { ProfileDrawer } from './ProfileDrawer';
import { toast } from 'sonner';
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
  Bell,
  Check,
  CheckCheck,
  Loader2,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';

const SIDEBAR_COLLAPSED_KEY = 'jwgestao-sidebar-collapsed';

export function Layout() {
  const { user, logout, loading } = useAuth();
  const { can } = usePermissions();
  const {
    notifications,
    unreadCount,
    pendingCount,
    loading: notificationsLoading,
    markRead,
    markAllRead,
    confirm,
  } = useNotifications();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [assignmentsMenuOpen, setAssignmentsMenuOpen] = useState(location.pathname.startsWith('/assignments'));
  const canViewAssignments = can('view_assignments');

  const canManageAssignments = user?.role === 'coordenador' || user?.role === 'designador';
  const assignmentChildren = canManageAssignments
    ? [
      { path: '/assignments/meetings', label: 'Reuniões' },
      { path: '/assignments/audio-video', label: 'Áudio e Vídeo' },
      { path: '/assignments/field-service', label: 'Saída de Campo' },
      { path: '/assignments/cart', label: 'Carrinho' },
    ]
    : [
      ...(user?.approved_audio_video || user?.approved_indicadores
        ? [{ path: '/assignments/audio-video', label: 'Áudio e Vídeo' }]
        : []),
      ...(user?.approved_carrinho ? [{ path: '/assignments/cart', label: 'Carrinho' }] : []),
    ];

  const navItems = [
    { path: '/dashboard', label: 'Painel', icon: LayoutDashboard, roles: ['coordenador', 'secretario', 'designador', 'publicador'] },
    { path: '/meetings', label: 'Reuniões', icon: CalendarDays, roles: ['coordenador', 'secretario', 'designador', 'publicador'] },
    { path: '/members', label: 'Membros', icon: Users, roles: ['coordenador', 'secretario'] },
    ...(canViewAssignments && assignmentChildren.length > 0
      ? [{
        path: '/assignments',
        label: 'Designações',
        icon: BookOpen,
        roles: ['coordenador', 'designador', 'publicador'],
        children: assignmentChildren,
      }]
      : []),
    { path: '/settings', label: 'Configurações', icon: Settings, roles: ['coordenador'] },
  ];

  useEffect(() => {
    try {
      setSidebarCollapsed(globalThis.localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === '1');
    } catch (storageError) {
      console.warn('[Layout] Nao foi possivel carregar a preferencia do menu lateral:', storageError);
    }
  }, []);

  useEffect(() => {
    if (location.pathname.startsWith('/assignments')) {
      setAssignmentsMenuOpen(true);
    }
  }, [location.pathname]);

  const filteredNav = user
    ? navItems
      .filter(item => item.roles.includes(user.role))
      .map(item => ({
        ...item,
        children: item.children,
      }))
    : [];

  const handleLogout = async () => {
    setNotificationsOpen(false);
    setProfileOpen(false);
    setSidebarOpen(false);
    await logout();
    navigate('/', { replace: true });
  };

  const toggleSidebarCollapsed = () => {
    setAssignmentsMenuOpen(false);
    setSidebarCollapsed(current => {
      const next = !current;

      try {
        if (next) {
          globalThis.localStorage.setItem(SIDEBAR_COLLAPSED_KEY, '1');
        } else {
          globalThis.localStorage.removeItem(SIDEBAR_COLLAPSED_KEY);
        }
      } catch (storageError) {
        console.warn('[Layout] Nao foi possivel salvar a preferencia do menu lateral:', storageError);
      }

      return next;
    });
  };

  const roleLabels: Record<string, string> = {
    coordenador: 'Coordenador',
    secretario: 'Secretário',
    designador: 'Designador',
    publicador: 'Publicador',
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="animate-spin text-primary" size={32} />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/" replace />;
  }

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
        className={`fixed lg:static inset-y-0 left-0 z-50 w-64 ${sidebarCollapsed ? 'lg:w-20' : 'lg:w-64'} bg-primary-foreground text-white transform transition-all duration-200 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
          } flex flex-col`}
      >
        <div className="p-5 border-b border-white/10">
          <div className="flex items-center justify-between">
            <div className={`min-w-0 ${sidebarCollapsed ? 'hidden lg:block lg:text-center lg:w-full' : ''}`}>
              {sidebarCollapsed ? (
                <div
                  className="hidden lg:flex h-10 w-10 items-center justify-center rounded-2xl bg-white/8 text-white mx-auto"
                  title="Expandir menu lateral"
                >
                  <span className="font-bold" style={{ fontSize: '0.9rem' }}>SR</span>
                </div>
              ) : (
                <>
                  <h2 className="text-white tracking-wide" style={{ fontSize: '1.1rem' }}>Salão do Reino</h2>
                  <p className="text-white/50 mt-0.5" style={{ fontSize: '0.75rem' }}>Congregação Vicente Nunes</p>
                </>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={toggleSidebarCollapsed}
                className="hidden lg:inline-flex h-9 w-9 items-center justify-center rounded-xl text-white/70 transition-colors hover:bg-white/8 hover:text-white"
                title={sidebarCollapsed ? 'Expandir menu lateral' : 'Recolher menu lateral'}
              >
                {sidebarCollapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
              </button>
              <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-white/70 hover:text-white">
                <X size={20} />
              </button>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {filteredNav.map((item) => {
            const isActive = location.pathname.startsWith(item.path);
            const hasChildren = Boolean(item.children?.length);

            if (hasChildren) {
              const isExpanded = assignmentsMenuOpen || isActive;

              return (
                <div key={item.path} className={`space-y-1 ${sidebarCollapsed ? 'relative' : ''}`}>
                  <button
                    onClick={() => setAssignmentsMenuOpen(value => !value)}
                    title={item.label}
                    className={`w-full flex items-center gap-3 rounded-lg transition-colors ${sidebarCollapsed ? 'lg:justify-center lg:px-0' : 'px-3'} py-2.5 ${isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'text-white/60 hover:bg-white/8 hover:text-white/90'
                      }`}
                  >
                    <item.icon size={18} />
                    {!sidebarCollapsed && <span style={{ fontSize: '0.9rem' }}>{item.label}</span>}
                    {!sidebarCollapsed && (isExpanded ? (
                      <ChevronDown size={14} className="ml-auto" />
                    ) : (
                      <ChevronRight size={14} className="ml-auto" />
                    ))}
                  </button>

                  {isExpanded && (
                    <div
                      className={
                        sidebarCollapsed
                          ? 'lg:absolute lg:left-full lg:top-0 lg:ml-3 lg:min-w-56 lg:rounded-2xl lg:border lg:border-white/10 lg:bg-primary-foreground lg:p-2 lg:shadow-2xl'
                          : 'ml-9 space-y-1'
                      }
                    >
                      {sidebarCollapsed && (
                        <div className="hidden lg:block px-3 py-2 text-white/50" style={{ fontSize: '0.72rem' }}>
                          {item.label}
                        </div>
                      )}
                      {item.children?.map((child) => {
                        const isChildActive = location.pathname === child.path;

                        return (
                          <button
                            key={child.path}
                            onClick={() => {
                              navigate(child.path);
                              setSidebarOpen(false);
                              setAssignmentsMenuOpen(false);
                            }}
                            className={`w-full rounded-lg px-3 py-2 text-left transition-colors ${isChildActive
                              ? 'bg-white/12 text-white'
                              : 'text-white/50 hover:bg-white/8 hover:text-white/85'
                              }`}
                            style={{ fontSize: '0.82rem' }}
                          >
                            {child.label}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            }

            return (
              <button
                key={item.path}
                onClick={() => { navigate(item.path); setSidebarOpen(false); }}
                title={item.label}
                className={`w-full flex items-center gap-3 rounded-lg transition-colors ${sidebarCollapsed ? 'lg:justify-center lg:px-0' : 'px-3'} py-2.5 ${isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-white/60 hover:bg-white/8 hover:text-white/90'
                  }`}
              >
                <item.icon size={18} />
                {!sidebarCollapsed && <span style={{ fontSize: '0.9rem' }}>{item.label}</span>}
                {!sidebarCollapsed && isActive && <ChevronRight size={14} className="ml-auto" />}
              </button>
            );
          })}
        </nav>

        {/* User card — clickable to open profile */}
        <div className="p-4 border-t border-white/10">
          <button
            onClick={() => { setProfileOpen(true); setSidebarOpen(false); }}
            title={user.name}
            className={`w-full flex items-center gap-3 mb-3 rounded-xl hover:bg-white/8 transition-colors group text-left ${sidebarCollapsed ? 'lg:justify-center lg:px-0 py-2.5' : 'px-3 py-2.5'}`}
          >
            <div className="w-9 h-9 rounded-full overflow-hidden bg-primary flex items-center justify-center shrink-0 group-hover:ring-2 group-hover:ring-[#35bdf8]/40 transition-all">
              {user.avatar ? (
                <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
              ) : (
                <span className="text-primary-foreground font-bold" style={{ fontSize: '0.8rem' }}>
                  {user.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                </span>
              )}
            </div>
            {!sidebarCollapsed && (
              <>
                <div className="min-w-0 flex-1">
                  <p className="text-white truncate group-hover:text-[#35bdf8] transition-colors" style={{ fontSize: '0.85rem' }}>{user.name}</p>
                  <p className="text-white/50" style={{ fontSize: '0.7rem' }}>{roleLabels[user.role]}</p>
                </div>
                <ChevronDown size={13} className="text-white/30 group-hover:text-[#35bdf8]/70 transition-colors shrink-0 -rotate-90" />
              </>
            )}
          </button>
          <button
            onClick={handleLogout}
            title="Sair"
            className={`w-full flex items-center gap-2 rounded-lg text-white/50 hover:text-white hover:bg-white/8 transition-colors ${sidebarCollapsed ? 'lg:justify-center lg:px-0 py-2.5' : 'px-3 py-2'}`}
          >
            <LogOut size={16} />
            {!sidebarCollapsed && <span style={{ fontSize: '0.85rem' }}>Sair</span>}
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="relative bg-card border-b border-border px-4 py-3 flex items-center gap-3 shrink-0">
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
              {user.avatar ? (
                <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
              ) : (
                <span className="text-primary-foreground font-bold" style={{ fontSize: '0.65rem' }}>
                  {user.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                </span>
              )}
            </div>
            <span className="text-foreground group-hover:text-primary transition-colors" style={{ fontSize: '0.82rem' }}>{user.name}</span>
          </button>
          <div className="relative flex items-center gap-2">
            <button
              onClick={() => setNotificationsOpen(value => !value)}
              className="relative inline-flex h-9 w-9 items-center justify-center rounded-full text-foreground transition-colors hover:bg-muted/50 hover:text-primary"
              aria-label="Abrir notificações"
            >
              <Bell size={18} />
              {unreadCount > 0 && (
                <span className="absolute -right-0.5 -top-0.5 inline-flex min-w-[18px] items-center justify-center rounded-full bg-primary px-1 text-[0.65rem] font-semibold text-primary-foreground">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {notificationsOpen && (
              <div className="absolute right-0 top-11 z-30 w-[min(92vw,380px)] overflow-hidden rounded-2xl border border-border bg-card shadow-xl">
                <div className="border-b border-border px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-foreground font-medium" style={{ fontSize: '0.9rem' }}>
                        Notificações
                      </p>
                      <p className="text-muted-foreground" style={{ fontSize: '0.78rem' }}>
                        {pendingCount} pendente(s) de confirmação
                      </p>
                    </div>
                    {unreadCount > 0 && (
                      <button
                        onClick={async () => {
                          try {
                            await markAllRead();
                          } catch (error: any) {
                            toast.error(error?.message || 'Erro ao marcar notificações como lidas.');
                          }
                        }}
                        className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-primary transition-colors hover:bg-muted"
                        style={{ fontSize: '0.75rem' }}
                      >
                        <CheckCheck size={14} />
                        Marcar todas
                      </button>
                    )}
                  </div>
                </div>

                <div className="max-h-[70vh] overflow-y-auto">
                  {notificationsLoading ? (
                    <div className="px-4 py-6 text-center text-muted-foreground" style={{ fontSize: '0.82rem' }}>
                      Carregando notificações...
                    </div>
                  ) : notifications.length === 0 ? (
                    <div className="px-4 py-6 text-center text-muted-foreground" style={{ fontSize: '0.82rem' }}>
                      Nenhuma notificação ativa.
                    </div>
                  ) : (
                    notifications.map(notification => (
                      <div
                        key={notification.id}
                        className={`border-b border-border/70 px-4 py-3 ${notification.isRead ? 'bg-card' : 'bg-primary/5'}`}
                      >
                        <div className="flex items-start gap-3">
                          <span
                            className={`mt-1 inline-flex h-2.5 w-2.5 shrink-0 rounded-full ${notification.status === 'confirmed' ? 'bg-green-500' : 'bg-amber-500'}`}
                          />
                          <div className="min-w-0 flex-1">
                            <p className="text-foreground font-medium" style={{ fontSize: '0.82rem' }}>
                              {notification.title}
                            </p>
                            <p className="mt-0.5 text-muted-foreground" style={{ fontSize: '0.76rem' }}>
                              {notification.message}
                            </p>
                            <div className="mt-2 flex flex-wrap gap-2">
                              {!notification.isRead && (
                                <button
                                  onClick={async () => {
                                    try {
                                      await markRead(notification.id);
                                    } catch (error: any) {
                                      toast.error(error?.message || 'Erro ao marcar notificação como lida.');
                                    }
                                  }}
                                  className="rounded-lg bg-muted px-2.5 py-1 text-foreground transition-colors hover:bg-muted/80"
                                  style={{ fontSize: '0.74rem' }}
                                >
                                  Marcar como lida
                                </button>
                              )}
                              {notification.status === 'pending_confirmation' ? (
                                <button
                                  onClick={async () => {
                                    try {
                                      await confirm(notification.id);
                                    } catch (error: any) {
                                      toast.error(error?.message || 'Erro ao confirmar designação.');
                                    }
                                  }}
                                  className="rounded-lg bg-primary px-2.5 py-1 text-primary-foreground transition-colors hover:bg-primary/90"
                                  style={{ fontSize: '0.74rem' }}
                                >
                                  Confirmar
                                </button>
                              ) : (
                                <span className="inline-flex items-center gap-1 rounded-lg bg-green-50 px-2.5 py-1 text-green-700" style={{ fontSize: '0.74rem' }}>
                                  <Check size={12} />
                                  Confirmada
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
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
