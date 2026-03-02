import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { ministryApi, type LocalReturnVisit } from '../../lib/ministry-api';
import { getCurrentLocationAsAddress } from '../../lib/geolocation';
import { toast } from 'sonner';
import { Plus, Trash2, Edit2, MapPin, BookOpen } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../ui/dialog';
import { Card, CardContent } from '../ui/card';
import { formatPhoneDisplay } from '../../helpers';

export function StudiesPage() {
  const { user } = useAuth();
  const userId = user?.id ?? '';

  const [studies, setStudies] = useState<LocalReturnVisit[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editStudy, setEditStudy] = useState<LocalReturnVisit | null>(null);
  const [gettingAddress, setGettingAddress] = useState(false);
  const [deactivationReason, setDeactivationReason] = useState('');
  const [form, setForm] = useState({
    name_or_initials: '',
    phone: '',
    address: '',
    topic: '',
    bible_text: '',
    next_step: '',
    return_date: '',
  });

  const loadStudies = async () => {
    if (!userId) return;
    try {
      setLoading(true);
      const data = await ministryApi.getReturnVisits(userId, 'estudo_iniciado');
      setStudies(data);
    } catch {
      toast.error('Erro ao carregar estudos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStudies();
  }, [userId]);

  const handleOpenNew = () => {
    setEditStudy(null);
    setDeactivationReason('');
    setForm({
      name_or_initials: '',
      phone: '',
      address: '',
      topic: '',
      bible_text: '',
      next_step: '',
      return_date: '',
    });
    setDialogOpen(true);
  };

  const handleUseLocation = async () => {
    setGettingAddress(true);
    try {
      const addr = await getCurrentLocationAsAddress();
      if (addr) {
        setForm((f) => ({ ...f, address: addr }));
        toast.success('Localização capturada');
      } else {
        toast.error('Não foi possível obter a localização');
      }
    } catch {
      toast.error('Erro ao obter localização');
    } finally {
      setGettingAddress(false);
    }
  };

  const handleOpenEdit = (s: LocalReturnVisit) => {
    setEditStudy(s);
    setDeactivationReason(s.deactivation_reason ?? '');
    setForm({
      name_or_initials: s.name_or_initials ?? '',
      phone: s.phone ?? '',
      address: s.address ?? '',
      topic: s.topic ?? '',
      bible_text: s.bible_text ?? '',
      next_step: s.next_step ?? '',
      return_date: s.return_date ?? '',
    });
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!userId) return;
    try {
      const payload = { ...form, status: 'estudo_iniciado' as const };
      if (editStudy) {
        const id = editStudy.supabase_id ?? editStudy.local_id;
        await ministryApi.updateReturnVisit(id, userId, payload);
        toast.success('Estudo atualizado');
      } else {
        await ministryApi.createReturnVisit(userId, payload);
        toast.success('Estudo adicionado');
      }
      setDialogOpen(false);
      loadStudies();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao salvar');
    }
  };

  const handleDelete = async (s: LocalReturnVisit) => {
    if (!userId || !confirm('Excluir este estudo?')) return;
    try {
      const id = s.supabase_id ?? s.local_id;
      await ministryApi.deleteReturnVisit(id, userId);
      toast.success('Estudo excluído');
      loadStudies();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao excluir');
    }
  };

  const isStudyActive = (study: LocalReturnVisit) => study.is_active ?? study.status !== 'encerrada';

  const handleDeactivateStudy = async () => {
    if (!userId || !editStudy) return;

    const reason = deactivationReason.trim();
    if (!reason) {
      toast.error('Informe o motivo da desativação');
      return;
    }

    try {
      const id = editStudy.supabase_id ?? editStudy.local_id;
      await ministryApi.updateReturnVisit(id, userId, {
        is_active: false,
        deactivation_reason: reason,
        deactivated_at: new Date().toISOString(),
        status: 'estudo_iniciado',
      });
      toast.success('Estudo desativado');
      setDialogOpen(false);
      loadStudies();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao desativar');
    }
  };

  const handleReactivateStudy = async () => {
    if (!userId || !editStudy) return;

    try {
      const id = editStudy.supabase_id ?? editStudy.local_id;
      await ministryApi.updateReturnVisit(id, userId, {
        is_active: true,
        deactivation_reason: undefined,
        deactivated_at: undefined,
        status: 'estudo_iniciado',
      });
      toast.success('Estudo reativado');
      setDialogOpen(false);
      loadStudies();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao reativar');
    }
  };

  const formatDate = (d: string) => {
    return new Date(`${d}T12:00:00`).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
    });
  };

  const formatFullDate = (d?: string) => {
    if (!d) return '';
    return new Date(d).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Estudos</h2>
          <p className="text-sm text-muted-foreground">Controle seus estudos bíblicos em andamento</p>
        </div>
        <Button onClick={handleOpenNew} className="hidden sm:flex gap-2 bg-primary text-primary-foreground rounded-full px-6">
          <Plus size={18} />
          Novo estudo
        </Button>
      </div>

      <button
        onClick={handleOpenNew}
        className="sm:hidden fixed bottom-24 right-6 z-40 flex items-center justify-center w-14 h-14 bg-primary text-primary-foreground rounded-full shadow-2xl active:scale-90 transition-transform"
        aria-label="Novo estudo"
      >
        <Plus size={28} />
      </button>

      <Card className="border border-border rounded-xl shadow-sm bg-card">
        <CardContent className="pt-4">
          {loading ? (
            <p className="text-muted-foreground text-sm">Carregando...</p>
          ) : studies.length === 0 ? (
            <p className="text-muted-foreground text-sm">Nenhum estudo em andamento.</p>
          ) : (
            <ul className="divide-y divide-border space-y-0">
              {studies.map((s) => {
                const active = isStudyActive(s);

                return (
                  <li key={s.local_id} className={`py-3 first:pt-0 last:pb-0 flex items-start justify-between gap-3 ${active ? '' : 'opacity-75'}`}>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium text-foreground">{s.name_or_initials || 'Sem nome'}</p>
                        {!active && (
                          <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-medium text-red-700">
                            Desativado
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground truncate">{s.topic || 'Sem lição'}</p>
                      {s.return_date && (
                        <p className="text-xs text-amber-600 mt-0.5 flex items-center gap-1">
                          <BookOpen size={12} />
                          Próxima visita: {formatDate(s.return_date)}
                        </p>
                      )}
                      {!active && (
                        <div className="mt-1 space-y-0.5">
                          {s.deactivation_reason && (
                            <p className="text-xs text-muted-foreground">Motivo: {s.deactivation_reason}</p>
                          )}
                          {s.deactivated_at && (
                            <p className="text-xs text-muted-foreground">Desativado em {formatFullDate(s.deactivated_at)}</p>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <Button variant="ghost" size="icon" onClick={() => handleOpenEdit(s)}>
                        <Edit2 size={14} />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(s)} className="text-red-500">
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editStudy ? 'Editar estudo' : 'Novo estudo'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Nome do estudante (ou iniciais)</Label>
              <Input
                value={form.name_or_initials}
                onChange={(e) => setForm((f) => ({ ...f, name_or_initials: e.target.value }))}
                className="mt-1"
              />
            </div>
            <div>
              <Label>Telefone</Label>
              <Input
                type="tel"
                inputMode="numeric"
                value={formatPhoneDisplay(form.phone)}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value.replace(/\D/g, '').slice(0, 11) }))}
                className="mt-1"
              />
            </div>
            <div>
              <Label>Endereço</Label>
              <div className="flex gap-2 mt-1">
                <Input
                  value={form.address}
                  onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                  placeholder="Ou use sua localização"
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={handleUseLocation}
                  disabled={gettingAddress}
                  title="Usar localização atual"
                  className="shrink-0 border-border"
                >
                  <MapPin size={18} />
                </Button>
              </div>
              {gettingAddress && <p className="text-xs text-muted-foreground mt-1">Obtendo...</p>}
            </div>
            <div>
              <Label>Lição atual</Label>
              <Input
                value={form.topic}
                onChange={(e) => setForm((f) => ({ ...f, topic: e.target.value }))}
                placeholder="Ex: Capítulo 1"
                className="mt-1"
              />
            </div>
            <div>
              <Label>Observações</Label>
              <Textarea
                value={form.bible_text}
                onChange={(e) => setForm((f) => ({ ...f, bible_text: e.target.value }))}
                placeholder="Anote detalhes importantes para a próxima visita"
                className="mt-1 min-h-24"
              />
            </div>
            <div>
              <Label>Próxima visita</Label>
              <Input
                value={form.next_step}
                onChange={(e) => setForm((f) => ({ ...f, next_step: e.target.value }))}
                placeholder="Ex: retomar a conversa sobre oração"
                className="mt-1"
              />
            </div>
            <div>
              <Label>Data da próxima visita</Label>
              <Input
                type="date"
                value={form.return_date}
                onChange={(e) => setForm((f) => ({ ...f, return_date: e.target.value }))}
                className="mt-1"
              />
            </div>
            {editStudy && (
              <div className="space-y-3 rounded-lg border border-border bg-muted/20 p-3">
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {isStudyActive(editStudy) ? 'Desativar estudo' : 'Estudo desativado'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {isStudyActive(editStudy)
                      ? 'Informe o motivo para remover este estudo da lista ativa.'
                      : 'O motivo e a data ficam salvos no registro.'}
                  </p>
                </div>
                {isStudyActive(editStudy) ? (
                  <Textarea
                    value={deactivationReason}
                    onChange={(e) => setDeactivationReason(e.target.value)}
                    placeholder="Motivo da desativação"
                    className="min-h-20"
                  />
                ) : (
                  <div className="space-y-1 text-sm text-muted-foreground">
                    <p>Motivo: {editStudy.deactivation_reason || 'Não informado'}</p>
                    <p>Data: {formatFullDate(editStudy.deactivated_at) || 'Não informada'}</p>
                  </div>
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            {editStudy && (
              isStudyActive(editStudy) ? (
                <Button
                  variant="outline"
                  onClick={handleDeactivateStudy}
                  className="mr-auto border-red-200 text-red-700 hover:bg-red-50 hover:text-red-800"
                >
                  Desativar
                </Button>
              ) : (
                <Button variant="outline" onClick={handleReactivateStudy} className="mr-auto">
                  Reativar
                </Button>
              )
            )}
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
