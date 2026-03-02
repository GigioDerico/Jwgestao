import React from 'react';
import { Outlet, NavLink, useLocation } from 'react-router';
import { MinistryProvider, useMinistry } from '../../context/MinistryContext';
import { Clock, Users, BookOpen, Target, History, Settings, MoreHorizontal } from 'lucide-react';
import { cn } from '../../lib/utils';

function formatTimer(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function PersistentTimer() {
  const { timerSeconds, isTimerRunning } = useMinistry();

  if (!isTimerRunning) return null;

  return (
    <div className="sticky top-0 z-30 px-4 py-2 mb-4 animate-in slide-in-from-top duration-300">
      <div className="flex items-center justify-between px-4 py-2.5 bg-primary/95 backdrop-blur-md rounded-full text-primary-foreground shadow-lg border border-white/20">
        <div className="flex items-center gap-2">
          <Clock className="animate-pulse" size={16} />
          <span className="text-xs font-medium uppercase tracking-wider">Serviço Ativo</span>
        </div>
        <span className="text-lg font-bold tabular-nums">{formatTimer(timerSeconds)}</span>
      </div>
    </div>
  );
}

const NAV_ITEMS = [
  { path: '/ministry/field-record', label: 'Campo', icon: Clock },
  { path: '/ministry/return-visits', label: 'Revisitas', icon: Users },
  { path: '/ministry/studies', label: 'Estudos', icon: BookOpen },
  { path: '/ministry/goals', label: 'Metas', icon: Target },
  { path: '/ministry/history', label: 'Histórico', icon: History },
];

const MORE_ITEMS = [
  { path: '/ministry/territory', label: 'Território', icon: Settings },
  { path: '/ministry/field-day', label: 'Dia de Campo', icon: Settings },
  { path: '/ministry/journal', label: 'Diário', icon: Settings },
  { path: '/ministry/settings', label: 'Config', icon: Settings },
];

function MinistryNavigation() {
  const location = useLocation();

  return (
    <>
      {/* Top Tabs - Desktop/Tablet */}
      <div className="hidden sm:flex border-b border-border/40 gap-1 mb-6 overflow-x-auto no-scrollbar">
        {NAV_ITEMS.concat(MORE_ITEMS.slice(0, 1)).map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) => cn(
              "px-4 py-2 text-sm font-medium transition-all border-b-2",
              isActive
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            {item.label}
          </NavLink>
        ))}
      </div>

      {/* Bottom Nav - Mobile Exclusive */}
      <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-50 px-4 pb-6 pt-2 bg-gradient-to-t from-background via-background/95 to-transparent pointer-events-none">
        <div className="flex items-center justify-between p-1 bg-card/80 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl pointer-events-auto max-w-sm mx-auto">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => cn(
                "flex flex-col items-center gap-1 flex-1 py-1.5 rounded-xl transition-all",
                isActive
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-muted/50"
              )}
            >
              <item.icon size={20} />
              <span className="text-[10px] font-medium">{item.label}</span>
            </NavLink>
          ))}

          {/* Menu More - Minimalist */}
          <div className="group relative flex flex-col items-center gap-1 flex-1 py-1.5 rounded-xl text-muted-foreground">
            <MoreHorizontal size={20} />
            <span className="text-[10px] font-medium">Mais</span>
            <div className="absolute bottom-full right-0 mb-4 w-48 bg-card/95 backdrop-blur-xl border border-border shadow-2xl rounded-2xl p-2 hidden group-hover:block transition-all opacity-100 scale-100">
              {MORE_ITEMS.map(subItem => (
                <NavLink
                  key={subItem.path}
                  to={subItem.path}
                  className={({ isActive }) => cn(
                    "block px-3 py-2 rounded-lg text-sm transition-all",
                    isActive ? "bg-primary/10 text-primary font-medium" : "hover:bg-muted text-foreground/80"
                  )}
                >
                  {subItem.label}
                </NavLink>
              ))}
            </div>
          </div>
        </div>
      </nav>
    </>
  );
}

export function MinistryLayout() {
  return (
    <MinistryProvider>
      <div className="max-w-4xl mx-auto pb-24 sm:pb-0">
        <MinistryNavigation />
        <PersistentTimer />
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
          <Outlet />
        </div>
      </div>
    </MinistryProvider>
  );
}
