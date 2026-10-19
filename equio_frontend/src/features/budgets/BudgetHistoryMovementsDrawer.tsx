import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { parseISO } from 'date-fns';
import { TrendingDown, TrendingUp, X } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import type { useI18n } from '../../i18n/i18nContextValue';
import type { BudgetHistoryMovement } from '../../types/budget.types';

interface MovementsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  movements: BudgetHistoryMovement[];
  formatCurrency: (value: number, options?: Intl.NumberFormatOptions) => string;
  formatDate: (value?: string) => string;
  formatTime: (date: Date) => string;
  t: ReturnType<typeof useI18n>['t'];
}

export function BudgetHistoryMovementsDrawer({
  isOpen,
  onClose,
  movements,
  formatCurrency,
  formatDate,
  formatTime,
  t,
}: MovementsDrawerProps) {
  useEffect(() => {
    if (!isOpen) return;

    const previousOverflow = document.body.style.overflow;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };

    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [isOpen, onClose]);

  const groupedMovements = movements.reduce<Map<string, BudgetHistoryMovement[]>>((groups, movement) => {
    const date = movement.date.slice(0, 10);
    const group = groups.get(date) ?? [];
    group.push(movement);
    groups.set(date, group);
    return groups;
  }, new Map());

  return createPortal(
    <AnimatePresence>
      {isOpen ? (
        <div className="fixed inset-0 z-[80]" role="dialog" aria-modal="true" aria-labelledby="history-movements-title">
          <motion.button
            type="button"
            className="absolute inset-0 bg-black/45"
            aria-label={t('budgets.closeMovements')}
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />
          <motion.aside
            className="absolute inset-y-0 right-0 flex w-full max-w-md flex-col bg-white shadow-2xl dark:bg-neutral-900"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 360, damping: 36 }}
          >
            <header className="flex shrink-0 items-center justify-between gap-4 border-b border-neutral-200 px-5 py-4 dark:border-neutral-700">
              <div>
                <h2 id="history-movements-title" className="text-lg font-bold text-neutral-950 dark:text-white">
                  {t('budgets.periodMovements')}
                </h2>
                <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">
                  {t('budgets.movementCount', { count: movements.length })}
                </p>
              </div>
              <Button variant="ghost" size="icon" onClick={onClose} aria-label={t('budgets.closeMovements')}>
                <X />
              </Button>
            </header>

            <div className="min-h-0 flex-1 overflow-y-auto">
              {groupedMovements.size > 0 ? Array.from(groupedMovements.entries()).map(([date, items]) => (
                <section key={date}>
                  <div className="sticky top-0 z-10 border-y border-neutral-200 bg-neutral-50/95 px-5 py-2 text-xs font-semibold text-neutral-600 backdrop-blur dark:border-neutral-700 dark:bg-neutral-800/95 dark:text-neutral-300">
                    {formatDate(date)}
                  </div>
                  <div className="divide-y divide-neutral-100 px-5 dark:divide-neutral-800">
                    {items.map((movement) => {
                      const isIncome = movement.type === 'INCOME';
                      const categoryName = movement.categoryName === 'Uncategorized'
                        ? t('common.uncategorized')
                        : movement.categoryName;

                      return (
                        <div key={movement.movementId} className="flex items-center gap-3 py-4">
                          <span className={isIncome
                            ? 'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400'
                            : 'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400'}
                          >
                            {isIncome ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold text-neutral-900 dark:text-white">
                              {movement.description || (isIncome ? t('budgets.movementIncome') : categoryName)}
                            </p>
                            <p className="mt-0.5 flex items-center gap-1.5 truncate text-xs text-neutral-500 dark:text-neutral-400">
                              <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: movement.categoryColor || '#a1a1aa' }} />
                              <span className="truncate">{categoryName}</span>
                              <span aria-hidden="true">·</span>
                              <span>{formatTime(parseISO(movement.date))}</span>
                            </p>
                          </div>
                          <div className="shrink-0 text-right">
                            <p className={isIncome
                              ? 'text-sm font-bold text-emerald-600 dark:text-emerald-400'
                              : 'text-sm font-bold text-rose-600 dark:text-rose-400'}
                            >
                              {isIncome ? '+' : '-'}{formatCurrency(movement.amount)}
                            </p>
                            <p className="mt-0.5 text-[11px] text-neutral-400">
                              {isIncome ? t('budgets.movementIncome') : t('budgets.movementExpense')}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>
              )) : (
                <div className="flex h-full items-center justify-center px-6 py-16 text-center text-sm text-neutral-500 dark:text-neutral-400">
                  {t('budgets.noPeriodMovements')}
                </div>
              )}
            </div>
          </motion.aside>
        </div>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}
