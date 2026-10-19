import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { PiggyBank, Pencil, X } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { useCurrency } from '../../hooks/useCurrency';
import { useI18n } from '../../i18n/i18nContextValue';
import type { BudgetRequest, BudgetResponse } from '../../types/budget.types';
import { getApiErrorMessage } from '../../utils/apiError';
import { MAX_MONEY_AMOUNT, parsePositiveMoney } from '../../utils/moneyInput';

interface SavingsCardProps {
  globalBudget?: BudgetResponse;
  onUpdateBudget: (input: { id: number; data: BudgetRequest }) => Promise<unknown>;
}

export function SavingsCard({ globalBudget, onUpdateBudget }: SavingsCardProps) {
  const { currency, formatCurrency } = useCurrency();
  const { t } = useI18n();

  const hasSavedSavings = globalBudget?.savingsValue != null;

  const [savingsType, setSavingsType] = useState<'PERCENTAGE' | 'FIXED'>(
    globalBudget?.savingsType || 'PERCENTAGE',
  );
  const [savingsValue, setSavingsValue] = useState(
    globalBudget?.savingsValue != null ? String(globalBudget.savingsValue) : '',
  );
  const [enabled, setEnabled] = useState(hasSavedSavings);
  const [isEditing, setIsEditing] = useState(!hasSavedSavings);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  if (!globalBudget) {
    return null;
  }

  const updateSavings = async (data: Pick<BudgetRequest, 'savingsType' | 'savingsValue'>) => {
    await onUpdateBudget({
      id: globalBudget.id,
      data: {
        name: globalBudget.name,
        totalAmount: globalBudget.totalAmount,
        isFixed: globalBudget.isFixed,
        startDate: globalBudget.startDate,
        endDate: globalBudget.endDate,
        categoryId: globalBudget.categoryId ?? undefined,
        ...data,
      },
    });
  };

  const handleToggle = async () => {
    const nextEnabled = !enabled;
    setEnabled(nextEnabled);
    if (nextEnabled) {
      if (globalBudget.savingsValue == null) {
        setIsEditing(true);
      }
      return;
    }

    setSaveError(null);
    setIsSaving(true);
    try {
      await updateSavings({ savingsType: undefined, savingsValue: undefined });
      setIsEditing(true);
      setSavingsValue('');
    } catch (error: unknown) {
      setEnabled(true);
      setSaveError(getApiErrorMessage(error, t('budgetDrawer.saveError'), t));
    } finally {
      setIsSaving(false);
    }
  };

  const handleSave = async () => {
    const parsedValue = parsePositiveMoney(savingsValue);
    const isInvalid = parsedValue === null
      || (savingsType === 'PERCENTAGE' && parsedValue > 100)
      || (savingsType === 'FIXED' && parsedValue > globalBudget.totalAmount);
    if (isInvalid) {
      setSaveError(t('common.invalidAmount'));
      return;
    }

    setSaveError(null);
    setIsSaving(true);
    try {
      await updateSavings({ savingsType, savingsValue: parsedValue });
      setIsEditing(false);
    } catch (error: unknown) {
      setSaveError(getApiErrorMessage(error, t('budgetDrawer.saveError'), t));
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelEdit = () => {
    if (globalBudget.savingsValue != null) {
      setSavingsValue(String(globalBudget.savingsValue));
      setSavingsType(globalBudget.savingsType || 'PERCENTAGE');
      setIsEditing(false);
      setSaveError(null);
    }
  };

  const parsedSavingsValue = parsePositiveMoney(savingsValue);
  const isApplied = enabled && !isEditing && hasSavedSavings;

  return (
    <Card className="p-5 md:p-6 flex flex-col justify-between h-full relative overflow-hidden bg-gradient-to-br from-white to-primary-50/20 dark:from-neutral-800 dark:to-primary-950/20 border-primary-100/50 dark:border-neutral-700">
      <div className="absolute top-0 right-0 w-32 h-32 bg-primary-100/30 dark:bg-primary-900/20 rounded-bl-full -mr-10 -mt-10 pointer-events-none" />
      <div className="flex justify-between items-center mb-4 relative z-10">
        <div className="flex items-center gap-2">
          <PiggyBank className="w-5 h-5 text-primary-500 dark:text-primary-400" />
          <h3 className="text-xl font-semibold text-neutral-900 dark:text-white">
            {t('budgets.savingsCardTitle')}
          </h3>
        </div>
        <button
          type="button"
          onClick={handleToggle}
          disabled={isSaving}
          className={`w-11 h-6 rounded-full transition-colors relative focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 shadow-inner ${enabled ? 'bg-primary-500' : 'bg-neutral-200 dark:bg-neutral-700'}`}
        >
          <span className={`absolute top-1 left-1 bg-white dark:bg-neutral-800 w-4 h-4 rounded-full shadow-sm transition-transform ${enabled ? 'translate-x-5' : ''}`} />
        </button>
      </div>

      <AnimatePresence mode="wait">
        {!enabled ? (
          <motion.div
            key="disabled"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="py-6 text-center text-neutral-500 dark:text-neutral-400 text-sm relative z-10"
          >
            {t('budgets.savingsDisabled')}
          </motion.div>
        ) : (
          <motion.div
            key="enabled"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-4 relative z-10"
          >
            {/* Selector de Tipo (Porcentaje o Monto Fijo) */}
            <div className={`flex items-center gap-2 p-1 bg-neutral-100 dark:bg-neutral-900 rounded-xl transition-all duration-200 ${
              isApplied ? 'opacity-60 blur-[0.5px] pointer-events-none select-none' : ''
            }`}>
              {(['PERCENTAGE', 'FIXED'] as const).map((type) => (
                <button
                  key={type}
                  type="button"
                  className={`flex-1 py-1.5 px-3 rounded-lg font-medium text-xs transition-colors shadow-sm ${
                    savingsType === type
                      ? 'bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white'
                      : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200'
                  }`}
                  onClick={() => setSavingsType(type)}
                >
                  {t(type === 'PERCENTAGE' ? 'budgets.percentage' : 'budgets.fixedAmount')}
                </button>
              ))}
            </div>

            {/* Input y Botón */}
            <div className="flex gap-2 items-center">
              <div className={`relative flex-1 transition-all duration-200 ${
                isApplied ? 'opacity-60 blur-[0.5px] pointer-events-none select-none' : ''
              }`}>
                <input
                  type="number"
                  step={savingsType === 'PERCENTAGE' ? '1' : '0.01'}
                  min="0.01"
                  max={savingsType === 'PERCENTAGE' ? 100 : Math.min(MAX_MONEY_AMOUNT, globalBudget.totalAmount)}
                  placeholder={t(savingsType === 'PERCENTAGE' ? 'budgets.percentageExample' : 'budgets.fixedAmountExample')}
                  value={savingsValue}
                  disabled={isApplied}
                  onChange={(event) => setSavingsValue(event.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 text-sm font-semibold text-neutral-900 dark:text-white placeholder:text-neutral-400 dark:placeholder:text-neutral-500 focus:outline-none focus:border-primary-500 shadow-sm"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-neutral-400 dark:text-neutral-500">
                  {savingsType === 'PERCENTAGE' ? '%' : currency}
                </span>
              </div>

              {isApplied ? (
                <Button
                  variant="outline"
                  type="button"
                  className="px-3 py-2 text-xs shadow-sm flex items-center gap-1.5 border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                  onClick={() => setIsEditing(true)}
                >
                  <Pencil className="w-3.5 h-3.5" />
                  {t('common.edit')}
                </Button>
              ) : (
                <div className="flex items-center gap-1.5">
                  <Button
                    variant="primary"
                    className="px-3 py-2 text-xs shadow-sm"
                    onClick={handleSave}
                    isLoading={isSaving}
                    disabled={!savingsValue}
                  >
                    {t('budgets.apply')}
                  </Button>
                  {hasSavedSavings && (
                    <Button
                      variant="ghost"
                      type="button"
                      className="px-2 py-2 text-xs text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200"
                      onClick={handleCancelEdit}
                      disabled={isSaving}
                      title={t('common.cancel')}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              )}
            </div>

            {saveError ? <p className="text-xs text-rose-600 dark:text-rose-400">{saveError}</p> : null}

            {/* Mensaje original de reserva de dinero */}
            <p className="text-[11px] text-neutral-500 dark:text-neutral-400 bg-white/50 dark:bg-neutral-900/60 p-2 rounded-lg border border-neutral-100 dark:border-neutral-700">
              {savingsType === 'PERCENTAGE' && parsedSavingsValue !== null
                ? t('budgets.autoReserve', {
                    amount: formatCurrency(globalBudget.totalAmount * (parsedSavingsValue / 100)),
                  })
                : t('budgets.protectedAmount')}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}
