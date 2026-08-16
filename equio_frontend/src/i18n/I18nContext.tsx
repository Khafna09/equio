import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { translations, type AppLanguage } from './translations';
import { I18nContext, type I18nContextValue } from './i18nContextValue';
import { getLocalStorageItem, setLocalStorageItem } from '../utils/browserStorage';

type TranslationLeaf = string;

function getBrowserLanguage(): AppLanguage {
  if (typeof navigator === 'undefined') {
    return 'es';
  }

  return navigator.language.toLowerCase().startsWith('en') ? 'en' : 'es';
}

function resolveTranslation(language: AppLanguage, key: string): TranslationLeaf | undefined {
  const parts = key.split('.');
  let current: unknown = translations[language];

  for (const part of parts) {
    if (!current || typeof current !== 'object' || !(part in current)) {
      return undefined;
    }
    current = (current as Record<string, unknown>)[part];
  }

  return typeof current === 'string' ? current : undefined;
}

function interpolate(template: string, params?: Record<string, string | number>) {
  if (!params) {
    return template;
  }

  return template.replace(/\{(\w+)\}/g, (_, token: string) => String(params[token] ?? `{${token}}`));
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<AppLanguage>(() => {
    if (typeof window === 'undefined') {
      return 'es';
    }

    const stored = getLocalStorageItem('equio_language');
    if (stored === 'es' || stored === 'en') {
      return stored;
    }

    return getBrowserLanguage();
  });

  const setLanguage = (nextLanguage: AppLanguage) => {
    setLanguageState(nextLanguage);
    setLocalStorageItem('equio_language', nextLanguage);
  };

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  const value = useMemo<I18nContextValue>(() => ({
    language,
    setLanguage,
    t: (key, params) => {
      const current = resolveTranslation(language, key) ?? resolveTranslation('es', key) ?? key;
      return interpolate(current, params);
    },
  }), [language]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}
