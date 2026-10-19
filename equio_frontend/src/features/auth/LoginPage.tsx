import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/authContextValue';
import { authApi } from '../../api/auth.api';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Mail, Lock, RotateCw } from 'lucide-react';
import { motion } from 'framer-motion';
import { useI18n } from '../../i18n/i18nContextValue';
import { getApiErrorMessage } from '../../utils/apiError';

export function LoginPage() {
  const navigate = useNavigate();
  const { login, logout, logoutPending } = useAuth();
  const { t } = useI18n();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isRetryingLogout, setIsRetryingLogout] = useState(false);

  const retryLogout = async () => {
    setIsRetryingLogout(true);
    setError('');
    try {
      await logout();
    } catch {
      // The pending warning remains visible until the API confirms revocation.
    } finally {
      setIsRetryingLogout(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const response = await authApi.signIn({ email, password });
      login(response);
      navigate('/');
    } catch (error: unknown) {
      setError(getApiErrorMessage(error, t('auth.signInError'), t));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      <div className="flex-1 flex flex-col justify-center px-4 sm:px-6 lg:flex-none lg:w-[480px] lg:px-20 xl:px-24 bg-white dark:bg-neutral-800">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mx-auto w-full max-w-sm lg:w-96"
        >
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl bg-primary-500 flex items-center justify-center text-white font-bold text-xl shadow-sm">
              E
            </div>
            <h2 className="text-2xl font-bold text-neutral-900 dark:text-white tracking-tight">Equio</h2>
          </div>

          <h1 className="text-3xl font-bold text-neutral-900 dark:text-white tracking-tight mb-2">{t('auth.welcomeBack')}</h1>
          <p className="text-neutral-500 dark:text-neutral-400 mb-8">{t('auth.signInSubtitle')}</p>

          {logoutPending && (
            <div role="alert" className="mb-6 space-y-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
              <p>{t('auth.logoutNotConfirmed')}</p>
              <Button type="button" variant="secondary" onClick={retryLogout} isLoading={isRetryingLogout}>
                <RotateCw className="h-4 w-4" aria-hidden="true" />
                {t('auth.retryLogout')}
              </Button>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <Input
              label={t('auth.email')}
              type="email"
              autoComplete="email"
              icon={<Mail className="w-5 h-5" />}
              placeholder={t('auth.emailPlaceholder')}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              maxLength={254}
              required
            />
            <Input
              label={t('auth.password')}
              type="password"
              autoComplete="current-password"
              icon={<Lock className="w-5 h-5" />}
              placeholder="********"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              maxLength={128}
              required
            />

            {error && (
              <div className="p-3 rounded-xl bg-tertiary-50 text-tertiary-600 dark:bg-tertiary-950/35 dark:text-tertiary-300 text-sm font-medium">
                {error}
              </div>
            )}

            <Button type="submit" variant="primary" className="w-full" isLoading={isLoading} disabled={logoutPending}>
              {t('auth.signIn')}
            </Button>
          </form>

          <p className="mt-8 text-center text-sm text-neutral-600 dark:text-neutral-300">
            {t('auth.noAccount')}{' '}
            <Link to="/register" className="font-semibold text-primary-600 hover:text-primary-500 dark:text-primary-300 dark:hover:text-primary-200">
              {t('auth.signUpHere')}
            </Link>
          </p>
        </motion.div>
      </div>

      <div className="hidden lg:block relative w-0 flex-1 bg-neutral-50 dark:bg-neutral-900">
        <div className="absolute inset-0 h-full w-full object-cover p-8">
          <div className="w-full h-full rounded-3xl bg-primary-600 dark:bg-neutral-800 overflow-hidden relative flex flex-col items-center justify-center text-center p-12 border border-primary-500/20 dark:border-primary-800">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2, duration: 0.6 }}
              className="relative z-10 max-w-md"
            >
              <h2 className="text-4xl font-bold text-white mb-6 leading-tight">{t('auth.takeControl')}</h2>
              <p className="text-primary-100 text-lg">{t('auth.takeControlSubtitle')}</p>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
