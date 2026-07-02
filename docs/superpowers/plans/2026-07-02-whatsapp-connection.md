# Conexão WhatsApp via uazapi — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permitir conectar/desconectar a linha WhatsApp (instância uazapi já existente) pela página de Configurações, via QR code ou código de pareamento.

**Architecture:** Generalizar a Edge Function `uazapi-proxy` (hoje hardcoded para `/send/text`) com allowlist de endpoints; adicionar funções de instância em `lib/whatsapp.ts`; criar componente `WhatsAppConnectionCard` renderizado no `SettingsPage` abaixo dos campos de credenciais.

**Tech Stack:** React 18 + TypeScript + Tailwind (modais custom, padrão do SettingsPage), Supabase Edge Functions (Deno), sonner (toasts), lucide-react (ícones). Projeto sem framework de testes — verificação por `npm run build` (typecheck) e teste manual.

**Spec:** `docs/superpowers/specs/2026-07-02-whatsapp-connection-design.md`

**Referência API uazapi** (docs.uazapi.com, uazapiGO 2.1.1; auth = header `token`):
- `POST /instance/connect` — body `{}` → QR code em `instance.qrcode` (base64); body `{ phone: "5511999999999" }` → código de pareamento em `instance.paircode`. Status vira `connecting`.
- `GET /instance/status` — retorna `{ instance: { status, qrcode, paircode, profileName, ... }, status: { connected, loggedIn } }`. QR renovado vem em `instance.qrcode`.
- `POST /instance/disconnect` — encerra sessão.
- Estados: `disconnected` | `connecting` | `connected` | `hibernated`.

---

### Task 1: Generalizar Edge Function `uazapi-proxy`

Allowlist de endpoints com método derivado no servidor (cliente não escolhe método — menos superfície). `endpoint` ausente → default `/send/text` (retrocompatibilidade total com o cliente atual).

**Files:**
- Modify: `supabase/functions/uazapi-proxy/index.ts`

- [ ] **Step 1: Reescrever a função com allowlist**

Substituir o conteúdo de `supabase/functions/uazapi-proxy/index.ts` por:

```ts
const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const ALLOWED_ENDPOINTS: Record<string, 'GET' | 'POST'> = {
    '/send/text': 'POST',
    '/instance/connect': 'POST',
    '/instance/status': 'GET',
    '/instance/disconnect': 'POST',
}

Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const { instance, token, payload, endpoint, isFallback } = await req.json()

        if (!instance || !token) {
            return new Response(
                JSON.stringify({ error: 'Missing required fields: instance or token' }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
            )
        }

        const targetEndpoint = endpoint || '/send/text'
        const method = ALLOWED_ENDPOINTS[targetEndpoint]

        if (!method) {
            return new Response(
                JSON.stringify({ error: `Endpoint not allowed: ${targetEndpoint}` }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
            )
        }

        if (targetEndpoint === '/send/text' && !payload) {
            return new Response(
                JSON.stringify({ error: 'Missing required field: payload' }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
            )
        }

        const domain = isFallback ? 'free.uazapi.com' : 'whatsapparteinovacao.uazapi.com'
        const url = `https://${domain}${targetEndpoint}`

        const response = await fetch(url, {
            method,
            headers: {
                'Content-Type': 'application/json',
                'token': token,
            },
            body: method === 'GET' ? undefined : JSON.stringify(payload || {}),
        })

        const data = await response.json().catch(() => null)

        if (!response.ok) {
            return new Response(
                JSON.stringify({ error: data?.error || response.statusText, status: response.status }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: response.status }
            )
        }

        return new Response(
            JSON.stringify(data || { success: true }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
        )

    } catch (error) {
        console.error('Edge function error:', error)
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred'

        return new Response(
            JSON.stringify({ error: errorMessage }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        )
    }
})
```

- [ ] **Step 2: Deploy da função**

Run: `supabase functions deploy uazapi-proxy`
Expected: deploy sem erro. (Se CLI não logada, avisar o usuário e seguir — deploy pode ser feito por ele depois; anotar como pendência.)

- [ ] **Step 3: Verificar retrocompatibilidade de `/send/text`**

Teste manual rápido (não bloqueante se não houver linha conectada): enviar uma designação pelo app OU verificar via curl que a função responde:

```bash
curl -s -X POST "https://<PROJECT_REF>.supabase.co/functions/v1/uazapi-proxy" \
  -H "Authorization: Bearer <ANON_KEY>" -H "Content-Type: application/json" \
  -d '{"instance":"x","token":"x","endpoint":"/instance/status"}'
