import React, { useEffect, useRef, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { ministryApi } from '../../lib/ministry-api';
import {
  getMyFieldServicePresence,
  startFieldService,
  stopFieldService,
  subscribeToFieldServicePresence,
  type FieldServicePresence,
} from '../../lib/field-service-live';
import { toast } from 'sonner';
import { BookOpen, FileText, Loader2, MapPin, Play, Plus, Square, Users2 } from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Input } from '../ui/input';
import { Label } from '../ui/label';

function formatTimer(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function formatLastSeen(lastSeenAt: string | null): string {
  if (!lastSeenAt) return 'Sem atualização';
  return new Date(lastSeenAt).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

export function FieldDayPage() {
  const { user } = useAuth();
  const userId = user?.id ?? '';

  const [timerRunning, setTimerRunning] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [todayRecords, setTodayRecords] = useState<Array<{ hours: number; return_visits: number; bible_studies: number }>>([]);
  const [quickDialog, setQuickDialog] = useState<'revisita' | 'estudo' | 'nota' | null>(null);
  const [quickValue, setQuickValue] = useState('');
  const [presenceLoading, setPresenceLoading] = useState(true);
  const [serviceBusy, setServiceBusy] = useState(false);
  const [serviceActive, setServiceActive] = useState(false);
  const [livePeople, setLivePeople] = useState<FieldServicePresence[]>([]);

  const today = new Date().toISOString().slice(0, 10);
  const todayHours = todayRecords.reduce((s, r) => s + Number(r.hours), 0);
  const todayRevisitas = todayRecords.reduce((s, r) => s + r.return_visits, 0);
  const todayEstudos = todayRecords.reduce((s, r) => s + r.bible_studies, 0);

  const actor = user
    ? {
      user_id: user.id,
      member_id: user.member_id ?? null,
      display_name: user.name,
      avatar_url: user.avatar ?? null,
      group_id: user.group_id ?? null,
    }
    : null;

  const loadToday = async () => {
    if (!userId) return;
    try {
      const records = await ministryApi.getFieldRecords(userId);
      const filtered = records.filter((r) => r.date === today);
      setTodayRecords(filtered.map((r) => ({
        hours: r.hours,
        return_visits: r.return_visits,
        bible_studies: r.bible_studies,
      })));
    } catch {
      setTodayRecords([]);
    }
  };

  useEffect(() => {
    void loadToday();
  }, [userId]);

  useEffect(() => {
    if (timerRunning) {
      timerRef.current = setInterval(() => setTimerSeconds((s) => s + 1), 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [timerRunning]);

  useEffect(() => {
    if (!actor) {
      setPresenceLoading(false);
      setServiceActive(false);
      setLivePeople([]);
      return;
    }

    let cancelled = false;
    setPresenceLoading(true);

    void (async () => {
      try {
        const myPresence = await getMyFieldServicePresence(actor.user_id);
        if (!cancelled) {
          setServiceActive(Boolean(myPresence?.is_active));
        }
      } catch (error) {
        console.warn('[FieldDay] Falha ao carregar status de serviço:', error);
      }
    })();

    const unsubscribe = subscribeToFieldServicePresence((rows) => {
      if (cancelled) return;
      setLivePeople(rows);
      setPresenceLoading(false);
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [actor?.user_id]);

  const handleStartService = async () => {
    if (!actor) return;

    setServiceBusy(true);
    try {
      await startFieldService(actor);
      setServiceActive(true);
      setTimerSeconds(0);
      setTimerRunning(true);
      toast.success('Serviço iniciado. Sua localização está sendo compartilhada em tempo real.');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Não foi possível iniciar o serviço.';
      toast.error(message);
    } finally {
      setServiceBusy(false);
    }
  };

  const handleStopService = async () => {
    if (!actor) return;

    setServiceBusy(true);
    try {
      await stopFieldService(actor);
      setServiceActive(false);

      const seconds = timerSeconds;
      setTimerRunning(false);
      setTimerSeconds(0);

      const hours = seconds / 3600;
      if (hours > 0.01) {
        await ministryApi.createFieldRecord(actor.user_id, {
          date: today,
          hours: Math.round(hours * 100) / 100,
          return_visits: 0,
          bible_studies: 0,
        });
        await loadToday();
      }

      toast.success('Serviço encerrado.');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Não foi possível encerrar o serviço.';
      toast.error(message);
    } finally {
      setServiceBusy(false);
    }
  };

  const handleQuickAdd = (type: 'revisita' | 'estudo' | 'nota') => {
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
      await loadToday();
    } catch {
      toast.error('Erro ao registrar');
    }
  };

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-medium text-foreground">Saída de Campo</h2>

      <Card className="border border-border rounded-xl shadow-sm bg-card">
        <CardContent className="pt-6 pb-6">
          <div className="text-center">
            <div className="text-5xl font-bold text-foreground tabular-nums mb-4">
              {formatTimer(timerSeconds)}
            </div>
            {!serviceActive ? (
              <Button
                onClick={handleStartService}
                size="lg"
                disabled={serviceBusy}
                className="gap-2 bg-primary text-primary-foreground"
              >
                {serviceBusy ? <Loader2 size={18} className="animate-spin" /> : <Play size={20} />}
                Iniciar Serviço
              </Button>
            ) : (
              <Button
                onClick={handleStopService}
                variant="outline"
                size="lg"
                disabled={serviceBusy}
                className="gap-2 border-border"
              >
                {serviceBusy ? <Loader2 size={18} className="animate-spin" /> : <Square size={20} />}
                Encerrar Serviço
              </Button>
            )}
            <p className="mt-3 text-xs text-muted-foreground">
              Ao iniciar, sua localização passa a ser atualizada em tempo real para quem está no campo.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className="border border-border rounded-xl shadow-sm bg-card">
        <CardContent className="pt-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium text-foreground flex items-center gap-2">
              <Users2 size={16} />
              Pessoas em Campo
            </p>
            <span className="text-xs text-muted-foreground">
              {livePeople.length} ativo(s)
            </span>
          </div>

          {presenceLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 size={16} className="animate-spin" />
              Carregando localização em tempo real...
            </div>
          ) : livePeople.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nenhuma pessoa com serviço ativo no momento.
            </p>
          ) : (
            <ul className="space-y-2">
              {livePeople.map((person) => {
                const hasCoords = typeof person.last_lat === 'number' && typeof person.last_lng === 'number';
                const mapsUrl = hasCoords
                  ? `https://www.google.com/maps?q=${person.last_lat},${person.last_lng}`
                  : null;

                return (
                  <li key={person.user_id} className="border border-border rounded-lg px-3 py-2.5">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {person.display_name}
                          {person.user_id === userId && (
                            <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary">
                              Você
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Atualizado: {formatLastSeen(person.last_seen_at)}
                        </p>
                        {hasCoords ? (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Lat {Number(person.last_lat).toFixed(5)} | Lng {Number(person.last_lng).toFixed(5)}
                          </p>
                        ) : (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Aguardando primeira coordenada...
                          </p>
                        )}
                      </div>

                      {mapsUrl ? (
                        <a
                          href={mapsUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="shrink-0 inline-flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-md border border-border hover:bg-muted transition-colors"
                        >
                          <MapPin size={13} />
                          Ver mapa
                        </a>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
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
                  placeholder="Opcional"
                  className="mt-1"
                />
              </div>
            )}
            {quickDialog === 'estudo' && (
              <p className="text-sm text-muted-foreground">
                Será adicionado 1 estudo bíblico ao registro de hoje.
              </p>
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
