const STORE_URL_KEY = 'suporte_store_url';
const STORE_COMPANY_ID_KEY = 'suporte_store_company_id';

const isBrowser = typeof window !== 'undefined' && typeof document !== 'undefined';

const normalizeUrl = (rawUrl: string): string | null => {
  if (!rawUrl) return null;
  const trimmed = rawUrl.trim();
  if (!trimmed) return null;
  try {
    const url = trimmed.startsWith('http://') || trimmed.startsWith('https://')
      ? new URL(trimmed)
      : new URL(`https://${trimmed}`);
    return url.origin;
  } catch {
    return null;
  }
};

const extractHost = (rawUrl: string): string | null => {
  const normalized = normalizeUrl(rawUrl);
  if (!normalized) return null;
  try {
    const url = new URL(normalized);
    return url.host.replace(/^www\./, '').toLowerCase();
  } catch {
    return null;
  }
};

const getFromQueryString = (): string | null => {
  if (!isBrowser) return null;
  const params = new URLSearchParams(window.location.search);
  const candidate =
    params.get('storeUrl') ||
    params.get('store') ||
    params.get('loja') ||
    params.get('company') ||
    params.get('companyUrl');
  return candidate ? normalizeUrl(candidate) : null;
};

const getFromReferrer = (): string | null => {
  if (!isBrowser || !document.referrer) return null;
  try {
    const refUrl = new URL(document.referrer);
    if (refUrl.host === window.location.host) {
      return null;
    }
    return refUrl.origin;
  } catch {
    return null;
  }
};

const setItem = (key: string, value: string | null) => {
  if (!isBrowser) return;
  if (!value) {
    window.localStorage.removeItem(key);
    return;
  }
  window.localStorage.setItem(key, value);
};

const getItem = (key: string): string | null => {
  if (!isBrowser) return null;
  return window.localStorage.getItem(key);
};

const detectAndStoreContext = (): string | null => {
  if (!isBrowser) return null;
  const existing = getItem(STORE_URL_KEY);
  const fromQuery = getFromQueryString();
  const fromReferrer = getFromReferrer();

  const finalUrl = fromQuery || fromReferrer || existing;
  if (finalUrl && finalUrl !== existing) {
    setItem(STORE_URL_KEY, finalUrl);
  }
  return finalUrl;
};

export const storeContext = {
  detectAndStoreContext,
  getStoredStoreUrl: () => getItem(STORE_URL_KEY),
  setStoredStoreUrl: (url: string | null) => setItem(STORE_URL_KEY, url),
  getStoredCompanyId: () => getItem(STORE_COMPANY_ID_KEY),
  setStoredCompanyId: (companyId: string | null) => setItem(STORE_COMPANY_ID_KEY, companyId),
  clear: () => {
    setItem(STORE_URL_KEY, null);
    setItem(STORE_COMPANY_ID_KEY, null);
  },
  extractHost,
};

export type StoreContext = {
  storeUrl?: string | null;
  companyId?: string | null;
};