```
Expected: JSON de erro da uazapi (token inválido) e não erro de "Endpoint not allowed" — prova que roteamento funciona.

- [ ] **Step 4: Commit**

```bash
git add supabase/functions/uazapi-proxy/index.ts
git commit -m "feat: generaliza uazapi-proxy com allowlist de endpoints de instância"
```

---

### Task 2: Funções de instância em `lib/whatsapp.ts`

Extrair helper `callUazapiProxy` (DRY: `sendWhatsAppText` passa a usá-lo) e adicionar `connectInstance`, `getInstanceStatus`, `disconnectInstance`.

**Files:**
- Modify: `src/app/lib/whatsapp.ts`

- [ ] **Step 1: Adicionar tipos e helper, refatorar `sendWhatsAppText`**

Em `src/app/lib/whatsapp.ts`, substituir a função `sendWhatsAppText` existente (linhas ~21-59) por:

```ts
export type InstanceConnectionState = 'disconnected' | 'connecting' | 'connected' | 'hibernated' | 'unknown';

export interface InstanceStatus {
    state: InstanceConnectionState;
    connected: boolean;
    loggedIn: boolean;
    profileName?: string;
    qrcode?: string;
    paircode?: string;
}

async function callUazapiProxy(endpoint: string, payload?: Record<string, unknown>): Promise<any> {
    const instance = await api.getAppSetting('uazapi_instance');
    const token = await api.getAppSetting('uazapi_token');

    if (!instance || !token) {
        throw new Error('Credenciais da UAZAPI não configuradas nas Settings.');
    }

    const body: Record<string, unknown> = { instance, token, endpoint, payload, isFallback: false };

    let { data: responseData, error: responseError } = await supabase.functions.invoke('uazapi-proxy', { body });

    if (responseError || (responseData && responseData.error && responseData.status === 404)) {
        const { data: fallbackData, error: fallbackError } = await supabase.functions.invoke('uazapi-proxy', {
            body: { ...body, isFallback: true }
        });

        if (fallbackError || (fallbackData && fallbackData.error)) {
            throw new Error(fallbackData?.error || fallbackError?.message || 'Falha na requisição UAZAPI Proxy Fallback');
        }
        return fallbackData;
    } else if (responseData && responseData.error) {
        throw new Error(responseData.error);
    }

    return responseData;
}

async function sendWhatsAppText(number: string, text: string): Promise<boolean> {
    await callUazapiProxy('/send/text', { number, text });
    return true;
}
```

- [ ] **Step 2: Adicionar funções de instância no final do arquivo**

```ts
function parseInstanceStatus(data: any): InstanceStatus {
    const inst = data?.instance || {};
    const st = data?.status || {};
    const rawState = inst.status as string | undefined;
    const validStates: InstanceConnectionState[] = ['disconnected', 'connecting', 'connected', 'hibernated'];
    return {
        state: validStates.includes(rawState as InstanceConnectionState) ? (rawState as InstanceConnectionState) : 'unknown',
        connected: Boolean(st.connected ?? data?.connected),
        loggedIn: Boolean(st.loggedIn ?? data?.loggedIn),
        profileName: inst.profileName || undefined,
        qrcode: inst.qrcode || undefined,
        paircode: inst.paircode || undefined,
    };
}

export async function connectInstance(phone?: string): Promise<InstanceStatus> {
    const payload: Record<string, unknown> = {};
    if (phone) {
        payload.phone = formatPhoneForWhatsApp(phone);
    }
    const data = await callUazapiProxy('/instance/connect', payload);
    return parseInstanceStatus(data);
}

export async function getInstanceStatus(): Promise<InstanceStatus> {
    const data = await callUazapiProxy('/instance/status');
    return parseInstanceStatus(data);
}

