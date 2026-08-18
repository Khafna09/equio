import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, RotateCcw } from 'lucide-react';
import {
  addMonths,
  addYears,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  isToday,
  setMonth,
  startOfMonth,
  startOfWeek,
  subMonths,
  subYears,
} from 'date-fns';
import { enUS, es } from 'date-fns/locale';
import { Card } from '../../components/ui/Card';
import { useI18n } from '../../i18n/i18nContextValue';
import type { MovementResponse } from '../../types/movement.types';

interface HistoryCalendarProps {
  movements: MovementResponse[];
  selectedDate: string | null;
  onSelectDate: (date: string | null) => void;
  language: 'es' | 'en';
}

export function HistoryCalendar({
  movements,
  selectedDate,
  onSelectDate,
  language
}: HistoryCalendarProps) {
  const { t } = useI18n();
  const [currentMonth, setCurrentMonth] = useState(() => startOfMonth(new Date()));
  const [isMonthGridOpen, setIsMonthGridOpen] = useState(false);
  const locale = language === 'en' ? enUS : es;

  const movementDates = useMemo(() => {
    const set = new Set<string>();
    movements.forEach(m => {
      const d = m.date ? m.date.substring(0, 10) : m.createdAt?.substring(0, 10);
      if (d) set.add(d);
    });
    return set;
  }, [movements]);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
  const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: startDate, end: endDate });

  const weekDays = [
    t('history.weekdayMon'),
    t('history.weekdayTue'),
    t('history.weekdayWed'),
    t('history.weekdayThu'),
    t('history.weekdayFri'),
    t('history.weekdaySat'),
    t('history.weekdaySun'),
  ];

  const months = Array.from({ length: 12 }, (_, monthIndex) => {
    const date = setMonth(monthStart, monthIndex);
    return {
      index: monthIndex,
      shortLabel: format(date, 'MMM', { locale }),
      fullLabel: format(date, 'MMMM', { locale }),
    };
  });

  const navigateBackward = () => {
    setCurrentMonth(previous => (
      isMonthGridOpen ? subYears(previous, 1) : subMonths(previous, 1)
    ));
  };

  const navigateForward = () => {
    setCurrentMonth(previous => (
      isMonthGridOpen ? addYears(previous, 1) : addMonths(previous, 1)
    ));
  };

  return (
    <Card className="p-4 space-y-3">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => setIsMonthGridOpen(open => !open)}
          className="rounded-lg px-1.5 py-1 text-left text-sm font-bold capitalize text-neutral-900 transition-colors hover:bg-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 dark:text-white dark:hover:bg-neutral-700"
          aria-expanded={isMonthGridOpen}
          aria-label={t('history.selectMonthYear')}
        >
          {isMonthGridOpen
            ? format(currentMonth, 'yyyy', { locale })
            : format(currentMonth, 'MMMM yyyy', { locale })}
        </button>

        <div className="flex gap-1">
          <button
            type="button"
            onClick={navigateBackward}
            className="p-1 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700 text-neutral-500 dark:text-neutral-400 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
            aria-label={isMonthGridOpen ? t('history.previousYear') : t('history.previousMonth')}
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={navigateForward}
            className="p-1 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700 text-neutral-500 dark:text-neutral-400 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
            aria-label={isMonthGridOpen ? t('history.nextYear') : t('history.nextMonth')}
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {isMonthGridOpen ? (
        <div
          className="grid min-h-[268px] grid-cols-3 auto-rows-fr gap-2 py-1"
          role="grid"
          aria-label={t('history.monthsOfYear', { year: currentMonth.getFullYear() })}
        >
          {months.map((month) => {
            const isDisplayedMonth = currentMonth.getMonth() === month.index;
            const now = new Date();
            const isCurrentMonth = now.getFullYear() === currentMonth.getFullYear()
              && now.getMonth() === month.index;

            return (
              <button
                key={month.index}
                type="button"
                onClick={() => {
                  setCurrentMonth(previous => setMonth(startOfMonth(previous), month.index));
                  setIsMonthGridOpen(false);
                }}
                className={`rounded-xl text-xs font-semibold capitalize transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 ${
                  isDisplayedMonth
                    ? 'bg-primary-600 text-white shadow-sm shadow-primary-500/30'
                    : isCurrentMonth
                      ? 'border border-primary-200 bg-primary-50 text-primary-700 dark:border-primary-800 dark:bg-primary-950/50 dark:text-primary-300'
                      : 'text-neutral-700 hover:bg-neutral-100 dark:text-neutral-200 dark:hover:bg-neutral-700/60'
                }`}
                aria-label={`${month.fullLabel} ${currentMonth.getFullYear()}`}
              >
                {month.shortLabel}
              </button>
            );
          })}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-7 gap-1 text-center">
            {weekDays.map(dayLabel => (
              <span key={dayLabel} className="text-[10px] font-semibold text-neutral-400 dark:text-neutral-400 uppercase">
                {dayLabel}
              </span>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1 text-center text-xs">
            {days.map((day) => {
              const dateStr = format(day, 'yyyy-MM-dd');
              const isSelected = selectedDate === dateStr;
              const inMonth = isSameMonth(day, monthStart);
              const hasMovs = movementDates.has(dateStr);
              const isCurrentDay = isToday(day);

              return (
                <button
                  key={dateStr}
                  type="button"
                  onClick={() => onSelectDate(isSelected ? null : dateStr)}
                  className={`
                    relative h-8 rounded-xl flex items-center justify-center font-medium transition-all
                    ${!inMonth
                      ? 'text-neutral-300 dark:text-neutral-600'
                      : isSelected
                        ? 'bg-primary-600 text-white font-bold shadow-md shadow-primary-500/30'
                        : isCurrentDay
                          ? 'bg-primary-50 dark:bg-primary-950/50 text-primary-700 dark:text-primary-300 font-bold border border-primary-200 dark:border-primary-800'
                          : 'text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-700/60'
                    }
                  `}
                >
                  {format(day, 'd')}
                  {hasMovs && !isSelected && (
                    <span className="absolute bottom-1 w-1.5 h-1.5 rounded-full bg-secondary-500" />
                  )}
                  {hasMovs && isSelected && (
                    <span className="absolute bottom-1 w-1.5 h-1.5 rounded-full bg-white" />
                  )}
                </button>
              );
            })}
          </div>
        </>
      )}

      {selectedDate && (
        <button
          type="button"
          onClick={() => onSelectDate(null)}
          className="w-full text-xs text-primary-600 dark:text-primary-400 font-medium hover:underline flex items-center justify-center gap-1 pt-1 border-t border-neutral-100 dark:border-neutral-700"
        >
          <RotateCcw className="w-3 h-3" /> {t('history.viewAllDays')}
        </button>
      )}
    </Card>
  );
}
