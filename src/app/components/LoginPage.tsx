import React, { useState } from 'react';
import { useNavigate, Navigate } from 'react-router';
import { useAuth } from '../context/AuthContext';
import { BookOpen, Eye, EyeOff, Phone, Loader2 } from 'lucide-react';

function formatPhone(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (digits.length <= 2) return digits;
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
}

export function LoginPage() {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { login, user, loading } = useAuth();
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="animate-spin text-[#35bdf8]" size={32} />
      </div>
    );
  }

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '').slice(0, 11);
    setPhone(raw);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const digits = phone.replace(/\D/g, '');
    if (digits.length < 10) {
      setError('Digite um número de telefone válido com DDD.');
      return;
    }

    setSubmitting(true);
    const errorMsg = await login(digits, password);
    setSubmitting(false);

    if (errorMsg) {
      if (errorMsg.includes('Invalid login credentials')) {
        setError('Telefone ou senha incorretos. Solicite seu acesso ao coordenador.');
      } else {
        setError(errorMsg);
      }
    } else {
      navigate('/dashboard');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo area */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-[#35bdf8]/10 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-[#35bdf8]/20 shadow-sm">
            <BookOpen size={32} className="text-[#35bdf8]" />
          </div>
          <h1 className="text-[#082c45]" style={{ fontSize: '1.5rem' }}>Salão do Reino</h1>
          <p className="text-gray-400 mt-1" style={{ fontSize: '0.9rem' }}>Congregação Vicente Nunes</p>
        </div>

        {/* Login form */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 md:p-8">
          <h2 className="text-center text-[#082c45] mb-6 font-bold" style={{ fontSize: '1.25rem' }}>Entrar</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-gray-600 mb-1.5" style={{ fontSize: '0.85rem' }}>Telefone (WhatsApp)</label>
              <div className="relative">
                <Phone size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="tel"
                  inputMode="numeric"
                  value={formatPhone(phone)}
                  onChange={handlePhoneChange}
                  placeholder="(11) 99999-9999"
                  className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#35bdf8] focus:border-transparent transition"
                  required
                  autoComplete="tel"
                />
              </div>
            </div>

            <div>
              <label className="block text-gray-600 mb-1.5" style={{ fontSize: '0.85rem' }}>Senha</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#35bdf8] focus:border-transparent transition pr-10"
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {error && (
              <p className="text-red-500 bg-red-50 px-3 py-2 rounded-lg" style={{ fontSize: '0.85rem' }}>{error}</p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-2.5 bg-[#35bdf8] text-[#082c45] font-bold rounded-xl hover:bg-[#29abe2] transition-colors shadow-md shadow-[#35bdf8]/20 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Entrando...
                </>
              ) : (
                'Entrar'
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-gray-400 mt-6" style={{ fontSize: '0.75rem' }}>
          Solicite seu acesso ao coordenador da congregação
        </p>
      </div>
    </div>
  );
}