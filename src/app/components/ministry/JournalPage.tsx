import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { ministryApi, type LocalSpiritualJournal } from '../../lib/ministry-api';
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
import { Card, CardContent } from '../ui/card';
import { Textarea } from '../ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';

const ENTRY_TYPES = [
  { value: 'experiencia', label: 'Experiência' },
  { value: 'agradecimento', label: 'Agradecimento' },
  { value: 'reflexao', label: 'Reflexão' },
  { value: 'objetivo', label: 'Objetivo espiritual' },
];

export function JournalPage() {
  const { user } = useAuth();
  const userId = user?.id ?? '';

  const [entries, setEntries] = useState<LocalSpiritualJournal[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editEntry, setEditEntry] = useState<LocalSpiritualJournal | null>(null);
  const [form, setForm] = useState({
    entry_type: 'reflexao',
    content: '',
  });

  const loadEntries = async () => {
    if (!userId) return;
    try {
      setLoading(true);
      const data = await ministryApi.getJournalEntries(userId);
      setEntries(data);
    } catch {
      toast.error('Erro ao carregar diário');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEntries();
  }, [userId]);

  const handleOpenNew = () => {
    setEditEntry(null);
    setForm({ entry_type: 'reflexao', content: '' });
    setDialogOpen(true);
  };

  const handleOpenEdit = (e: LocalSpiritualJournal) => {
    setEditEntry(e);
    setForm({
      entry_type: e.entry_type,
      content: e.content,
    });
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!userId || !form.content.trim()) return;
    try {
      if (editEntry) {
        const id = editEntry.supabase_id ?? editEntry.local_id;
        await ministryApi.updateJournalEntry(id, userId, form);
        toast.success('Entrada atualizada');
      } else {
        await ministryApi.createJournalEntry(userId, form);
        toast.success('Entrada adicionada');
      }
      setDialogOpen(false);
      loadEntries();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao salvar');
    }
  };

  const handleDelete = async (e: LocalSpiritualJournal) => {
    if (!userId || !confirm('Excluir esta entrada?')) return;
    try {
      const id = e.supabase_id ?? e.local_id;
      await ministryApi.deleteJournalEntry(id, userId);
      toast.success('Entrada excluída');
      loadEntries();
    } catch (err) {
      toast.error('Erro ao excluir');
    }
  };

  const formatDate = (d: string) => {
    return new Date(d).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-medium text-foreground">Diário Espiritual</h2>
        <Button onClick={handleOpenNew} className="gap-2 bg-primary text-primary-foreground">
          <Plus size={18} />
          Nova entrada
        </Button>
      </div>

      <Card className="border border-border rounded-xl shadow-sm bg-card">
        <CardContent className="pt-4">
          {loading ? (
            <p className="text-muted-foreground text-sm">Carregando...</p>
          ) : entries.length === 0 ? (
            <p className="text-muted-foreground text-sm">Nenhuma entrada ainda.</p>
          ) : (
            <ul className="divide-y divide-border space-y-0">
              {entries.map((e) => (
                <li key={e.local_id} className="py-3 first:pt-0 last:pb-0">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-muted-foreground">{formatDate(e.created_at)}</p>
                      <p className="text-sm text-foreground mt-0.5 whitespace-pre-wrap">{e.content}</p>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <Button variant="ghost" size="icon" onClick={() => handleOpenEdit(e)}>
                        <Edit2 size={14} />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(e)} className="text-red-500">
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editEntry ? 'Editar entrada' : 'Nova entrada'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Tipo</Label>
              <Select value={form.entry_type} onValueChange={(v) => setForm((f) => ({ ...f, entry_type: v }))}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ENTRY_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Conteúdo</Label>
              <Textarea
                value={form.content}
                onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
                rows={4}
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={!form.content.trim()} className="bg-primary text-primary-foreground">
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
