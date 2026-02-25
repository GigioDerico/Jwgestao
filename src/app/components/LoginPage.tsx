import React, { useState } from 'react';
import { useNavigate, Navigate } from 'react-router';
import { useAuth } from '../context/AuthContext';
import { BookOpen, Eye, EyeOff } from 'lucide-react';

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [showDemo, setShowDemo] = useState(false);
  const { login, user } = useAuth();
  const navigate = useNavigate();

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (login(email, password)) {
      navigate('/dashboard');
    } else {
      setError('Credenciais inválidas. Use uma das contas de demonstração.');
      setShowDemo(true);
    }
  };

  const demoAccounts = [
    { email: 'admin@congregacao.com', role: 'Coordenador (Admin)', desc: 'Acesso completo' },
    { email: 'secretario@congregacao.com', role: 'Secretário', desc: 'Membros + Reuniões' },
    { email: 'designador@congregacao.com', role: 'Designador', desc: 'Reuniões + Designações' },
    { email: 'publicador@congregacao.com', role: 'Publicador', desc: 'Apenas visualização' },
  ];

  const quickLogin = (demoEmail: string) => {
    if (login(demoEmail, 'demo')) {
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
              <label className="block text-gray-600 mb-1.5" style={{ fontSize: '0.85rem' }}>E-mail</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="seu@email.com"
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#35bdf8] focus:border-transparent transition"
                required
              />
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
              className="w-full py-2.5 bg-[#35bdf8] text-[#082c45] font-bold rounded-xl hover:bg-[#29abe2] transition-colors shadow-md shadow-[#35bdf8]/20"
            >
              Entrar
            </button>
          </form>

          {/* Demo accounts */}
          <div className="mt-6 pt-5 border-t border-gray-100">
            <button
              onClick={() => setShowDemo(!showDemo)}
              className="w-full text-center text-[#35bdf8] hover:text-[#29abe2] font-medium mb-3"
              style={{ fontSize: '0.85rem' }}
            >
              {showDemo ? 'Ocultar contas demo' : 'Ver contas de demonstração'}
            </button>

            {showDemo && (
              <div className="space-y-2">
                {demoAccounts.map(acc => (
                  <button
                    key={acc.email}
                    onClick={() => quickLogin(acc.email)}
                    className="w-full text-left px-3 py-2.5 bg-gray-50 hover:bg-blue-50 rounded-xl transition-colors group"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-gray-800 group-hover:text-[#082c45]" style={{ fontSize: '0.85rem' }}>{acc.role}</p>
                        <p className="text-gray-400" style={{ fontSize: '0.75rem' }}>{acc.desc}</p>
                      </div>
                      <span className="text-[#35bdf8] group-hover:translate-x-1 transition-transform" style={{ fontSize: '0.75rem' }}>→</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <p className="text-center text-gray-400 mt-6" style={{ fontSize: '0.75rem' }}>
          Solicite seu acesso ao coordenador da congregação
        </p>
      </div>
    </div>
  );
}