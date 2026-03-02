import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { ministryApi } from '../../lib/ministry-api';
import { supabase } from '../../lib/supabase';
import { toast } from 'sonner';
import { Trash2, Shield } from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '../ui/alert-dialog';

export function MinistrySettingsPage() {
  const { user } = useAuth();
  const userId = user?.id ?? '';
  const [deleting, setDeleting] = useState(false);

  const handleDeleteAll = async () => {
    if (!userId) return;
    setDeleting(true);
    try {
      await ministryApi.clearAllData(userId);

      const tables = [
        'personal_field_records',
        'personal_monthly_goals',
        'personal_goal_planner_template',
        'personal_goal_planner_month_items',
        'personal_return_visits',
        'personal_territory_logs',
        'personal_spiritual_journal',
      ];
      for (const table of tables) {
        await supabase.from(table).delete().eq('user_id', userId);
      }

      toast.success('Todos os dados do Ministério foram excluídos');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao excluir dados');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-medium text-foreground">Configurações do Ministério</h2>

      <Card className="border border-border rounded-xl shadow-sm bg-card">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Shield size={18} />
            Privacidade
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Os dados do módulo Ministério são pessoais e não são compartilhados com a congregação. 
            São armazenados no seu dispositivo e sincronizados opcionalmente com a nuvem (criptografado em trânsito).
          </p>
        </CardContent>
      </Card>

      <Card className="border border-border rounded-xl shadow-sm bg-card border-red-200">
        <CardHeader>
          <CardTitle className="text-base text-red-600">Excluir todos os dados</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Esta ação remove permanentemente todos os seus registros de campo, metas, planejamentos,
            revisitas, territórios e diário espiritual (dados locais e na nuvem). Não é possível desfazer.
          </p>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" className="border-red-300 text-red-600 hover:bg-red-50" disabled={deleting}>
                <Trash2 size={16} className="mr-2" />
                Excluir todos os dados
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Excluir todos os dados?</AlertDialogTitle>
                <AlertDialogDescription>
                  Esta ação não pode ser desfeita. Todos os seus dados do módulo Ministério serão removidos permanentemente.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDeleteAll}
                  className="bg-red-600 hover:bg-red-700"
                >
                  Excluir tudo
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>
    </div>
  );
}
