import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';
import { Shield, Lock, Eye, EyeOff, Loader2 } from 'lucide-react';

export function SetupPasswordPage() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();

    const [loading, setLoading] = useState(true);
    const [errorMsg, setErrorMsg] = useState('');

    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        const authenticate = async () => {
            const email = searchParams.get('e');
            const tempPassword = searchParams.get('p');

            // Se não houver credenciais na URL, verifica se já está logado
            if (!email || !tempPassword) {
                const { data: { session } } = await supabase.auth.getSession();
                if (!session) {
                    setErrorMsg('Link inválido, expirado ou formato incorreto.');
                }
                setLoading(false);
                return;
            }

            try {
                setLoading(true);
                // Autentica usando as credenciais temporárias do Magic Link
                const { error } = await supabase.auth.signInWithPassword({
                    email,
                    password: tempPassword,
                });

                if (error) {
                    throw error;
                }

                // Limpa a URL sensível do histórico do navegador
                window.history.replaceState({}, document.title, window.location.pathname);
            } catch (err: any) {
                console.error('Magic Link Error:', err);
                setErrorMsg('O link é inválido ou já foi utilizado. Por favor, solicite um novo link ao seu administrador.');
            } finally {
                setLoading(false);
            }
        };

        authenticate();
    }, [searchParams]);

    const handleSavePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (newPassword.length < 6) {
            toast.error('A senha deve ter pelo menos 6 caracteres.');
            return;
        }
        if (newPassword !== confirmPassword) {
            toast.error('As senhas não coincidem.');
            return;
        }

        setSaving(true);
        try {
            const { error } = await supabase.auth.updateUser({ password: newPassword });
            if (error) throw error;

            toast.success('Senha atualizada com sucesso! Bem-vindo(a).');
            // Usamos href ao ínves de navigate para que o roteador instancie as sessões autenticadas apropriadamente no private-route.
            window.location.href = '/dashboard';
        } catch (err: any) {
            toast.error(err.message || 'Erro ao salvar nova senha.');
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center p-4">
                <div className="text-center space-y-4">
                    <Loader2 size={48} className="animate-spin text-primary mx-auto" />
                    <p className="text-muted-foreground">Autenticando link mágico...</p>
                </div>
            </div>
        );
    }

    if (errorMsg) {
        return (
            <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center p-4">
                <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md text-center space-y-4 border border-border">
                    <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Shield size={32} />
                    </div>
                    <h2 className="text-xl font-bold text-[#082c45]">Acesso Negado</h2>
                    <p className="text-muted-foreground">{errorMsg}</p>
                    <button
                        onClick={() => navigate('/login')}
                        className="w-full mt-4 py-3 bg-[#082c45] text-white font-bold rounded-xl hover:bg-[#0a4a7a] transition-all"
                    >
                        Voltar para o Login
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#f8fafc] flex flex-col justify-center p-4 sm:p-8">
            <div className="max-w-md w-full mx-auto">
                <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-primary/10 text-primary rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <Lock size={32} />
                    </div>
                    <h1 className="text-2xl sm:text-3xl items-center justify-center flex font-bold text-[#082c45]">
                        Configure sua Senha Pessoal
                    </h1>
                    <p className="text-muted-foreground mt-2 px-4 shadow-none">
                        Por favor, crie uma senha segura para utilizar futuramente.
                    </p>
                </div>

                <form onSubmit={handleSavePassword} className="bg-white rounded-2xl shadow-xl p-6 sm:p-8 border border-border space-y-6">
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-foreground ml-1">Nova Senha</label>
                            <div className="relative">
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    placeholder="Mínimo 6 caracteres"
                                    className="w-full pl-4 pr-12 py-3 bg-muted/30 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#35bdf8] focus:border-transparent transition-all outline-none"
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1"
                                >
                                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                </button>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-foreground ml-1">Confirmar Senha</label>
                            <div className="relative">
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    placeholder="Repita a nova senha"
                                    className="w-full pl-4 pr-12 py-3 bg-muted/30 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#35bdf8] focus:border-transparent transition-all outline-none"
                                    required
                                />
                            </div>
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={saving || !newPassword || !confirmPassword}
                        className="w-full py-3.5 bg-[#082c45] text-white font-bold rounded-xl hover:bg-[#0a4a7a] focus:ring-4 focus:ring-primary/20 transition-all shadow-lg shadow-[#082c45]/20 disabled:opacity-70 flex items-center justify-center gap-2"
                    >
                        {saving ? (
                            <>
                                <Loader2 size={20} className="animate-spin" />
                                <span>Salvando...</span>
                            </>
                        ) : (
                            'Salvar e Acessar'
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
}
