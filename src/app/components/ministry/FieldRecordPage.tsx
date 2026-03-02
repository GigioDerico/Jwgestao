import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { ministryApi, type LocalFieldRecord, type CreateFieldRecordInput } from '../../lib/ministry-api';
import { toast } from 'sonner';
import { Plus, Trash2, Edit2, Play, Square, Clock } from 'lucide-react';
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

function formatHours(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function FieldRecordPage() {
  const { user } = useAuth();
  const userId = user?.id ?? '';

  const [records, setRecords] = useState<LocalFieldRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editRecord, setEditRecord] = useState<LocalFieldRecord | null>(null);
  const [timerRunning, setTimerRunning] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [form, setForm] = useState<CreateFieldRecordInput>({
    date: new Date().toISOString().slice(0, 10),
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

  useEffect(() => {
    if (timerRunning) {
      timerRef.current = setInterval(() => {
        setTimerSeconds((s) => s + 1);
      }, 1000);
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
    setForm((f) => ({ ...f, hours: Math.round(hours * 100) / 100 }));
    setDialogOpen(true);
  };

  const handleOpenNew = () => {
    setEditRecord(null);
    setForm({
      date: new Date().toISOString().slice(0, 10),
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

  const formatDate = (d: string) => {
    return new Date(`${d}T12:00:00`).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-medium text-foreground">Registro de Serviço de Campo</h2>
        <Button onClick={handleOpenNew} className="gap-2 bg-primary text-primary-foreground">
          <Plus size={18} />
          Novo registro
        </Button>
      </div>

      {/* Cronômetro */}
      <Card className="border border-border rounded-xl shadow-sm bg-card">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Clock size={18} />
            Cronômetro
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="text-3xl font-bold text-foreground tabular-nums">
            {formatHours(timerSeconds)}
          </div>
          <div className="flex gap-2">
            {!timerRunning ? (
              <Button onClick={handleStartTimer} className="gap-2 bg-primary text-primary-foreground">
                <Play size={16} />
                Iniciar Serviço
              </Button>
            ) : (
              <Button onClick={handleStopTimer} variant="outline" className="gap-2 border-border">
                <Square size={16} />
                Encerrar Serviço
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

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

      {/* Modal de formulário */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editRecord ? 'Editar registro' : 'Novo registro'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="date">Data</Label>
              <Input
                id="date"
                type="date"
                value={form.date}
                onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="hours">Horas</Label>
              <Input
                id="hours"
                type="number"
                step="0.25"
                min="0"
                value={form.hours || ''}
                onChange={(e) => setForm((f) => ({ ...f, hours: parseFloat(e.target.value) || 0 }))}
                className="mt-1"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Publicações</Label>
                <Input
                  type="number"
                  min="0"
                  value={form.publications ?? 0}
                  onChange={(e) => setForm((f) => ({ ...f, publications: parseInt(e.target.value, 10) || 0 }))}
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Vídeos</Label>
                <Input
                  type="number"
                  min="0"
                  value={form.videos ?? 0}
                  onChange={(e) => setForm((f) => ({ ...f, videos: parseInt(e.target.value, 10) || 0 }))}
                  className="mt-1"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Revisitas</Label>
                <Input
                  type="number"
                  min="0"
                  value={form.return_visits ?? 0}
                  onChange={(e) => setForm((f) => ({ ...f, return_visits: parseInt(e.target.value, 10) || 0 }))}
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Estudos bíblicos</Label>
                <Input
                  type="number"
                  min="0"
                  value={form.bible_studies ?? 0}
                  onChange={(e) => setForm((f) => ({ ...f, bible_studies: parseInt(e.target.value, 10) || 0 }))}
                  className="mt-1"
                />
              </div>
            </div>
            <div>
              <Label>Observações</Label>
              <Textarea
                value={form.notes ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                rows={3}
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} className="bg-primary text-primary-foreground">
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
