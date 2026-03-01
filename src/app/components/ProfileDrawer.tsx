import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
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
  Bell,
  MapPin,
} from 'lucide-react';
import { toast } from 'sonner';
import { Geolocation } from '@capacitor/geolocation';
import { PushNotifications } from '@capacitor/push-notifications';
import { supabase } from '../lib/supabase';
import { formatPhoneDisplay } from '../helpers';

interface ProfileDrawerProps {
  open: boolean;
  onClose: () => void;
}

const EMPTY_FORM = {
  full_name: '',
  email: '',
  phone: '',
  emergency_contact_name: '',
  emergency_contact_phone: '',
  address_street: '',
  address_number: '',
  address_neighborhood: '',
  address_city: '',
  address_state: '',
  address_zip_code: '',
};

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
  const { user, refreshUser } = useAuth();

  const [form, setForm] = useState(EMPTY_FORM);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [removePhoto, setRemovePhoto] = useState(false);
  const [groupName, setGroupName] = useState('Sem grupo');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [geoStatus, setGeoStatus] = useState<string>('unknown');
  const [pushStatus, setPushStatus] = useState<string>('unknown');

  // Check initial permission status for native features
  useEffect(() => {
    const checkPermissions = async () => {
      try {
        const geoCheck = await Geolocation.checkPermissions();
        setGeoStatus(geoCheck.location);
      } catch (e) {
        // Not natively supported or running in simple web context
      }
      try {
        const pushCheck = await PushNotifications.checkPermissions();
        setPushStatus(pushCheck.receive);
      } catch (e) { }
    };
    if (open) {
      checkPermissions();
    }
  }, [open]);

  const requestGeolocation = async () => {
    try {
      const status = await Geolocation.requestPermissions();
      setGeoStatus(status.location);
      if (status.location === 'granted') {
        toast.success('Permissão de localização concedida.');
      } else {
        toast.error('Permissão de localização negada.');
      }
    } catch (e) {
      toast.error('Dispositivo/Navegador sem suporte nativo.');
    }
  };

  const requestPush = async () => {
    try {
      const status = await PushNotifications.requestPermissions();
      setPushStatus(status.receive);
      if (status.receive === 'granted') {
        await PushNotifications.register();
        toast.success('Permissão de notificações concedida.');
      } else {
        toast.error('Permissão de notificações negada.');
      }
    } catch (e) {
      toast.error('Dispositivo/Navegador sem suporte central Push.');
    }
  };

  useEffect(() => {
    let cancelled = false;

    const loadProfile = async () => {
      if (!open || !user) {
        return;
      }

      setPhotoPreview(user.avatar || null);
      setRemovePhoto(false);
      setDirty(false);

      const baseForm = {
        ...EMPTY_FORM,
        full_name: user.name || '',
        phone: user.phone || '',
      };

      if (!user.member_id) {
        setForm(baseForm);
        return;
      }

      const { data, error } = await supabase
        .from('members')
        .select(`
          full_name,
          email,
          phone,
          emergency_contact_name,
          emergency_contact_phone,
          address_street,
          address_number,
          address_neighborhood,
          address_city,
          address_state,
          address_zip_code
        `)
        .eq('id', user.member_id)
        .limit(1);

      if (cancelled) {
        return;
      }

      if (error) {
        console.warn('[Profile] Falha ao carregar dados do membro:', error);
        setForm(baseForm);
        return;
      }

      const member = data?.[0];

      setForm({
        ...baseForm,
        full_name: member?.full_name || baseForm.full_name,
        email: member?.email || '',
        phone: member?.phone || baseForm.phone,
        emergency_contact_name: member?.emergency_contact_name || '',
        emergency_contact_phone: member?.emergency_contact_phone || '',
        address_street: member?.address_street || '',
        address_number: member?.address_number || '',
        address_neighborhood: member?.address_neighborhood || '',
        address_city: member?.address_city || '',
        address_state: member?.address_state || '',
        address_zip_code: member?.address_zip_code || '',
      });
    };

    void loadProfile();

    return () => {
      cancelled = true;
    };
  }, [user, open]);

  useEffect(() => {
    let cancelled = false;

    const loadGroupName = async () => {
      if (!open || !user?.group_id) {
        setGroupName('Sem grupo');
        return;
      }

      const { data, error } = await supabase
        .from('field_service_groups')
        .select('name')
        .eq('id', user.group_id)
        .limit(1);

      if (cancelled) {
        return;
      }

      if (error) {
        console.warn('[Profile] Falha ao carregar grupo do usuario:', error);
        setGroupName('Sem grupo');
        return;
      }

      setGroupName(data?.[0]?.name || 'Sem grupo');
    };

    void loadGroupName();

    return () => {
      cancelled = true;
    };
  }, [open, user?.group_id]);

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

  const handleSave = async () => {
    if (!form.full_name.trim()) {
      toast.error('O nome completo é obrigatório.');
      return;
    }
    if (!user?.member_id) {
      toast.error('Nenhum membro vinculado a este perfil.');
      return;
    }
    setSaving(true);
    try {
      let newAvatarUrl: string | null | undefined = undefined; // undefined = don't change

      // 1) Handle photo
      if (removePhoto) {
        // Delete from storage if there was a previous avatar
        if (user.avatar) {
          const path = user.avatar.split('/avatars/')[1];
          if (path) await supabase.storage.from('avatars').remove([path]);
        }
        newAvatarUrl = null;
      } else if (photoPreview && photoPreview !== user.avatar) {
        // Upload new photo
        const base64 = photoPreview.split(',')[1];
        const mimeMatch = photoPreview.match(/data:([^;]+);/);
        const mime = mimeMatch?.[1] || 'image/jpeg';
        const ext = mime.split('/')[1] || 'jpg';
        const fileName = `${user.member_id}-${Date.now()}.${ext}`;

        const byteChars = atob(base64);
        const byteArr = new Uint8Array(byteChars.length);
        for (let i = 0; i < byteChars.length; i++) byteArr[i] = byteChars.charCodeAt(i);
        const blob = new Blob([byteArr], { type: mime });

        const { error: uploadErr } = await supabase.storage
          .from('avatars')
          .upload(fileName, blob, { upsert: true, contentType: mime });

        if (uploadErr) throw new Error('Falha no upload da foto: ' + uploadErr.message);

        const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(fileName);
        newAvatarUrl = urlData.publicUrl;
      }

      // 2) Update members table
      const updatePayload: Record<string, any> = {
        full_name: form.full_name.trim(),
        email: form.email.trim() || null,
        emergency_contact_name: form.emergency_contact_name.trim() || null,
        emergency_contact_phone: form.emergency_contact_phone.trim() || null,
        address_street: form.address_street.trim() || null,
        address_number: form.address_number.trim() || null,
        address_neighborhood: form.address_neighborhood.trim() || null,
        address_city: form.address_city.trim() || null,
        address_state: form.address_state.trim() || null,
        address_zip_code: form.address_zip_code.trim() || null,
      };
      if (newAvatarUrl !== undefined) updatePayload.avatar_url = newAvatarUrl;

      const { error: updateErr } = await supabase
        .from('members')
        .update(updatePayload)
        .eq('id', user.member_id);

      if (updateErr) throw new Error('Falha ao salvar perfil: ' + updateErr.message);

      // 3) Refresh auth user to propagate changes throughout the app
      await refreshUser();

      toast.success('Perfil atualizado com sucesso!');
      setDirty(false);
      setRemovePhoto(false);
    } catch (err: any) {
      toast.error(err.message || 'Erro ao salvar perfil.');
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    if (dirty) {
      const confirmed = window.confirm('Há alterações não salvas. Deseja sair mesmo assim?');
      if (!confirmed) return;
    }
    onClose();
  };

  const familyHead = null;
  const familyMembersCount = 0;

  const initials = (name: string) =>
    name
      .split(' ')
      .map(n => n[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();

  if (!user) return null;

  const currentPhoto: string | null = removePhoto
    ? null
    : (photoPreview ?? user?.avatar ?? null);

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px] transition-opacity duration-300 ${open ? 'opacity-100' : 'opacity-0 pointer-events-none'
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
        className={`fixed top-0 right-0 z-50 h-full w-full max-w-md bg-white shadow-2xl flex flex-col transition-transform duration-300 ease-out ${open ? 'translate-x-0' : 'translate-x-full'
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
                    alt={user.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-[#35bdf8] flex items-center justify-center">
                    <span className="text-[#082c45] font-black" style={{ fontSize: '1.5rem' }}>
                      {initials(user.name)}
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
                {user.name}
              </h2>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <span className="px-2 py-0.5 bg-[#35bdf8]/20 border border-[#35bdf8]/30 text-[#35bdf8] rounded-full" style={{ fontSize: '0.72rem' }}>
                  {roleLabels[user.role]}
                </span>

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
                <p className="text-gray-800 truncate" style={{ fontSize: '0.78rem' }}>{groupName}</p>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 px-3 py-3 flex items-center gap-2.5">
              <div
                className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                  user.gender === 'M'
                    ? 'bg-blue-50'
                    : user.gender === 'F'
                      ? 'bg-pink-50'
                      : 'bg-gray-100'
                }`}
              >
                <User
                  size={14}
                  className={
                    user.gender === 'M'
                      ? 'text-blue-500'
                      : user.gender === 'F'
                        ? 'text-pink-500'
                        : 'text-gray-500'
                  }
                />
              </div>
              <div className="min-w-0">
                <p className="text-gray-400 truncate" style={{ fontSize: '0.65rem' }}>GÊNERO</p>
                <p className="text-gray-800 truncate" style={{ fontSize: '0.78rem' }}>
                  {user.gender === 'M' ? 'Masculino' : user.gender === 'F' ? 'Feminino' : '-'}
                </p>
              </div>
            </div>


          </div>

          {/* Situação espiritual */}
          <div className="px-5 mb-5">
            <div className="flex items-center gap-2 mb-3">
              <Shield size={14} className="text-primary" />
              <span className="text-gray-500 font-medium" style={{ fontSize: '0.8rem' }}>SITUAÇÃO ESPIRITUAL</span>
            </div>
            <div className="flex flex-wrap gap-2">
              <span className="px-3 py-1.5 rounded-full font-medium bg-gray-100 text-gray-700" style={{ fontSize: '0.8rem' }}>
                {user.spiritual_status === 'publicador_batizado' ? 'Publicador Batizado' :
                  user.spiritual_status === 'publicador' ? 'Publicador Não Batizado' :
                    user.spiritual_status === 'pioneiro_auxiliar' ? 'Pioneiro Auxiliar' :
                      user.spiritual_status === 'pioneiro_regular' ? 'Pioneiro Regular' :
                        user.spiritual_status === 'estudante' ? 'Estudante' :
                          user.spiritual_status === 'anciao' ? 'Ancão' :
                            user.spiritual_status === 'servo_ministerial' ? 'Servo Ministerial' :
                              'Não informado'}
              </span>
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
                      value={formatPhoneDisplay(form.phone)}
                      readOnly
                      className="w-full pl-8 pr-3 py-2.5 bg-gray-100 border border-gray-200 rounded-xl text-gray-500 transition cursor-not-allowed"
                      style={{ fontSize: '0.9rem' }}
                      placeholder="(11) 99999-0000"
                    />
                  </div>
                  <p className="mt-1 text-gray-400" style={{ fontSize: '0.72rem' }}>
                    O telefone de acesso é gerenciado pelo coordenador.
                  </p>
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
                      inputMode="numeric"
                      value={formatPhoneDisplay(form.emergency_contact_phone)}
                      onChange={e => handleChange('emergency_contact_phone', e.target.value.replace(/\D/g, '').slice(0, 11))}
                      className="w-full pl-8 pr-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#35bdf8] focus:border-transparent text-gray-800 transition"
                      style={{ fontSize: '0.9rem' }}
                      placeholder="(11) 88888-0000"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Endereço */}
            <div>
              <h3 className="text-gray-700 font-bold mb-3 flex items-center gap-1.5" style={{ fontSize: '0.85rem' }}>
                <Home size={14} className="text-primary" />
                Endereço
              </h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-gray-500 mb-1" style={{ fontSize: '0.78rem' }}>Rua</label>
                  <input
                    type="text"
                    value={form.address_street}
                    onChange={e => handleChange('address_street', e.target.value)}
                    className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#35bdf8] focus:border-transparent text-gray-800 transition"
                    style={{ fontSize: '0.9rem' }}
                    placeholder="Nome da rua"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-gray-500 mb-1" style={{ fontSize: '0.78rem' }}>Número</label>
                    <input
                      type="text"
                      value={form.address_number}
                      onChange={e => handleChange('address_number', e.target.value)}
                      className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#35bdf8] focus:border-transparent text-gray-800 transition"
                      style={{ fontSize: '0.9rem' }}
                      placeholder="123"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-500 mb-1" style={{ fontSize: '0.78rem' }}>CEP</label>
                    <input
                      type="text"
                      value={form.address_zip_code}
                      onChange={e => handleChange('address_zip_code', e.target.value)}
                      className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#35bdf8] focus:border-transparent text-gray-800 transition"
                      style={{ fontSize: '0.9rem' }}
                      placeholder="00000-000"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-gray-500 mb-1" style={{ fontSize: '0.78rem' }}>Bairro</label>
                  <input
                    type="text"
                    value={form.address_neighborhood}
                    onChange={e => handleChange('address_neighborhood', e.target.value)}
                    className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#35bdf8] focus:border-transparent text-gray-800 transition"
                    style={{ fontSize: '0.9rem' }}
                    placeholder="Seu bairro"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-gray-500 mb-1" style={{ fontSize: '0.78rem' }}>Cidade</label>
                    <input
                      type="text"
                      value={form.address_city}
                      onChange={e => handleChange('address_city', e.target.value)}
                      className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#35bdf8] focus:border-transparent text-gray-800 transition"
                      style={{ fontSize: '0.9rem' }}
                      placeholder="Sua cidade"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-500 mb-1" style={{ fontSize: '0.78rem' }}>UF</label>
                    <input
                      type="text"
                      value={form.address_state}
                      onChange={e => handleChange('address_state', e.target.value.toUpperCase().slice(0, 2))}
                      className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#35bdf8] focus:border-transparent text-gray-800 transition"
                      style={{ fontSize: '0.9rem' }}
                      placeholder="SP"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Permissões Mobile */}
            <div>
              <h3 className="text-gray-700 font-bold mb-3 flex items-center gap-1.5" style={{ fontSize: '0.85rem' }}>
                <Shield size={14} className="text-[#35bdf8]" />
                Integrações Mobile
              </h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-[#35bdf8]/10 flex flex-col items-center justify-center text-[#35bdf8]">
                      <MapPin size={16} />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-800" style={{ fontSize: '0.85rem' }}>Localização em Fundo</p>
                      <p className="text-gray-500" style={{ fontSize: '0.75rem' }}>
                        {geoStatus === 'granted' ? 'Acesso Concedido' : geoStatus === 'denied' ? 'Acesso Negado' : 'Não Solicitado'}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={requestGeolocation}
                    disabled={geoStatus === 'granted'}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${geoStatus === 'granted' ? 'bg-green-100 text-green-700 cursor-not-allowed border border-green-200' : 'bg-[#082c45] text-white hover:bg-[#0a4a7a]'
                      }`}
                  >
                    {geoStatus === 'granted' ? 'Ativo' : 'Permitir'}
                  </button>
                </div>

                <div className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-[#35bdf8]/10 flex flex-col items-center justify-center text-[#35bdf8]">
                      <Bell size={16} />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-800" style={{ fontSize: '0.85rem' }}>Notificações Push</p>
                      <p className="text-gray-500" style={{ fontSize: '0.75rem' }}>
                        {pushStatus === 'granted' ? 'Acesso Concedido' : pushStatus === 'denied' ? 'Acesso Negado' : 'Não Solicitadas'}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={requestPush}
                    disabled={pushStatus === 'granted'}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${pushStatus === 'granted' ? 'bg-green-100 text-green-700 cursor-not-allowed border border-green-200' : 'bg-[#082c45] text-white hover:bg-[#0a4a7a]'
                      }`}
                  >
                    {pushStatus === 'granted' ? 'Ativo' : 'Permitir'}
                  </button>
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
            className={`flex-1 py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${dirty && !saving
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
