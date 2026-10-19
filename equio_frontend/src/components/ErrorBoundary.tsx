import React from 'react';
import { translations, type AppLanguage } from '../i18n/translations';
import { getLocalStorageItem } from '../utils/browserStorage';

interface State {
  hasError: boolean;
  error: Error | null;
}

interface Props {
  children: React.ReactNode;
}

function getStoredLanguage(): AppLanguage {
  const stored = getLocalStorageItem('equio_language');
  return stored === 'en' ? 'en' : 'es';
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, info);
  }

  render() {
    if (this.state.hasError) {
      const t = translations[getStoredLanguage()].components;

      return (
        <div className="min-h-screen flex items-center justify-center bg-neutral-50 dark:bg-neutral-900 p-8">
          <div className="text-center max-w-md">
            <div className="w-16 h-16 bg-tertiary-50 text-tertiary-500 dark:bg-tertiary-950/35 dark:text-tertiary-300 rounded-full flex items-center justify-center mx-auto mb-6 text-3xl">
              {"\u26A0\uFE0F"}
            </div>
            <h1 className="text-2xl font-bold text-neutral-900 dark:text-white mb-2">{t.errorTitle}</h1>
            <p className="text-neutral-500 dark:text-neutral-400 mb-6">{t.errorMessage}</p>
            {this.state.error && (
              <details className="mb-6 text-left bg-neutral-100 dark:bg-neutral-800 rounded-2xl p-4">
                <summary className="text-sm font-medium text-neutral-600 cursor-pointer">
                  {t.errorDetails}
                </summary>
                <pre className="mt-2 text-xs text-tertiary-600 overflow-auto">
                  {this.state.error.message}
                </pre>
              </details>
            )}
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-3 bg-primary-500 text-white rounded-xl font-semibold hover:bg-primary-600 transition-colors"
            >
              {t.reloadPage}
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
