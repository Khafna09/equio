import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import type { DashboardCalendarPeriod, DashboardPeriod } from '../../types/dashboard.types';
import { useI18n } from '../../i18n/i18nContextValue';
import { cn } from '../../utils/classNames';

const calendarPeriods: DashboardCalendarPeriod[] = ['WEEK', 'FORTNIGHT', 'MONTH'];

interface DashboardPeriodSelectorProps {
  value: DashboardPeriod;
  calendarPeriod: DashboardCalendarPeriod;
  hasActiveBudget: boolean;
  isLoading: boolean;
  onBudgetSelect: () => void;
  onCalendarViewSelect: () => void;
  onCalendarPeriodChange: (period: DashboardCalendarPeriod) => void;
}

export function DashboardPeriodSelector({
  value,
  calendarPeriod,
  hasActiveBudget,
  isLoading,
  onBudgetSelect,
  onCalendarViewSelect,
  onCalendarPeriodChange,
}: DashboardPeriodSelectorProps) {
  const { t } = useI18n();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const isBudgetView = value === 'BUDGET';

  const options = calendarPeriods.map((period) => ({
    value: period,
    label: t(`dashboard.current${period}`),
  }));

  const activePeriodLabel = options.find((opt) => opt.value === calendarPeriod)?.label;

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  if (isLoading) {
    return <div className="h-7.5 w-40 animate-pulse rounded-lg bg-neutral-100 dark:bg-neutral-800" />;
  }

  const handlePeriodButtonClick = () => {
    if (isBudgetView) {
      onCalendarViewSelect();
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
          onBudgetSelect();
        }}
        className={cn(
          'flex h-8 items-center justify-center rounded-lg px-3 text-xs font-semibold transition-all select-none',
          isBudgetView
            ? 'bg-white text-primary-700 shadow-sm dark:bg-neutral-700 dark:text-white'
            : 'text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100'
        )}
      >
        {t('dashboard.periodBUDGET')}
      </button>

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
