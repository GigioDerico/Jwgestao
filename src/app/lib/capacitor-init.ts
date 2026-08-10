import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';

// WebView do Android inclui "; wv)" no user-agent — detecta o app nativo
// mesmo quando a bridge do Capacitor ainda não foi injetada na página
// remota (server.url), o que faz isNativePlatform() retornar false.
function isAndroidWebView(): boolean {
    const ua = navigator.userAgent || '';
    return /Android/i.test(ua) && /; wv\)/i.test(ua);
}

async function configureStatusBar(): Promise<void> {
    try {
        await StatusBar.setOverlaysWebView({ overlay: true });

        // Style.Dark = ícones claros, para o fundo azul escuro
        await StatusBar.setStyle({ style: Style.Dark });

        // Set the status bar background to the sidebar/header dark blue
        await StatusBar.setBackgroundColor({ color: '#082c45' });
    } catch (error) {
        console.warn('[capacitor-init] Failed to configure StatusBar:', error);
    }
}

/**
 * Initializes Capacitor native plugins.
 * Must be called once at app startup (before React render).
 * Gracefully no-ops when running in a regular browser.
 */
export async function initCapacitorPlugins(): Promise<void> {
    if (Capacitor.isNativePlatform() || isAndroidWebView()) {
        // CSS global usa esta classe pra reservar a área da status bar
        // (Android 15+ força edge-to-edge; header ficava atrás do relógio)
        document.documentElement.classList.add('cap-native');
    }

    if (Capacitor.isNativePlatform()) {
        await configureStatusBar();
        return;
    }

    // Bridge pode ser injetada depois do carregamento da página remota:
    // tenta de novo por alguns segundos antes de desistir.
    for (const delay of [250, 1000, 3000]) {
        await new Promise((resolve) => setTimeout(resolve, delay));
        if (Capacitor.isNativePlatform()) {
            document.documentElement.classList.add('cap-native');
            await configureStatusBar();
            return;
        }
    }
}
