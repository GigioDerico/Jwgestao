import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { ministryApi, type LocalReturnVisit, type ReturnVisitStatus } from '../../lib/ministry-api';
import { toast } from 'sonner';
import { Plus, Trash2, Edit2 } from 'lucide-react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';

const STATUS_OPTIONS: { value: ReturnVisitStatus; label: string }[] = [
  { value: 'ativa', label: 'Ativa' },
  { value: 'estudo_iniciado', label: 'Estudo iniciado' },
  { value: 'encerrada', label: 'Encerrada' },
];

export function ReturnVisitsPage() {
  const { user } = useAuth();
  const userId = user?.id ?? '';

  const [visits, setVisits] = useState<LocalReturnVisit[]>([]);
  const [filter, setFilter] = useState<ReturnVisitStatus | 'all'>('ativa');
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editVisit, setEditVisit] = useState<LocalReturnVisit | null>(null);
  const [form, setForm] = useState({
    name_or_initials: '',
    phone: '',
    address: '',
    topic: '',
    bible_text: '',
    next_step: '',
    return_date: '',
    status: 'ativa' as ReturnVisitStatus,
  });

  const loadVisits = async () => {
    if (!userId) return;
    try {
      setLoading(true);
      const data = await ministryApi.getReturnVisits(userId);
      setVisits(data);
    } catch {
      toast.error('Erro ao carregar revisitas');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadVisits();
  }, [userId]);

  const filtered = filter === 'all'
    ? visits
    : visits.filter((v) => v.status === filter);

  const handleOpenNew = () => {
    setEditVisit(null);
    setForm({
      name_or_initials: '',
      phone: '',
      address: '',
      topic: '',
      bible_text: '',
      next_step: '',
      return_date: '',
      status: 'ativa',
    });
    setDialogOpen(true);
  };

  const handleOpenEdit = (v: LocalReturnVisit) => {
    setEditVisit(v);
    setForm({
      name_or_initials: v.name_or_initials ?? '',
      phone: v.phone ?? '',
      address: v.address ?? '',
      topic: v.topic ?? '',
      bible_text: v.bible_text ?? '',
      next_step: v.next_step ?? '',
      return_date: v.return_date ?? '',
      status: v.status,
    });
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!userId) return;
    try {
      if (editVisit) {
        const id = editVisit.supabase_id ?? editVisit.local_id;
        await ministryApi.updateReturnVisit(id, userId, form);
        toast.success('Revisita atualizada');
      } else {
        await ministryApi.createReturnVisit(userId, form);
        toast.success('Revisita adicionada');
      }
      setDialogOpen(false);
      loadVisits();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao salvar');
    }
  };

  const handleDelete = async (v: LocalReturnVisit) => {
    if (!userId || !confirm('Excluir esta revisita?')) return;
    try {
      const id = v.supabase_id ?? v.local_id;
      await ministryApi.deleteReturnVisit(id, userId);
      toast.success('Revisita excluída');
      loadVisits();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao excluir');
    }
  };

  const formatDate = (d: string) => {
    return new Date(`${d}T12:00:00`).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-medium text-foreground">Revisitas</h2>
        <Button onClick={handleOpenNew} className="gap-2 bg-primary text-primary-foreground">
          <Plus size={18} />
          Nova revisita
        </Button>
      </div>

      <div className="flex gap-2 flex-wrap">
        <Select value={filter} onValueChange={(v) => setFilter(v as ReturnVisitStatus | 'all')}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Filtrar" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            {STATUS_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card className="border border-border rounded-xl shadow-sm bg-card">
        <CardContent className="pt-4">
          {loading ? (
            <p className="text-muted-foreground text-sm">Carregando...</p>
          ) : filtered.length === 0 ? (
            <p className="text-muted-foreground text-sm">Nenhuma revisita.</p>
          ) : (
            <ul className="divide-y divide-border space-y-0">
              {filtered.map((v) => (
                <li key={v.local_id} className="py-3 first:pt-0 last:pb-0 flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-foreground">{v.name_or_initials || 'Sem nome'}</p>
                    <p className="text-sm text-muted-foreground truncate">{v.topic || v.address}</p>
                    {v.return_date && (
                      <p className="text-xs text-amber-600 mt-0.5">
                        Retorno: {formatDate(v.return_date)}
                      </p>
                    )}
                  </div>
                  <span className="text-xs rounded-full px-2 py-0.5 bg-accent text-accent-foreground shrink-0">
                    {STATUS_OPTIONS.find((o) => o.value === v.status)?.label ?? v.status}
                  </span>
                  <div className="flex gap-1 shrink-0">
                    <Button variant="ghost" size="icon" onClick={() => handleOpenEdit(v)}>
                      <Edit2 size={14} />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(v)} className="text-red-500">
                      <Trash2 size={14} />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editVisit ? 'Editar revisita' : 'Nova revisita'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Nome ou iniciais</Label>
              <Input
                value={form.name_or_initials}
                onChange={(e) => setForm((f) => ({ ...f, name_or_initials: e.target.value }))}
                className="mt-1"
              />
            </div>
            <div>
              <Label>Telefone</Label>
              <Input
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                className="mt-1"
              />
            </div>
            <div>
              <Label>Endereço</Label>
              <Input
                value={form.address}
                onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                className="mt-1"
              />
            </div>
            <div>
              <Label>Assunto conversado</Label>
              <Input
                value={form.topic}
                onChange={(e) => setForm((f) => ({ ...f, topic: e.target.value }))}
                className="mt-1"
              />
            </div>
            <div>
              <Label>Texto bíblico usado</Label>
              <Input
                value={form.bible_text}
                onChange={(e) => setForm((f) => ({ ...f, bible_text: e.target.value }))}
                className="mt-1"
              />
            </div>
            <div>
              <Label>Próximo passo</Label>
              <Input
                value={form.next_step}
                onChange={(e) => setForm((f) => ({ ...f, next_step: e.target.value }))}
                className="mt-1"
              />
            </div>
            <div>
              <Label>Data de retorno</Label>
              <Input
                type="date"
                value={form.return_date}
                onChange={(e) => setForm((f) => ({ ...f, return_date: e.target.value }))}
                className="mt-1"
              />
            </div>
            <div>
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm((f) => ({ ...f, status: v as ReturnVisitStatus }))}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
