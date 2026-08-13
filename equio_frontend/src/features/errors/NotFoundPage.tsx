import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useI18n } from '../../i18n/i18nContextValue';

export function NotFoundPage() {
  const { t } = useI18n();

  return (
    <main className="min-h-screen grid place-items-center bg-neutral-50 px-6 dark:bg-neutral-950">
      <div className="max-w-md text-center">
        <p className="text-sm font-semibold text-primary-600">404</p>
        <h1 className="mt-3 text-3xl font-bold text-neutral-950 dark:text-white">
          {t('notFound.title')}
        </h1>
        <p className="mt-3 text-neutral-600 dark:text-neutral-400">
          {t('notFound.description')}
        </p>
        <Link
          to="/"
          className="mt-7 inline-flex items-center gap-2 text-sm font-semibold text-primary-600 hover:text-primary-700"
        >
          <ArrowLeft className="h-4 w-4" />
          {t('notFound.action')}
        </Link>
      </div>
    </main>
  );
}
