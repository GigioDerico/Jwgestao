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

function formatPhoneForWhatsApp(phone: string) {
    let formattedPhone = phone.replace(/\D/g, '');
    if (formattedPhone.length === 10 || formattedPhone.length === 11) {
        formattedPhone = `55${formattedPhone}`;
    }
    return formattedPhone;
}

export async function sendDesignationWhatsApp(data: DesignationMessageData): Promise<boolean> {
    try {
        if (!data.phone) {
            throw new Error('Número de telefone do estudante não encontrado.');
        }

        const title = data.meetingTitle || 'DESIGNAÇÃO PARA A REUNIÃO NOSSA VIDA E MINISTÉRIO CRISTÃO';
        const assignmentLabel =
            data.assignmentLabel ||
            (typeof data.partNumber === 'number' ? 'Número da parte' : 'Designação');
        const observationText = data.observationText || (
            title === 'DESIGNAÇÃO PARA A REUNIÃO NOSSA VIDA E MINISTÉRIO CRISTÃO'
                ? 'A lição e a fonte de matéria para a sua designação estão na *Apostila da Reunião Vida e Ministério*. Veja as instruções para a parte que estão nas *Instruções para a Reunião Nossa Vida e Ministério Cristão (S-38)*.'
                : 'Se houver algum imprevisto, informe com antecedência ao responsável pelas designações.'
        );

        const messageTemplate = `Olá *${data.studentName}*, tudo bem?

Segue sua designação para a reunião:

*${title}*
Nome: ${data.studentName}
${data.assistantName ? `Ajudante: ${data.assistantName}\n` : ''}Data: ${data.date}
${assignmentLabel}: ${data.partNumber}

Local: ${data.location}

Observação: ${observationText}`;

        return sendWhatsAppText(formatPhoneForWhatsApp(data.phone), messageTemplate);
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
