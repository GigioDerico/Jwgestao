import React, { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { AlertTriangle, Loader2, MapPin, QrCode, RefreshCw, Smartphone, Unplug, X } from 'lucide-react';
import {
    connectInstance,
    disconnectInstance,
    getInstanceStatus,
    getMessageLimits,
    listProxyCities,
    InstanceConnectionState,
    InstanceStatus,
    MessageLimits,
    ProxyCity,
} from '../lib/whatsapp';

interface WhatsAppConnectionCardProps {
    hasCredentials: boolean;
}

const STATE_LABELS: Record<InstanceConnectionState, string> = {
    connected: 'Conectado',
    connecting: 'Conectando',
    disconnected: 'Desconectado',
    hibernated: 'Sessão pausada',
    unknown: 'Desconhecido',
};

const STATE_STYLES: Record<InstanceConnectionState, string> = {
    connected: 'bg-green-100 text-green-800',
    connecting: 'bg-yellow-100 text-yellow-800',
    disconnected: 'bg-muted text-muted-foreground',
    hibernated: 'bg-yellow-100 text-yellow-800',
    unknown: 'bg-muted text-muted-foreground',
};

const POLL_INTERVAL_MS = 3000;

export function WhatsAppConnectionCard({ hasCredentials }: WhatsAppConnectionCardProps) {
    const [status, setStatus] = useState<InstanceStatus | null>(null);
    const [limits, setLimits] = useState<MessageLimits | null>(null);
    const [loadingStatus, setLoadingStatus] = useState(false);
    const [showConnectModal, setShowConnectModal] = useState(false);
    const [connectTab, setConnectTab] = useState<'qr' | 'code'>('qr');
    const [qrcode, setQrcode] = useState<string | null>(null);
    const [paircode, setPaircode] = useState<string | null>(null);
    const [phoneInput, setPhoneInput] = useState('');
    const [connecting, setConnecting] = useState(false);
    const [expired, setExpired] = useState(false);
    const [showDisconnectConfirm, setShowDisconnectConfirm] = useState(false);
    const [disconnecting, setDisconnecting] = useState(false);
    const [cities, setCities] = useState<ProxyCity[]>([]);
    const [selectedCity, setSelectedCity] = useState('');
    const [loadingCities, setLoadingCities] = useState(false);
    const pollRef = useRef<number | null>(null);
    const pollGenRef = useRef(0);

    const refreshStatus = useCallback(async (silent = false) => {
        if (!hasCredentials) return;
        if (!silent) setLoadingStatus(true);
        try {
            const s = await getInstanceStatus();
            setStatus(s);
            if (s.state === 'connected') {
                try {
                    setLimits(await getMessageLimits());
                } catch {
                    // limites são informativos: falha não bloqueia o status
                }
            } else {
                setLimits(null);
            }
        } catch (err: any) {
            if (!silent) toast.error(err.message || 'Erro ao consultar status do WhatsApp.');
        } finally {
            if (!silent) setLoadingStatus(false);
        }
    }, [hasCredentials]);

    useEffect(() => {
        refreshStatus();
    }, [refreshStatus]);

    const stopPolling = useCallback(() => {
        pollGenRef.current += 1;
        if (pollRef.current !== null) {
            window.clearTimeout(pollRef.current);
            pollRef.current = null;
        }
    }, []);

    const startPolling = useCallback(() => {
        stopPolling();
        const myGen = pollGenRef.current;

        const tick = async () => {
            try {
                const s = await getInstanceStatus();
                if (pollGenRef.current !== myGen) return;
                setStatus(s);
                if (s.qrcode) setQrcode(s.qrcode);
                if (s.paircode) setPaircode(s.paircode);
                if (s.state === 'connected') {
                    stopPolling();
                    setShowConnectModal(false);
                    toast.success('WhatsApp conectado com sucesso!');
                    return;
                } else if (s.state === 'disconnected') {
                    stopPolling();
                    setExpired(true);
                    return;
                }
            } catch {
                // erro transitório de poll: ignora, próxima iteração tenta de novo
                if (pollGenRef.current !== myGen) return;
            }
            if (pollGenRef.current === myGen) {
                pollRef.current = window.setTimeout(tick, POLL_INTERVAL_MS);
            }
        };

        pollRef.current = window.setTimeout(tick, POLL_INTERVAL_MS);
    }, [stopPolling]);

    useEffect(() => stopPolling, [stopPolling]);

    const beginConnect = async (phone?: string, cityValue?: string) => {
        setConnecting(true);
        setExpired(false);
        try {
            const effectiveCity = cityValue !== undefined ? cityValue : selectedCity;
            const city = cities.find(c => c.value === effectiveCity);
            const s = await connectInstance(phone, city);
            setQrcode(s.qrcode || null);
            setPaircode(s.paircode || null);
            setStatus(s);
            startPolling();
        } catch (err: any) {
            toast.error(err.message || 'Erro ao iniciar conexão.');
        } finally {
            setConnecting(false);
        }
    };

    const loadCities = useCallback(async () => {
        if (cities.length > 0) return;
        setLoadingCities(true);
        try {
            setCities(await listProxyCities());
        } catch {
            // proxy regional é opcional: falha silenciosa, conexão segue sem cidade
        } finally {
            setLoadingCities(false);
        }
    }, [cities.length]);

    const openConnectModal = () => {
        setConnectTab('qr');
        setQrcode(null);
        setPaircode(null);
        setPhoneInput('');
        setExpired(false);
        setShowConnectModal(true);
        loadCities();
        beginConnect();
    };

    const closeConnectModal = () => {
        stopPolling();
        setShowConnectModal(false);
        refreshStatus(true);
    };

    const handleCityChange = (value: string) => {
        setSelectedCity(value);
        if (connectTab === 'qr') {
            stopPolling();
            setQrcode(null);
            setExpired(false);
            beginConnect(undefined, value);
        }
    };

    const switchTab = (tab: 'qr' | 'code') => {
        if (tab === connectTab) return;
        stopPolling();
        setExpired(false);
        setConnectTab(tab);
        if (tab === 'qr') {
            setQrcode(null);
            beginConnect();
        } else {
            setPaircode(null);
        }
    };

    const handleDisconnect = async () => {
        setDisconnecting(true);
        try {
            await disconnectInstance();
            toast.success('WhatsApp desconectado.');
            setShowDisconnectConfirm(false);
            await refreshStatus(true);
        } catch (err: any) {
            toast.error(err.message || 'Erro ao desconectar.');
        } finally {
            setDisconnecting(false);
        }
    };

    const state: InstanceConnectionState = status?.state ?? 'unknown';
    const isConnected = state === 'connected';

    return (
        <div className="mt-4 rounded-lg border border-border bg-card p-4">
            <div className="flex flex-wrap items-center gap-3">
                <span className="font-medium text-foreground" style={{ fontSize: '0.9rem' }}>Conexão WhatsApp</span>
                {hasCredentials ? (
                    <>
                        <span className={`rounded-full px-2 py-0.5 ${STATE_STYLES[state]}`} style={{ fontSize: '0.75rem' }}>
                            {STATE_LABELS[state]}
                        </span>
                        {isConnected && status?.profileName && (
                            <span className="text-muted-foreground" style={{ fontSize: '0.8rem' }}>{status.profileName}</span>
                        )}
                        <button
                            onClick={() => refreshStatus()}
                            disabled={loadingStatus}
                            className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground disabled:opacity-50"
                            style={{ fontSize: '0.8rem' }}
                            title="Atualizar status"
                        >
                            {loadingStatus ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                        </button>
                        <div className="ml-auto flex gap-2">
                            {isConnected ? (
                                <button
                                    onClick={() => setShowDisconnectConfirm(true)}
                                    className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-foreground transition-colors hover:bg-muted"
                                    style={{ fontSize: '0.85rem' }}
                                >
                                    <Unplug className="h-4 w-4" /> Desconectar
                                </button>
                            ) : (
                                <button
                                    onClick={openConnectModal}
                                    className="inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-primary-foreground transition-colors hover:bg-primary/90"
                                    style={{ fontSize: '0.85rem' }}
                                >
                                    <QrCode className="h-4 w-4" /> Conectar
                                </button>
                            )}
                        </div>
                    </>
                ) : (
                    <span className="text-muted-foreground" style={{ fontSize: '0.8rem' }}>
                        Preencha e salve Instância e Token UAZAPI para conectar.
                    </span>
                )}
            </div>

            {/* Aviso de restrição de novas conversas (erro 463) */}
            {isConnected && limits && limits.canSendNew === false && (
                <div className="mt-3 flex items-start gap-2 rounded-lg border border-yellow-300 bg-yellow-50 p-3 text-yellow-800">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                    <div style={{ fontSize: '0.8rem' }}>
                        <p className="font-medium">Envio de novas conversas restrito pelo WhatsApp</p>
                        <p className="mt-0.5">
                            {limits.message || 'A conta está sob restrição temporária para iniciar novas conversas (volume/qualidade). Reduza a cadência de envios e aguarde a liberação.'}
                        </p>
                    </div>
                </div>
            )}

            {/* Modal de conexão */}
            {showConnectModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="w-full max-w-md rounded-lg border border-border bg-card p-5 shadow-lg">
                        <div className="mb-3 flex items-center justify-between">
                            <h3 className="font-medium text-foreground">Conectar WhatsApp</h3>
                            <button onClick={closeConnectModal} className="text-muted-foreground hover:text-foreground">
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        <div className="mb-4">
                            <label className="mb-1 flex items-center gap-1 text-muted-foreground" style={{ fontSize: '0.8rem' }}>
                                <MapPin className="h-3.5 w-3.5" /> Região da conexão (opcional)
                            </label>
                            <select
                                value={selectedCity}
                                onChange={e => handleCityChange(e.target.value)}
                                disabled={loadingCities}
                                className="w-full rounded-lg border border-border bg-card px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-60"
                                style={{ fontSize: '0.85rem' }}
                            >
                                <option value="">{loadingCities ? 'Carregando cidades...' : 'Sem proxy regional (padrão)'}</option>
                                {cities.map(c => (
                                    <option key={c.value} value={c.value}>
                                        {c.label}{c.state_label ? ` - ${c.state_label}` : ''}
                                    </option>
                                ))}
                            </select>
                            <p className="mt-1 text-muted-foreground" style={{ fontSize: '0.72rem' }}>
                                Escolher uma cidade próxima faz a conexão sair de um IP brasileiro regional, reduzindo bloqueios de segurança do WhatsApp.
                            </p>
                        </div>
                        <div className="mb-4 flex gap-2 border-b border-border">
                            <button
                                onClick={() => switchTab('qr')}
                                className={`px-3 py-2 border-b-2 transition-colors ${connectTab === 'qr' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
                                style={{ fontSize: '0.85rem' }}
                            >
                                <span className="inline-flex items-center gap-1"><QrCode className="h-4 w-4" /> QR Code</span>
                            </button>
                            <button
                                onClick={() => switchTab('code')}
                                className={`px-3 py-2 border-b-2 transition-colors ${connectTab === 'code' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
                                style={{ fontSize: '0.85rem' }}
                            >
                                <span className="inline-flex items-center gap-1"><Smartphone className="h-4 w-4" /> Código de pareamento</span>
                            </button>
                        </div>

                        {connectTab === 'qr' && (
                            <div className="flex flex-col items-center gap-3">
                                {connecting && <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />}
                                {!connecting && qrcode && !expired && (
                                    <>
                                        <img
                                            src={qrcode.startsWith('data:') ? qrcode : `data:image/png;base64,${qrcode}`}
                                            alt="QR Code para conectar o WhatsApp"
                                            className="h-56 w-56 rounded-lg border border-border bg-white p-2"
                                        />
                                        <p className="text-center text-muted-foreground" style={{ fontSize: '0.8rem' }}>
                                            No celular: WhatsApp → Configurações → Aparelhos conectados → Conectar um aparelho, e escaneie o código.
                                        </p>
                                    </>
                                )}
                                {expired && (
                                    <button
                                        onClick={() => beginConnect()}
                                        className="inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-primary-foreground hover:bg-primary/90"
                                        style={{ fontSize: '0.85rem' }}
                                    >
                                        <RefreshCw className="h-4 w-4" /> Gerar novo QR code
                                    </button>
                                )}
                            </div>
                        )}

                        {connectTab === 'code' && (
                            <div className="flex flex-col gap-3">
                                {!paircode && (
                                    <>
                                        <label className="text-muted-foreground" style={{ fontSize: '0.8rem' }}>
                                            Número da linha (DDD + número, ex.: 11999999999)
                                        </label>
                                        <input
                                            type="tel"
                                            value={phoneInput}
                                            onChange={e => setPhoneInput(e.target.value)}
                                            placeholder="11999999999"
                                            className="w-full rounded-lg border border-border bg-card px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                                        />
                                        <button
                                            onClick={() => beginConnect(phoneInput)}
                                            disabled={connecting || phoneInput.replace(/\D/g, '').length < 10}
                                            className="inline-flex items-center justify-center gap-1 rounded-lg bg-primary px-3 py-2 text-primary-foreground hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-70"
                                            style={{ fontSize: '0.85rem' }}
                                        >
                                            {connecting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Smartphone className="h-4 w-4" />}
                                            Gerar código
                                        </button>
                                    </>
                                )}
                                {paircode && !expired && (
                                    <div className="flex flex-col items-center gap-3">
                                        <span className="rounded-lg bg-muted px-6 py-3 font-mono text-2xl tracking-widest text-foreground">
                                            {paircode}
                                        </span>
                                        <p className="text-center text-muted-foreground" style={{ fontSize: '0.8rem' }}>
                                            No celular: WhatsApp → Configurações → Aparelhos conectados → Conectar um aparelho → Conectar com número de telefone, e digite o código.
                                        </p>
                                    </div>
                                )}
                                {expired && (
                                    <button
                                        onClick={() => { setPaircode(null); setExpired(false); }}
                                        className="inline-flex items-center justify-center gap-1 rounded-lg bg-primary px-3 py-2 text-primary-foreground hover:bg-primary/90"
                                        style={{ fontSize: '0.85rem' }}
                                    >
                                        <RefreshCw className="h-4 w-4" /> Gerar novo código
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Confirmação de desconexão */}
            {showDisconnectConfirm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="w-full max-w-sm rounded-lg border border-border bg-card p-5 shadow-lg">
                        <h3 className="mb-2 font-medium text-foreground">Desconectar WhatsApp?</h3>
                        <p className="mb-4 text-muted-foreground" style={{ fontSize: '0.85rem' }}>
                            A sessão será encerrada. Para reconectar será necessário escanear um novo QR code ou usar um novo código de pareamento.
                        </p>
                        <div className="flex justify-end gap-2">
                            <button
                                onClick={() => setShowDisconnectConfirm(false)}
                                className="rounded-lg border border-border px-3 py-1.5 text-foreground hover:bg-muted"
                                style={{ fontSize: '0.85rem' }}
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleDisconnect}
                                disabled={disconnecting}
                                className="inline-flex items-center gap-1 rounded-lg bg-destructive px-3 py-1.5 text-destructive-foreground hover:bg-destructive/90 disabled:opacity-70"
                                style={{ fontSize: '0.85rem' }}
                            >
                                {disconnecting && <Loader2 className="h-4 w-4 animate-spin" />}
                                Desconectar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
