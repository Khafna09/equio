import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/authContextValue';
import { authApi } from '../../api/auth.api';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Mail, Lock } from 'lucide-react';
import { motion } from 'framer-motion';
import { useI18n } from '../../i18n/i18nContextValue';
import { getApiErrorMessage } from '../../utils/apiError';

export function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const { t } = useI18n();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const response = await authApi.signIn({ email, password });
      login(response);
      navigate('/');
    } catch (error: unknown) {
      setError(getApiErrorMessage(error, t('auth.signInError')));
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

          <form onSubmit={handleSubmit} className="space-y-5">
            <Input
              label={t('auth.email')}
              type="email"
              autoComplete="email"
              icon={<Mail className="w-5 h-5" />}
              placeholder="name@example.com"
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
              <div className="p-3 rounded-xl bg-tertiary-50 text-tertiary-600 text-sm font-medium">
                {error}
              </div>
            )}

            <Button type="submit" variant="primary" className="w-full" isLoading={isLoading}>
              {t('auth.signIn')}
            </Button>
          </form>

          <p className="mt-8 text-center text-sm text-neutral-600">
            {t('auth.noAccount')}{' '}
            <Link to="/register" className="font-semibold text-primary-600 hover:text-primary-500">
              {t('auth.signUpHere')}
            </Link>
          </p>
        </motion.div>
      </div>

      <div className="hidden lg:block relative w-0 flex-1 bg-neutral-50 dark:bg-neutral-900">
        <div className="absolute inset-0 h-full w-full object-cover p-8">
          <div className="w-full h-full rounded-3xl bg-primary-600 overflow-hidden relative flex flex-col items-center justify-center text-center p-12">
            <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary-400 via-primary-600 to-primary-900 opacity-80" />
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