export async function disconnectInstance(): Promise<void> {
    await callUazapiProxy('/instance/disconnect');
}
```

- [ ] **Step 3: Typecheck via build**

Run: `npm run build`
Expected: build sem erros de TypeScript.

- [ ] **Step 4: Commit**

```bash
git add src/app/lib/whatsapp.ts
git commit -m "feat: adiciona funções de conexão de instância uazapi no cliente"
```

---

### Task 3: Componente `WhatsAppConnectionCard`

Componente isolado com badge de status, modal de conexão (abas QR / pareamento) e desconectar com confirmação. Segue padrão de modal custom do SettingsPage (overlay + card Tailwind), toasts via sonner.

**Files:**
- Create: `src/app/components/WhatsAppConnectionCard.tsx`

- [ ] **Step 1: Criar o componente**

```tsx
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Loader2, QrCode, RefreshCw, Smartphone, Unplug, X } from 'lucide-react';
import {
    connectInstance,
    disconnectInstance,
    getInstanceStatus,
    InstanceConnectionState,
    InstanceStatus,
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
    const pollRef = useRef<number | null>(null);

    const refreshStatus = useCallback(async (silent = false) => {
        if (!hasCredentials) return;
        if (!silent) setLoadingStatus(true);
        try {
            const s = await getInstanceStatus();
            setStatus(s);
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
        if (pollRef.current !== null) {
            window.clearInterval(pollRef.current);
            pollRef.current = null;
        }
    }, []);

    const startPolling = useCallback(() => {
        stopPolling();
        pollRef.current = window.setInterval(async () => {
            try {
                const s = await getInstanceStatus();
                setStatus(s);
                if (s.qrcode) setQrcode(s.qrcode);
                if (s.paircode) setPaircode(s.paircode);
                if (s.state === 'connected') {
                    stopPolling();
                    setShowConnectModal(false);
                    toast.success('WhatsApp conectado com sucesso!');
                } else if (s.state === 'disconnected') {
                    stopPolling();
                    setExpired(true);
                }
            } catch {
                // erro transitório de poll: ignora, próxima iteração tenta de novo
            }
        }, POLL_INTERVAL_MS);
    }, [stopPolling]);

    useEffect(() => stopPolling, [stopPolling]);

    const beginConnect = async (phone?: string) => {
        setConnecting(true);
        setExpired(false);
        try {
            const s = await connectInstance(phone);
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

    const openConnectModal = () => {
        setConnectTab('qr');
        setQrcode(null);
        setPaircode(null);
        setPhoneInput('');
        setExpired(false);
        setShowConnectModal(true);
        beginConnect();
    };

    const closeConnectModal = () => {
        stopPolling();
        setShowConnectModal(false);
        refreshStatus(true);
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
```

- [ ] **Step 2: Typecheck via build**

Run: `npm run build`
Expected: build sem erros. (Componente ainda não usado — ok; se o linter reclamar de export não usado, ignorar até Task 4.)

- [ ] **Step 3: Commit**

```bash
git add src/app/components/WhatsAppConnectionCard.tsx
git commit -m "feat: adiciona componente de conexão WhatsApp (QR e pareamento)"
```

---

### Task 4: Integrar card no SettingsPage

**Files:**
- Modify: `src/app/components/SettingsPage.tsx` (import no topo; render após o bloco do botão "Salvar dados", ~linha 349)

- [ ] **Step 1: Adicionar import**

Após a linha 8 (`import { supabase } from '../lib/supabase';`):

```tsx
import { WhatsAppConnectionCard } from './WhatsAppConnectionCard';
```

- [ ] **Step 2: Renderizar o card**

No JSX, logo após o `</div>` que fecha o bloco `<div className="w-full flex justify-end">` do botão "Salvar dados" (linha ~349, ainda dentro do container dos campos ou logo após ele — colocar como irmão do container de campos, antes do comentário `{/* Tabs */}`):

```tsx
      <WhatsAppConnectionCard hasCredentials={Boolean(uazapiInstance.trim() && uazapiToken.trim())} />
```

- [ ] **Step 3: Build**

Run: `npm run build`
Expected: sem erros.

- [ ] **Step 4: Verificação manual no dev server**

Run: `npm run dev` e abrir Configurações.
Verificar:
1. Sem credenciais → card mostra aviso "Preencha e salve Instância e Token".
2. Com credenciais → badge de status carrega; botão Atualizar funciona.
3. Conectar → modal abre já gerando QR; aba pareamento gera código com número válido.
4. Escanear QR / digitar código com a linha real → badge vira "Conectado" + nome do perfil + toast.
5. Desconectar → confirmação → badge "Desconectado".
6. Enviar uma designação por WhatsApp → mensagem chega (retrocompatibilidade `/send/text`).

- [ ] **Step 5: Commit**

```bash
git add src/app/components/SettingsPage.tsx
git commit -m "feat: exibe conexão WhatsApp na página de configurações"
```
