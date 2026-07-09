import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';

/**
 * Initializes Capacitor native plugins.
 * Must be called once at app startup (before React render).
 * Gracefully no-ops when running in a regular browser.
 */
export async function initCapacitorPlugins(): Promise<void> {
    if (!Capacitor.isNativePlatform()) {
        return;
    }

    try {
        // WebView abaixo da status bar — Android não aplica safe-area-inset,
        // então overlay faria o header ficar atrás do relógio/bateria
        await StatusBar.setOverlaysWebView({ overlay: false });

        // Style.Dark = ícones claros, para o fundo azul escuro
        await StatusBar.setStyle({ style: Style.Dark });

        // Set the status bar background to the sidebar/header dark blue
        await StatusBar.setBackgroundColor({ color: '#082c45' });
    } catch (error) {
        console.warn('[capacitor-init] Failed to configure StatusBar:', error);
    }
}
