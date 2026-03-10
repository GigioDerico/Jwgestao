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

async function sendWhatsAppText(number: string, text: string): Promise<boolean> {
    const instance = await api.getAppSetting('uazapi_instance');
    const token = await api.getAppSetting('uazapi_token');

    if (!instance || !token) {
        throw new Error('Credenciais da UAZAPI não configuradas nas Settings.');
    }

    const payload = { number, text };

    let { data: responseData, error: responseError } = await supabase.functions.invoke('uazapi-proxy', {
        body: {
            instance,
            token,
            payload,
            isFallback: false
        }
    });

    if (responseError || (responseData && responseData.error && responseData.status === 404)) {
        const { data: fallbackData, error: fallbackError } = await supabase.functions.invoke('uazapi-proxy', {
            body: {
                instance,
                token,
                payload,
                isFallback: true
            }
        });

        if (fallbackError || (fallbackData && fallbackData.error)) {
            throw new Error(fallbackData?.error || fallbackError?.message || 'Falha na requisição UAZAPI Proxy Fallback');
        }
        return true;
    } else if (responseData && responseData.error) {
        throw new Error(responseData.error);
    }

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
