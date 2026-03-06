/**
 * ministry-timer.ts
 * Abstração do timer do ministério para Web, Android e iOS.
 *
 * - Android: usa ForegroundService (mantém timer ativo mesmo com app minimizado)
 * - iOS/Web: usa timestamp persistido no localStorage para calcular o tempo decorrido
 */

import { Capacitor } from '@capacitor/core';

const STORAGE_KEY = 'jwgestao-ministry-timer-start';

// Lazy-load do plugin para não quebrar o build web
async function getForegroundService() {
    if (Capacitor.getPlatform() !== 'android') return null;
    try {
        const { ForegroundService } = await import(
            '@capawesome-team/capacitor-android-foreground-service'
        );
        return ForegroundService;
    } catch {
        return null;
    }
}

async function getLocalNotifications() {
    if (Capacitor.isNativePlatform()) {
        try {
            const { LocalNotifications } = await import('@capacitor/local-notifications');
            return LocalNotifications;
        } catch {
            return null;
        }
    }
    return null;
}

/** Retorna quantos segundos se passaram desde que o timer foi iniciado */
export function getElapsedSeconds(): number {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return 0;
    return Math.max(0, Math.floor((Date.now() - parseInt(saved, 10)) / 1000));
}

/** Verifica se há um timer salvo em execução */
export function hasActiveTimer(): boolean {
    return !!localStorage.getItem(STORAGE_KEY);
}

/** Inicia o timer — persiste o timestamp e ativa o foreground service no Android */
export async function startNativeTimer(): Promise<void> {
    localStorage.setItem(STORAGE_KEY, Date.now().toString());

    const platform = Capacitor.getPlatform();

    if (platform === 'android') {
        const svc = await getForegroundService();
        if (svc) {
            try {
                await svc.requestPermissions();
                await svc.startForegroundService({
                    id: 101,
                    title: 'Serviço de Campo Ativo',
                    body: 'Seu tempo está sendo registrado',
                    smallIcon: 'ic_launcher_foreground',
                    buttons: [{ title: 'Abrir App', id: 1 }],
                });
            } catch (e) {
                console.warn('[MinistryTimer] ForegroundService indisponível:', e);
            }
        }
    } else if (platform === 'ios') {
        // iOS: agenda uma notificação local após 1h como lembrete
        const ln = await getLocalNotifications();
        if (ln) {
            try {
                await ln.requestPermissions();
                await ln.schedule({
                    notifications: [
                        {
                            id: 1001,
                            title: 'Serviço em andamento',
                            body: 'Não esqueça de encerrar o cronômetro quando terminar!',
                            schedule: { at: new Date(Date.now() + 60 * 60 * 1000) },
                        },
                    ],
                });
            } catch (e) {
                console.warn('[MinistryTimer] LocalNotifications indisponível:', e);
            }
        }
    }
}

/** Para o timer — remove o timestamp e para o foreground service no Android */
export async function stopNativeTimer(): Promise<number> {
    const elapsed = getElapsedSeconds();
    localStorage.removeItem(STORAGE_KEY);

    const platform = Capacitor.getPlatform();

    if (platform === 'android') {
        const svc = await getForegroundService();
        if (svc) {
            try {
                await svc.stopForegroundService();
            } catch (e) {
                console.warn('[MinistryTimer] Erro ao parar ForegroundService:', e);
            }
        }
    } else if (platform === 'ios') {
        const ln = await getLocalNotifications();
        if (ln) {
            try {
                await ln.cancel({ notifications: [{ id: 1001 }] });
            } catch {
                // Ignora erro ao cancelar notificação
            }
        }
    }

    const hours = elapsed / 3600;
    return Math.round(hours * 100) / 100;
}
