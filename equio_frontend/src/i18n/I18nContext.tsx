import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { translations, type AppLanguage } from './translations';
import { I18nContext, type I18nContextValue } from './i18nContextValue';
import { getLocalStorageItem, setLocalStorageItem } from '../utils/browserStorage';
import { useAuth } from '../contexts/authContextValue';

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
  const { user } = useAuth();
  const accountKey = `${user?.id ?? 'guest'}:${user?.language ?? ''}`;
  const [selection, setSelection] = useState(() => {
    const stored = getLocalStorageItem('equio_language');
    const language: AppLanguage = user?.language === 'es' || user?.language === 'en'
      ? user.language : stored === 'es' || stored === 'en' ? stored : getBrowserLanguage();
    return { accountKey, language };
  });
  let { language } = selection;

  // Reset the preference with the account, before rendering another account's views.
  if (selection.accountKey !== accountKey) {
    language = user?.language === 'es' || user?.language === 'en' ? user.language : selection.language;
    setSelection({ accountKey, language });
  }

  const setLanguage = useCallback((nextLanguage: AppLanguage) => {
    setSelection({ accountKey, language: nextLanguage });
  }, [accountKey]);

  useEffect(() => {
    setLocalStorageItem('equio_language', language);
    document.documentElement.lang = language;
  }, [language]);

  const value = useMemo<I18nContextValue>(() => ({
    language,
    setLanguage,
    t: (key, params) => {
      const current = resolveTranslation(language, key) ?? resolveTranslation('es', key) ?? key;
      return interpolate(current, params);
    },
  }), [language, setLanguage]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}
