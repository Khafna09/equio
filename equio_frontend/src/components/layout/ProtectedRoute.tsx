import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../contexts/authContextValue';
import { useI18n } from '../../i18n/i18nContextValue';
import { AppLayout } from './AppLayout';

export function ProtectedRoute() {
  const { isAuthenticated, isLoading } = useAuth();
  const { t } = useI18n();

  if (isLoading) {
    return (
      <div className="min-h-screen grid place-items-center bg-neutral-50 dark:bg-neutral-950">
        <p role="status" className="text-sm text-neutral-500">
          {t('common.loading')}
        </p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <AppLayout>
      <Outlet />
    </AppLayout>
  );
}
