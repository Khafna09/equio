import { lazy, Suspense } from 'react';
import { LoaderCircle } from 'lucide-react';
import { Route, Routes } from 'react-router-dom';
import { ProtectedRoute } from './components/layout/ProtectedRoute';
import { AuthProvider } from './contexts/AuthContext';
import { I18nProvider } from './i18n/I18nContext';
import { useI18n } from './i18n/i18nContextValue';

const LoginPage = lazy(() => import('./features/auth/LoginPage')
  .then((module) => ({ default: module.LoginPage })));
const RegisterPage = lazy(() => import('./features/auth/RegisterPage')
  .then((module) => ({ default: module.RegisterPage })));
const BudgetsPage = lazy(() => import('./features/budgets/BudgetsPage')
  .then((module) => ({ default: module.BudgetsPage })));
const DashboardPage = lazy(() => import('./features/dashboard/DashboardPage')
  .then((module) => ({ default: module.DashboardPage })));
const NotFoundPage = lazy(() => import('./features/errors/NotFoundPage')
  .then((module) => ({ default: module.NotFoundPage })));
const HistoryPage = lazy(() => import('./features/history/HistoryPage')
  .then((module) => ({ default: module.HistoryPage })));
const SavingsPage = lazy(() => import('./features/savings/SavingsPage')
  .then((module) => ({ default: module.SavingsPage })));
const SettingsPage = lazy(() => import('./features/settings/SettingsPage')
  .then((module) => ({ default: module.SettingsPage })));

function RouteFallback() {
  const { t } = useI18n();
  return (
    <div
      className="flex min-h-screen items-center justify-center"
      role="status"
      aria-label={t('common.loading')}
    >
      <LoaderCircle className="h-6 w-6 animate-spin text-primary-500" aria-hidden="true" />
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <I18nProvider>
        <Suspense fallback={<RouteFallback />}>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route element={<ProtectedRoute />}>
              <Route path="/" element={<DashboardPage />} />
              <Route path="/budgets" element={<BudgetsPage />} />
              <Route path="/savings" element={<SavingsPage />} />
              <Route path="/history" element={<HistoryPage />} />
              <Route path="/settings" element={<SettingsPage />} />
            </Route>
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </Suspense>
      </I18nProvider>
    </AuthProvider>
  );
}

export default App;
