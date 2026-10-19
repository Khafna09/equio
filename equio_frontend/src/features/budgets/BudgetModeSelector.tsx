import { useI18n } from '../../i18n/i18nContextValue';

interface BudgetModeSelectorProps {
  advanced: boolean;
  disabled?: boolean;
  onChange: (advanced: boolean) => void;
}

export function BudgetModeSelector({ advanced, disabled = false, onChange }: BudgetModeSelectorProps) {
  const { t } = useI18n();
  return (
    <div className="flex items-center gap-3 rounded-lg border border-neutral-100 bg-white px-4 py-2 shadow-sm dark:border-neutral-700 dark:bg-neutral-800">
      <span className={`text-sm font-medium ${!advanced ? 'text-neutral-900 dark:text-white' : 'text-neutral-400'}`}>
        {t('budgets.normalMode')}
      </span>
      <button
        type="button"
        onClick={() => onChange(!advanced)}
        disabled={disabled}
        aria-pressed={advanced}
        aria-label={t('budgets.advancedMode')}
        className={`relative h-6 w-11 rounded-full shadow-inner transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${advanced ? 'bg-primary-500' : 'bg-neutral-200 dark:bg-neutral-700'}`}
      >
        <span className={`absolute left-1 top-1 h-4 w-4 rounded-full bg-white shadow-sm transition-transform dark:bg-neutral-800 ${advanced ? 'translate-x-5' : ''}`} />
      </button>
      <span className={`text-sm font-medium ${advanced ? 'text-primary-600 dark:text-primary-400' : 'text-neutral-400'}`}>
        {t('budgets.advancedMode')}
      </span>
    </div>
  );
}
