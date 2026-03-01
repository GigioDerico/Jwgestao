import React, { useEffect, useState } from 'react';
import { useNavigate, Navigate } from 'react-router';
import { useAuth } from '../context/AuthContext';
import { formatPhoneDisplay } from '../helpers';
import { BookOpen, Eye, EyeOff, Phone, Loader2 } from 'lucide-react';

const REMEMBER_LOGIN_KEY = 'jwgestao-remember-login';
const REMEMBERED_PHONE_KEY = 'jwgestao-remembered-phone';

export function LoginPage() {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [rememberLogin, setRememberLogin] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { login, user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    try {
      const shouldRemember = globalThis.localStorage.getItem(REMEMBER_LOGIN_KEY) === '1';
      const savedPhone = globalThis.localStorage.getItem(REMEMBERED_PHONE_KEY) || '';

      setRememberLogin(shouldRemember);

      if (shouldRemember && savedPhone) {
        setPhone(savedPhone.replace(/\D/g, '').slice(0, 11));
      }
    } catch (storageError) {
      console.warn('[Login] Nao foi possivel carregar os dados salvos neste dispositivo:', storageError);
    }
  }, []);

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

  const updateRememberedLogin = (digits: string) => {
    try {
      if (rememberLogin) {
        globalThis.localStorage.setItem(REMEMBER_LOGIN_KEY, '1');
        globalThis.localStorage.setItem(REMEMBERED_PHONE_KEY, digits);
        return;
      }

      globalThis.localStorage.removeItem(REMEMBER_LOGIN_KEY);
      globalThis.localStorage.removeItem(REMEMBERED_PHONE_KEY);
    } catch (storageError) {
      console.warn('[Login] Nao foi possivel atualizar os dados salvos neste dispositivo:', storageError);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const digits = phone.replace(/\D/g, '');
    if (digits.length < 10) {
      setError('Digite um número de telefone válido com DDD.');
      return;
    }

    updateRememberedLogin(digits);
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
                  name="username"
                  value={formatPhoneDisplay(phone)}
                  onChange={handlePhoneChange}
                  placeholder="(11) 99999-9999"
                  className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#35bdf8] focus:border-transparent transition"
                  required
                  autoComplete="username"
                  spellCheck={false}
                />
              </div>
            </div>

            <div>
              <label className="block text-gray-600 mb-1.5" style={{ fontSize: '0.85rem' }}>Senha</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
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

            <label className="flex items-start gap-2 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5">
              <input
                type="checkbox"
                checked={rememberLogin}
                onChange={(e) => {
                  const nextValue = e.target.checked;
                  setRememberLogin(nextValue);

                  if (!nextValue) {
                    try {
                      globalThis.localStorage.removeItem(REMEMBER_LOGIN_KEY);
                      globalThis.localStorage.removeItem(REMEMBERED_PHONE_KEY);
                    } catch (storageError) {
                      console.warn('[Login] Nao foi possivel limpar os dados salvos neste dispositivo:', storageError);
                    }
                  }
                }}
                className="mt-0.5 h-4 w-4 rounded border-gray-300 text-[#35bdf8] focus:ring-[#35bdf8]"
              />
              <span className="text-gray-600 leading-5" style={{ fontSize: '0.82rem' }}>
                Lembrar de mim
              </span>
            </label>

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
