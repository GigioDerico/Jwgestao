import { api } from './api';
import { supabase } from './supabase';

export interface DesignationMessageData {
    studentName: string;
    assistantName?: string;
    date: string;
    partNumber: number | string;
    location: string;
    phone: string;
    meetingTitle?: string;
    assignmentLabel?: string;
    observationText?: string;
}

export interface PlainWhatsAppMessageData {
    phone: string;
    text: string;
}

export type InstanceConnectionState = 'disconnected' | 'connecting' | 'connected' | 'hibernated' | 'unknown';

export interface InstanceStatus {
    state: InstanceConnectionState;
    connected: boolean;
    loggedIn: boolean;
    profileName?: string;
    qrcode?: string;
    paircode?: string;
}

// Quando a Edge Function responde não-2xx, o supabase-js popula `error`
// (FunctionsHttpError) e o corpo real da resposta fica em `error.context`.
// Extrai daí a mensagem/status verdadeiros do WhatsApp (ex: erro 463).
async function extractProxyError(error: any): Promise<{ message: string; status?: number }> {
    try {
        const ctx = error?.context;
        if (ctx && typeof ctx.json === 'function') {
            const body = await ctx.json();
            return { message: body?.error || error?.message || 'Erro na requisição UAZAPI', status: body?.status ?? ctx.status };
        }
        if (ctx && typeof ctx.status === 'number') {
            return { message: error?.message || 'Erro na requisição UAZAPI', status: ctx.status };
        }
    } catch {
        // corpo ilegível: cai no fallback de mensagem abaixo
    }
    return { message: error?.message || 'Erro na requisição UAZAPI' };
}

async function callUazapiProxy(endpoint: string, payload?: Record<string, unknown>): Promise<any> {
    const instance = await api.getAppSetting('uazapi_instance');
    const token = await api.getAppSetting('uazapi_token');

    if (!instance || !token) {
        throw new Error('Credenciais da UAZAPI não configuradas nas Settings.');
    }

    const body: Record<string, unknown> = { instance, token, endpoint, payload, isFallback: false };

    const { data, error } = await supabase.functions.invoke('uazapi-proxy', { body });

    if (!error && !(data && data.error)) {
        return data;
    }

    let errMessage: string;
    let errStatus: number | undefined;
    if (error) {
        const extracted = await extractProxyError(error);
        errMessage = extracted.message;
        errStatus = extracted.status;
    } else {
        errMessage = data.error;
        errStatus = data.status;
    }

    // Fallback só quando o host principal não tem o recurso (404, ex: endpoint
    // movido de domínio). Erros reais do WhatsApp (463, etc) são propagados —
    // o token é dedicado ao host principal, tentar o free só geraria 401 falso.
    if (errStatus === 404) {
        const { data: fbData, error: fbError } = await supabase.functions.invoke('uazapi-proxy', {
            body: { ...body, isFallback: true }
        });
        if (!fbError && !(fbData && fbData.error)) {
            return fbData;
        }
        if (fbError) {
            throw new Error((await extractProxyError(fbError)).message);
        }
        throw new Error(fbData.error);
    }

    throw new Error(errMessage);
}

async function sendWhatsAppText(number: string, text: string): Promise<boolean> {
    await callUazapiProxy('/send/text', { number, text });
    return true;
}

function formatPhoneForWhatsApp(phone: string) {
    let formattedPhone = phone.replace(/\D/g, '');
    if (formattedPhone.length === 10 || formattedPhone.length === 11) {
        formattedPhone = `55${formattedPhone}`;
    }
    return formattedPhone;
}

