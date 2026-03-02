import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { ministryApi } from '../../lib/ministry-api';
import { toast } from 'sonner';
import { Play, Square, Plus, BookOpen, FileText } from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../ui/dialog';
import { Input } from '../ui/input';
import { Label } from '../ui/label';

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function FieldDayPage() {
  const { user } = useAuth();
  const userId = user?.id ?? '';

  const [timerRunning, setTimerRunning] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [todayRecords, setTodayRecords] = useState<{ hours: number; return_visits: number; bible_studies: number }[]>([]);
  const [quickDialog, setQuickDialog] = useState<'revisita' | 'estudo' | 'nota' | null>(null);
  const [quickValue, setQuickValue] = useState('');

  const today = new Date().toISOString().slice(0, 10);
  const todayHours = todayRecords.reduce((s, r) => s + Number(r.hours), 0);
  const todayRevisitas = todayRecords.reduce((s, r) => s + r.return_visits, 0);
  const todayEstudos = todayRecords.reduce((s, r) => s + r.bible_studies, 0);

  const loadToday = async () => {
    if (!userId) return;
    try {
      const records = await ministryApi.getFieldRecords(userId);
      const filtered = records.filter((r) => r.date === today);
      setTodayRecords(filtered.map((r) => ({ hours: r.hours, return_visits: r.return_visits, bible_studies: r.bible_studies })));
    } catch {
      setTodayRecords([]);
    }
  };

  useEffect(() => {
    loadToday();
  }, [userId]);

  useEffect(() => {
    if (timerRunning) {
      timerRef.current = setInterval(() => setTimerSeconds((s) => s + 1), 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [timerRunning]);

  const handleStartTimer = () => {
    setTimerSeconds(0);
    setTimerRunning(true);
  };

  const handleStopTimer = async () => {
    setTimerRunning(false);
    const hours = timerSeconds / 3600;
    try {
      await ministryApi.createFieldRecord(userId, {
        date: today,
        hours: Math.round(hours * 100) / 100,
        return_visits: 0,
        bible_studies: 0,
      });
      toast.success('Registro salvo');
      loadToday();
    } catch {
      toast.error('Erro ao salvar');
    }
  };

  const handleQuickAdd = async (type: 'revisita' | 'estudo' | 'nota') => {
    if (!userId) return;
    setQuickDialog(type);
    setQuickValue('');
  };

  const handleQuickSubmit = async () => {
    if (!userId) return;
    try {
      if (quickDialog === 'revisita') {
        await ministryApi.createReturnVisit(userId, { name_or_initials: quickValue || undefined });
        toast.success('Revisita registrada');
      } else if (quickDialog === 'estudo') {
        const records = await ministryApi.getFieldRecords(userId);
        const todayRec = records.find((r) => r.date === today);
        if (todayRec) {
          await ministryApi.updateFieldRecord(todayRec.supabase_id ?? todayRec.local_id, userId, {
            bible_studies: (todayRec.bible_studies ?? 0) + 1,
          });
        } else {
          await ministryApi.createFieldRecord(userId, {
            date: today,
            hours: 0,
            return_visits: 0,
            bible_studies: 1,
          });
        }
        toast.success('Estudo registrado');
      } else if (quickDialog === 'nota') {
        await ministryApi.createFieldRecord(userId, {
          date: today,
          hours: 0,
          return_visits: 0,
          bible_studies: 0,
          notes: quickValue,
        });
        toast.success('Nota adicionada');
      }
      setQuickDialog(null);
      loadToday();
    } catch {
      toast.error('Erro ao registrar');
    }
  };

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-medium text-foreground">Dia de Campo</h2>

      <Card className="border border-border rounded-xl shadow-sm bg-card">
        <CardContent className="pt-6 pb-6">
          <div className="text-center">
            <div className="text-5xl font-bold text-foreground tabular-nums mb-4">
              {formatTime(timerSeconds)}
            </div>
            {!timerRunning ? (
              <Button onClick={handleStartTimer} size="lg" className="gap-2 bg-primary text-primary-foreground">
                <Play size={20} />
                Iniciar Serviço
              </Button>
            ) : (
              <Button onClick={handleStopTimer} variant="outline" size="lg" className="gap-2 border-border">
                <Square size={20} />
                Encerrar Serviço
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-3 gap-2">
        <Button variant="outline" onClick={() => handleQuickAdd('revisita')} className="flex flex-col gap-1 py-4 border-border">
          <Plus size={20} />
          <span className="text-xs">Revisita</span>
        </Button>
        <Button variant="outline" onClick={() => handleQuickAdd('estudo')} className="flex flex-col gap-1 py-4 border-border">
          <BookOpen size={20} />
          <span className="text-xs">Estudo</span>
        </Button>
        <Button variant="outline" onClick={() => handleQuickAdd('nota')} className="flex flex-col gap-1 py-4 border-border">
          <FileText size={20} />
          <span className="text-xs">Nota</span>
        </Button>
      </div>

      <Card className="border border-border rounded-xl shadow-sm bg-card">
        <CardContent className="pt-4">
          <p className="text-sm font-medium text-foreground mb-2">Resumo do dia</p>
          <div className="flex gap-4 text-muted-foreground text-sm">
            <span>{todayHours.toFixed(1)}h</span>
            <span>{todayRevisitas} revisitas</span>
            <span>{todayEstudos} estudos</span>
          </div>
        </CardContent>
      </Card>

      <Dialog open={quickDialog !== null} onOpenChange={() => setQuickDialog(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {quickDialog === 'revisita' && 'Registrar revisita'}
              {quickDialog === 'estudo' && 'Registrar estudo bíblico'}
              {quickDialog === 'nota' && 'Adicionar nota'}
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            {(quickDialog === 'revisita' || quickDialog === 'nota') && (
              <div>
                <Label>{quickDialog === 'revisita' ? 'Nome ou iniciais' : 'Nota'}</Label>
                <Input
                  value={quickValue}
                  onChange={(e) => setQuickValue(e.target.value)}
                  placeholder={quickDialog === 'revisita' ? 'Opcional' : 'Opcional'}
                  className="mt-1"
                />
              </div>
            )}
            {quickDialog === 'estudo' && (
              <p className="text-sm text-muted-foreground">Será adicionado 1 estudo bíblico ao registro de hoje.</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setQuickDialog(null)}>
              Cancelar
            </Button>
            <Button onClick={handleQuickSubmit} className="bg-primary text-primary-foreground">
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
