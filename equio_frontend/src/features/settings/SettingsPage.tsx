import { useState, useEffect } from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../components/ui/Tabs';
import { useAuth } from '../../contexts/AuthContext';
import { useProfile } from '../../hooks/useProfile';
import { AnimatedThemeToggler } from '../../components/ui/animated-theme-toggler';
import { CategoriesManager } from '../categories/CategoriesManager';
import { Save, User, LayoutGrid } from 'lucide-react';
import { useI18n } from '../../i18n/I18nContext';

export function SettingsPage() {
  const { user } = useAuth();
  const { profile, updateProfile, isUpdating } = useProfile();
  const { t, setLanguage: setAppLanguage } = useI18n();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [language, setLanguage] = useState('es');
  const [currency, setCurrency] = useState('PEN');
  const [theme, setTheme] = useState('light');
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    if (profile) {
      setFirstName(profile.firstName || '');
      setLastName(profile.lastName || '');
      setLanguage(profile.language || 'es');
      setCurrency(profile.currency || 'PEN');
      setTheme(profile.theme || 'light');
      document.documentElement.classList.toggle('dark', profile.theme === 'dark');
    }
  }, [profile]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateProfile({ firstName, lastName, language, currency, theme });
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch {
      alert(t('settings.saveError'));
    }
  };

  const handleThemeChange = async (newTheme: string) => {
    setTheme(newTheme);
    document.documentElement.classList.toggle('dark', newTheme === 'dark');
    try {
      await updateProfile({ firstName, lastName, language, currency, theme: newTheme });
    } catch (error) {
      console.error('Error saving theme preference', error);
    }
  };

  const handleLanguageChange = (value: string) => {
    setLanguage(value);
    if (value === 'es' || value === 'en') {
      setAppLanguage(value);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-bold text-neutral-900 dark:text-white tracking-tight mb-2">{t('settings.title')}</h1>
        <p className="text-neutral-500 dark:text-neutral-400">{t('settings.subtitle')}</p>
      </div>

      <Tabs defaultValue="profile" className="max-w-3xl">
        <TabsList className="mb-8">
          <TabsTrigger value="profile" className="flex items-center gap-2">
            <User className="w-4 h-4" /> {t('settings.profileTab')}
          </TabsTrigger>
          <TabsTrigger value="categories" className="flex items-center gap-2">
            <LayoutGrid className="w-4 h-4" /> {t('settings.categoriesTab')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <Card className="p-8 bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800">
            <form onSubmit={handleSaveProfile} className="space-y-8">
              <div>
                <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-4">{t('settings.personalData')}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input label={t('auth.firstName')} value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
                  <Input label={t('auth.lastName')} value={lastName} onChange={(e) => setLastName(e.target.value)} required />
                </div>
                <div className="mt-4 p-4 bg-neutral-50 dark:bg-neutral-800 rounded-xl border border-neutral-100 dark:border-neutral-700">
                  <p className="font-medium text-neutral-900 dark:text-white mb-1">{t('settings.email')}</p>
                  <p className="text-neutral-500 dark:text-neutral-400">{user?.email}</p>
                  <p className="text-xs text-neutral-400 mt-2">{t('settings.emailLocked')}</p>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-4">{t('settings.preferences')}</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl gap-4">
                    <div>
                      <p className="font-medium text-neutral-900 dark:text-white">{t('settings.currency')}</p>
                      <p className="text-sm text-neutral-500 dark:text-neutral-400">{t('settings.currencyHint')}</p>
                    </div>
                    <div className="w-44">
                      <Select
                        value={currency}
                        onChange={(val) => setCurrency(val)}
                        options={[
                          { value: 'PEN', label: 'Soles (S/.)' },
                          { value: 'USD', label: 'US Dollars ($)' },
                          { value: 'EUR', label: 'Euros (?)' },
                          { value: 'MXN', label: 'Mexican Pesos ($)' },
                          { value: 'COP', label: 'Colombian Pesos ($)' },
                          { value: 'CLP', label: 'Chilean Pesos ($)' },
                        ]}
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl gap-4">
                    <div>
                      <p className="font-medium text-neutral-900 dark:text-white">{t('settings.language')}</p>
                      <p className="text-sm text-neutral-500 dark:text-neutral-400">{t('settings.languageHint')}</p>
                    </div>
                    <div className="w-44">
                      <Select
                        value={language}
                        onChange={handleLanguageChange}
                        options={[
                          { value: 'es', label: t('settings.spanish') },
                          { value: 'en', label: t('settings.english') },
                        ]}
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl">
                    <div>
                      <p className="font-medium text-neutral-900 dark:text-white">{t('settings.appearance')}</p>
                      <p className="text-sm text-neutral-500 dark:text-neutral-400">{t('settings.appearanceHint')}</p>
                    </div>
                    <AnimatedThemeToggler theme={theme as 'light' | 'dark'} onThemeChange={handleThemeChange} variant="circle" />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-neutral-100 dark:border-neutral-800">
                {savedSuccess && (
                  <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-3 py-1.5 rounded-lg border border-emerald-200 dark:border-emerald-800">
                    {t('settings.changesSaved')}
                  </span>
                )}
                <Button type="submit" variant="primary" disabled={isUpdating} className="flex items-center gap-2">
                  <Save className="w-4 h-4" />
                  {isUpdating ? t('settings.saving') : t('settings.saveChanges')}
                </Button>
              </div>
            </form>
          </Card>
        </TabsContent>

        <TabsContent value="categories">
          <Card className="p-8 bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800">
            <CategoriesManager />
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