function buildDesignationMessage(data: DesignationMessageData): string {
    const title = data.meetingTitle || 'DESIGNAÇÃO PARA A REUNIÃO NOSSA VIDA E MINISTÉRIO CRISTÃO';
    const assignmentLabel =
        data.assignmentLabel ||
        (typeof data.partNumber === 'number' ? 'Número da parte' : 'Designação');
    const observationText = data.observationText || (
        title === 'DESIGNAÇÃO PARA A REUNIÃO NOSSA VIDA E MINISTÉRIO CRISTÃO'
            ? 'A lição e a fonte de matéria para a sua designação estão na *Apostila da Reunião Vida e Ministério*. Veja as instruções para a parte que estão nas *Instruções para a Reunião Nossa Vida e Ministério Cristão (S-38)*.'
            : 'Se houver algum imprevisto, informe com antecedência ao responsável pelas designações.'
    );

    return `Olá *${data.studentName}*, tudo bem?

Segue sua designação para a reunião:

*${title}*
Nome: ${data.studentName}
${data.assistantName ? `Ajudante: ${data.assistantName}\n` : ''}Data: ${data.date}
${assignmentLabel}: ${data.partNumber}

Local: ${data.location}

Observação: ${observationText}`;
}

// Link "click to chat" oficial: abre o WhatsApp do próprio usuário (app ou
// WhatsApp Web) com a conversa e o texto pré-preenchidos — o envio é manual.
export function buildWaMeLink(phone: string, text: string): string {
    return `https://wa.me/${formatPhoneForWhatsApp(phone)}?text=${encodeURIComponent(text)}`;
}

function openWaMeLink(phone: string, text: string): void {
    window.open(buildWaMeLink(phone, text), '_blank', 'noopener,noreferrer');
}

export function openDesignationInWhatsApp(data: DesignationMessageData): void {
    if (!data.phone) {
        throw new Error('Número de telefone do estudante não encontrado.');
    }
    openWaMeLink(data.phone, buildDesignationMessage(data));
}

export function openTextInWhatsApp(data: PlainWhatsAppMessageData): void {
    if (!data.phone) {
        throw new Error('Número de telefone não encontrado.');
    }
    const message = (data.text || '').trim();
    if (!message) {
        throw new Error('Mensagem vazia.');
    }
    openWaMeLink(data.phone, message);
}

export async function sendDesignationWhatsApp(data: DesignationMessageData): Promise<boolean> {
    try {
        if (!data.phone) {
            throw new Error('Número de telefone do estudante não encontrado.');
        }

        return sendWhatsAppText(formatPhoneForWhatsApp(data.phone), buildDesignationMessage(data));
    } catch (error: any) {
        console.error('Error sending WhatsApp message:', error);
        throw error;
    }
}

export async function sendTextWhatsApp(data: PlainWhatsAppMessageData): Promise<boolean> {
    try {
        if (!data.phone) {
            throw new Error('Número de telefone não encontrado.');
        }

        const message = (data.text || '').trim();
        if (!message) {
            throw new Error('Mensagem vazia.');
        }

        return sendWhatsAppText(formatPhoneForWhatsApp(data.phone), message);
    } catch (error: any) {
        console.error('Error sending WhatsApp text message:', error);
        throw error;
    }
}

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

export interface ProxyCity {
    value: string;
    label: string;
    state?: string;
    state_label?: string;
}

export async function listProxyCities(): Promise<ProxyCity[]> {
    const data = await callUazapiProxy('/proxy-managed/cities');
    const cities = Array.isArray(data?.cities) ? data.cities : [];
    return cities.map((c: any) => ({
        value: c.value,
        label: c.label || c.value,
        state: c.state || undefined,
        state_label: c.state_label || undefined,
    }));
}

export async function connectInstance(phone?: string, proxyCity?: ProxyCity): Promise<InstanceStatus> {
    const payload: Record<string, unknown> = {};
    if (phone) {
        payload.phone = formatPhoneForWhatsApp(phone);
    }
    if (proxyCity?.value) {
        payload.proxy_managed_country = 'br';
        payload.proxy_managed_city = proxyCity.value;
        if (proxyCity.state) {
            payload.proxy_managed_state = proxyCity.state;
        }
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

export interface MessageLimits {
    canSendNew: boolean | null;
    reachable: boolean;
    message?: string;
}

export async function getMessageLimits(): Promise<MessageLimits> {
    const data = await callUazapiProxy('/instance/wa_messages_limits');
    return {
        canSendNew: typeof data?.can_send_new_messages === 'boolean' ? data.can_send_new_messages : null,
        reachable: Boolean(data?.reachable),
        message: data?.provider_message_ptbr || data?.message_ptbr || undefined,
    };
}
