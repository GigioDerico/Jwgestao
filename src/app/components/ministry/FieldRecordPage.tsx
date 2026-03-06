import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useMinistry } from '../../context/MinistryContext';
import { ministryApi, type LocalFieldRecord, type CreateFieldRecordInput } from '../../lib/ministry-api';
import { toast } from 'sonner';
import { Plus, Trash2, Edit2, Play, Square, Clock, BookOpen, FileText } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Textarea } from '../ui/textarea';

function formatTimer(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function FieldRecordPage() {
  const { user } = useAuth();
  const userId = user?.id ?? '';
  const { timerSeconds, isTimerRunning, startTimer, stopTimer } = useMinistry();

  const [records, setRecords] = useState<LocalFieldRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editRecord, setEditRecord] = useState<LocalFieldRecord | null>(null);
  const [quickDialog, setQuickDialog] = useState<'revisita' | 'estudo' | 'nota' | null>(null);
  const [quickValue, setQuickValue] = useState('');

  const today = new Date().toISOString().slice(0, 10);

  const [form, setForm] = useState<CreateFieldRecordInput>({
    date: today,
    hours: 0,
    publications: 0,
    videos: 0,
    return_visits: 0,
    bible_studies: 0,
    notes: '',
  });

  const loadRecords = async () => {
    if (!userId) return;
    try {
      setLoading(true);
      // Puxa dados do Supabase antes de ler o store local
      await ministryApi.pullFromCloud(userId);
      const data = await ministryApi.getFieldRecords(userId);
      setRecords(data);
    } catch (e) {
      toast.error('Erro ao carregar registros');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRecords();
  }, [userId]);

  const handleStartTimer = async () => startTimer();

  const handleStopTimer = async () => {
    const hours = await stopTimer();
    setForm((f) => ({ ...f, hours }));
    setEditRecord(null);
    setDialogOpen(true);
  };

  const handleOpenNew = () => {
    setEditRecord(null);
    setForm({
      date: today,
      hours: 0,
      publications: 0,
      videos: 0,
      return_visits: 0,
      bible_studies: 0,
      notes: '',
    });
    setDialogOpen(true);
  };

  const handleOpenEdit = (r: LocalFieldRecord) => {
    setEditRecord(r);
    setForm({
      date: r.date,
      hours: r.hours,
      publications: r.publications,
      videos: r.videos,
      return_visits: r.return_visits,
      bible_studies: r.bible_studies,
      notes: r.notes ?? '',
    });
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!userId) return;
    try {
      if (editRecord) {
        const id = editRecord.supabase_id ?? editRecord.local_id;
        await ministryApi.updateFieldRecord(id, userId, form);
        toast.success('Registro atualizado');
      } else {
        await ministryApi.createFieldRecord(userId, form);
        toast.success('Registro salvo');
      }
      setDialogOpen(false);
      loadRecords();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao salvar');
    }
  };

  const handleDelete = async (r: LocalFieldRecord) => {
    if (!userId || !confirm('Excluir este registro?')) return;
    try {
      const id = r.supabase_id ?? r.local_id;
      await ministryApi.deleteFieldRecord(id, userId);
      toast.success('Registro excluído');
      loadRecords();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao excluir');
    }
  };

  const handleQuickSubmit = async () => {
    if (!userId) return;
    try {
      if (quickDialog === 'revisita') {
        await ministryApi.createReturnVisit(userId, { name_or_initials: quickValue || undefined });
        toast.success('Revisita registrada');
      } else if (quickDialog === 'estudo') {
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
      setQuickValue('');
      loadRecords();
    } catch {
      toast.error('Erro ao registrar');
    }
  };

  const formatDate = (d: string) => {
    return new Date(`${d}T12:00:00`).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Serviço de Campo</h2>
          <p className="text-sm text-muted-foreground">Registre seu tempo e atividades</p>
        </div>
        <Button onClick={handleOpenNew} className="hidden sm:flex gap-2 bg-primary text-primary-foreground rounded-full px-6">
          <Plus size={18} />
          Novo registro
        </Button>
      </div>

      {/* Floating Action Button (Mobile Only) */}
      <button
        onClick={handleOpenNew}
        className="sm:hidden fixed bottom-24 right-6 z-40 flex items-center justify-center w-14 h-14 bg-primary text-primary-foreground rounded-full shadow-2xl active:scale-90 transition-transform"
        aria-label="Novo registro"
      >
        <Plus size={28} />
      </button>

      {/* Cronômetro */}
      <Card className="border-none shadow-md bg-gradient-to-br from-card to-muted/30 overflow-hidden relative">
        <div className="absolute top-0 right-0 p-8 opacity-5">
          <Clock size={120} />
        </div>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2 text-muted-foreground uppercase tracking-wider">
            <Clock size={14} />
            Sessão Atual
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 relative z-10">
          <div className="text-5xl font-black text-foreground tabular-nums tracking-tighter">
            {formatTimer(timerSeconds)}
          </div>
          <div className="flex gap-3">
            {!isTimerRunning ? (
              <Button onClick={handleStartTimer} className="flex-1 gap-2 bg-primary text-primary-foreground rounded-xl py-6 text-base font-semibold shadow-lg shadow-primary/20">
                <Play size={20} fill="currentColor" />
                Iniciar Serviço
              </Button>
            ) : (
              <Button onClick={handleStopTimer} variant="secondary" className="flex-1 gap-2 rounded-xl py-6 text-base font-semibold border-border shadow-inner">
                <Square size={20} fill="currentColor" />
                Encerrar e Salvar
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Ações Rápidas */}
      <div>
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Ações Rápidas</p>
        <div className="grid grid-cols-3 gap-2">
          <Button variant="outline" onClick={() => { setQuickValue(''); setQuickDialog('revisita'); }} className="flex flex-col gap-1 py-4 border-border h-auto">
            <Plus size={20} />
            <span className="text-xs">Revisita</span>
          </Button>
          <Button variant="outline" onClick={() => { setQuickValue(''); setQuickDialog('estudo'); }} className="flex flex-col gap-1 py-4 border-border h-auto">
            <BookOpen size={20} />
            <span className="text-xs">Estudo</span>
          </Button>
          <Button variant="outline" onClick={() => { setQuickValue(''); setQuickDialog('nota'); }} className="flex flex-col gap-1 py-4 border-border h-auto">
            <FileText size={20} />
            <span className="text-xs">Nota</span>
          </Button>
        </div>
      </div>

      {/* Lista de registros */}
      <Card className="border border-border rounded-xl shadow-sm bg-card">
        <CardHeader>
          <CardTitle className="text-base">Histórico</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground text-sm">Carregando...</p>
          ) : records.length === 0 ? (
            <p className="text-muted-foreground text-sm">Nenhum registro ainda.</p>
          ) : (
            <ul className="divide-y divide-border space-y-0">
              {records.map((r) => (
                <li key={r.local_id} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                  <div>
                    <p className="font-medium text-foreground">{formatDate(r.date)}</p>
                    <p className="text-sm text-muted-foreground">
                      {r.hours}h • {r.publications} pub. • {r.videos} vídeos • {r.return_visits} revisitas • {r.bible_studies} estudos
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="icon" onClick={() => handleOpenEdit(r)}>
                      <Edit2 size={16} />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(r)} className="text-red-500">
                      <Trash2 size={16} />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Modal de formulário completo */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md w-[95vw] sm:w-full max-h-[90vh] flex flex-col p-6 overflow-hidden rounded-2xl">
          <DialogHeader className="shrink-0 mb-2">
            <DialogTitle className="text-xl">{editRecord ? 'Editar registro' : 'Novo registro'}</DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto space-y-5 pr-2 pb-2">
            <div className="space-y-2">
              <Label htmlFor="date" className="text-sm font-medium">Data</Label>
              <Input
                id="date"
                type="date"
                value={form.date}
                onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                className="h-12 w-full rounded-xl bg-muted/50 border-transparent focus:bg-background focus:border-primary transition-colors"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="hours" className="text-sm font-medium">Horas</Label>
              <Input
                id="hours"
                type="number"
                step="0.25"
                min="0"
                inputMode="decimal"
                value={form.hours || ''}
                onChange={(e) => setForm((f) => ({ ...f, hours: parseFloat(e.target.value) || 0 }))}
                className="h-12 text-lg rounded-xl bg-muted/50 border-transparent focus:bg-background focus:border-primary transition-colors"
                placeholder="Ex: 2.5"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground uppercase tracking-wider">Publicações</Label>
                <Input
                  type="number"
                  inputMode="numeric"
                  min="0"
                  value={form.publications ?? 0}
                  onChange={(e) => setForm((f) => ({ ...f, publications: parseInt(e.target.value, 10) || 0 }))}
                  className="h-12 text-center text-lg rounded-xl bg-muted/50 border-transparent focus:bg-background focus:border-primary transition-colors"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground uppercase tracking-wider">Vídeos</Label>
                <Input
                  type="number"
                  inputMode="numeric"
                  min="0"
                  value={form.videos ?? 0}
                  onChange={(e) => setForm((f) => ({ ...f, videos: parseInt(e.target.value, 10) || 0 }))}
                  className="h-12 text-center text-lg rounded-xl bg-muted/50 border-transparent focus:bg-background focus:border-primary transition-colors"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground uppercase tracking-wider">Revisitas</Label>
                <Input
                  type="number"
                  inputMode="numeric"
                  min="0"
                  value={form.return_visits ?? 0}
                  onChange={(e) => setForm((f) => ({ ...f, return_visits: parseInt(e.target.value, 10) || 0 }))}
                  className="h-12 text-center text-lg rounded-xl bg-muted/50 border-transparent focus:bg-background focus:border-primary transition-colors"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground uppercase tracking-wider">Estudos</Label>
                <Input
                  type="number"
                  inputMode="numeric"
                  min="0"
                  value={form.bible_studies ?? 0}
                  onChange={(e) => setForm((f) => ({ ...f, bible_studies: parseInt(e.target.value, 10) || 0 }))}
                  className="h-12 text-center text-lg rounded-xl bg-muted/50 border-transparent focus:bg-background focus:border-primary transition-colors"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">Observações</Label>
              <Textarea
                value={form.notes ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                rows={3}
                placeholder="Algo importante que aconteceu no campo?"
                className="resize-none rounded-xl bg-muted/50 border-transparent focus:bg-background focus:border-primary transition-colors"
              />
            </div>
          </div>

          <DialogFooter className="shrink-0 pt-4 grid grid-cols-2 gap-3 sm:flex sm:justify-end mt-auto">
            <Button variant="outline" onClick={() => setDialogOpen(false)} className="h-12 rounded-xl text-base w-full sm:w-auto">
              Voltar
            </Button>
            <Button onClick={handleSubmit} className="h-12 rounded-xl text-base w-full sm:w-auto bg-primary text-primary-foreground shadow-md shadow-primary/20">
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de ações rápidas */}
      <Dialog open={quickDialog !== null} onOpenChange={() => setQuickDialog(null)}>
        <DialogContent className="max-w-sm w-[95vw] sm:w-full rounded-2xl p-6">
          <DialogHeader className="mb-2">
            <DialogTitle className="text-xl">
              {quickDialog === 'revisita' && 'Registrar revisita'}
              {quickDialog === 'estudo' && 'Registrar estudo bíblico'}
              {quickDialog === 'nota' && 'Adicionar nota'}
            </DialogTitle>
          </DialogHeader>
          <div className="py-2">
            {(quickDialog === 'revisita' || quickDialog === 'nota') && (
              <div className="space-y-2">
                <Label className="text-sm font-medium">{quickDialog === 'revisita' ? 'Nome ou iniciais (Opcional)' : 'O que deseja anotar?'}</Label>
                <Input
                  value={quickValue}
                  onChange={(e) => setQuickValue(e.target.value)}
                  placeholder="Escreva aqui..."
                  className="h-12 rounded-xl bg-muted/50 border-transparent focus:bg-background focus:border-primary transition-colors"
                  autoFocus
                />
              </div>
            )}
            {quickDialog === 'estudo' && (
              <p className="text-base text-muted-foreground p-4 bg-muted/30 rounded-xl border border-border">
                Será adicionado <strong className="text-foreground">1 estudo bíblico</strong> ao registro de hoje imediatamente.
              </p>
            )}
          </div>
          <DialogFooter className="grid grid-cols-2 gap-3 mt-4">
            <Button variant="outline" onClick={() => setQuickDialog(null)} className="h-12 rounded-xl text-base w-full">
              Cancelar
            </Button>
            <Button onClick={handleQuickSubmit} className="h-12 rounded-xl text-base w-full bg-primary text-primary-foreground shadow-md shadow-primary/20">
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
