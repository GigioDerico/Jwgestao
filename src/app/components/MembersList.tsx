import React, { useState, useEffect } from 'react';
import { type Member, type FieldServiceGroup } from '../types';
import { getStatusLabel, getStatusColor, getRoleLabel } from '../helpers';
import { api, type CreateMemberInput } from '../lib/api';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import {
  Search,
  Plus,
  Phone,
  Mail,
  Filter,
  X,
  ChevronDown,
  ChevronUp,
  Shield,
  Users,
  List,
  Home,
  Crown,
  Monitor,
  ShoppingCart,
  UserCheck,
  Edit2,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { usePermissions } from '../hooks/usePermissions';

type ViewMode = 'list' | 'service_group' | 'family';

export function MembersList() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [groupFilter, setGroupFilter] = useState('all');
  const [showFilters, setShowFilters] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [allMembers, setAllMembers] = useState<Member[]>([]);
  const [fieldServiceGroups, setFieldServiceGroups] = useState<FieldServiceGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingMember, setSavingMember] = useState(false);
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [editForm, setEditForm] = useState<Partial<CreateMemberInput>>({});

  const { user: authUser, isAdmin } = useAuth();
  const { can } = usePermissions();

  const canCreate = can('create_members');
  const canEdit = can('edit_members');
  const canView = can('view_members');

  const formatPhoneMask = (digits: string): string => {
    if (digits.length <= 2) return digits;
    if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
  };

  const formatZipMask = (digits: string): string => {
    if (digits.length <= 5) return digits;
    return `${digits.slice(0, 5)}-${digits.slice(5, 8)}`;
  };

  const [newMemberForm, setNewMemberForm] = useState<CreateMemberInput>({
    full_name: '',
    phone: '',
    email: '',
    address_street: '',
    address_number: '',
    address_neighborhood: '',
    address_city: '',
    address_state: '',
    address_zip_code: '',
    emergency_contact_name: '',
    emergency_contact_phone: '',
    spiritual_status: 'estudante',
    gender: 'M',
    group_id: '',
    is_family_head: false,
    family_head_id: '',
    approved_audio_video: false,
    approved_indicadores: false,
    approved_carrinho: false,
    approved_pioneiro_auxiliar: false,
    approved_pioneiro_regular: false,
    system_role: 'publicador',
  });

  const fetchMembers = async () => {
    try {
      setLoading(true);
      const raw = await api.getMembers();

      // Map snake_case DB fields → camelCase Member type
      const mapped: Member[] = raw.map((m: any) => ({
        id: m.id,
        full_name: m.full_name,
        email: m.email || '',
        phone: m.phone || '',
        address_street: m.address_street || '',
        address_number: m.address_number || '',
        address_neighborhood: m.address_neighborhood || '',
        address_city: m.address_city || '',
        address_state: m.address_state || '',
        address_zip_code: m.address_zip_code || '',
        emergency_contact_name: m.emergency_contact_name || '',
        emergency_contact_phone: m.emergency_contact_phone || '',
        spiritual_status: m.spiritual_status,
        gender: m.gender,
        roles: Array.isArray(m.roles) ? m.roles : [],
        groupId: m.group_id || undefined,
        isFamilyHead: m.is_family_head || false,
        familyHeadId: m.family_head_id || undefined,
        avatar: m.avatar_url || undefined,
        approvedAudioVideo: m.approved_audio_video || false,
        approvedIndicadores: m.approved_indicadores || false,
        approvedCarrinho: m.approved_carrinho || false,
        // Keep snake_case copies too so updateMember/handleOpenEdit can read them
        approved_pioneiro_auxiliar: m.approved_pioneiro_auxiliar || false,
        approved_pioneiro_regular: m.approved_pioneiro_regular || false,
        group_id: m.group_id || undefined,
        family_head_id: m.family_head_id || undefined,
        system_role: m.system_role || 'publicador',
      }));

      setAllMembers(mapped);
      const { data: groups } = await supabase.from('field_service_groups').select('*');
      if (groups) setFieldServiceGroups(groups);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }

  };

  useEffect(() => {
    fetchMembers();
  }, []);

  const resetNewMemberForm = () => {
    setNewMemberForm({
      full_name: '',
      phone: '',
      email: '',
      address_street: '',
      address_number: '',
      address_neighborhood: '',
      address_city: '',
      address_state: '',
      address_zip_code: '',
      emergency_contact_name: '',
      emergency_contact_phone: '',
      spiritual_status: 'estudante',
      gender: 'M',
      group_id: '',
      is_family_head: false,
      family_head_id: '',
      approved_audio_video: false,
      approved_indicadores: false,
      approved_carrinho: false,
      approved_pioneiro_auxiliar: false,
      approved_pioneiro_regular: false,
      system_role: 'publicador',
    });
  };

  const handleSaveMember = async () => {
    if (!newMemberForm.full_name.trim()) {
      toast.error('O nome completo é obrigatório.');
      return;
    }
    const digits = (newMemberForm.phone || '').replace(/\D/g, '');
    if (!digits || digits.length < 10) {
      toast.error('Telefone com DDD é obrigatório (mínimo 10 dígitos).');
      return;
    }

    setSavingMember(true);
    try {
      await api.createMember({
        ...newMemberForm,
        group_id: newMemberForm.group_id || undefined,
        family_head_id: newMemberForm.family_head_id || undefined,
      });
      toast.success(`Membro "${newMemberForm.full_name}" criado com sucesso! Senha padrão: 001914`);
      setShowAddModal(false);
      resetNewMemberForm();
      await fetchMembers();
    } catch (err: any) {
      toast.error(err.message || 'Erro ao criar membro.');
    } finally {
      setSavingMember(false);
    }
  };

  const handleOpenEdit = (member: Member) => {
    setEditingMember(member);
    setEditForm({
      full_name: member.full_name,
      phone: member.phone,
      email: member.email,
      address_street: member.address_street,
      address_number: member.address_number,
      address_neighborhood: member.address_neighborhood,
      address_city: member.address_city,
      address_state: member.address_state,
      address_zip_code: member.address_zip_code,
      emergency_contact_name: member.emergency_contact_name,
      emergency_contact_phone: member.emergency_contact_phone,
      spiritual_status: member.spiritual_status,
      gender: member.gender,
      group_id: (member as any).group_id || '',
      is_family_head: member.isFamilyHead || false,
      family_head_id: (member as any).family_head_id || member.familyHeadId || '',
      approved_audio_video: member.approvedAudioVideo || false,
      approved_indicadores: member.approvedIndicadores || false,
      approved_carrinho: member.approvedCarrinho || false,
      approved_pioneiro_auxiliar: (member as any).approved_pioneiro_auxiliar || false,
      approved_pioneiro_regular: (member as any).approved_pioneiro_regular || false,
    });
  };

  const handleSaveEdit = async () => {
    if (!editingMember) return;
    if (!editForm.full_name?.trim()) {
      toast.error('O nome completo é obrigatório.');
      return;
    }
    setSavingMember(true);
    try {
      await api.updateMember(editingMember.id, {
        ...editForm,
        group_id: editForm.group_id || undefined,
        family_head_id: editForm.family_head_id || undefined,
      });
      toast.success(`Membro "${editForm.full_name}" atualizado com sucesso!`);
      setEditingMember(null);
      await fetchMembers();
    } catch (err: any) {
      toast.error(err.message || 'Erro ao atualizar membro.');
    } finally {
      setSavingMember(false);
    }
  };



  const filtered = allMembers.filter(m => {
    const matchesSearch =
      m.full_name.toLowerCase().includes(search.toLowerCase()) ||
      (m.email || '').toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || m.spiritual_status === statusFilter;
    const matchesGroup = groupFilter === 'all' || m.groupId === groupFilter;
    return matchesSearch && matchesStatus && matchesGroup;
  });

  const statuses = [
    'all',
    'estudante',
    'publicador',
    'publicador_batizado',
    'servo_ministerial',
    'anciao',
  ];

  const getGroupName = (groupId?: string) => {
    return fieldServiceGroups.find(g => g.id === groupId)?.name || 'Sem grupo';
  };

  const getFamilyHead = (familyHeadId?: string) => {
    return allMembers.find(m => m.id === familyHeadId);
  };

  const getFamilyMembers = (headId: string) => {
    return allMembers.filter(m => m.familyHeadId === headId);
  };

  // ---------- grouped by service group ----------
  const membersByServiceGroup = fieldServiceGroups.map(group => ({
    group,
    members: filtered.filter(m => m.groupId === group.id),
  })).filter(g => g.members.length > 0);
  const noGroupMembers = filtered.filter(m => !m.groupId);

  // ---------- grouped by family ----------
  const familyHeads = filtered.filter(m => m.isFamilyHead);
  const membersByFamily = familyHeads.map(head => ({
    head,
    members: filtered.filter(m => m.familyHeadId === head.id),
  }));
  const noFamilyMembers = filtered.filter(
    m => !m.isFamilyHead && !m.familyHeadId
  );

  const MemberCard = ({ member, isNested = false }: { member: Member; isNested?: boolean }) => (
    <div className={`group ${isNested ? '' : ''}`}>
      <button
        onClick={() => setExpandedId(expandedId === member.id ? null : member.id)}
        className={`w-full px-4 py-3.5 flex items-center gap-3 hover:bg-muted/30 transition-colors text-left ${isNested ? 'pl-10 bg-muted/5' : ''}`}
      >
        <div
          className={`w-10 h-10 rounded-full overflow-hidden flex items-center justify-center shrink-0 border ${member.isFamilyHead
            ? 'bg-amber-50 text-amber-700 border-amber-200'
            : member.gender === 'M'
              ? 'bg-accent text-accent-foreground border-primary/5'
              : 'bg-pink-50 text-pink-600 border-pink-100'
            }`}
        >
          {((member as any).avatar_url || member.avatar) ? (
            <img
              src={(member as any).avatar_url || member.avatar}
              alt={member.full_name}
              className="w-full h-full object-cover"
            />
          ) : (
            <span className="font-bold" style={{ fontSize: '0.8rem' }}>
              {member.full_name
                .split(' ')
                .map(n => n[0])
                .join('')
                .slice(0, 2)}
            </span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <p
              className="text-foreground truncate font-medium group-hover:text-primary transition-colors"
              style={{ fontSize: '0.9rem' }}
            >
              {member.full_name}
            </p>
            {member.isFamilyHead && (
              <Crown size={12} className="text-amber-500 shrink-0" />
            )}
          </div>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            <span
              className={`px-2 py-0.5 rounded-full font-medium ${getStatusColor(member.spiritual_status)}`}
              style={{ fontSize: '0.7rem' }}
            >
              {getStatusLabel(member.spiritual_status)}
            </span>
            {(member.roles?.length ?? 0) > 0 && (
              <span
                className="flex items-center gap-0.5 text-muted-foreground"
                style={{ fontSize: '0.7rem' }}
              >
                <Shield size={10} />
                {member.roles.map(r => getRoleLabel(r)).join(', ')}
              </span>
            )}

            {member.system_role && member.system_role !== 'publicador' && (
              <span
                className="px-2 py-0.5 rounded-full font-medium bg-purple-100 text-purple-700"
                style={{ fontSize: '0.7rem' }}
              >
                {member.system_role === 'coordenador' ? 'Coordenador do Sistema' :
                  member.system_role === 'secretario' ? 'Secretário do Sistema' :
                    member.system_role === 'designador' ? 'Designador de Reuniões' : ''}
              </span>
            )}

            <span
              className="flex items-center gap-0.5 text-primary/70"
              style={{ fontSize: '0.7rem' }}
            >
              <Users size={10} />
              {getGroupName(member.groupId)}
            </span>
            {member.familyHeadId && viewMode !== 'family' && (
              <span
                className="flex items-center gap-0.5 text-amber-600"
                style={{ fontSize: '0.7rem' }}
              >
                <Home size={10} />
                Família {getFamilyHead(member.familyHeadId)?.full_name.split(' ')[0]}
              </span>
            )}
          </div>
        </div>
        {expandedId === member.id ? (
          <ChevronUp size={16} className="text-primary" />
        ) : (
          <ChevronDown size={16} className="text-muted-foreground" />
        )}
      </button>

      {expandedId === member.id && (
        <div className="px-4 pb-4 bg-muted/10 border-t border-border/5 animate-in slide-in-from-top-1 duration-200">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 pl-13">
            <div className="flex items-center gap-2 text-foreground/80" style={{ fontSize: '0.85rem' }}>
              <div className="w-7 h-7 rounded-full bg-muted/50 flex items-center justify-center shrink-0">
                <Phone size={14} className="text-muted-foreground" />
              </div>
              {member.phone}
            </div>
            <div className="flex items-center gap-2 text-foreground/80" style={{ fontSize: '0.85rem' }}>
              <div className="w-7 h-7 rounded-full bg-muted/50 flex items-center justify-center shrink-0">
                <Mail size={14} className="text-muted-foreground" />
              </div>
              {member.email}
            </div>
            {member.emergency_contact_name && (
              <div className="sm:col-span-2 bg-primary/5 rounded-lg px-3 py-2 border border-primary/10">
                <p className="text-primary font-bold" style={{ fontSize: '0.75rem' }}>
                  Contato de Emergência
                </p>
                <p className="text-foreground/90 mt-0.5" style={{ fontSize: '0.85rem' }}>
                  {member.emergency_contact_name} — {member.emergency_contact_phone}
                </p>
              </div>
            )}
            <div
              className="sm:col-span-2 flex items-center gap-2 text-foreground/80 mt-1"
              style={{ fontSize: '0.85rem' }}
            >
              <div className="w-7 h-7 rounded-full bg-accent/50 flex items-center justify-center shrink-0">
                <Users size={14} className="text-accent-foreground" />
              </div>
              <span className="font-medium">Grupo:</span> {getGroupName(member.groupId)}
            </div>
            {member.isFamilyHead && (
              <div
                className="sm:col-span-2 flex items-center gap-2 text-amber-700 mt-1"
                style={{ fontSize: '0.85rem' }}
              >
                <div className="w-7 h-7 rounded-full bg-amber-50 flex items-center justify-center shrink-0">
                  <Crown size={14} className="text-amber-500" />
                </div>
                <span className="font-medium">Chefe de família</span>
                <span className="text-muted-foreground">
                  — {getFamilyMembers(member.id).length} membro(s) na família
                </span>
              </div>
            )}
            {member.familyHeadId && (
              <div
                className="sm:col-span-2 flex items-center gap-2 text-amber-700 mt-1"
                style={{ fontSize: '0.85rem' }}
              >
                <div className="w-7 h-7 rounded-full bg-amber-50 flex items-center justify-center shrink-0">
                  <Home size={14} className="text-amber-500" />
                </div>
                <span className="font-medium">Família de:</span>{' '}
                {getFamilyHead(member.familyHeadId)?.full_name}
              </div>
            )}
            {/* Approval badges */}
            {(member.approvedAudioVideo || member.approvedIndicadores || member.approvedCarrinho) && (
              <div className="sm:col-span-2 mt-2">
                <p className="text-muted-foreground font-medium mb-1.5 flex items-center gap-1.5" style={{ fontSize: '0.75rem' }}>
                  <UserCheck size={12} />
                  Aprovado para
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {member.approvedAudioVideo && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-sky-100 text-sky-700" style={{ fontSize: '0.7rem' }}>
                      <Monitor size={10} />
                      Áudio e Vídeo
                    </span>
                  )}
                  {member.approvedIndicadores && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-indigo-100 text-indigo-700" style={{ fontSize: '0.7rem' }}>
                      <Users size={10} />
                      Indicadores
                    </span>
                  )}
                  {member.approvedCarrinho && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-100 text-amber-700" style={{ fontSize: '0.7rem' }}>
                      <ShoppingCart size={10} />
                      Carrinho
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* System Role Editor */}
            {isAdmin && (
              <div className="sm:col-span-2 mt-4 bg-white rounded-lg border border-border p-3">
                <p className="text-muted-foreground font-medium mb-2 flex items-center gap-1.5" style={{ fontSize: '0.75rem' }}>
                  <Shield size={12} className="text-purple-500" />
                  Permissão de Acesso ao Sistema
                </p>
                <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
                  <select
                    value={member.system_role || 'publicador'}
                    onChange={async (e) => {
                      try {
                        setSavingMember(true);
                        await api.updateMemberSystemRole(member.id, e.target.value);
                        toast.success('Permissão atualizada com sucesso!');
                        await fetchMembers();
                      } catch (err: any) {
                        toast.error('Erro ao atualizar permissão: ' + err.message);
                      } finally {
                        setSavingMember(false);
                      }
                    }}
                    disabled={savingMember || member.id === authUser?.id} // Don't let users edit their own permission here
                    className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#35bdf8] text-foreground text-sm"
                  >
                    <option value="publicador">Publicador (Acesso Padrão)</option>
                    <option value="designador">Designador de Reuniões</option>
                    <option value="secretario">Secretário</option>
                    <option value="coordenador">Coordenador</option>
                  </select>
                  {member.id === authUser?.id && (
                    <span className="text-amber-600 text-xs mt-1 sm:mt-0">Você não pode alterar sua própria permissão.</span>
                  )}
                </div>
              </div>
            )}

            {/* Edit Button */}
            {canEdit && (
              <div className="sm:col-span-2 mt-3 flex justify-end">
                <button
                  onClick={() => handleOpenEdit(member)}
                  className="flex items-center gap-2 px-4 py-2 bg-[#082c45] text-white rounded-xl hover:bg-[#0a4a7a] transition-colors font-medium"
                  style={{ fontSize: '0.85rem' }}
                >
                  <Edit2 size={14} />
                  Editar Membro
                </button>
              </div>
            )}

          </div>
        </div>
      )}
    </div>
  );

  const GroupHeader = ({
    title,
    subtitle,
    count,
    color = 'blue',
  }: {
    title: string;
    subtitle?: string;
    count: number;
    color?: 'blue' | 'amber';
  }) => (
    <div
      className={`px-4 py-3 flex items-center gap-3 border-b border-border/60 ${color === 'amber'
        ? 'bg-amber-50/70'
        : 'bg-primary/5'
        }`}
    >
      <div
        className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${color === 'amber'
          ? 'bg-amber-100 text-amber-600'
          : 'bg-primary/10 text-primary'
          }`}
      >
        {color === 'amber' ? <Home size={15} /> : <Users size={15} />}
      </div>
      <div className="flex-1 min-w-0">
        <p className={`font-bold truncate ${color === 'amber' ? 'text-amber-800' : 'text-primary'}`} style={{ fontSize: '0.85rem' }}>
          {title}
        </p>
        {subtitle && (
          <p className="text-muted-foreground truncate" style={{ fontSize: '0.72rem' }}>
            {subtitle}
          </p>
        )}
      </div>
      <span
        className={`px-2 py-0.5 rounded-full font-medium shrink-0 ${color === 'amber'
          ? 'bg-amber-100 text-amber-700'
          : 'bg-primary/10 text-primary'
          }`}
        style={{ fontSize: '0.72rem' }}
      >
        {count} membro{count !== 1 ? 's' : ''}
      </span>
    </div>
  );

  return (
    <div className="max-w-5xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-foreground">Membros</h1>
          <p className="text-muted-foreground" style={{ fontSize: '0.85rem' }}>
            {filtered.length} membros encontrados
          </p>
        </div>
        {canCreate && (
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground font-bold rounded-xl hover:opacity-90 transition-colors shadow-sm"
          >
            <Plus size={16} />
            <span className="hidden sm:inline" style={{ fontSize: '0.9rem' }}>
              Novo Membro
            </span>
          </button>
        )}
      </div>

      {/* Search & Filters */}
      <div className="bg-card rounded-xl border border-border p-3 space-y-3 shadow-sm">
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar por nome ou e-mail..."
              className="w-full pl-9 pr-4 py-2 bg-muted/30 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-foreground"
              style={{ fontSize: '0.9rem' }}
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border transition-colors ${showFilters || statusFilter !== 'all' || groupFilter !== 'all'
              ? 'bg-primary/10 border-primary/20 text-primary'
              : 'bg-muted/30 border-border text-muted-foreground hover:bg-muted/50'
              }`}
          >
            <Filter size={16} />
            <span className="hidden sm:inline" style={{ fontSize: '0.85rem' }}>
              Filtros
            </span>
          </button>
        </div>

        {showFilters && (
          <div className="space-y-3 animate-in fade-in slide-in-from-top-1 duration-200">
            <div className="flex flex-wrap gap-2">
              <span
                className="w-full text-muted-foreground font-medium mb-1"
                style={{ fontSize: '0.75rem' }}
              >
                Situação Espiritual
              </span>
              {statuses.map(s => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={`px-3 py-1.5 rounded-full transition-all ${statusFilter === s
                    ? 'bg-primary text-primary-foreground font-medium shadow-sm'
                    : 'bg-muted/50 text-muted-foreground hover:bg-muted/80'
                    }`}
                  style={{ fontSize: '0.8rem' }}
                >
                  {s === 'all' ? 'Todos' : getStatusLabel(s)}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap gap-2 pt-2 border-t border-border/50">
              <span
                className="w-full text-muted-foreground font-medium mb-1"
                style={{ fontSize: '0.75rem' }}
              >
                Grupo de Serviço
              </span>
              <button
                onClick={() => setGroupFilter('all')}
                className={`px-3 py-1.5 rounded-full transition-all ${groupFilter === 'all'
                  ? 'bg-primary text-primary-foreground font-medium shadow-sm'
                  : 'bg-muted/50 text-muted-foreground hover:bg-muted/80'
                  }`}
                style={{ fontSize: '0.8rem' }}
              >
                Todos
              </button>
              {fieldServiceGroups.map(g => (
                <button
                  key={g.id}
                  onClick={() => setGroupFilter(g.id)}
                  className={`px-3 py-1.5 rounded-full transition-all ${groupFilter === g.id
                    ? 'bg-primary text-primary-foreground font-medium shadow-sm'
                    : 'bg-muted/50 text-muted-foreground hover:bg-muted/80'
                    }`}
                  style={{ fontSize: '0.8rem' }}
                >
                  {g.name}
                </button>
              ))}
            </div>

            {(statusFilter !== 'all' || groupFilter !== 'all') && (
              <button
                onClick={() => {
                  setStatusFilter('all');
                  setGroupFilter('all');
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 text-red-500 hover:text-red-600 transition-colors font-medium"
                style={{ fontSize: '0.8rem' }}
              >
                <X size={14} />
                Limpar filtros
              </button>
            )}
          </div>
        )}
      </div>

      {/* View mode toggle */}
      <div className="flex items-center gap-1 bg-card rounded-xl border border-border p-1 shadow-sm w-fit">
        <button
          onClick={() => setViewMode('list')}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-lg transition-all ${viewMode === 'list'
            ? 'bg-primary text-primary-foreground shadow-sm'
            : 'text-muted-foreground hover:bg-muted/50'
            }`}
          style={{ fontSize: '0.82rem' }}
        >
          <List size={14} />
          Lista
        </button>
        <button
          onClick={() => setViewMode('service_group')}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-lg transition-all ${viewMode === 'service_group'
            ? 'bg-primary text-primary-foreground shadow-sm'
            : 'text-muted-foreground hover:bg-muted/50'
            }`}
          style={{ fontSize: '0.82rem' }}
        >
          <Users size={14} />
          Por Grupo
        </button>
        <button
          onClick={() => setViewMode('family')}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-lg transition-all ${viewMode === 'family'
            ? 'bg-amber-500 text-white shadow-sm'
            : 'text-muted-foreground hover:bg-muted/50'
            }`}
          style={{ fontSize: '0.82rem' }}
        >
          <Home size={14} />
          Por Família
        </button>
      </div>

      {/* ---- VIEW: LIST ---- */}
      {viewMode === 'list' && (
        <div className="bg-card rounded-xl border border-border overflow-hidden divide-y divide-border shadow-sm">
          {filtered.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground" style={{ fontSize: '0.9rem' }}>
              Nenhum membro encontrado.
            </div>
          ) : (
            filtered.map(member => <MemberCard key={member.id} member={member} />)
          )}
        </div>
      )}

      {/* ---- VIEW: BY SERVICE GROUP ---- */}
      {viewMode === 'service_group' && (
        <div className="space-y-4">
          {membersByServiceGroup.map(({ group, members: groupMembers }) => (
            <div
              key={group.id}
              className="bg-card rounded-xl border border-border overflow-hidden shadow-sm"
            >
              <GroupHeader
                title={group.name}
                subtitle={`Dirigente: ${group.overseer}`}
                count={groupMembers.length}
                color="blue"
              />
              <div className="divide-y divide-border">
                {groupMembers.map(member => (
                  <MemberCard key={member.id} member={member} />
                ))}
              </div>
            </div>
          ))}
          {noGroupMembers.length > 0 && (
            <div className="bg-card rounded-xl border border-border overflow-hidden shadow-sm">
              <GroupHeader title="Sem Grupo" count={noGroupMembers.length} color="blue" />
              <div className="divide-y divide-border">
                {noGroupMembers.map(member => (
                  <MemberCard key={member.id} member={member} />
                ))}
              </div>
            </div>
          )}
          {membersByServiceGroup.length === 0 && noGroupMembers.length === 0 && (
            <div className="bg-card rounded-xl border border-border py-12 text-center text-muted-foreground shadow-sm" style={{ fontSize: '0.9rem' }}>
              Nenhum membro encontrado.
            </div>
          )}
        </div>
      )}

      {/* ---- VIEW: BY FAMILY ---- */}
      {viewMode === 'family' && (
        <div className="space-y-4">
          {membersByFamily.map(({ head, members: familyMembers }) => (
            <div
              key={head.id}
              className="bg-card rounded-xl border border-border overflow-hidden shadow-sm"
            >
              <GroupHeader
                title={`Família ${head.full_name}`}
                subtitle={
                  familyMembers.length > 0
                    ? `${familyMembers.length} membro(s) vinculado(s)`
                    : 'Nenhum membro vinculado ainda'
                }
                count={1 + familyMembers.length}
                color="amber"
              />
              <div className="divide-y divide-border">
                {/* Head always first */}
                <MemberCard key={head.id} member={head} />
                {familyMembers.map(member => (
                  <MemberCard key={member.id} member={member} isNested />
                ))}
              </div>
            </div>
          ))}

          {noFamilyMembers.length > 0 && (
            <div className="bg-card rounded-xl border border-border overflow-hidden shadow-sm">
              <div className="px-4 py-3 flex items-center gap-3 border-b border-border/60 bg-muted/30">
                <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                  <Users size={15} className="text-muted-foreground" />
                </div>
                <div className="flex-1">
                  <p className="font-bold text-muted-foreground" style={{ fontSize: '0.85rem' }}>
                    Sem família cadastrada
                  </p>
                </div>
                <span
                  className="px-2 py-0.5 bg-muted text-muted-foreground rounded-full font-medium shrink-0"
                  style={{ fontSize: '0.72rem' }}
                >
                  {noFamilyMembers.length} membro{noFamilyMembers.length !== 1 ? 's' : ''}
                </span>
              </div>
              <div className="divide-y divide-border">
                {noFamilyMembers.map(member => (
                  <MemberCard key={member.id} member={member} />
                ))}
              </div>
            </div>
          )}

          {membersByFamily.length === 0 && noFamilyMembers.length === 0 && (
            <div className="bg-card rounded-xl border border-border py-12 text-center text-muted-foreground shadow-sm" style={{ fontSize: '0.9rem' }}>
              Nenhum membro encontrado.
            </div>
          )}
        </div>
      )}

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-[#082c45]/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-border flex items-center justify-between sticky top-0 bg-white z-10">
              <h3 className="text-[#082c45] font-bold">Novo Membro</h3>
              <button
                onClick={() => { setShowAddModal(false); resetNewMemberForm(); }}
                className="text-muted-foreground hover:text-foreground p-1 transition-colors"
                disabled={savingMember}
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-5 space-y-4">
              {/* Nome Completo */}
              <div>
                <label className="block text-gray-600 mb-1 font-medium" style={{ fontSize: '0.85rem' }}>Nome Completo *</label>
                <input
                  type="text"
                  value={newMemberForm.full_name}
                  onChange={e => setNewMemberForm(f => ({ ...f, full_name: e.target.value }))}
                  placeholder="Ex: João da Silva"
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#35bdf8] text-foreground"
                  style={{ fontSize: '0.9rem' }}
                />
              </div>
              {/* Telefone */}
              <div>
                <label className="block text-gray-600 mb-1 font-medium" style={{ fontSize: '0.85rem' }}>Telefone (WhatsApp) *</label>
                <input
                  type="tel"
                  inputMode="numeric"
                  value={formatPhoneMask(newMemberForm.phone || '')}
                  onChange={e => setNewMemberForm(f => ({ ...f, phone: e.target.value.replace(/\D/g, '').slice(0, 11) }))}
                  placeholder="(11) 99999-0000"
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#35bdf8] text-foreground"
                  style={{ fontSize: '0.9rem' }}
                />
                <p className="text-gray-400 mt-1" style={{ fontSize: '0.72rem' }}>Será usado como login. Senha padrão: 001914</p>
              </div>
              {/* E-mail */}
              <div>
                <label className="block text-gray-600 mb-1 font-medium" style={{ fontSize: '0.85rem' }}>E-mail</label>
                <input
                  type="email"
                  value={newMemberForm.email}
                  onChange={e => setNewMemberForm(f => ({ ...f, email: e.target.value }))}
                  placeholder="joao@email.com"
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#35bdf8] text-foreground"
                  style={{ fontSize: '0.9rem' }}
                />
              </div>
              <div className="space-y-3 rounded-xl border border-gray-100 bg-gray-50/60 p-3">
                <div>
                  <p className="text-gray-700 font-medium" style={{ fontSize: '0.85rem' }}>Endereço</p>
                  <p className="text-gray-500" style={{ fontSize: '0.72rem' }}>Opcional. Preencha apenas os campos que desejar.</p>
                </div>
                <div>
                  <label className="block text-gray-600 mb-1 font-medium" style={{ fontSize: '0.85rem' }}>Rua / Logradouro</label>
                  <input
                    type="text"
                    value={newMemberForm.address_street || ''}
                    onChange={e => setNewMemberForm(f => ({ ...f, address_street: e.target.value }))}
                    placeholder="Ex: Rua das Flores"
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#35bdf8] text-foreground"
                    style={{ fontSize: '0.9rem' }}
                  />
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <div>
                    <label className="block text-gray-600 mb-1 font-medium" style={{ fontSize: '0.85rem' }}>Número</label>
                    <input
                      type="text"
                      value={newMemberForm.address_number || ''}
                      onChange={e => setNewMemberForm(f => ({ ...f, address_number: e.target.value }))}
                      placeholder="123"
                      className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#35bdf8] text-foreground"
                      style={{ fontSize: '0.9rem' }}
                    />
                  </div>
                  <div>
                    <label className="block text-gray-600 mb-1 font-medium" style={{ fontSize: '0.85rem' }}>Bairro</label>
                    <input
                      type="text"
                      value={newMemberForm.address_neighborhood || ''}
                      onChange={e => setNewMemberForm(f => ({ ...f, address_neighborhood: e.target.value }))}
                      placeholder="Centro"
                      className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#35bdf8] text-foreground"
                      style={{ fontSize: '0.9rem' }}
                    />
                  </div>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <div>
                    <label className="block text-gray-600 mb-1 font-medium" style={{ fontSize: '0.85rem' }}>Cidade</label>
                    <input
                      type="text"
                      value={newMemberForm.address_city || ''}
                      onChange={e => setNewMemberForm(f => ({ ...f, address_city: e.target.value }))}
                      placeholder="São Paulo"
                      className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#35bdf8] text-foreground"
                      style={{ fontSize: '0.9rem' }}
                    />
                  </div>
                  <div>
                    <label className="block text-gray-600 mb-1 font-medium" style={{ fontSize: '0.85rem' }}>Estado (UF)</label>
                    <input
                      type="text"
                      value={newMemberForm.address_state || ''}
                      onChange={e => setNewMemberForm(f => ({ ...f, address_state: e.target.value.toUpperCase().slice(0, 2) }))}
                      placeholder="SP"
                      className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#35bdf8] text-foreground"
                      style={{ fontSize: '0.9rem' }}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-gray-600 mb-1 font-medium" style={{ fontSize: '0.85rem' }}>CEP</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={formatZipMask((newMemberForm.address_zip_code || '').replace(/\D/g, ''))}
                    onChange={e => setNewMemberForm(f => ({ ...f, address_zip_code: e.target.value.replace(/\D/g, '').slice(0, 8) }))}
                    placeholder="00000-000"
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#35bdf8] text-foreground"
                    style={{ fontSize: '0.9rem' }}
                  />
                </div>
              </div>
              {/* Contato de Emergência */}
              <div>
                <label className="block text-gray-600 mb-1 font-medium" style={{ fontSize: '0.85rem' }}>Contato de Emergência</label>
                <input
                  type="text"
                  value={newMemberForm.emergency_contact_name}
                  onChange={e => setNewMemberForm(f => ({ ...f, emergency_contact_name: e.target.value }))}
                  placeholder="Nome do contato"
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#35bdf8] text-foreground"
                  style={{ fontSize: '0.9rem' }}
                />
              </div>
              <div>
                <label className="block text-gray-600 mb-1 font-medium" style={{ fontSize: '0.85rem' }}>Telefone Emergência</label>
                <input
                  type="tel"
                  inputMode="numeric"
                  value={formatPhoneMask(newMemberForm.emergency_contact_phone || '')}
                  onChange={e => setNewMemberForm(f => ({ ...f, emergency_contact_phone: e.target.value.replace(/\D/g, '').slice(0, 11) }))}
                  placeholder="(11) 88888-0000"
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#35bdf8] text-foreground"
                  style={{ fontSize: '0.9rem' }}
                />
              </div>

              {/* Situação Espiritual */}
              <div>
                <label className="block text-gray-600 mb-1 font-medium" style={{ fontSize: '0.85rem' }}>Situação Espiritual</label>
                <select
                  value={newMemberForm.spiritual_status}
                  onChange={e => setNewMemberForm(f => ({ ...f, spiritual_status: e.target.value as any }))}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#35bdf8] text-foreground"
                  style={{ fontSize: '0.9rem' }}
                >
                  <option value="estudante">Estudante</option>
                  <option value="publicador">Publicador Não Batizado</option>
                  <option value="publicador_batizado">Publicador Batizado</option>
                  <option value="servo_ministerial">Servo Ministerial</option>
                  <option value="anciao">Ancião</option>
                </select>
              </div>

              {/* Grupo */}
              <div>
                <label className="block text-gray-600 mb-1 font-medium" style={{ fontSize: '0.85rem' }}>Grupo de Saída de Campo</label>
                <select
                  value={newMemberForm.group_id}
                  onChange={e => setNewMemberForm(f => ({ ...f, group_id: e.target.value }))}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#35bdf8] text-foreground"
                  style={{ fontSize: '0.9rem' }}
                >
                  <option value="">Selecione um grupo...</option>
                  {fieldServiceGroups.map(g => (
                    <option key={g.id} value={g.id}>{g.name}</option>
                  ))}
                </select>
              </div>

              {/* Gênero */}
              <div>
                <label className="block text-gray-600 mb-1 font-medium" style={{ fontSize: '0.85rem' }}>Gênero *</label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer group">
                    <input type="radio" name="newGender" value="M" checked={newMemberForm.gender === 'M'} onChange={() => setNewMemberForm(f => ({ ...f, gender: 'M' }))} className="accent-[#35bdf8] w-4 h-4" />
                    <span className="text-gray-700 group-hover:text-[#082c45] transition-colors" style={{ fontSize: '0.9rem' }}>Masculino</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer group">
                    <input type="radio" name="newGender" value="F" checked={newMemberForm.gender === 'F'} onChange={() => setNewMemberForm(f => ({ ...f, gender: 'F' }))} className="accent-[#35bdf8] w-4 h-4" />
                    <span className="text-gray-700 group-hover:text-[#082c45] transition-colors" style={{ fontSize: '0.9rem' }}>Feminino</span>
                  </label>
                </div>
              </div>

              {/* Família */}
              <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 space-y-3">
                <div className="flex items-center gap-2">
                  <Crown size={14} className="text-amber-500 shrink-0" />
                  <span className="text-amber-800 font-medium" style={{ fontSize: '0.85rem' }}>Família</span>
                </div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={newMemberForm.is_family_head || false} onChange={e => setNewMemberForm(f => ({ ...f, is_family_head: e.target.checked, family_head_id: e.target.checked ? '' : f.family_head_id }))} className="accent-[#35bdf8] w-4 h-4 rounded" />
                  <span className="text-gray-700" style={{ fontSize: '0.85rem' }}>Marcar como chefe de família</span>
                </label>
                {!newMemberForm.is_family_head && (
                  <div>
                    <label className="block text-gray-600 mb-1" style={{ fontSize: '0.82rem' }}>Vincular a uma família existente:</label>
                    <select
                      value={newMemberForm.family_head_id}
                      onChange={e => setNewMemberForm(f => ({ ...f, family_head_id: e.target.value }))}
                      className="w-full px-3 py-2 bg-white border border-amber-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-300 text-foreground"
                      style={{ fontSize: '0.9rem' }}
                    >
                      <option value="">Nenhuma família</option>
                      {allMembers.filter(m => m.isFamilyHead).map(head => (
                        <option key={head.id} value={head.id}>Família {head.full_name}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Privilégios */}
              <div className="bg-sky-50 border border-sky-100 rounded-xl p-3 space-y-3">
                <div className="flex items-center gap-2">
                  <UserCheck size={14} className="text-sky-600 shrink-0" />
                  <span className="text-sky-800 font-medium" style={{ fontSize: '0.85rem' }}>Privilégios</span>
                </div>
                <p className="text-gray-500" style={{ fontSize: '0.75rem' }}>Marque os privilégios atribuídos a este membro.</p>
                <div className="space-y-2">
                  <label className="flex items-center gap-2.5 cursor-pointer group">
                    <input type="checkbox" checked={newMemberForm.approved_pioneiro_auxiliar || false} onChange={e => setNewMemberForm(f => ({ ...f, approved_pioneiro_auxiliar: e.target.checked }))} className="accent-[#35bdf8] w-4 h-4 rounded" />
                    <Shield size={14} className="text-emerald-500 shrink-0" />
                    <span className="text-gray-700 group-hover:text-[#082c45] transition-colors" style={{ fontSize: '0.85rem' }}>Pioneiro Auxiliar</span>
                  </label>
                  <label className="flex items-center gap-2.5 cursor-pointer group">
                    <input type="checkbox" checked={newMemberForm.approved_pioneiro_regular || false} onChange={e => setNewMemberForm(f => ({ ...f, approved_pioneiro_regular: e.target.checked }))} className="accent-[#35bdf8] w-4 h-4 rounded" />
                    <Shield size={14} className="text-teal-500 shrink-0" />
                    <span className="text-gray-700 group-hover:text-[#082c45] transition-colors" style={{ fontSize: '0.85rem' }}>Pioneiro Regular</span>
                  </label>
                  <label className="flex items-center gap-2.5 cursor-pointer group">
                    <input type="checkbox" checked={newMemberForm.approved_carrinho || false} onChange={e => setNewMemberForm(f => ({ ...f, approved_carrinho: e.target.checked }))} className="accent-[#35bdf8] w-4 h-4 rounded" />
                    <ShoppingCart size={14} className="text-amber-500 shrink-0" />
                    <span className="text-gray-700 group-hover:text-[#082c45] transition-colors" style={{ fontSize: '0.85rem' }}>Carrinho</span>
                  </label>
                  <label className="flex items-center gap-2.5 cursor-pointer group">
                    <input type="checkbox" checked={newMemberForm.approved_audio_video || false} onChange={e => setNewMemberForm(f => ({ ...f, approved_audio_video: e.target.checked }))} className="accent-[#35bdf8] w-4 h-4 rounded" />
                    <Monitor size={14} className="text-sky-500 shrink-0" />
                    <span className="text-gray-700 group-hover:text-[#082c45] transition-colors" style={{ fontSize: '0.85rem' }}>Áudio e Vídeo</span>
                  </label>
                  <label className="flex items-center gap-2.5 cursor-pointer group">
                    <input type="checkbox" checked={newMemberForm.approved_indicadores || false} onChange={e => setNewMemberForm(f => ({ ...f, approved_indicadores: e.target.checked }))} className="accent-[#35bdf8] w-4 h-4 rounded" />
                    <Users size={14} className="text-indigo-500 shrink-0" />
                    <span className="text-gray-700 group-hover:text-[#082c45] transition-colors" style={{ fontSize: '0.85rem' }}>Indicadores</span>
                  </label>
                </div>
              </div>
            </div>
            <div className="p-5 border-t border-border flex gap-3 justify-end sticky bottom-0 bg-white">
              <button
                onClick={() => { setShowAddModal(false); resetNewMemberForm(); }}
                disabled={savingMember}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors font-medium disabled:opacity-50"
                style={{ fontSize: '0.9rem' }}
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveMember}
                disabled={savingMember}
                className="px-6 py-2 bg-[#35bdf8] text-[#082c45] font-bold rounded-lg hover:opacity-90 transition-colors shadow-md shadow-[#35bdf8]/10 disabled:opacity-50 flex items-center gap-2"
                style={{ fontSize: '0.9rem' }}
              >
                {savingMember ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Criando...
                  </>
                ) : (
                  'Salvar'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Member Modal */}
      {editingMember && (
        <div className="fixed inset-0 bg-[#082c45]/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="p-5 border-b border-border flex items-center justify-between sticky top-0 bg-white z-10">
              <h3 className="text-[#082c45] font-bold flex items-center gap-2">
                <Edit2 size={16} />
                Editar Membro
              </h3>
              <button onClick={() => setEditingMember(null)} disabled={savingMember} className="text-muted-foreground hover:text-foreground p-1 transition-colors">
                <X size={20} />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-gray-600 mb-1 font-medium" style={{ fontSize: '0.85rem' }}>Nome Completo *</label>
                <input type="text" value={editForm.full_name || ''} onChange={e => setEditForm(f => ({ ...f, full_name: e.target.value }))} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#35bdf8] text-foreground" style={{ fontSize: '0.9rem' }} />
              </div>
              <div>
                <label className="block text-gray-600 mb-1 font-medium" style={{ fontSize: '0.85rem' }}>Telefone</label>
                <input type="tel" inputMode="numeric" value={formatPhoneMask((editForm.phone || '').replace(/\D/g, ''))} onChange={e => setEditForm(f => ({ ...f, phone: e.target.value.replace(/\D/g, '').slice(0, 11) }))} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#35bdf8] text-foreground" style={{ fontSize: '0.9rem' }} />
              </div>
              <div>
                <label className="block text-gray-600 mb-1 font-medium" style={{ fontSize: '0.85rem' }}>E-mail</label>
                <input type="email" value={editForm.email || ''} onChange={e => setEditForm(f => ({ ...f, email: e.target.value }))} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#35bdf8] text-foreground" style={{ fontSize: '0.9rem' }} />
              </div>
              <div className="space-y-3 rounded-xl border border-gray-100 bg-gray-50/60 p-3">
                <div>
                  <p className="text-gray-700 font-medium" style={{ fontSize: '0.85rem' }}>Endereço</p>
                  <p className="text-gray-500" style={{ fontSize: '0.72rem' }}>Opcional. Preencha apenas os campos que desejar.</p>
                </div>
                <div>
                  <label className="block text-gray-600 mb-1 font-medium" style={{ fontSize: '0.85rem' }}>Rua / Logradouro</label>
                  <input type="text" value={editForm.address_street || ''} onChange={e => setEditForm(f => ({ ...f, address_street: e.target.value }))} placeholder="Ex: Rua das Flores" className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#35bdf8] text-foreground" style={{ fontSize: '0.9rem' }} />
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <div>
                    <label className="block text-gray-600 mb-1 font-medium" style={{ fontSize: '0.85rem' }}>Número</label>
                    <input type="text" value={editForm.address_number || ''} onChange={e => setEditForm(f => ({ ...f, address_number: e.target.value }))} placeholder="123" className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#35bdf8] text-foreground" style={{ fontSize: '0.9rem' }} />
                  </div>
                  <div>
                    <label className="block text-gray-600 mb-1 font-medium" style={{ fontSize: '0.85rem' }}>Bairro</label>
                    <input type="text" value={editForm.address_neighborhood || ''} onChange={e => setEditForm(f => ({ ...f, address_neighborhood: e.target.value }))} placeholder="Centro" className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#35bdf8] text-foreground" style={{ fontSize: '0.9rem' }} />
                  </div>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <div>
                    <label className="block text-gray-600 mb-1 font-medium" style={{ fontSize: '0.85rem' }}>Cidade</label>
                    <input type="text" value={editForm.address_city || ''} onChange={e => setEditForm(f => ({ ...f, address_city: e.target.value }))} placeholder="São Paulo" className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#35bdf8] text-foreground" style={{ fontSize: '0.9rem' }} />
                  </div>
                  <div>
                    <label className="block text-gray-600 mb-1 font-medium" style={{ fontSize: '0.85rem' }}>Estado (UF)</label>
                    <input type="text" value={editForm.address_state || ''} onChange={e => setEditForm(f => ({ ...f, address_state: e.target.value.toUpperCase().slice(0, 2) }))} placeholder="SP" className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#35bdf8] text-foreground" style={{ fontSize: '0.9rem' }} />
                  </div>
                </div>
                <div>
                  <label className="block text-gray-600 mb-1 font-medium" style={{ fontSize: '0.85rem' }}>CEP</label>
                  <input type="text" inputMode="numeric" value={formatZipMask((editForm.address_zip_code || '').replace(/\D/g, ''))} onChange={e => setEditForm(f => ({ ...f, address_zip_code: e.target.value.replace(/\D/g, '').slice(0, 8) }))} placeholder="00000-000" className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#35bdf8] text-foreground" style={{ fontSize: '0.9rem' }} />
                </div>
              </div>
              <div>
                <label className="block text-gray-600 mb-1 font-medium" style={{ fontSize: '0.85rem' }}>Contato Emergência</label>
                <input type="text" value={editForm.emergency_contact_name || ''} onChange={e => setEditForm(f => ({ ...f, emergency_contact_name: e.target.value }))} placeholder="Nome do contato" className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#35bdf8] text-foreground" style={{ fontSize: '0.9rem' }} />
              </div>
              <div>
                <label className="block text-gray-600 mb-1 font-medium" style={{ fontSize: '0.85rem' }}>Tel. Emergência</label>
                <input type="tel" inputMode="numeric" value={formatPhoneMask((editForm.emergency_contact_phone || '').replace(/\D/g, ''))} onChange={e => setEditForm(f => ({ ...f, emergency_contact_phone: e.target.value.replace(/\D/g, '').slice(0, 11) }))} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#35bdf8] text-foreground" style={{ fontSize: '0.9rem' }} />
              </div>
              <div>
                <label className="block text-gray-600 mb-1 font-medium" style={{ fontSize: '0.85rem' }}>Situação Espiritual</label>
                <select value={editForm.spiritual_status || 'publicador'} onChange={e => setEditForm(f => ({ ...f, spiritual_status: e.target.value as any }))} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#35bdf8] text-foreground" style={{ fontSize: '0.9rem' }}>
                  <option value="estudante">Estudante</option>
                  <option value="publicador">Publicador Não Batizado</option>
                  <option value="publicador_batizado">Publicador Batizado</option>
                  <option value="servo_ministerial">Servo Ministerial</option>
                  <option value="anciao">Ancião</option>
                </select>
              </div>
              <div>
                <label className="block text-gray-600 mb-1 font-medium" style={{ fontSize: '0.85rem' }}>Grupo de Saída</label>
                <select value={editForm.group_id || ''} onChange={e => setEditForm(f => ({ ...f, group_id: e.target.value }))} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#35bdf8] text-foreground" style={{ fontSize: '0.9rem' }}>
                  <option value="">Sem grupo</option>
                  {fieldServiceGroups.map(g => (<option key={g.id} value={g.id}>{g.name}</option>))}
                </select>
              </div>
              <div>
                <label className="block text-gray-600 mb-1 font-medium" style={{ fontSize: '0.85rem' }}>Gênero *</label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer"><input type="radio" name="editGender" value="M" checked={editForm.gender === 'M'} onChange={() => setEditForm(f => ({ ...f, gender: 'M' }))} className="accent-[#35bdf8] w-4 h-4" /><span className="text-gray-700" style={{ fontSize: '0.9rem' }}>Masculino</span></label>
                  <label className="flex items-center gap-2 cursor-pointer"><input type="radio" name="editGender" value="F" checked={editForm.gender === 'F'} onChange={() => setEditForm(f => ({ ...f, gender: 'F' }))} className="accent-[#35bdf8] w-4 h-4" /><span className="text-gray-700" style={{ fontSize: '0.9rem' }}>Feminino</span></label>
                </div>
              </div>

              {/* Família */}
              <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 space-y-3">
                <div className="flex items-center gap-2">
                  <Crown size={14} className="text-amber-500 shrink-0" />
                  <span className="text-amber-800 font-medium" style={{ fontSize: '0.85rem' }}>Família</span>
                </div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editForm.is_family_head || false}
                    onChange={e => setEditForm(f => ({ ...f, is_family_head: e.target.checked, family_head_id: e.target.checked ? '' : f.family_head_id }))}
                    className="accent-[#35bdf8] w-4 h-4 rounded"
                  />
                  <span className="text-gray-700" style={{ fontSize: '0.85rem' }}>Marcar como chefe de família</span>
                </label>
                {!editForm.is_family_head && (
                  <div>
                    <label className="block text-gray-600 mb-1" style={{ fontSize: '0.82rem' }}>Vincular a uma família existente:</label>
                    <select
                      value={editForm.family_head_id || ''}
                      onChange={e => setEditForm(f => ({ ...f, family_head_id: e.target.value }))}
                      className="w-full px-3 py-2 bg-white border border-amber-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-300 text-foreground"
                      style={{ fontSize: '0.9rem' }}
                    >
                      <option value="">Nenhuma família</option>
                      {allMembers.filter(m => m.isFamilyHead && m.id !== editingMember?.id).map(head => (
                        <option key={head.id} value={head.id}>Família {head.full_name}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Privilégios */}
              <div className="bg-sky-50 border border-sky-100 rounded-xl p-3 space-y-2">
                <div className="flex items-center gap-2 mb-1"><UserCheck size={14} className="text-sky-600 shrink-0" /><span className="text-sky-800 font-medium" style={{ fontSize: '0.85rem' }}>Privilégios</span></div>
                <p className="text-gray-500" style={{ fontSize: '0.75rem' }}>Marque os privilégios atribuídos a este membro.</p>
                {[
                  { key: 'approved_pioneiro_auxiliar', label: 'Pioneiro Auxiliar' },
                  { key: 'approved_pioneiro_regular', label: 'Pioneiro Regular' },
                  { key: 'approved_carrinho', label: 'Carrinho' },
                  { key: 'approved_audio_video', label: 'Áudio e Vídeo' },
                  { key: 'approved_indicadores', label: 'Indicadores' },
                ].map(({ key, label }) => (
                  <label key={key} className="flex items-center gap-2.5 cursor-pointer">
                    <input type="checkbox" checked={(editForm as any)[key] || false} onChange={e => setEditForm(f => ({ ...f, [key]: e.target.checked }))} className="accent-[#35bdf8] w-4 h-4 rounded" />
                    <span className="text-gray-700" style={{ fontSize: '0.85rem' }}>{label}</span>
                  </label>
                ))}
              </div>

            </div>
            <div className="p-5 border-t border-border flex gap-3 justify-end sticky bottom-0 bg-white">
              <button onClick={() => setEditingMember(null)} disabled={savingMember} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors font-medium disabled:opacity-50" style={{ fontSize: '0.9rem' }}>Cancelar</button>
              <button onClick={handleSaveEdit} disabled={savingMember} className="px-6 py-2 bg-[#35bdf8] text-[#082c45] font-bold rounded-lg hover:opacity-90 transition-colors shadow-md shadow-[#35bdf8]/10 disabled:opacity-50 flex items-center gap-2" style={{ fontSize: '0.9rem' }}>
                {savingMember ? (<><Loader2 size={16} className="animate-spin" />Salvando...</>) : 'Salvar Alterações'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
