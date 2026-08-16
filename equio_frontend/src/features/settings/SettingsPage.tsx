import { useState } from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../components/ui/Tabs';
import { useAuth } from '../../contexts/authContextValue';
import { useProfile } from '../../hooks/useProfile';
import { AnimatedThemeToggler } from '../../components/ui/animated-theme-toggler';
import { CategoriesManager } from '../categories/CategoriesManager';
import { Save, User, LayoutGrid } from 'lucide-react';
import { useI18n } from '../../i18n/i18nContextValue';
import type { ProfileRequest, ProfileResponse } from '../../api/profile.api';
import { getApiErrorMessage } from '../../utils/apiError';

export function SettingsPage() {
  const profileState = useProfile();
  const { t } = useI18n();
  if (!profileState.profile) {
    return <div className="py-12 text-center text-neutral-500">{t('common.loading')}</div>;
  }

  const profile = profileState.profile;
  const key = profile.id;
  return (
    <SettingsPageContent
      key={key}
      profile={profile}
      updateProfile={profileState.updateProfile}

    />
  );
}

interface SettingsPageContentProps {
  profile: ProfileResponse;
  updateProfile: (data: ProfileRequest) => Promise<ProfileResponse>;

}

function SettingsPageContent({ profile, updateProfile }: SettingsPageContentProps) {
  const { user } = useAuth();
  const { t, setLanguage: setAppLanguage } = useI18n();
  const [firstName, setFirstName] = useState(profile.firstName || '');
  const [lastName, setLastName] = useState(profile.lastName || '');
  const [language, setLanguage] = useState(profile.language || 'es');
  const [currency, setCurrency] = useState(profile.currency || 'PEN');
  const [theme, setTheme] = useState(profile.theme || 'light');
  const [timeFormat, setTimeFormat] = useState<'12' | '24'>(profile.timeFormat || '24');
  const [isSavingPersonal, setIsSavingPersonal] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanFirstName = firstName.trim();
    const cleanLastName = lastName.trim();
    const validName = /^[\p{L}\p{M} .'-]+$/u;
    if (!cleanFirstName || !cleanLastName
        || !validName.test(cleanFirstName)
        || !validName.test(cleanLastName)) {
      setSaveError(t('common.invalidForm'));
      return;
    }

    setSaveError(null);
    setIsSavingPersonal(true);
    try {
      await updateProfile({ firstName: cleanFirstName, lastName: cleanLastName });
      setFirstName(cleanFirstName);
      setLastName(cleanLastName);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (error: unknown) {
      setSaveError(getApiErrorMessage(error, t('settings.saveError')));
    } finally {
      setIsSavingPersonal(false);
    }
  };

  const persistPreference = async (data: ProfileRequest) => {
    try {
      setSaveError(null);
      await updateProfile(data);
      return true;
    } catch (error: unknown) {
      setSaveError(getApiErrorMessage(error, t('settings.saveError')));
      return false;
    }
  };

  const handleThemeChange = (newTheme: 'light' | 'dark') => {
    const previousTheme = theme;
    setTheme(newTheme);
    document.documentElement.classList.toggle('dark', newTheme === 'dark');
    void persistPreference({ theme: newTheme }).then((saved) => {
      if (saved) return;
      setTheme(previousTheme);
      document.documentElement.classList.toggle('dark', previousTheme === 'dark');
    });
  };

  const handleLanguageChange = (value: string) => {
    if (value !== 'es' && value !== 'en') return;
    const previousLanguage = language === 'en' ? 'en' : 'es';
    setLanguage(value);
    setAppLanguage(value);
    void persistPreference({ language: value }).then((saved) => {
      if (saved) return;
      setLanguage(previousLanguage);
      setAppLanguage(previousLanguage);
    });
  };

  const handleCurrencyChange = (value: string) => {
    const previousCurrency = currency;
    setCurrency(value);
    void persistPreference({ currency: value }).then((saved) => {
      if (!saved) setCurrency(previousCurrency);
    });
  };

  const handleTimeFormatChange = (value: string) => {
    if (value !== '12' && value !== '24') return;
    const previousTimeFormat = timeFormat;
    setTimeFormat(value);
    void persistPreference({ timeFormat: value }).then((saved) => {
      if (!saved) setTimeFormat(previousTimeFormat);
    });
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
            {saveError ? (
              <div className="mb-5 rounded-lg bg-rose-50 p-3 text-sm text-rose-700 dark:bg-rose-950/30 dark:text-rose-300">
                {saveError}
              </div>
            ) : null}
            <form onSubmit={handleSaveProfile} className="space-y-8">
              <div>
                <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-4">{t('settings.personalData')}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input label={t('auth.firstName')} value={firstName} onChange={(e) => setFirstName(e.target.value)} maxLength={50} required />
                  <Input label={t('auth.lastName')} value={lastName} onChange={(e) => setLastName(e.target.value)} maxLength={50} required />
                </div>
                <div className="mt-4 p-4 bg-neutral-50 dark:bg-neutral-800 rounded-xl border border-neutral-100 dark:border-neutral-700">
                  <p className="font-medium text-neutral-900 dark:text-white mb-1">{t('settings.email')}</p>
                  <p className="text-neutral-500 dark:text-neutral-400">{user?.email}</p>
                  <p className="text-xs text-neutral-400 mt-2">{t('settings.emailLocked')}</p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-neutral-100 dark:border-neutral-800">
                {savedSuccess && (
                  <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-3 py-1.5 rounded-lg border border-emerald-200 dark:border-emerald-800">
                    {t('settings.changesSaved')}
                  </span>
                )}
                <Button type="submit" variant="primary" disabled={isSavingPersonal} className="flex items-center gap-2">
                  <Save className="w-4 h-4" />
                  {isSavingPersonal ? t('settings.saving') : t('settings.savePersonalDetails')}
                </Button>
              </div>
            </form>
              <div className="pt-8 mt-8 border-t border-neutral-100 dark:border-neutral-800">
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
                        onChange={handleCurrencyChange}
                        options={[
                          { value: 'PEN', label: 'Soles (S/.)' },
                          { value: 'USD', label: 'US Dollars ($)' },
                          { value: 'EUR', label: 'Euros (€)' },
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

                  <div className="flex items-center justify-between p-4 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl gap-4">
                    <div>
                      <p className="font-medium text-neutral-900 dark:text-white">{t('settings.timeFormat')}</p>
                      <p className="text-sm text-neutral-500 dark:text-neutral-400">{t('settings.timeFormatHint')}</p>
                    </div>
                    <div className="w-44">
                      <Select
                        value={timeFormat}
                        onChange={handleTimeFormatChange}
                        options={[
                          { value: '24', label: t('settings.timeFormat24') },
                          { value: '12', label: t('settings.timeFormat12') },
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
