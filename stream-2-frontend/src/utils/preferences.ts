export type AppLanguage = 'en' | 'zh';

export const AUTH_TOKEN_KEY = 'authToken';
export const KEEP_SIGNED_IN_KEY = 'keepSignedIn';
export const APP_LANGUAGE_KEY = 'appLanguage';

const isBrowser = () => typeof window !== 'undefined';

export const getKeepSignedInPreference = (): boolean => {
  if (!isBrowser()) {
    return true;
  }
  const raw = localStorage.getItem(KEEP_SIGNED_IN_KEY);
  if (raw === null) {
    return true;
  }
  return raw === 'true';
};

export const setKeepSignedInPreference = (value: boolean): void => {
  if (!isBrowser()) {
    return;
  }
  localStorage.setItem(KEEP_SIGNED_IN_KEY, value ? 'true' : 'false');
};

export const getStoredAuthToken = (): string | null => {
  if (!isBrowser()) {
    return null;
  }
  return localStorage.getItem(AUTH_TOKEN_KEY) ?? sessionStorage.getItem(AUTH_TOKEN_KEY);
};

export const persistAuthToken = (token: string, keepSignedIn: boolean): void => {
  if (!isBrowser()) {
    return;
  }
  if (keepSignedIn) {
    localStorage.setItem(AUTH_TOKEN_KEY, token);
    sessionStorage.removeItem(AUTH_TOKEN_KEY);
  } else {
    sessionStorage.setItem(AUTH_TOKEN_KEY, token);
    localStorage.removeItem(AUTH_TOKEN_KEY);
  }
};

export const clearStoredAuthToken = (): void => {
  if (!isBrowser()) {
    return;
  }
  localStorage.removeItem(AUTH_TOKEN_KEY);
  sessionStorage.removeItem(AUTH_TOKEN_KEY);
};

export const moveStoredAuthToken = (keepSignedIn: boolean): void => {
  const token = getStoredAuthToken();
  if (!token) {
    return;
  }
  persistAuthToken(token, keepSignedIn);
};

export const getSavedLanguage = (): AppLanguage => {
  if (!isBrowser()) {
    return 'en';
  }
  const raw = localStorage.getItem(APP_LANGUAGE_KEY);
  return raw === 'zh' ? 'zh' : 'en';
};

export const setSavedLanguage = (language: AppLanguage): void => {
  if (!isBrowser()) {
    return;
  }
  localStorage.setItem(APP_LANGUAGE_KEY, language);
};