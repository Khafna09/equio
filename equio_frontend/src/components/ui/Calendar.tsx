import { DayPicker, type DayPickerProps } from 'react-day-picker';
import { cn } from '../../utils/classNames';
import 'react-day-picker/dist/style.css';

export type CalendarProps = DayPickerProps & {
  className?: string;
  compact?: boolean;
};

export function Calendar({ className, compact = false, ...props }: CalendarProps) {
  return (
    <>
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
        }
        .equio-calendar--compact {
          --rdp-day-height: 2rem;
          --rdp-day-width: 2rem;
          --rdp-day_button-height: 2rem;
          --rdp-day_button-width: 2rem;
          --rdp-nav_button-height: 1.75rem;
          --rdp-nav_button-width: 1.75rem;
        }
        .equio-calendar .rdp-month_caption { font-size: 0.95rem; font-weight: 600; color: #27272a; }
        .equio-calendar--compact .rdp-month_caption { font-size: 0.875rem; }
        .equio-calendar .rdp-weekday { color: #71717a; font-size: 0.75rem; font-weight: 500; text-transform: uppercase; }
        .equio-calendar--compact .rdp-weekday { font-size: 0.6875rem; }
        .equio-calendar .rdp-day_button { border: 0; font-weight: 500; color: #3f3f46; }
        .equio-calendar .rdp-day_button:hover { background: #f4f4f5; }
        .equio-calendar .rdp-selected .rdp-day_button { background: #8b5cf6; color: white; }
        .equio-calendar .rdp-today:not(.rdp-selected) .rdp-day_button { border: 1px solid #a78bfa; color: #6d28d9; }
        .equio-calendar .rdp-outside { color: #a1a1aa; }
        .equio-calendar .rdp-button_previous, .equio-calendar .rdp-button_next { color: #7c3aed; }
        .dark .equio-calendar { --rdp-accent-background-color: #3b2a56; }
        .dark .equio-calendar .rdp-month_caption { color: #f4f4f5; }
        .dark .equio-calendar .rdp-weekday { color: #a1a1aa; }
        .dark .equio-calendar .rdp-day_button { color: #e4e4e7; }
        .dark .equio-calendar .rdp-day_button:hover { background: #27272a; }
        .dark .equio-calendar .rdp-outside { color: #71717a; }
      `}</style>
      <DayPicker
        showOutsideDays
        className={cn(
          'equio-calendar rounded-xl border border-border bg-background',
          compact ? 'equio-calendar--compact p-2' : 'p-3',
          className,
        )}
        {...props}
      />
    </>
  );
}