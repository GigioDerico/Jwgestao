import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { ministryApi, type LocalTerritoryLog, type TerritoryType } from '../../lib/ministry-api';
import { toast } from 'sonner';
import { Plus, Trash2, Edit2, MapPin } from 'lucide-react';
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

const TERRITORY_TYPES: { value: TerritoryType; label: string }[] = [
  { value: 'residencial', label: 'Residencial' },
  { value: 'comercial', label: 'Comercial' },
  { value: 'rural', label: 'Rural' },
  { value: 'publico', label: 'Público' },
];

async function getCurrentLocation(): Promise<{ lat: number; lng: number } | null> {
  try {
    const { Geolocation } = await import('@capacitor/geolocation');
    const pos = await Geolocation.getCurrentPosition({ enableHighAccuracy: true });
    const lat = pos.coords.latitude;
    const lng = pos.coords.longitude;
    return { lat, lng };
  } catch {
    if (navigator.geolocation) {
      return new Promise((resolve) => {
        navigator.geolocation.getCurrentPosition(
          (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude }),
          () => resolve(null)
        );
      });
    }
    return null;
  }
}

export function TerritoryPage() {
  const { user } = useAuth();
  const userId = user?.id ?? '';

  const [logs, setLogs] = useState<LocalTerritoryLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editLog, setEditLog] = useState<LocalTerritoryLog | null>(null);
  const [gettingLocation, setGettingLocation] = useState(false);
  const [form, setForm] = useState({
    name: '',
    street_area: '',
    lat: undefined as number | undefined,
    lng: undefined as number | undefined,
    approximate_address: '',
    territory_type: 'residencial' as TerritoryType,
    date_worked: new Date().toISOString().slice(0, 10),
    time_spent_minutes: 0,
    notes: '',
  });

  const loadLogs = async () => {
    if (!userId) return;
    try {
      setLoading(true);
      const data = await ministryApi.getTerritoryLogs(userId);
      setLogs(data);
    } catch {
      toast.error('Erro ao carregar territórios');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, [userId]);

  const handleOpenNew = () => {
    setEditLog(null);
    setForm({
      name: '',
      street_area: '',
      lat: undefined,
      lng: undefined,
      approximate_address: '',
      territory_type: 'residencial',
      date_worked: new Date().toISOString().slice(0, 10),
      time_spent_minutes: 0,
      notes: '',
    });
    setDialogOpen(true);
  };

  const handleUseLocation = async () => {
    setGettingLocation(true);
    try {
      const pos = await getCurrentLocation();
      if (pos) {
        setForm((f) => ({
          ...f,
          lat: pos.lat,
          lng: pos.lng,
          approximate_address: `Lat: ${pos.lat.toFixed(5)}, Lng: ${pos.lng.toFixed(5)}`,
        }));
        toast.success('Localização capturada');
      } else {
        toast.error('Não foi possível obter a localização');
      }
    } catch {
      toast.error('Erro ao obter localização');
    } finally {
      setGettingLocation(false);
    }
  };

  const handleOpenEdit = (l: LocalTerritoryLog) => {
    setEditLog(l);
    setForm({
      name: l.name ?? '',
      street_area: l.street_area ?? '',
      lat: l.lat,
      lng: l.lng,
      approximate_address: l.approximate_address ?? '',
      territory_type: l.territory_type,
      date_worked: l.date_worked,
      time_spent_minutes: l.time_spent_minutes ?? 0,
      notes: l.notes ?? '',
    });
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!userId) return;
    try {
      const payload = {
        name: form.name || undefined,
        street_area: form.street_area || undefined,
        lat: form.lat,
        lng: form.lng,
        approximate_address: form.approximate_address || undefined,
        territory_type: form.territory_type,
        date_worked: form.date_worked,
        time_spent_minutes: form.time_spent_minutes ?? 0,
        notes: form.notes || undefined,
      };
      if (editLog) {
        const id = editLog.supabase_id ?? editLog.local_id;
        await ministryApi.updateTerritoryLog(id, userId, payload);
        toast.success('Território atualizado');
      } else {
        await ministryApi.createTerritoryLog(userId, payload);
        toast.success('Território registrado');
      }
      setDialogOpen(false);
      loadLogs();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao salvar');
    }
  };

  const handleDelete = async (l: LocalTerritoryLog) => {
    if (!userId || !confirm('Excluir este registro?')) return;
    try {
      const id = l.supabase_id ?? l.local_id;
      await ministryApi.deleteTerritoryLog(id, userId);
      toast.success('Registro excluído');
      loadLogs();
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
        <h2 className="text-xl font-medium text-foreground">Registro de Território</h2>
        <Button onClick={handleOpenNew} className="gap-2 bg-primary text-primary-foreground">
          <Plus size={18} />
          Novo
        </Button>
      </div>

      <Card className="border border-border rounded-xl shadow-sm bg-card">
        <CardContent className="pt-4">
          {loading ? (
            <p className="text-muted-foreground text-sm">Carregando...</p>
          ) : logs.length === 0 ? (
            <p className="text-muted-foreground text-sm">Nenhum território registrado.</p>
          ) : (
            <ul className="divide-y divide-border space-y-0">
              {logs.map((l) => (
                <li key={l.local_id} className="py-3 first:pt-0 last:pb-0 flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-foreground">{l.name || l.street_area || 'Sem nome'}</p>
                    <p className="text-sm text-muted-foreground">
                      {formatDate(l.date_worked)} • {TERRITORY_TYPES.find((t) => t.value === l.territory_type)?.label ?? l.territory_type}
                    </p>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button variant="ghost" size="icon" onClick={() => handleOpenEdit(l)}>
                      <Edit2 size={14} />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(l)} className="text-red-500">
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
            <DialogTitle>{editLog ? 'Editar território' : 'Novo território'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Nome do território</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Ex: Centro"
                className="mt-1"
              />
            </div>
            <div>
              <Label>Rua / Bairro</Label>
              <Input
                value={form.street_area}
                onChange={(e) => setForm((f) => ({ ...f, street_area: e.target.value }))}
                placeholder="Ex: Rua das Flores, Centro"
                className="mt-1"
              />
            </div>
            <div>
              <Button
                variant="outline"
                onClick={handleUseLocation}
                disabled={gettingLocation}
                className="gap-2 border-border w-full"
              >
                <MapPin size={16} />
                {gettingLocation ? 'Obtendo...' : 'Usar minha localização atual'}
              </Button>
              {form.approximate_address && (
                <p className="text-xs text-muted-foreground mt-1 truncate">{form.approximate_address}</p>
              )}
            </div>
            <div>
              <Label>Tipo</Label>
              <Select value={form.territory_type} onValueChange={(v) => setForm((f) => ({ ...f, territory_type: v as TerritoryType }))}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TERRITORY_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Data trabalhada</Label>
                <Input
                  type="date"
                  value={form.date_worked}
                  onChange={(e) => setForm((f) => ({ ...f, date_worked: e.target.value }))}
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Tempo (min)</Label>
                <Input
                  type="number"
                  min="0"
                  value={form.time_spent_minutes || ''}
                  onChange={(e) => setForm((f) => ({ ...f, time_spent_minutes: parseInt(e.target.value, 10) || 0 }))}
                  className="mt-1"
                />
              </div>
            </div>
            <div>
              <Label>Observações</Label>
              <Textarea
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                rows={2}
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
