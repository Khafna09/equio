import { useState } from 'react';
import { CircleStop, Link2, Trash2, Wallet } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { useCurrency } from '../../hooks/useCurrency';
import { useI18n } from '../../i18n/i18nContextValue';
import type { BudgetResponse } from '../../types/budget.types';
import { getApiErrorMessage } from '../../utils/apiError';

type ResolutionAction = 'CLOSE' | 'DELETE';

interface BudgetModeTransitionDialogProps {
  isOpen: boolean;
  independentBudgets: BudgetResponse[];
  globalBudget?: BudgetResponse;
  isChangingMode: boolean;
  modeError: string | null;
  onClose: () => void;
  onCreateGlobal: () => void;
  onRequestLink: (budget: BudgetResponse) => void;
  onCloseBudget: (budgetId: number) => Promise<unknown>;
  onDeleteBudget: (budgetId: number) => Promise<unknown>;
  onEnableNormalMode: () => Promise<void>;
}

export function BudgetModeTransitionDialog({
  isOpen,
  independentBudgets,
  globalBudget,
  isChangingMode,
  modeError,
  onClose,
  onCreateGlobal,
  onRequestLink,
  onCloseBudget,
  onDeleteBudget,
  onEnableNormalMode,
}: BudgetModeTransitionDialogProps) {
  const { t } = useI18n();
  const { formatCurrency } = useCurrency();
  const [confirmation, setConfirmation] = useState<{ id: number; action: ResolutionAction } | null>(null);
  const [busyBudgetId, setBusyBudgetId] = useState<number | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const resolve = async (budgetId: number, action: ResolutionAction) => {
    if (busyBudgetId != null) return;
    setBusyBudgetId(budgetId);
    setActionError(null);
    try {
      if (action === 'CLOSE') {
        await onCloseBudget(budgetId);
      } else {
        await onDeleteBudget(budgetId);
      }
      setConfirmation(null);
    } catch (error: unknown) {
      setActionError(getApiErrorMessage(error, t('budgets.actionError'), t));
    } finally {
      setBusyBudgetId(null);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => busyBudgetId == null && !isChangingMode && onClose()}
      title={t('budgets.modeTransitionTitle')}
      className="max-w-2xl"
    >
      <div className="space-y-5">
        <p className="text-sm leading-6 text-neutral-600 dark:text-neutral-300">
          {t('budgets.modeTransitionDescription')}
        </p>

        {!globalBudget && independentBudgets.length > 0 && (
          <div className="flex items-center justify-between gap-4 rounded-lg border border-primary-200 bg-primary-50 p-4 dark:border-primary-900 dark:bg-primary-950/30">
            <div>
              <p className="text-sm font-semibold text-neutral-900 dark:text-white">{t('budgets.modeTransitionNoGlobal')}</p>
              <p className="mt-1 text-xs text-neutral-600 dark:text-neutral-300">{t('budgets.modeTransitionNoGlobalHint')}</p>
            </div>
            <Button variant="primary" onClick={onCreateGlobal} icon={<Wallet />}>
              {t('budgets.configureGlobal')}
            </Button>
          </div>
        )}

        {independentBudgets.length > 0 ? (
          <div className="divide-y divide-neutral-200 overflow-hidden rounded-lg border border-neutral-200 dark:divide-neutral-700 dark:border-neutral-700">
            {independentBudgets.map((budget) => {
              const confirming = confirmation?.id === budget.id ? confirmation.action : null;
              return (
                <div key={budget.id} className="p-4">
                  <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-neutral-900 dark:text-white">
                        {budget.categoryName || t('common.category')}
                      </p>
                      <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                        {t('budgets.modeTransitionBudgetSummary', {
                          amount: formatCurrency(budget.totalAmount),
                          spent: formatCurrency(budget.spentAmount),
                        })}
                      </p>
                    </div>
                    {!confirming && (
                      <div className="flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={!globalBudget || busyBudgetId != null}
                          onClick={() => onRequestLink(budget)}
                          icon={<Link2 />}
                        >
                          {t('budgets.linkAction')}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={busyBudgetId != null}
                          onClick={() => setConfirmation({ id: budget.id, action: 'CLOSE' })}
                          icon={<CircleStop />}
                        >
                          {t('budgets.closeBudget')}
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          disabled={busyBudgetId != null}
                          onClick={() => setConfirmation({ id: budget.id, action: 'DELETE' })}
                          icon={<Trash2 />}
                        >
                          {t('common.delete')}
                        </Button>
                      </div>
                    )}
                  </div>

                  {confirming && (
                    <div className="mt-3 flex flex-col justify-between gap-3 rounded-lg bg-neutral-50 p-3 dark:bg-neutral-900/60 sm:flex-row sm:items-center">
                      <p className="text-xs font-medium text-neutral-700 dark:text-neutral-200">
                        {t(confirming === 'CLOSE'
                          ? 'budgets.modeTransitionConfirmClose'
                          : 'budgets.modeTransitionConfirmDelete')}
                      </p>
                      <div className="flex justify-end gap-2">
                        <Button size="sm" variant="ghost" disabled={busyBudgetId != null} onClick={() => setConfirmation(null)}>
                          {t('common.cancel')}
                        </Button>
                        <Button
                          size="sm"
                          variant={confirming === 'DELETE' ? 'destructive' : 'primary'}
                          isLoading={busyBudgetId === budget.id}
                          onClick={() => void resolve(budget.id, confirming)}
                        >
                          {t('common.confirm')}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200">
            {t('budgets.modeTransitionReady')}
          </div>
        )}

        {(actionError || modeError) && (
          <p role="alert" className="text-sm text-red-600 dark:text-red-400">{actionError || modeError}</p>
        )}

        <div className="flex justify-end gap-2 border-t border-neutral-200 pt-4 dark:border-neutral-700">
          <Button variant="outline" disabled={busyBudgetId != null || isChangingMode} onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button
            variant="primary"
            disabled={independentBudgets.length > 0 || busyBudgetId != null}
            isLoading={isChangingMode}
            onClick={() => void onEnableNormalMode()}
          >
            {t('budgets.enableNormalMode')}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
