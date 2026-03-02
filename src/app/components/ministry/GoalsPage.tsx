import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { ministryApi } from '../../lib/ministry-api';
import { toast } from 'sonner';
import { Target } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Progress } from '../ui/progress';

const BIBLE_VERSES = [
  'O amor não busca seus próprios interesses. — 1 Coríntios 13:5',
  'Alegrai-vos sempre no Senhor. — Filipenses 4:4',
  'Procuremos promover o que contribui para a paz. — Romanos 14:19',
];

export function GoalsPage() {
  const { user } = useAuth();
  const userId = user?.id ?? '';

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  const [goal, setGoal] = useState<number>(10);
  const [saving, setSaving] = useState(false);
  const [recordsThisMonth, setRecordsThisMonth] = useState<{ hours: number }[]>([]);
  const [lastGoalToast, setLastGoalToast] = useState<number | null>(null);

  const hoursThisMonth = recordsThisMonth.reduce((sum, r) => sum + Number(r.hours), 0);
  const progressPercent = goal > 0 ? Math.min(100, (hoursThisMonth / goal) * 100) : 0;

  const loadData = async () => {
    if (!userId) return;
    try {
      const [goalData, records] = await Promise.all([
        ministryApi.getMonthlyGoal(userId, currentYear, currentMonth),
        ministryApi.getFieldRecords(userId, currentMonth, currentYear),
      ]);
      if (goalData) setGoal(Number(goalData.hours_goal));
      setRecordsThisMonth(records.map((r) => ({ hours: r.hours })));
    } catch (e) {
      toast.error('Erro ao carregar metas');
    }
  };

  useEffect(() => {
    loadData();
  }, [userId]);

  useEffect(() => {
    if (goal <= 0) return;
    if (progressPercent >= 100 && lastGoalToast !== 100) {
      toast.success('Parabéns! Meta de horas atingida!', { duration: 4000 });
      setLastGoalToast(100);
    } else if (progressPercent >= 50 && progressPercent < 100 && lastGoalToast !== 50) {
      toast.info('Você já atingiu 50% da meta. Continue assim!');
      setLastGoalToast(50);
    }
    if (progressPercent < 50) setLastGoalToast(null);
  }, [progressPercent, goal, lastGoalToast]);

  const handleSaveGoal = async () => {
    if (!userId) return;
    try {
      setSaving(true);
      await ministryApi.setMonthlyGoal(userId, currentYear, currentMonth, goal);
      toast.success('Meta salva');
      loadData();
    } catch (e) {
      toast.error('Erro ao salvar meta');
    } finally {
      setSaving(false);
    }
  };

  const monthName = new Date(currentYear, currentMonth - 1, 1).toLocaleDateString('pt-BR', { month: 'long' });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Metas Mensais</h2>
        <p className="text-sm text-muted-foreground">Acompanhe seu progresso espiritual</p>
      </div>

      <Card className="border border-border rounded-xl shadow-sm bg-card">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Target size={18} />
            Meta de {monthName} {currentYear}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-3 items-end">
            <div className="flex-1">
              <Label>Horas (meta)</Label>
              <Input
                type="number"
                step="0.5"
                min="0"
                value={goal}
                onChange={(e) => setGoal(parseFloat(e.target.value) || 0)}
                className="mt-1"
              />
            </div>
            <Button onClick={handleSaveGoal} disabled={saving} className="bg-primary text-primary-foreground">
              {saving ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>

          <div>
            <div className="flex justify-between text-sm text-muted-foreground mb-1">
              <span>{hoursThisMonth.toFixed(1)}h de {goal}h</span>
              <span>{progressPercent.toFixed(0)}%</span>
            </div>
            <Progress value={progressPercent} className="h-3" />
          </div>

          <p className="text-sm text-muted-foreground">
            {progressPercent >= 100
              ? 'Meta concluída. Ótimo trabalho!'
              : progressPercent >= 50
                ? 'Quase lá. Continue firme!'
                : 'Registre suas horas no Registro de Campo para acompanhar o progresso.'}
          </p>
        </CardContent>
      </Card>

      {BIBLE_VERSES.length > 0 && (
        <Card className="border border-border rounded-xl shadow-sm bg-card">
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground italic">
              {BIBLE_VERSES[Math.floor(Math.random() * BIBLE_VERSES.length)]}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
