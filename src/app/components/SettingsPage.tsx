import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Shield, Check, Plus, Users, Trash2, Edit2, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { usePermissions } from '../hooks/usePermissions';
import { supabase } from '../lib/supabase';

const roles = [
  { key: 'coordenador', label: 'Coordenador' },
  { key: 'secretario', label: 'Secretário' },
  { key: 'designador', label: 'Designador' },
  { key: 'publicador', label: 'Publicador' },
];

const permissionDefs = [
  { key: 'view_members', label: 'Visualizar Membros' },
  { key: 'create_members', label: 'Criar Membros' },
  { key: 'edit_members', label: 'Editar Membros' },
  { key: 'view_meetings', label: 'Visualizar Reuniões' },
  { key: 'edit_assignments', label: 'Editar Designações' },
  { key: 'view_assignments', label: 'Visualizar Designações' },
  { key: 'manage_permissions', label: 'Gerenciar Permissões' },
  { key: 'view_reports', label: 'Visualizar Relatórios' },
];

export function SettingsPage() {
  const { user } = useAuth();
  const { matrix, loading, updatePermission } = usePermissions();
  const [groups, setGroups] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'permissions' | 'groups'>('permissions');
  const [togglingCell, setTogglingCell] = useState<string | null>(null);

  const isCoordinator = user?.role === 'coordenador';
  const canManageGroups = user?.role === 'coordenador' || user?.role === 'secretario';

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('field_service_groups').select('*');
      if (data) setGroups(data);
    })();
  }, []);

  const handleToggle = async (role: string, perm: string) => {
    if (role === 'coordenador') return;
    if (!isCoordinator) {
      toast.error('Apenas o Coordenador pode alterar permissões.');
      return;
    }

    const cellKey = `${role}-${perm}`;
    setTogglingCell(cellKey);
    try {
      const newValue = !matrix[role]?.[perm];
      await updatePermission(role, perm, newValue);
      toast.success('Permissão atualizada!');
    } catch (err: any) {
      toast.error(err.message || 'Erro ao atualizar permissão.');
    } finally {
      setTogglingCell(null);
    }
  };

  const PermCell = ({ roleKey, permKey }: { roleKey: string; permKey: string }) => {
    const isLocked = roleKey === 'coordenador';
    const value = matrix[roleKey]?.[permKey] ?? false;
    const cellKey = `${roleKey}-${permKey}`;
    const isToggling = togglingCell === cellKey;

    return (
      <button
        onClick={() => handleToggle(roleKey, permKey)}
        disabled={isLocked || isToggling || !isCoordinator}
        title={isLocked ? 'Coordenador sempre tem acesso total' : undefined}
        className={`w-9 h-9 rounded-lg flex items-center justify-center mx-auto transition-all
          ${value ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-300'}
          ${isLocked ? 'cursor-not-allowed opacity-75' : isCoordinator ? 'hover:scale-110 cursor-pointer' : 'cursor-default'}
        `}
      >
        {isToggling ? (
          <Loader2 size={14} className="animate-spin text-gray-400" />
        ) : value ? (
          <Check size={16} />
        ) : null}
      </button>
    );
  };

  return (
    <div className="max-w-5xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-gray-900">Configurações</h1>
          <p className="text-gray-500" style={{ fontSize: '0.85rem' }}>Gerenciamento do sistema e permissões</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-border mb-4">
        <button
          onClick={() => setActiveTab('permissions')}
          className={`px-4 py-2 font-medium transition-colors border-b-2 ${activeTab === 'permissions'
            ? 'border-primary text-primary'
            : 'border-transparent text-muted-foreground hover:text-foreground'}`}
          style={{ fontSize: '0.9rem' }}
        >
          Permissões (RBAC)
        </button>
        <button
          onClick={() => setActiveTab('groups')}
          className={`px-4 py-2 font-medium transition-colors border-b-2 ${activeTab === 'groups'
            ? 'border-primary text-primary'
            : 'border-transparent text-muted-foreground hover:text-foreground'}`}
          style={{ fontSize: '0.9rem' }}
        >
          Grupos de Serviço
        </button>
      </div>

      {activeTab === 'permissions' ? (
        <>
          {!isCoordinator && (
            <div className="bg-amber-50 rounded-xl p-3 border border-amber-100 flex items-center gap-2 text-amber-700" style={{ fontSize: '0.85rem' }}>
              <Shield size={16} />
              Apenas o Coordenador pode alterar permissões. Você está visualizando em modo leitura.
            </div>
          )}

          {/* Desktop matrix */}
          <div className="hidden md:block bg-white rounded-xl border border-gray-100 overflow-hidden shadow-sm">
            {loading ? (
              <div className="py-10 flex items-center justify-center gap-2 text-muted-foreground">
                <Loader2 size={18} className="animate-spin" />
                Carregando permissões...
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="px-4 py-3 text-gray-500 font-medium" style={{ fontSize: '0.85rem' }}>
                        <div className="flex items-center gap-2">
                          <Shield size={16} />
                          Permissão
                        </div>
                      </th>
                      {roles.map(role => (
                        <th key={role.key} className="text-center px-3 py-3 text-gray-700 font-medium" style={{ fontSize: '0.85rem' }}>
                          {role.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {permissionDefs.map(perm => (
                      <tr key={perm.key} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-4 py-3 text-gray-700" style={{ fontSize: '0.85rem' }}>{perm.label}</td>
                        {roles.map(role => (
                          <td key={role.key} className="text-center px-3 py-3">
                            <PermCell roleKey={role.key} permKey={perm.key} />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Mobile view */}
          <div className="md:hidden space-y-3">
            {roles.map(role => (
              <div key={role.key} className="bg-white rounded-xl border border-gray-100 overflow-hidden shadow-sm">
                <div className="px-4 py-3 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
                  <h4 className="text-gray-900 font-semibold" style={{ fontSize: '0.9rem' }}>{role.label}</h4>
                  {role.key === 'coordenador' && (
                    <span className="text-xs px-2 py-0.5 bg-primary/10 text-primary rounded-full">Acesso total</span>
                  )}
                </div>
                <div className="divide-y divide-gray-50">
                  {permissionDefs.map(perm => (
                    <button
                      key={perm.key}
                      onClick={() => handleToggle(role.key, perm.key)}
                      disabled={role.key === 'coordenador' || !isCoordinator}
                      className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50/50 transition-colors"
                    >
                      <span className="text-gray-700 text-left" style={{ fontSize: '0.85rem' }}>{perm.label}</span>
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ml-2 ${matrix[role.key]?.[perm.key] ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-300'}`}>
                        {matrix[role.key]?.[perm.key] && <Check size={14} />}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="bg-amber-50 rounded-xl p-4 border border-amber-100 shadow-sm">
            <p className="text-amber-800" style={{ fontSize: '0.85rem' }}>
              <strong>Nota:</strong> O Coordenador sempre tem acesso completo ao sistema e não pode ter suas permissões alteradas. As alterações são salvas automaticamente.
            </p>
          </div>
        </>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-foreground font-bold">Grupos de Saída de Campo</h3>
            {canManageGroups && (
              <button
                onClick={() => toast.info('Funcionalidade de criação em breve')}
                className="flex items-center gap-2 px-3 py-1.5 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-all font-bold"
                style={{ fontSize: '0.85rem' }}
              >
                <Plus size={16} />
                Novo Grupo
              </button>
            )}
          </div>

          {!canManageGroups && (
            <div className="bg-amber-50 text-amber-800 p-4 rounded-xl border border-amber-100 flex items-center gap-3">
              <Shield size={18} />
              <p style={{ fontSize: '0.85rem' }}>Somente o Coordenador e o Secretário podem gerenciar os grupos.</p>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {groups.map(group => (
              <div key={group.id} className="bg-white rounded-xl border border-border p-4 shadow-sm hover:border-primary/20 transition-all group">
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 bg-accent rounded-lg flex items-center justify-center text-accent-foreground">
                    <Users size={20} />
                  </div>
                  {canManageGroups && (
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button className="p-1.5 text-muted-foreground hover:text-primary transition-colors">
                        <Edit2 size={16} />
                      </button>
                      <button className="p-1.5 text-muted-foreground hover:text-red-500 transition-colors">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  )}
                </div>
                <h4 className="text-foreground font-bold">{group.name}</h4>
                <div className="flex items-center gap-2 mt-2 text-muted-foreground" style={{ fontSize: '0.85rem' }}>
                  <span className="font-medium text-foreground/70">Dirigente:</span>
                  <span>{group.overseer}</span>
                </div>
                <div className="mt-4 pt-4 border-t border-border flex justify-between items-center">
                  <span className="text-muted-foreground" style={{ fontSize: '0.75rem' }}>
                    0 membros vinculados
                  </span>
                  <button className="text-primary hover:underline font-medium" style={{ fontSize: '0.75rem' }}>
                    Ver lista
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
