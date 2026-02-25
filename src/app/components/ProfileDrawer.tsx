import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { fieldServiceGroups, members as allMembers, getStatusLabel, getStatusColor, getRoleLabel } from '../data/mockData';
import {
  X,
  User,
  Phone,
  Mail,
  Shield,
  Users,
  Home,
  Crown,
  Save,
  AlertCircle,
  Camera,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';

interface ProfileDrawerProps {
  open: boolean;
  onClose: () => void;
}

const roleLabels: Record<string, string> = {
  coordenador: 'Coordenador',
  secretario: 'Secretário',
  designador: 'Designador de Reuniões',
  publicador: 'Publicador',
};

const genderLabels: Record<string, string> = {
  M: 'Masculino',
  F: 'Feminino',
};

export function ProfileDrawer({ open, onClose }: ProfileDrawerProps) {
  const { user, member, updateMember } = useAuth();

  const [form, setForm] = useState({
    full_name: '',
    email: '',
    phone: '',
    emergency_contact_name: '',
    emergency_contact_phone: '',
  });
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [removePhoto, setRemovePhoto] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync form whenever member changes or drawer opens
  useEffect(() => {
    if (member) {
      setForm({
        full_name: member.full_name,
        email: member.email,
        phone: member.phone,
        emergency_contact_name: member.emergency_contact_name,
        emergency_contact_phone: member.emergency_contact_phone,
      });
      setPhotoPreview(null);
      setRemovePhoto(false);
      setDirty(false);
    }
  }, [member, open]);

  const handleChange = (field: string, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
    setDirty(true);
  };

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Selecione um arquivo de imagem válido.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('A imagem deve ter no máximo 5MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = ev => {
      setPhotoPreview(ev.target?.result as string);
      setRemovePhoto(false);
      setDirty(true);
    };
    reader.readAsDataURL(file);
    // Reset input so same file can be selected again
    e.target.value = '';
  };

  const handleRemovePhoto = () => {
    setPhotoPreview(null);
    setRemovePhoto(true);
    setDirty(true);
  };

  const handleSave = () => {
    if (!form.full_name.trim()) {
      toast.error('O nome completo é obrigatório.');
      return;
    }
    setSaving(true);
    setTimeout(() => {
      const avatarValue = removePhoto ? undefined : (photoPreview ?? member?.avatar);
      updateMember({ ...form, avatar: avatarValue });
      setSaving(false);
      setDirty(false);
      setPhotoPreview(null);
      setRemovePhoto(false);
      toast.success('Perfil atualizado com sucesso!');
    }, 600);
  };

  const handleClose = () => {
    if (dirty) {
      const confirmed = window.confirm('Há alterações não salvas. Deseja sair mesmo assim?');
      if (!confirmed) return;
    }
    onClose();
  };

  const groupName = fieldServiceGroups.find(g => g.id === member?.groupId)?.name || 'Sem grupo';
  const familyHead = member?.familyHeadId
    ? allMembers.find(m => m.id === member.familyHeadId)
    : null;
  const familyMembersCount = member?.isFamilyHead
    ? allMembers.filter(m => m.familyHeadId === member.id).length
    : 0;

  const initials = (name: string) =>
    name
      .split(' ')
      .map(n => n[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();

  if (!user || !member) return null;

  const currentPhoto = removePhoto ? null : (photoPreview ?? member.avatar ?? null);

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px] transition-opacity duration-300 ${
          open ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={handleClose}
      />

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handlePhotoSelect}
      />

      {/* Drawer */}
      <div
        className={`fixed top-0 right-0 z-50 h-full w-full max-w-md bg-white shadow-2xl flex flex-col transition-transform duration-300 ease-out ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="relative bg-gradient-to-br from-[#082c45] to-[#0a4a7a] px-6 pt-6 pb-16 shrink-0">
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/70 hover:text-white transition-colors"
          >
            <X size={16} />
          </button>

          <div className="flex items-end gap-4">
            {/* Avatar — clickable to change photo */}
            <div className="relative shrink-0 group/avatar">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-20 h-20 rounded-2xl overflow-hidden shadow-lg border-4 border-white/20 block focus:outline-none focus:ring-2 focus:ring-[#35bdf8]"
                title="Alterar foto"
              >
                {currentPhoto ? (
                  <img
                    src={currentPhoto}
                    alt={member.full_name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-[#35bdf8] flex items-center justify-center">
                    <span className="text-[#082c45] font-black" style={{ fontSize: '1.5rem' }}>
                      {initials(member.full_name)}
                    </span>
                  </div>
                )}
                {/* Hover overlay */}
                <div className="absolute inset-0 bg-black/50 rounded-2xl flex items-center justify-center opacity-0 group-hover/avatar:opacity-100 transition-opacity">
                  <Camera size={22} className="text-white" />
                </div>
              </button>

              {/* Action buttons below avatar */}
              <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 flex gap-1 opacity-0 group-hover/avatar:opacity-100 transition-opacity">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-6 h-6 bg-[#35bdf8] rounded-full flex items-center justify-center shadow-md"
                  title="Escolher foto"
                >
                  <Camera size={11} className="text-[#082c45]" />
                </button>
                {currentPhoto && (
                  <button
                    onClick={handleRemovePhoto}
                    className="w-6 h-6 bg-red-400 rounded-full flex items-center justify-center shadow-md"
                    title="Remover foto"
                  >
                    <Trash2 size={11} className="text-white" />
                  </button>
                )}
              </div>
            </div>

            <div className="pb-1 min-w-0">
              <h2 className="text-white truncate" style={{ fontSize: '1.1rem' }}>
                {member.full_name}
              </h2>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <span className="px-2 py-0.5 bg-[#35bdf8]/20 border border-[#35bdf8]/30 text-[#35bdf8] rounded-full" style={{ fontSize: '0.72rem' }}>
                  {roleLabels[user.role]}
                </span>
                {member.isFamilyHead && (
                  <span className="flex items-center gap-1 px-2 py-0.5 bg-amber-400/20 border border-amber-400/30 text-amber-300 rounded-full" style={{ fontSize: '0.72rem' }}>
                    <Crown size={10} />
                    Chefe de Família
                  </span>
                )}
              </div>
              {/* Photo hint */}
              <button
                onClick={() => fileInputRef.current?.click()}
                className="mt-2 flex items-center gap-1 text-white/40 hover:text-white/70 transition-colors"
                style={{ fontSize: '0.7rem' }}
              >
                <Camera size={11} />
                {currentPhoto ? 'Alterar foto' : 'Adicionar foto'}
              </button>
            </div>
          </div>
        </div>

        {/* Content — scrollable */}
        <div className="flex-1 overflow-y-auto -mt-8">
          {/* Congregação info cards */}
          <div className="px-5 pt-10 grid grid-cols-2 gap-3 mb-5">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 px-3 py-3 flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <Users size={14} className="text-primary" />
              </div>
              <div className="min-w-0">
                <p className="text-gray-400 truncate" style={{ fontSize: '0.65rem' }}>GRUPO</p>
                <p className="text-gray-800 truncate" style={{ fontSize: '0.78rem' }}>{groupName.split(' - ')[0]}</p>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 px-3 py-3 flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-pink-50 flex items-center justify-center shrink-0">
                <User size={14} className="text-pink-500" />
              </div>
              <div className="min-w-0">
                <p className="text-gray-400 truncate" style={{ fontSize: '0.65rem' }}>GÊNERO</p>
                <p className="text-gray-800 truncate" style={{ fontSize: '0.78rem' }}>{genderLabels[member.gender]}</p>
              </div>
            </div>

            {member.isFamilyHead && (
              <div className="col-span-2 bg-amber-50 rounded-xl border border-amber-100 px-3 py-3 flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
                  <Home size={14} className="text-amber-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-amber-500" style={{ fontSize: '0.65rem' }}>FAMÍLIA</p>
                  <p className="text-amber-800" style={{ fontSize: '0.78rem' }}>
                    Chefe de família · {familyMembersCount} membro(s) vinculado(s)
                  </p>
                </div>
              </div>
            )}

            {familyHead && (
              <div className="col-span-2 bg-amber-50 rounded-xl border border-amber-100 px-3 py-3 flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
                  <Home size={14} className="text-amber-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-amber-500" style={{ fontSize: '0.65rem' }}>FAMÍLIA</p>
                  <p className="text-amber-800" style={{ fontSize: '0.78rem' }}>
                    Família de {familyHead.full_name}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Situação espiritual */}
          <div className="px-5 mb-5">
            <div className="flex items-center gap-2 mb-3">
              <Shield size={14} className="text-primary" />
              <span className="text-gray-500 font-medium" style={{ fontSize: '0.8rem' }}>SITUAÇÃO ESPIRITUAL</span>
            </div>
            <div className="flex flex-wrap gap-2">
              <span className={`px-3 py-1.5 rounded-full font-medium ${getStatusColor(member.spiritual_status)}`} style={{ fontSize: '0.8rem' }}>
                {getStatusLabel(member.spiritual_status)}
              </span>
              {member.roles.map(r => (
                <span key={r} className="px-3 py-1.5 bg-purple-50 text-purple-700 border border-purple-100 rounded-full" style={{ fontSize: '0.8rem' }}>
                  {getRoleLabel(r)}
                </span>
              ))}
            </div>
          </div>

          {/* Divider */}
          <div className="mx-5 border-t border-gray-100 mb-5" />

          {/* Editable fields */}
          <div className="px-5 space-y-5 pb-6">
            {/* Dados pessoais */}
            <div>
              <h3 className="text-gray-700 font-bold mb-3 flex items-center gap-1.5" style={{ fontSize: '0.85rem' }}>
                <User size={14} className="text-primary" />
                Dados Pessoais
              </h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-gray-500 mb-1" style={{ fontSize: '0.78rem' }}>Nome Completo *</label>
                  <input
                    type="text"
                    value={form.full_name}
                    onChange={e => handleChange('full_name', e.target.value)}
                    className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#35bdf8] focus:border-transparent text-gray-800 transition"
                    style={{ fontSize: '0.9rem' }}
                    placeholder="Seu nome completo"
                  />
                </div>
                <div>
                  <label className="block text-gray-500 mb-1" style={{ fontSize: '0.78rem' }}>E-mail</label>
                  <div className="relative">
                    <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="email"
                      value={form.email}
                      onChange={e => handleChange('email', e.target.value)}
                      className="w-full pl-8 pr-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#35bdf8] focus:border-transparent text-gray-800 transition"
                      style={{ fontSize: '0.9rem' }}
                      placeholder="seu@email.com"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-gray-500 mb-1" style={{ fontSize: '0.78rem' }}>Telefone</label>
                  <div className="relative">
                    <Phone size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="tel"
                      value={form.phone}
                      onChange={e => handleChange('phone', e.target.value)}
                      className="w-full pl-8 pr-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#35bdf8] focus:border-transparent text-gray-800 transition"
                      style={{ fontSize: '0.9rem' }}
                      placeholder="(11) 99999-0000"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Contato de emergência */}
            <div>
              <h3 className="text-gray-700 font-bold mb-3 flex items-center gap-1.5" style={{ fontSize: '0.85rem' }}>
                <AlertCircle size={14} className="text-red-400" />
                Contato de Emergência
              </h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-gray-500 mb-1" style={{ fontSize: '0.78rem' }}>Nome do Contato</label>
                  <input
                    type="text"
                    value={form.emergency_contact_name}
                    onChange={e => handleChange('emergency_contact_name', e.target.value)}
                    className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#35bdf8] focus:border-transparent text-gray-800 transition"
                    style={{ fontSize: '0.9rem' }}
                    placeholder="Nome do contato de emergência"
                  />
                </div>
                <div>
                  <label className="block text-gray-500 mb-1" style={{ fontSize: '0.78rem' }}>Telefone do Contato</label>
                  <div className="relative">
                    <Phone size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="tel"
                      value={form.emergency_contact_phone}
                      onChange={e => handleChange('emergency_contact_phone', e.target.value)}
                      className="w-full pl-8 pr-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#35bdf8] focus:border-transparent text-gray-800 transition"
                      style={{ fontSize: '0.9rem' }}
                      placeholder="(11) 88888-0000"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Unsaved indicator */}
            {dirty && (
              <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-xl text-amber-700" style={{ fontSize: '0.8rem' }}>
                <AlertCircle size={14} className="shrink-0" />
                Você tem alterações não salvas.
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-gray-100 bg-white shrink-0 flex gap-3">
          <button
            onClick={handleClose}
            className="flex-1 py-2.5 border border-gray-200 text-gray-600 hover:bg-gray-50 rounded-xl transition-colors font-medium"
            style={{ fontSize: '0.9rem' }}
          >
            Fechar
          </button>
          <button
            onClick={handleSave}
            disabled={!dirty || saving}
            className={`flex-1 py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${
              dirty && !saving
                ? 'bg-[#35bdf8] text-[#082c45] hover:bg-[#29abe2] shadow-md shadow-[#35bdf8]/20'
                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
            }`}
            style={{ fontSize: '0.9rem' }}
          >
            {saving ? (
              <>
                <div className="w-4 h-4 border-2 border-[#082c45]/30 border-t-[#082c45] rounded-full animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <Save size={15} />
                Salvar
              </>
            )}
          </button>
        </div>
      </div>
    </>
  );
}