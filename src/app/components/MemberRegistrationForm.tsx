import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { User, Phone, Mail, MapPin, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';

type Gender = 'M' | 'F';

type SpiritualStatus =
  | 'estudante'
  | 'publicador'
  | 'publicador_batizado'
  | 'pioneiro_auxiliar'
  | 'pioneiro_regular'
  | 'servo_ministerial'
  | 'anciao';

const spiritualStatusOptions: { value: SpiritualStatus; label: string }[] = [
  { value: 'estudante', label: 'Estudante Bíblico' },
  { value: 'publicador', label: 'Publicador' },
  { value: 'publicador_batizado', label: 'Publicador Batizado' },
  { value: 'pioneiro_auxiliar', label: 'Pioneiro Auxiliar' },
  { value: 'pioneiro_regular', label: 'Pioneiro Regular' },
  { value: 'servo_ministerial', label: 'Servo Ministerial' },
  { value: 'anciao', label: 'Ancião' },
];

interface FormState {
  full_name: string;
  gender: Gender;
  phone: string;
  email: string;
  spiritual_status: SpiritualStatus;
  address_street: string;
  address_number: string;
  address_neighborhood: string;
  address_city: string;
  address_state: string;
  address_zip_code: string;
  emergency_contact_name: string;
  emergency_contact_phone: string;
}

function formatPhoneDisplay(digits: string): string {
  if (digits.length === 0) return '';
  if (digits.length <= 2) return `(${digits}`;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
}

function formatZipDisplay(digits: string): string {
  if (digits.length <= 5) return digits;
  return `${digits.slice(0, 5)}-${digits.slice(5, 8)}`;
}

const initialForm: FormState = {
  full_name: '',
  gender: 'M',
  phone: '',
  email: '',
  spiritual_status: 'publicador',
  address_street: '',
  address_number: '',
  address_neighborhood: '',
  address_city: '',
  address_state: '',
  address_zip_code: '',
  emergency_contact_name: '',
  emergency_contact_phone: '',
};

export function MemberRegistrationForm() {
  const [form, setForm] = useState<FormState>(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleChange = (field: keyof FormState, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const digits = e.target.value.replace(/\D/g, '').slice(0, 11);
    handleChange('phone', digits);
  };

  const handleEmergencyPhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const digits = e.target.value.replace(/\D/g, '').slice(0, 11);
    handleChange('emergency_contact_phone', digits);
  };

  const handleZipChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const digits = e.target.value.replace(/\D/g, '').slice(0, 8);
    handleChange('address_zip_code', digits);
  };

  const handleStateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^a-zA-Z]/g, '').slice(0, 2).toUpperCase();
    handleChange('address_state', value);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const name = form.full_name.trim();
    if (!name) {
      setError('Por favor, informe o nome completo.');
      return;
    }

    if (form.phone.length < 10) {
      setError('Por favor, informe um número de telefone válido com DDD.');
      return;
    }

    if (!form.address_street.trim()) {
      setError('Por favor, informe a rua/logradouro.');
      return;
    }

    if (!form.address_city.trim()) {
      setError('Por favor, informe a cidade.');
      return;
    }

    if (!form.address_state.trim()) {
      setError('Por favor, informe o estado (UF).');
      return;
    }

    if (!form.emergency_contact_name.trim()) {
      setError('Por favor, informe o nome do contato de emergência.');
      return;
    }

    if (form.emergency_contact_phone.length < 10) {
      setError('Por favor, informe o telefone do contato de emergência com DDD.');
      return;
    }

    setSubmitting(true);

    try {
      const payload: Record<string, string | boolean | null> = {
        full_name: name,
        gender: form.gender,
        phone: form.phone,
        spiritual_status: form.spiritual_status,
        email: form.email.trim() || null,
        address_street: form.address_street.trim() || null,
        address_number: form.address_number.trim() || null,
        address_neighborhood: form.address_neighborhood.trim() || null,
        address_city: form.address_city.trim() || null,
        address_state: form.address_state.trim() || null,
        address_zip_code: form.address_zip_code || null,
        emergency_contact_name: form.emergency_contact_name.trim() || null,
        emergency_contact_phone: form.emergency_contact_phone || null,
      };

      const { error: insertError } = await supabase.from('members').insert(payload);

      if (insertError) {
        if (insertError.message.includes('duplicate') || insertError.message.includes('unique')) {
          setError('Já existe um cadastro com este telefone ou e-mail.');
        } else {
          setError('Ocorreu um erro ao enviar o formulário. Tente novamente.');
        }
        return;
      }

      setSubmitted(true);
    } catch {
      setError('Ocorreu um erro inesperado. Tente novamente.');
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md text-center">
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8">
            <div className="flex justify-center mb-4">
              <div className="bg-green-50 rounded-full p-4">
                <CheckCircle2 size={48} className="text-green-500" />
              </div>
            </div>
            <h2 className="text-[#082c45] font-bold text-xl mb-2">Cadastro enviado!</h2>
            <p className="text-gray-500 text-sm leading-relaxed">
              Suas informações foram recebidas com sucesso. Em breve o responsável da congregação irá processar seu cadastro.
            </p>
            <button
              onClick={() => { setForm(initialForm); setSubmitted(false); }}
              className="mt-6 w-full py-2.5 bg-[#35bdf8] text-[#082c45] font-bold rounded-xl hover:bg-[#29abe2] transition-colors"
            >
              Preencher novo cadastro
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-start justify-center p-4 pt-8 pb-12">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-6">
          <img
            src="/app-logo.svg"
            alt="Congregação Vicente Nunes"
            className="mx-auto mb-3 h-20 w-20 drop-shadow-sm"
          />
          <h1 className="text-[#082c45] font-bold text-xl">Congregação Vicente Nunes</h1>
          <p className="text-gray-400 mt-1 text-sm">Formulário de Cadastro de Membro</p>
        </div>

        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 space-y-5">
          <form onSubmit={handleSubmit} className="space-y-5">

            {/* Nome */}
            <div>
              <label className="block text-gray-600 mb-1.5 text-sm font-medium">
                Nome completo <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <User size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={form.full_name}
                  onChange={e => handleChange('full_name', e.target.value)}
                  placeholder="Seu nome completo"
                  className="w-full pl-9 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#35bdf8] focus:border-transparent transition text-sm"
                  required
                  autoComplete="name"
                />
              </div>
            </div>

            {/* Gênero */}
            <div>
              <label className="block text-gray-600 mb-1.5 text-sm font-medium">
                Gênero <span className="text-red-400">*</span>
              </label>
              <div className="flex gap-3">
                {(['M', 'F'] as Gender[]).map(g => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => handleChange('gender', g)}
                    className={`flex-1 py-2.5 rounded-xl border text-sm font-medium transition-all ${
                      form.gender === g
                        ? 'bg-[#35bdf8] border-[#35bdf8] text-[#082c45]'
                        : 'bg-gray-50 border-gray-200 text-gray-600 hover:border-[#35bdf8]'
                    }`}
                  >
                    {g === 'M' ? 'Masculino' : 'Feminino'}
                  </button>
                ))}
              </div>
            </div>

            {/* Telefone */}
            <div>
              <label className="block text-gray-600 mb-1.5 text-sm font-medium">
                Telefone / WhatsApp <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <Phone size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="tel"
                  inputMode="numeric"
                  value={formatPhoneDisplay(form.phone)}
                  onChange={handlePhoneChange}
                  placeholder="(11) 99999-9999"
                  className="w-full pl-9 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#35bdf8] focus:border-transparent transition text-sm"
                  autoComplete="tel"
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-gray-600 mb-1.5 text-sm font-medium">E-mail</label>
              <div className="relative">
                <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="email"
                  value={form.email}
                  onChange={e => handleChange('email', e.target.value)}
                  placeholder="seu@email.com (opcional)"
                  className="w-full pl-9 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#35bdf8] focus:border-transparent transition text-sm"
                  autoComplete="email"
                />
              </div>
            </div>

            {/* Status espiritual */}
            <div>
              <label className="block text-gray-600 mb-1.5 text-sm font-medium">Situação espiritual</label>
              <select
                value={form.spiritual_status}
                onChange={e => handleChange('spiritual_status', e.target.value)}
                className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#35bdf8] focus:border-transparent transition text-sm text-gray-700"
              >
                {spiritualStatusOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            {/* Endereço */}
            <div className="border border-gray-100 rounded-xl overflow-hidden">
              <div className="px-4 py-3 bg-gray-50 border-b border-gray-100">
                <span className="flex items-center gap-2 text-sm text-gray-600 font-medium">
                  <MapPin size={15} className="text-gray-400" />
                  Endereço <span className="text-red-400">*</span>
                </span>
              </div>
              <div className="p-4 space-y-3 bg-white">
                <div className="flex gap-2">
                  <div className="flex-1">
                    <label className="block text-gray-500 mb-1 text-xs">Rua / Logradouro <span className="text-red-400">*</span></label>
                    <input
                      type="text"
                      value={form.address_street}
                      onChange={e => handleChange('address_street', e.target.value)}
                      placeholder="Rua, Av., Estrada..."
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#35bdf8] focus:border-transparent transition text-sm"
                      autoComplete="address-line1"
                    />
                  </div>
                  <div className="w-20">
                    <label className="block text-gray-500 mb-1 text-xs">Nº</label>
                    <input
                      type="text"
                      value={form.address_number}
                      onChange={e => handleChange('address_number', e.target.value)}
                      placeholder="123"
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#35bdf8] focus:border-transparent transition text-sm"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-gray-500 mb-1 text-xs">Bairro</label>
                  <input
                    type="text"
                    value={form.address_neighborhood}
                    onChange={e => handleChange('address_neighborhood', e.target.value)}
                    placeholder="Bairro"
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#35bdf8] focus:border-transparent transition text-sm"
                  />
                </div>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <label className="block text-gray-500 mb-1 text-xs">Cidade <span className="text-red-400">*</span></label>
                    <input
                      type="text"
                      value={form.address_city}
                      onChange={e => handleChange('address_city', e.target.value)}
                      placeholder="Cidade"
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#35bdf8] focus:border-transparent transition text-sm"
                      autoComplete="address-level2"
                    />
                  </div>
                  <div className="w-16">
                    <label className="block text-gray-500 mb-1 text-xs">UF <span className="text-red-400">*</span></label>
                    <input
                      type="text"
                      value={form.address_state}
                      onChange={handleStateChange}
                      placeholder="SP"
                      maxLength={2}
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#35bdf8] focus:border-transparent transition text-sm uppercase"
                      autoComplete="address-level1"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-gray-500 mb-1 text-xs">CEP</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={formatZipDisplay(form.address_zip_code)}
                    onChange={handleZipChange}
                    placeholder="00000-000"
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#35bdf8] focus:border-transparent transition text-sm"
                    autoComplete="postal-code"
                  />
                </div>
              </div>
            </div>

            {/* Contato de emergência */}
            <div className="border border-gray-100 rounded-xl overflow-hidden">
              <div className="px-4 py-3 bg-gray-50 border-b border-gray-100">
                <span className="flex items-center gap-2 text-sm text-gray-600 font-medium">
                  <AlertCircle size={15} className="text-gray-400" />
                  Contato de emergência <span className="text-red-400">*</span>
                </span>
              </div>
              <div className="p-4 space-y-3 bg-white">
                <div>
                  <label className="block text-gray-500 mb-1 text-xs">Nome do contato <span className="text-red-400">*</span></label>
                  <input
                    type="text"
                    value={form.emergency_contact_name}
                    onChange={e => handleChange('emergency_contact_name', e.target.value)}
                    placeholder="Nome completo"
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#35bdf8] focus:border-transparent transition text-sm"
                  />
                </div>
                <div>
                  <label className="block text-gray-500 mb-1 text-xs">Telefone do contato <span className="text-red-400">*</span></label>
                  <div className="relative">
                    <Phone size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="tel"
                      inputMode="numeric"
                      value={formatPhoneDisplay(form.emergency_contact_phone)}
                      onChange={handleEmergencyPhoneChange}
                      placeholder="(11) 99999-9999"
                      className="w-full pl-8 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#35bdf8] focus:border-transparent transition text-sm"
                    />
                  </div>
                </div>
              </div>
            </div>

            {error && (
              <p className="text-red-500 bg-red-50 px-3 py-2.5 rounded-xl text-sm flex items-center gap-2">
                <AlertCircle size={15} className="shrink-0" />
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 bg-[#35bdf8] text-[#082c45] font-bold rounded-xl hover:bg-[#29abe2] transition-colors shadow-md shadow-[#35bdf8]/20 disabled:opacity-50 flex items-center justify-center gap-2 text-sm"
            >
              {submitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Enviando...
                </>
              ) : (
                'Enviar cadastro'
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-gray-400 mt-5 text-xs">
          Congregação Vicente Nunes — Suas informações são mantidas em sigilo.
        </p>
      </div>
    </div>
  );
}
