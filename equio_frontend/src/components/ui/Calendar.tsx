import { useState, useEffect } from 'react';
import { DayPicker, type DayPickerProps, type CaptionLabelProps } from 'react-day-picker';
import { ChevronLeft, ChevronRight, ChevronDown, X } from 'lucide-react';
import { format, isValid, type Locale } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '../../utils/classNames';
import 'react-day-picker/dist/style.css';

export type CalendarProps = DayPickerProps & {
  className?: string;
  compact?: boolean;
};

export function Calendar({ className, compact = false, month: controlledMonth, onMonthChange, locale = es, ...props }: CalendarProps) {
  const getInitialMonth = () => {
    if (controlledMonth && isValid(controlledMonth)) return controlledMonth;
    if (props.defaultMonth && isValid(props.defaultMonth)) return props.defaultMonth;
    const selected = 'selected' in props ? props.selected : undefined;
    if (selected instanceof Date && isValid(selected)) return selected;
    return new Date();
  };

  const [currentMonth, setCurrentMonth] = useState<Date>(getInitialMonth);
  const [viewMode, setViewMode] = useState<'days' | 'months' | 'years'>('days');
  const [pickerYear, setPickerYear] = useState<number>(() => currentMonth.getFullYear());
  const [decadeStart, setDecadeStart] = useState<number>(() => Math.floor(currentMonth.getFullYear() / 12) * 12);

  useEffect(() => {
    if (controlledMonth && isValid(controlledMonth)) {
      // Keep month, month-grid, and year-grid navigation aligned for controlled calendars.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCurrentMonth(controlledMonth);
      setPickerYear(controlledMonth.getFullYear());
      setDecadeStart(Math.floor(controlledMonth.getFullYear() / 12) * 12);
    }
  }, [controlledMonth]);

  const handleMonthChange = (newMonth: Date) => {
    setCurrentMonth(newMonth);
    setPickerYear(newMonth.getFullYear());
    setDecadeStart(Math.floor(newMonth.getFullYear() / 12) * 12);
    onMonthChange?.(newMonth);
  };

  const handleSelectMonth = (monthIndex: number) => {
    const newMonth = new Date(pickerYear, monthIndex, 1);
    handleMonthChange(newMonth);
    setViewMode('days');
  };

  const handleSelectYear = (year: number) => {
    setPickerYear(year);
    setViewMode('months');
  };

  const customComponents = {
    CaptionLabel: (captionProps: CaptionLabelProps) => {
      return (
        <button
          type="button"
          onClick={() => {
            setPickerYear(currentMonth.getFullYear());
            setViewMode('months');
          }}
          className="group inline-flex items-center gap-1.5 px-2 py-1 -ml-1 rounded-lg font-semibold text-neutral-800 dark:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors text-sm capitalize"
          title="Cambiar mes y año"
        >
          <span>{captionProps.children}</span>
          <ChevronDown className="w-3.5 h-3.5 text-neutral-400 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-transform duration-200" />
        </button>
      );
    }
  };

  return (
    <div className={cn(
      'equio-calendar-wrapper relative rounded-2xl border border-border bg-card overflow-hidden select-none',
      compact ? (viewMode === 'days' ? 'w-fit' : 'w-[224px]') : 'w-[320px]',
      className
    )}>
      <style>{`
        .equio-calendar {
          --rdp-accent-color: #8b5cf6;
          --rdp-accent-background-color: #f3e8ff;
          --rdp-day-height: 2.35rem;
          --rdp-day-width: 2.35rem;
          --rdp-day_button-height: 2.35rem;
          --rdp-day_button-width: 2.35rem;
          --rdp-day_button-border-radius: 0.5rem;
          --rdp-nav_button-height: 2rem;
          --rdp-nav_button-width: 2rem;
          --rdp-nav_button-border-radius: 0.5rem;
          margin: 0;
          width: 100%;
        }
        .equio-calendar--compact {
          --rdp-day-height: 1.75rem;
          --rdp-day-width: 1.75rem;
          --rdp-day_button-height: 1.75rem;
          --rdp-day_button-width: 1.75rem;
          --rdp-nav_button-height: 1.625rem;
          --rdp-nav_button-width: 1.625rem;
        }
        .equio-calendar .rdp-month_caption { font-size: 0.95rem; font-weight: 600; color: #27272a; }
        .equio-calendar--compact .rdp-month_caption { font-size: 0.875rem; }
        .equio-calendar .rdp-weekday { color: #71717a; font-size: 0.75rem; font-weight: 600; text-transform: uppercase; }
        .equio-calendar--compact .rdp-weekday { font-size: 0.6875rem; }
        .equio-calendar .rdp-day_button { border: 0; font-weight: 500; color: #3f3f46; border-radius: 0.5rem; }
        .equio-calendar .rdp-day_button:hover { background: #f4f4f5; }
        .equio-calendar .rdp-selected .rdp-day_button { background: #8b5cf6; color: white; font-weight: 700; }
        .equio-calendar .rdp-today:not(.rdp-selected) .rdp-day_button { border: 1px solid #a78bfa; color: #6d28d9; }
        .equio-calendar .rdp-outside { color: #a1a1aa; opacity: 0.5; }
        .equio-calendar .rdp-button_previous, .equio-calendar .rdp-button_next { color: #7c3aed; }
        .dark .equio-calendar { --rdp-accent-background-color: #3b2a56; }
        .dark .equio-calendar .rdp-month_caption { color: #f4f4f5; }
        .dark .equio-calendar .rdp-weekday { color: #a1a1aa; }
        .dark .equio-calendar .rdp-day_button { color: #e4e4e7; }
        .dark .equio-calendar .rdp-day_button:hover { background: #27272a; }
        .dark .equio-calendar .rdp-outside { color: #71717a; }
      `}</style>

      {viewMode === 'days' && (
        <DayPicker
          fixedWeeks
          showOutsideDays
          month={currentMonth}
          onMonthChange={handleMonthChange}
          locale={locale}
          components={customComponents}
          className={cn(
            'equio-calendar',
            compact ? 'equio-calendar--compact p-2' : 'p-3.5'
          )}
          {...props}
        />
      )}

      {viewMode === 'months' && (
        <div className={cn('flex flex-col justify-between', compact ? 'h-[270px] w-[224px] p-3' : 'h-[310px] p-4')}>
          <div className="flex items-center justify-between pb-2 border-b border-border/50">
            <button
              type="button"
              onClick={() => setPickerYear((y) => y - 1)}
              className="p-1.5 rounded-lg text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800 dark:text-neutral-400 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => {
                setDecadeStart(Math.floor(pickerYear / 12) * 12);
                setViewMode('years');
              }}
              className="px-3 py-1 rounded-lg font-bold text-sm text-neutral-900 dark:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 flex items-center gap-1.5 transition-colors"
            >
              <span>{pickerYear}</span>
              <ChevronDown className="w-3.5 h-3.5 text-neutral-400" />
            </button>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setPickerYear((y) => y + 1)}
                className="p-1.5 rounded-lg text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800 dark:text-neutral-400 transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('days')}
                className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors ml-1"
                title="Volver a los días"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 py-3 flex-1 items-center">
            {Array.from({ length: 12 }, (_, i) => {
              const monthDate = new Date(pickerYear, i, 1);
              const monthLabel = format(monthDate, 'MMM', { locale: locale as Locale });
              const isCurrentMonth = currentMonth.getFullYear() === pickerYear && currentMonth.getMonth() === i;
              const isTodayMonth = new Date().getFullYear() === pickerYear && new Date().getMonth() === i;

              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => handleSelectMonth(i)}
                  className={cn(
                    'h-11 rounded-xl text-xs font-semibold capitalize transition-all duration-150 flex items-center justify-center',
                    isCurrentMonth
                      ? 'bg-primary-600 text-white font-bold shadow-md shadow-primary-500/25'
                      : isTodayMonth
                      ? 'border border-primary-400/80 text-primary-600 dark:text-primary-400 font-bold hover:bg-primary-50 dark:hover:bg-primary-950/40'
                      : 'text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800'
                  )}
                >
                  {monthLabel}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {viewMode === 'years' && (
        <div className={cn('flex flex-col justify-between', compact ? 'h-[270px] w-[224px] p-3' : 'h-[310px] p-4')}>
          <div className="flex items-center justify-between pb-2 border-b border-border/50">
            <button
              type="button"
              onClick={() => setDecadeStart((d) => d - 12)}
              className="p-1.5 rounded-lg text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800 dark:text-neutral-400 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-bold text-sm text-neutral-900 dark:text-white px-2">
              {decadeStart} - {decadeStart + 11}
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setDecadeStart((d) => d + 12)}
                className="p-1.5 rounded-lg text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800 dark:text-neutral-400 transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('months')}
                className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors ml-1"
                title="Volver a los meses"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 py-3 flex-1 items-center">
            {Array.from({ length: 12 }, (_, i) => {
              const year = decadeStart + i;
              const isSelectedYear = pickerYear === year;
              const isCurrentYear = new Date().getFullYear() === year;

              return (
                <button
                  key={year}
                  type="button"
                  onClick={() => handleSelectYear(year)}
                  className={cn(
                    'h-11 rounded-xl text-xs font-semibold transition-all duration-150 flex items-center justify-center',
                    isSelectedYear
                      ? 'bg-primary-600 text-white font-bold shadow-md shadow-primary-500/25'
                      : isCurrentYear
                      ? 'border border-primary-400/80 text-primary-600 dark:text-primary-400 font-bold hover:bg-primary-50 dark:hover:bg-primary-950/40'
                      : 'text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800'
                  )}
                >
                  {year}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
