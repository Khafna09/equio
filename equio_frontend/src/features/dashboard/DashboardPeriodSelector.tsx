import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import type { DashboardBudgetOption, DashboardCalendarPeriod, DashboardPeriod } from '../../types/dashboard.types';
import { useI18n } from '../../i18n/i18nContextValue';
import { cn } from '../../utils/classNames';

const calendarPeriods: DashboardCalendarPeriod[] = ['WEEK', 'FORTNIGHT', 'MONTH'];

interface DashboardPeriodSelectorProps {
  value: DashboardPeriod;
  calendarPeriod: DashboardCalendarPeriod;
  hasActiveBudget: boolean;
  activeBudgets: DashboardBudgetOption[];
  selectedBudgetId: number | null;
  isLoading: boolean;
  onBudgetSelect: (budgetId: number) => void;
  onCalendarViewSelect: () => void;
  onCalendarPeriodChange: (period: DashboardCalendarPeriod) => void;
}

export function DashboardPeriodSelector({
  value,
  calendarPeriod,
  hasActiveBudget,
  activeBudgets,
  selectedBudgetId,
  isLoading,
  onBudgetSelect,
  onCalendarViewSelect,
  onCalendarPeriodChange,
}: DashboardPeriodSelectorProps) {
  const { t } = useI18n();
  const [isOpen, setIsOpen] = useState(false);
  const [isBudgetOpen, setIsBudgetOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const isBudgetView = value === 'BUDGET';
  const selectedBudget = activeBudgets.find((budget) => budget.id === selectedBudgetId)
    ?? activeBudgets[0];
  const budgetLabel = selectedBudget?.scope === 'GLOBAL'
    ? t('budgets.globalBudget')
    : selectedBudget?.name;

  const options = calendarPeriods.map((period) => ({
    value: period,
    label: t(`dashboard.current${period}`),
  }));

  const activePeriodLabel = options.find((opt) => opt.value === calendarPeriod)?.label;

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setIsBudgetOpen(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false);
        setIsBudgetOpen(false);
      }
    }
    if (isOpen || isBudgetOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, isBudgetOpen]);

  if (isLoading) {
    return <div className="h-7.5 w-40 animate-pulse rounded-lg bg-neutral-100 dark:bg-neutral-800" />;
  }

  const handlePeriodButtonClick = () => {
    if (isBudgetView) {
      onCalendarViewSelect();
      setIsBudgetOpen(false);
      setIsOpen(true);
    } else {
      setIsOpen((prev) => !prev);
    }
  };

  const menuDropdown = (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: -4, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -4, scale: 0.96 }}
          transition={{ duration: 0.15, ease: 'easeOut' }}
          className="absolute left-0 sm:right-0 sm:left-auto z-50 mt-1 min-w-40 overflow-hidden rounded-xl border border-neutral-200/80 bg-white/95 p-1 shadow-xl backdrop-blur-md dark:border-neutral-700 dark:bg-neutral-800/95"
          role="menu"
        >
          {options.map((opt) => {
            const isSelected = !isBudgetView && opt.value === calendarPeriod;
            return (
              <button
                key={opt.value}
                type="button"
                role="menuitem"
                onClick={() => {
                  onCalendarPeriodChange(opt.value);
                  onCalendarViewSelect();
                  setIsOpen(false);
                }}
                className={cn(
                  'flex w-full items-center justify-between px-2.5 py-1.5 text-xs rounded-lg transition-colors text-left font-medium',
                  isSelected
                    ? 'bg-primary-50 dark:bg-primary-950/50 text-primary-700 dark:text-primary-300 font-semibold'
                    : 'text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700/60'
                )}
              >
                <span>{opt.label}</span>
                {isSelected && (
                  <Check className="w-3.5 h-3.5 text-primary-600 dark:text-primary-400 shrink-0 ml-2" />
                )}
              </button>
            );
          })}
        </motion.div>
      )}
    </AnimatePresence>
  );

  if (!hasActiveBudget) {
    return (
      <div ref={containerRef} className="relative inline-block">
        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          aria-expanded={isOpen}
          aria-haspopup="menu"
          className={cn(
            'flex h-8 items-center gap-1.5 rounded-lg border border-neutral-200/80 bg-white px-2.5 sm:px-3 text-xs font-semibold text-neutral-800 shadow-sm transition-all hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100 dark:hover:bg-neutral-700/80',
            isOpen && 'ring-2 ring-primary-500/20 border-primary-500'
          )}
        >
          <span>{t('dashboard.byPeriod')}</span>
          <span className="text-[11px] font-normal text-primary-600 dark:text-primary-300">
            ({activePeriodLabel})
          </span>
          <ChevronDown
            className={cn(
              'w-3 h-3 text-neutral-400 transition-transform duration-200',
              isOpen && 'rotate-180 text-primary-500'
            )}
          />
        </button>
        {menuDropdown}
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative inline-flex items-center rounded-xl border border-neutral-200/80 bg-neutral-100 p-1 dark:border-neutral-700/80 dark:bg-neutral-800/90 shadow-sm">
      <button
        type="button"
        onClick={() => {
          setIsOpen(false);
          setIsBudgetOpen(false);
          if (selectedBudget) onBudgetSelect(selectedBudget.id);
        }}
        className={cn(
          'flex h-8 items-center justify-center rounded-lg px-3 text-xs font-semibold transition-all select-none',
          isBudgetView
            ? 'bg-white text-primary-700 shadow-sm dark:bg-neutral-700 dark:text-white'
            : 'text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100'
        )}
      >
        <span>{t('dashboard.periodBUDGET')}</span>
        {isBudgetView && budgetLabel ? (
          <span className="max-w-28 truncate text-[11px] font-normal text-primary-600 dark:text-primary-300">
            · {budgetLabel}
          </span>
        ) : null}
      </button>

      {activeBudgets.length > 1 ? (
        <div className="relative">
          <button
            type="button"
            onClick={() => {
              setIsOpen(false);
              setIsBudgetOpen((open) => !open);
            }}
            aria-label={t('dashboard.selectBudget')}
            aria-expanded={isBudgetOpen}
            aria-haspopup="menu"
            className="flex h-8 w-7 items-center justify-center rounded-lg text-neutral-500 transition-colors hover:bg-white hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-700 dark:hover:text-white"
          >
            <ChevronDown className={cn('h-3 w-3 transition-transform', isBudgetOpen && 'rotate-180')} />
          </button>
          <AnimatePresence>
            {isBudgetOpen ? (
              <motion.div
                initial={{ opacity: 0, y: -4, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -4, scale: 0.96 }}
                transition={{ duration: 0.15, ease: 'easeOut' }}
                className="absolute left-0 z-50 mt-1 min-w-52 overflow-hidden rounded-xl border border-neutral-200/80 bg-white/95 p-1 shadow-xl backdrop-blur-md dark:border-neutral-700 dark:bg-neutral-800/95"
                role="menu"
              >
                {activeBudgets.map((budget) => {
                  const label = budget.scope === 'GLOBAL' ? t('budgets.globalBudget') : budget.name;
                  const selected = budget.id === selectedBudget?.id;
                  return (
                    <button
                      key={budget.id}
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        onBudgetSelect(budget.id);
                        setIsBudgetOpen(false);
                      }}
                      className={cn(
                        'flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-xs font-medium transition-colors',
                        selected
                          ? 'bg-primary-50 text-primary-700 dark:bg-primary-950/50 dark:text-primary-300'
                          : 'text-neutral-700 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-700/60',
                      )}
                    >
                      <span className="truncate">{label}</span>
                      {selected ? <Check className="ml-2 h-3.5 w-3.5 shrink-0" /> : null}
                    </button>
                  );
                })}
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
      ) : null}

      <div className="relative">
        <button
          type="button"
          onClick={handlePeriodButtonClick}
          aria-expanded={isOpen}
          aria-haspopup="menu"
          className={cn(
            'flex h-7 sm:h-7.5 items-center justify-center gap-1.5 rounded-lg px-2.5 sm:px-3 text-xs font-semibold transition-all select-none',
            !isBudgetView
              ? 'bg-white text-primary-700 shadow-sm dark:bg-neutral-700 dark:text-white'
              : 'text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100'
          )}
        >
          <span>{t('dashboard.byPeriod')}</span>
          {!isBudgetView && (
            <span className="text-[11px] font-normal text-primary-600 dark:text-primary-300">
              ({activePeriodLabel})
            </span>
          )}
          <ChevronDown
            className={cn(
              'w-3 h-3 transition-transform duration-200 opacity-70',
              isOpen && 'rotate-180 opacity-100'
            )}
          />
        </button>
        {menuDropdown}
      </div>
    </div>
  );
}
