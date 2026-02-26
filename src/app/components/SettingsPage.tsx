import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Shield, Save, Check, Plus, Users, Trash2, Edit2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';

const roles = [
  { key: 'coordenador', label: 'Coordenador (Admin)' },
  { key: 'secretario', label: 'Secretário' },
  { key: 'designador', label: 'Designador de Reuniões' },
  { key: 'publicador', label: 'Publicador' },
];

const permissions = [
  { key: 'view_members', label: 'Visualizar Membros' },
  { key: 'edit_members', label: 'Editar Membros' },
  { key: 'add_members', label: 'Adicionar Membros' },
  { key: 'view_meetings', label: 'Visualizar Reuniões' },
  { key: 'edit_assignments', label: 'Editar Designações' },
  { key: 'view_assignments', label: 'Visualizar Designações' },
  { key: 'manage_permissions', label: 'Gerenciar Permissões' },
  { key: 'view_reports', label: 'Visualizar Relatórios' },
];

const defaultMatrix: Record<string, Record<string, boolean>> = {
  coordenador: {
    view_members: true, edit_members: true, add_members: true,
    view_meetings: true, edit_assignments: true, view_assignments: true,
    manage_permissions: true, view_reports: true,
  },
  secretario: {
    view_members: true, edit_members: true, add_members: true,
    view_meetings: true, edit_assignments: false, view_assignments: true,
    manage_permissions: false, view_reports: true,
  },
  designador: {
    view_members: true, edit_members: false, add_members: false,
    view_meetings: true, edit_assignments: true, view_assignments: true,
    manage_permissions: false, view_reports: false,
  },
  publicador: {
    view_members: false, edit_members: false, add_members: false,
    view_meetings: true, edit_assignments: false, view_assignments: true,
    manage_permissions: false, view_reports: false,
  },
};

export function SettingsPage() {
  const { user } = useAuth();
  const [matrix, setMatrix] = useState(defaultMatrix);
  const [groups, setGroups] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'permissions' | 'groups'>('permissions');

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('field_service_groups').select('*');
      if (data) setGroups(data);
    })();
  }, []);

  const canManageGroups = user?.role === 'coordenador' || user?.role === 'secretario';

  const toggle = (role: string, perm: string) => {
    if (role === 'coordenador') return; // Admin always has all
    setMatrix(prev => ({
      ...prev,
      [role]: {
        ...prev[role],
        [perm]: !prev[role][perm],
      },
    }));
  };

  return (
    <div className="max-w-5xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-gray-900">Configurações</h1>
          <p className="text-gray-500" style={{ fontSize: '0.85rem' }}>Gerenciamento do sistema e permissões</p>
        </div>
        <button
          onClick={() => toast.success('Configurações salvas!')}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors"
        >
          <Save size={16} />
          <span className="hidden sm:inline" style={{ fontSize: '0.9rem' }}>Salvar Tudo</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-border mb-4">
        <button
          onClick={() => setActiveTab('permissions')}
          className={`px-4 py-2 font-medium transition-colors border-b-2 ${activeTab === 'permissions' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          style={{ fontSize: '0.9rem' }}
        >
          Permissões (RBAC)
        </button>
        <button
          onClick={() => setActiveTab('groups')}
          className={`px-4 py-2 font-medium transition-colors border-b-2 ${activeTab === 'groups' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          style={{ fontSize: '0.9rem' }}
        >
          Grupos de Serviço
        </button>
      </div>

      {activeTab === 'permissions' ? (
        <>
          {/* Desktop matrix */}
          <div className="hidden md:block bg-white rounded-xl border border-gray-100 overflow-hidden shadow-sm">
            {/* ... existing table code ... */}
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
                  {permissions.map(perm => (
                    <tr key={perm.key} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-4 py-3 text-gray-700" style={{ fontSize: '0.85rem' }}>{perm.label}</td>
                      {roles.map(role => (
                        <td key={role.key} className="text-center px-3 py-3">
                          <button
                            onClick={() => toggle(role.key, perm.key)}
                            className={`w-8 h-8 rounded-lg flex items-center justify-center mx-auto transition-colors ${matrix[role.key][perm.key]
                              ? 'bg-green-100 text-green-600'
                              : 'bg-gray-100 text-gray-300 hover:bg-gray-200'
                              } ${role.key === 'coordenador' ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                            disabled={role.key === 'coordenador'}
                          >
                            {matrix[role.key][perm.key] && <Check size={16} />}
                          </button>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile view */}
          <div className="md:hidden space-y-3">
            {roles.map(role => (
              <div key={role.key} className="bg-white rounded-xl border border-gray-100 overflow-hidden shadow-sm">
                <div className="px-4 py-3 bg-gray-50 border-b border-gray-100">
                  <h4 className="text-gray-900" style={{ fontSize: '0.9rem' }}>{role.label}</h4>
                </div>
                <div className="divide-y divide-gray-50">
                  {permissions.map(perm => (
                    <button
                      key={perm.key}
                      onClick={() => toggle(role.key, perm.key)}
                      disabled={role.key === 'coordenador'}
                      className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50/50 transition-colors"
                    >
                      <span className="text-gray-700" style={{ fontSize: '0.85rem' }}>{perm.label}</span>
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${matrix[role.key][perm.key]
                        ? 'bg-green-100 text-green-600'
                        : 'bg-gray-100 text-gray-300'
                        }`}>
                        {matrix[role.key][perm.key] && <Check size={14} />}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="bg-amber-50 rounded-xl p-4 border border-amber-100 shadow-sm">
            <p className="text-amber-800" style={{ fontSize: '0.85rem' }}>
              <strong>Nota:</strong> O Coordenador (Admin) sempre tem acesso completo ao sistema e não pode ter suas permissões alteradas.
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
