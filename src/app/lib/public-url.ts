const DEFAULT_PUBLIC_APP_URL = 'https://jwgestao.vercel.app';
const configuredPublicAppUrl = import.meta.env.VITE_PUBLIC_APP_URL?.trim();

function normalizeOrigin(value: string) {
  return value.replace(/\/+$/, '');
}

export function getPublicAppOrigin() {
  if (configuredPublicAppUrl) {
    return normalizeOrigin(configuredPublicAppUrl);
  }

  if (import.meta.env.PROD) {
    return DEFAULT_PUBLIC_APP_URL;
  }

  if (typeof window !== 'undefined' && window.location?.origin) {
    return normalizeOrigin(window.location.origin);
  }

  return DEFAULT_PUBLIC_APP_URL;
}

export function buildPublicAppUrl(path: string) {
  const origin = getPublicAppOrigin();
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${origin}${normalizedPath}`;
}
