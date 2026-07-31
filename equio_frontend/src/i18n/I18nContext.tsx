import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { translations, type AppLanguage } from './translations';

type TranslationLeaf = string;

interface I18nContextType {
  language: AppLanguage;
  setLanguage: (language: AppLanguage) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

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

    const stored = localStorage.getItem('equio_language');
    if (stored === 'es' || stored === 'en') {
      return stored;
    }

    try {
      const rawUser = localStorage.getItem('user');
      if (rawUser) {
        const user = JSON.parse(rawUser);
        if (user?.language === 'es' || user?.language === 'en') {
          return user.language;
        }
      }
    } catch {
      return getBrowserLanguage();
    }

    return getBrowserLanguage();
  });

  const setLanguage = (nextLanguage: AppLanguage) => {
    setLanguageState(nextLanguage);
    localStorage.setItem('equio_language', nextLanguage);
  };

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  const value = useMemo<I18nContextType>(() => ({
    language,
    setLanguage,
    t: (key, params) => {
      const current = resolveTranslation(language, key) ?? resolveTranslation('es', key) ?? key;
      return interpolate(current, params);
    },
  }), [language]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used within an I18nProvider');
  }
  return context;
}
