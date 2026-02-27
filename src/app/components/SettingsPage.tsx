import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Shield, Check, Plus, Users, Trash2, Edit2, Loader2, X } from 'lucide-react';
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
  const [membersByGroup, setMembersByGroup] = useState<Record<string, number>>({});
  const [eligibleMembers, setEligibleMembers] = useState<{ id: string; full_name: string }[]>([]);
  const [activeTab, setActiveTab] = useState<'permissions' | 'groups'>('permissions');
  const [togglingCell, setTogglingCell] = useState<string | null>(null);
  const [showNewGroupModal, setShowNewGroupModal] = useState(false);
  const [newGroupOverseerId, setNewGroupOverseerId] = useState('');
  const [savingGroup, setSavingGroup] = useState(false);
  const [editingGroup, setEditingGroup] = useState<{ id: string; name: string; overseer_id: string; overseer_name?: string; assistant_ids: string[] } | null>(null);
  const [deleteConfirmGroup, setDeleteConfirmGroup] = useState<{ id: string; name: string } | null>(null);

  const isCoordinator = user?.role === 'coordenador';
  const canManageGroups = user?.role === 'coordenador' || user?.role === 'secretario';

  const fetchEligibleMembers = async () => {
    const { data: privs } = await supabase.from('member_privileges').select('member_id').in('role', ['anciao', 'servo_ministerial']);
    let ids = [...new Set((privs || []).map((p: any) => p.member_id))];
    if (ids.length === 0) {
      const { data: byStatus } = await supabase.from('members').select('id').in('spiritual_status', ['anciao', 'servo_ministerial']);
      ids = (byStatus || []).map((m: any) => m.id);
    }
    if (ids.length === 0) {
      const { data: all } = await supabase.from('members').select('id, full_name').order('full_name');
      if (all) setEligibleMembers(all);
      return;
    }
    const { data: members } = await supabase.from('members').select('id, full_name').in('id', ids).order('full_name');
    if (members) setEligibleMembers(members);
  };

  const fetchGroups = async () => {
    const { data, error } = await supabase
      .from('field_service_groups')
      .select('*, overseer:members!overseer_id(full_name), assistants:field_service_group_assistants(member_id, assistant:members(full_name))');
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/01de7b58-075b-4ec4-b2be-533b4a69e95c',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'SettingsPage:fetchGroups',message:'fetch groups result',data:{count:data?.length,error:error?.message,sampleGroup:data?.[0]?{keys:Object.keys(data[0]),overseer_id:data[0].overseer_id}:null},timestamp:Date.now(),hypothesisId:'H3'})}).catch(()=>{});
    // #endregion
    if (data) setGroups(data);

    const { data: members } = await supabase.from('members').select('id, group_id');
    if (members) {
      const counts: Record<string, number> = {};
      members.forEach((m: any) => {
        if (m.group_id) counts[m.group_id] = (counts[m.group_id] || 0) + 1;
      });
      setMembersByGroup(counts);
    }
  };

  useEffect(() => {
    fetchGroups();
  }, []);

  useEffect(() => {
    if (showNewGroupModal || editingGroup) {
      fetchEligibleMembers();
    }
  }, [showNewGroupModal, editingGroup]);

  const handleCreateGroup = async () => {
    if (!newGroupOverseerId.trim()) {
      toast.error('Selecione o dirigente do grupo.');
      return;
    }
    setSavingGroup(true);
    try {
      const overseer = eligibleMembers.find(m => m.id === newGroupOverseerId);
      const name = `Grupo - ${overseer?.full_name || 'Novo'}`;
      const { error } = await supabase.from('field_service_groups').insert({
        name,
        overseer_id: newGroupOverseerId,
      });
      if (error) throw error;
      toast.success('Grupo criado com sucesso!');
      setShowNewGroupModal(false);
      setNewGroupOverseerId('');
      fetchGroups();
    } catch (err: any) {
      toast.error(err.message || 'Erro ao criar grupo.');
    } finally {
      setSavingGroup(false);
    }
  };

  const handleOpenEdit = (group: any) => {
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/01de7b58-075b-4ec4-b2be-533b4a69e95c',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'SettingsPage:handleOpenEdit',message:'group object',data:{groupKeys:Object.keys(group),overseer_id:group.overseer_id,overseer:group.overseer,assistants:group.assistants,assistantsLen:(group.assistants||[]).length},timestamp:Date.now(),hypothesisId:'H1'})}).catch(()=>{});
    // #endregion
    const assistants = group.assistants || [];
    const assistantIds = Array.isArray(assistants) ? assistants.map((a: any) => a.member_id) : [];
    setEditingGroup({
      id: group.id,
      name: group.name,
      overseer_id: group.overseer_id || '',
      overseer_name: (group.overseer as any)?.full_name,
      assistant_ids: assistantIds,
    });
  };

  const handleSaveEdit = async () => {
    if (!editingGroup) return;
    if (!editingGroup.overseer_id.trim()) {
      toast.error('Selecione o dirigente do grupo.');
      return;
    }
    setSavingGroup(true);
    try {
      const { error: updateError } = await supabase.from('field_service_groups').update({
        name: editingGroup.name,
        overseer_id: editingGroup.overseer_id,
      }).eq('id', editingGroup.id);
      if (updateError) throw updateError;

      await supabase.from('field_service_group_assistants').delete().eq('group_id', editingGroup.id);
      if (editingGroup.assistant_ids.length > 0) {
        const rows = editingGroup.assistant_ids.map(member_id => ({ group_id: editingGroup.id, member_id }));
        const { error: insertError } = await supabase.from('field_service_group_assistants').insert(rows);
        if (insertError) throw insertError;
      }
      toast.success('Grupo atualizado com sucesso!');
      setEditingGroup(null);
      fetchGroups();
    } catch (err: any) {
      toast.error(err.message || 'Erro ao atualizar grupo.');
    } finally {
      setSavingGroup(false);
    }
  };

  const handleDeleteGroup = async () => {
    if (!deleteConfirmGroup) return;
    setSavingGroup(true);
    try {
      const { error } = await supabase.from('field_service_groups').delete().eq('id', deleteConfirmGroup.id);
      if (error) throw error;
      toast.success('Grupo excluído. Os membros vinculados ficaram sem grupo.');
      setDeleteConfirmGroup(null);
      fetchGroups();
    } catch (err: any) {
      toast.error(err.message || 'Erro ao excluir grupo.');
    } finally {
      setSavingGroup(false);
    }
  };

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
                onClick={() => setShowNewGroupModal(true)}
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
                      <button onClick={() => handleOpenEdit(group)} className="p-1.5 text-muted-foreground hover:text-primary transition-colors" title="Editar">
                        <Edit2 size={16} />
                      </button>
                      <button onClick={() => setDeleteConfirmGroup({ id: group.id, name: group.name })} className="p-1.5 text-muted-foreground hover:text-red-500 transition-colors" title="Excluir">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  )}
                </div>
                <h4 className="text-foreground font-bold">{group.name}</h4>
                <div className="flex items-center gap-2 mt-2 text-muted-foreground" style={{ fontSize: '0.85rem' }}>
                  <span className="font-medium text-foreground/70">Dirigente:</span>
                  <span>{(group.overseer as any)?.full_name ?? group.overseer ?? '—'}</span>
                </div>
                {((group.assistants as any[])?.length ?? 0) > 0 && (
                  <div className="flex items-start gap-2 mt-1.5 text-muted-foreground" style={{ fontSize: '0.85rem' }}>
                    <span className="font-medium text-foreground/70 shrink-0">Ajudantes:</span>
                    <span>{(group.assistants as any[]).map((a: any) => a.assistant?.full_name ?? a.member_id).filter(Boolean).join(', ')}</span>
                  </div>
                )}
                <div className="mt-4 pt-4 border-t border-border flex justify-between items-center">
                  <span className="text-muted-foreground" style={{ fontSize: '0.75rem' }}>
                    {membersByGroup[group.id] ?? 0} membros vinculados
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

      {/* Modal Novo Grupo */}
      {showNewGroupModal && (
        <div
          className="fixed inset-0 bg-[#082c45]/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => { if (!savingGroup) { setShowNewGroupModal(false); setNewGroupOverseerId(''); } }}
        >
          <div
            className="bg-white rounded-2xl w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200"
            onClick={e => e.stopPropagation()}
          >
            <div className="p-5 border-b border-border flex items-center justify-between">
              <h3 className="text-[#082c45] font-bold">Novo Grupo de Serviço</h3>
              <button
                onClick={() => { setShowNewGroupModal(false); setNewGroupOverseerId(''); }}
                className="text-muted-foreground hover:text-foreground p-1 transition-colors"
                disabled={savingGroup}
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-gray-600 mb-1 font-medium" style={{ fontSize: '0.85rem' }}>
                  Dirigente do grupo *
                </label>
                <select
                  value={newGroupOverseerId}
                  onChange={e => setNewGroupOverseerId(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#35bdf8] text-foreground"
                  style={{ fontSize: '0.9rem' }}
                >
                  <option value="">Selecione o dirigente...</option>
                  {eligibleMembers.map(m => (
                    <option key={m.id} value={m.id}>{m.full_name}</option>
                  ))}
                </select>
                <p className="text-gray-400 mt-1" style={{ fontSize: '0.72rem' }}>
                  O nome do grupo será gerado automaticamente como &quot;Grupo - [Nome do dirigente]&quot;
                </p>
              </div>
            </div>
            <div className="p-5 pt-0 flex gap-2 justify-end">
              <button
                onClick={() => { setShowNewGroupModal(false); setNewGroupOverseerId(''); }}
                className="px-4 py-2 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors"
                style={{ fontSize: '0.9rem' }}
                disabled={savingGroup}
              >
                Cancelar
              </button>
              <button
                onClick={handleCreateGroup}
                disabled={!newGroupOverseerId.trim() || savingGroup}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ fontSize: '0.9rem' }}
              >
                {savingGroup ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                Criar grupo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Editar Grupo */}
      {editingGroup && (() => {
        const overseerInList = eligibleMembers.some(m => m.id === editingGroup.overseer_id);
        const displayMembers = overseerInList ? eligibleMembers : [
          ...eligibleMembers,
          ...(editingGroup.overseer_id ? [{ id: editingGroup.overseer_id, full_name: editingGroup.overseer_name || 'Dirigente atual' }] : []),
        ];
        return (
        <div
          className="fixed inset-0 bg-[#082c45]/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => { if (!savingGroup) setEditingGroup(null); }}
        >
          <div
            className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl animate-in zoom-in-95 duration-200"
            onClick={e => e.stopPropagation()}
          >
            <div className="p-5 border-b border-border flex items-center justify-between">
              <h3 className="text-[#082c45] font-bold">Editar Grupo</h3>
              <button onClick={() => setEditingGroup(null)} className="text-muted-foreground hover:text-foreground p-1 transition-colors" disabled={savingGroup}>
                <X size={20} />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-gray-600 mb-1 font-medium" style={{ fontSize: '0.85rem' }}>Nome do grupo *</label>
                <input
                  type="text"
                  value={editingGroup.name}
                  onChange={e => setEditingGroup(g => g ? { ...g, name: e.target.value } : null)}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#35bdf8] text-foreground"
                  style={{ fontSize: '0.9rem' }}
                />
              </div>
              <div>
                <label className="block text-gray-600 mb-1 font-medium" style={{ fontSize: '0.85rem' }}>Dirigente do grupo *</label>
                <select
                  value={editingGroup.overseer_id}
                  onChange={e => setEditingGroup(g => g ? { ...g, overseer_id: e.target.value } : null)}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#35bdf8] text-foreground"
                  style={{ fontSize: '0.9rem' }}
                >
                  <option value="">Selecione o dirigente...</option>
                  {displayMembers.map(m => (
                    <option key={m.id} value={m.id}>{m.full_name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-gray-600 mb-1 font-medium" style={{ fontSize: '0.85rem' }}>Ajudantes (opcional)</label>
                <div className="max-h-32 overflow-y-auto border border-gray-200 rounded-lg p-2 space-y-1.5">
                  {displayMembers.filter(m => m.id !== editingGroup.overseer_id).map(m => (
                    <label key={m.id} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 rounded px-2 py-1">
                      <input
                        type="checkbox"
                        checked={editingGroup.assistant_ids.includes(m.id)}
                        onChange={e => {
                          setEditingGroup(g => g ? {
                            ...g,
                            assistant_ids: e.target.checked ? [...g.assistant_ids, m.id] : g.assistant_ids.filter(id => id !== m.id),
                          } : null);
                        }}
                        className="accent-[#35bdf8]"
                      />
                      <span style={{ fontSize: '0.9rem' }}>{m.full_name}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <div className="p-5 pt-0 flex gap-2 justify-end">
              <button onClick={() => setEditingGroup(null)} className="px-4 py-2 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50" style={{ fontSize: '0.9rem' }} disabled={savingGroup}>Cancelar</button>
              <button onClick={handleSaveEdit} disabled={!editingGroup.overseer_id.trim() || savingGroup} className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed" style={{ fontSize: '0.9rem' }}>
                {savingGroup ? <Loader2 size={16} className="animate-spin" /> : null} Salvar
              </button>
            </div>
          </div>
        </div>
        );
      })()}

      {/* Modal Confirmar Exclusão */}
      {deleteConfirmGroup && (
        <div className="fixed inset-0 bg-[#082c45]/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl p-5">
            <h3 className="text-[#082c45] font-bold mb-2">Excluir grupo?</h3>
            <p className="text-gray-600 mb-4" style={{ fontSize: '0.9rem' }}>
              O grupo &quot;{deleteConfirmGroup.name}&quot; será excluído. Os membros vinculados ficarão sem grupo. Deseja continuar?
            </p>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setDeleteConfirmGroup(null)} className="px-4 py-2 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50" style={{ fontSize: '0.9rem' }} disabled={savingGroup}>Cancelar</button>
              <button onClick={handleDeleteGroup} className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:opacity-90 disabled:opacity-50" style={{ fontSize: '0.9rem' }}>
                {savingGroup ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />} Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
