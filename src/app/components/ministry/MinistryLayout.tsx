import React from 'react';
import { Outlet } from 'react-router';
import { MinistryProvider, useMinistry } from '../../context/MinistryContext';
import { Clock } from 'lucide-react';

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

export function MinistryLayout() {
  return (
    <MinistryProvider>
      <div className="max-w-4xl mx-auto">
        <PersistentTimer />
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
          <Outlet />
        </div>
      </div>
    </MinistryProvider>
  );
}
