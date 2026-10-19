import { useState } from 'react';
import { Link } from 'react-router-dom';
import { authApi } from '../../api/auth.api';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Mail, Lock, User } from 'lucide-react';
import { motion } from 'framer-motion';
import { useI18n } from '../../i18n/i18nContextValue';
import { getApiErrorMessage } from '../../utils/apiError';

export function RegisterPage() {
  const { t } = useI18n();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await authApi.signUp({ firstName, lastName, email, password });
      setPassword('');
      setSubmitted(true);
    } catch (error: unknown) {
      setError(getApiErrorMessage(error, t('auth.registerError'), t));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-row-reverse">
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

          <h1 className="text-3xl font-bold text-neutral-900 dark:text-white tracking-tight mb-2">{t('auth.createAccount')}</h1>
          <p className="text-neutral-500 dark:text-neutral-400 mb-8">{t('auth.registerSubtitle')}</p>

          {submitted ? (
            <div className="space-y-4">
              <p role="status" className="text-sm text-neutral-700 dark:text-neutral-200">{t('auth.registrationProcessed')}</p>
              <Link to="/login" className="block text-center py-3 bg-primary-500 hover:bg-primary-600 text-white rounded-lg font-semibold">{t('auth.signIn')}</Link>
            </div>
          ) : <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Input
                label={t('auth.firstName')}
                icon={<User className="w-5 h-5" />}
                placeholder={t('auth.firstNamePlaceholder')}
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                maxLength={50}
                required
              />
              <Input
                label={t('auth.lastName')}
                placeholder={t('auth.lastNamePlaceholder')}
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                maxLength={50}
                required
              />
            </div>
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
              autoComplete="new-password"
              icon={<Lock className="w-5 h-5" />}
              placeholder="********"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={12}
              maxLength={128}
            />

            {error && (
              <div className="p-3 rounded-xl bg-tertiary-50 text-tertiary-600 dark:bg-tertiary-950/35 dark:text-tertiary-300 text-sm font-medium">
                {error}
              </div>
            )}

            <Button type="submit" variant="primary" className="w-full" isLoading={isLoading}>
              {t('auth.signUp')}
            </Button>
          </form>}

          <p className="mt-8 text-center text-sm text-neutral-600 dark:text-neutral-300">
            {t('auth.alreadyHaveAccount')}{' '}
            <Link to="/login" className="font-semibold text-primary-600 hover:text-primary-500 dark:text-primary-300 dark:hover:text-primary-200">
              {t('auth.signInHere')}
            </Link>
          </p>
        </motion.div>
      </div>

      <div className="hidden lg:block relative w-0 flex-1 bg-neutral-50 dark:bg-neutral-900">
        <div className="absolute inset-0 h-full w-full object-cover p-8">
          <div className="w-full h-full rounded-3xl bg-secondary-600 dark:bg-neutral-800 overflow-hidden relative flex flex-col items-center justify-center text-center p-12 border border-secondary-500/20 dark:border-secondary-800">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2, duration: 0.6 }}
              className="relative z-10 max-w-md"
            >
              <h2 className="text-4xl font-bold text-white mb-6 leading-tight">{t('auth.freedomTitle')}</h2>
              <p className="text-secondary-100 text-lg">{t('auth.freedomSubtitle')}</p>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
