import { Capacitor } from '@capacitor/core';

const DEFAULT_PUBLIC_APP_URL = 'https://jwgestao.vercel.app';
const configuredPublicAppUrl = import.meta.env.VITE_PUBLIC_APP_URL?.trim();

function normalizeOrigin(value: string) {
  return value.replace(/\/+$/, '');
}

export interface PublicOriginEnvironment {
  configured?: string;
  production: boolean;
  native: boolean;
  windowOrigin?: string;
}

export function getPublicAppOriginForEnvironment(environment: PublicOriginEnvironment) {
  const configured = environment.configured?.trim();
  if (configured) return normalizeOrigin(configured);
  if (environment.production || environment.native) return DEFAULT_PUBLIC_APP_URL;
  if (environment.windowOrigin) return normalizeOrigin(environment.windowOrigin);
  return DEFAULT_PUBLIC_APP_URL;
}

export function getPublicAppOrigin() {
  return getPublicAppOriginForEnvironment({
    configured: configuredPublicAppUrl,
    production: import.meta.env.PROD,
    native: Capacitor.isNativePlatform(),
    windowOrigin: typeof window !== 'undefined' ? window.location?.origin : undefined,
  });
}

export function buildPublicAppUrl(path: string) {
  const origin = getPublicAppOrigin();
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${origin}${normalizedPath}`;
}
