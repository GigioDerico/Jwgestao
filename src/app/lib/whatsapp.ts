import { api } from './api';
import { supabase } from './supabase';

export interface DesignationMessageData {
    studentName: string;
    assistantName?: string;
    date: string;
    partNumber: number | string;
    location: string;
    phone: string;
}

export async function sendDesignationWhatsApp(data: DesignationMessageData): Promise<boolean> {
    try {
        const instance = await api.getAppSetting('uazapi_instance');
        const token = await api.getAppSetting('uazapi_token');

        if (!instance || !token) {
            throw new Error('Credenciais da UAZAPI não configuradas nas Settings.');
        }

        if (!data.phone) {
            throw new Error('Número de telefone do estudante não encontrado.');
        }

        const messageTemplate = `Olá *${data.studentName}*, tudo bem?

Segue sua designação para a reunião:

*DESIGNAÇÃO PARA A REUNIÃO NOSSA VIDA E MINISTÉRIO CRISTÃO*
Nome: ${data.studentName}
${data.assistantName ? `Ajudante: ${data.assistantName}\n` : ''}Data: ${data.date}
Número da parte: ${data.partNumber}

Local: ${data.location}

Observação para o estudante: A lição e a fonte de matéria para a sua designação estão na *Apostila da Reunião Vida e Ministério*. Veja as instruções para a parte que estão nas *Instruções para a Reunião Nossa Vida e Ministério Cristão (S-38)*.`;

        // Format phone to ensure it has the country code (assuming +55 for Brazil if not provided)
        let formattedPhone = data.phone.replace(/\D/g, '');
        if (formattedPhone.length === 10 || formattedPhone.length === 11) {
            formattedPhone = `55${formattedPhone}`;
        }

        const payload = {
            number: formattedPhone,
            text: messageTemplate,
        };

        let { data: responseData, error: responseError } = await supabase.functions.invoke('uazapi-proxy', {
            body: {
                instance,
                token,
                payload,
                isFallback: false
            }
        });

        if (responseError || (responseData && responseData.error && responseData.status === 404)) {
            // Attempt fallback if 404
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
    } catch (error: any) {
        console.error('Error sending WhatsApp message:', error);
        throw error;
    }
}
