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
        // Make the WebView extend behind the status bar
        await StatusBar.setOverlaysWebView({ overlay: true });

        // Dark icons on light backgrounds, light icons on dark backgrounds
        await StatusBar.setStyle({ style: Style.Light });

        // Set the status bar background to the sidebar/header dark blue
        await StatusBar.setBackgroundColor({ color: '#082c45' });
    } catch (error) {
        console.warn('[capacitor-init] Failed to configure StatusBar:', error);
    }
}
