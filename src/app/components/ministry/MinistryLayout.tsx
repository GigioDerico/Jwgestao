import React from 'react';
import { Outlet, NavLink } from 'react-router';
import { MinistryProvider, useMinistry } from '../../context/MinistryContext';
import { Clock, Users, BookOpen, Target, History, Library, Settings } from 'lucide-react';
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
  { path: '/ministry/library', label: 'Biblioteca', icon: Library },
  { path: '/ministry/settings', label: 'Config', icon: Settings },
];

function MinistryNavigation() {
  return (
    <nav className="flex border-b border-border/40 gap-1 mb-6 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {NAV_ITEMS.map((item) => (
        <NavLink
          key={item.path}
          to={item.path}
          className={({ isActive }) => cn(
            "flex shrink-0 items-center gap-1.5 px-3 sm:px-4 py-2 text-sm font-medium whitespace-nowrap transition-all border-b-2",
            isActive
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          <item.icon size={16} />
          {item.label}
        </NavLink>
      ))}
    </nav>
  );
}

export function MinistryLayout() {
  return (
    <MinistryProvider>
      <div className="max-w-4xl mx-auto">
        <MinistryNavigation />
        <PersistentTimer />
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
          <Outlet />
        </div>
      </div>
    </MinistryProvider>
  );
}
