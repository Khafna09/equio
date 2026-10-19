import { useState } from 'react';
import * as Popover from '@radix-ui/react-popover';
import { CalendarDays, X } from 'lucide-react';
import { format, isValid, parseISO } from 'date-fns';
import { enUS, es } from 'date-fns/locale';
import { Calendar } from './Calendar';
import { useI18n } from '../../i18n/i18nContextValue';
import { cn } from '../../utils/classNames';

interface DatePickerProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  minDate?: Date;
}

export function DatePicker({
  label,
  value,
  onChange,
  placeholder,
  disabled = false,
  minDate,
}: DatePickerProps) {
  const [open, setOpen] = useState(false);
  const { language, t } = useI18n();
  const selectedDate = value ? parseISO(value) : undefined;
  const date = selectedDate && isValid(selectedDate) ? selectedDate : undefined;
  const locale = language === 'es' ? es : enUS;

  return (
    <div className="space-y-1.5">
      <span className="block text-sm font-medium text-foreground">{label}</span>
      <div className="relative">
        <Popover.Root open={open} onOpenChange={setOpen}>
          <Popover.Trigger asChild>
            <button
              type="button"
              disabled={disabled}
              className={cn(
                'flex h-12 w-full items-center rounded-xl border border-border bg-card px-3 pr-10 text-left text-sm transition-colors hover:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:cursor-not-allowed disabled:opacity-60',
                !date && 'text-muted-foreground',
              )}
            >
              <CalendarDays className="mr-2 h-4 w-4 shrink-0 text-muted-foreground" />
              <span className="truncate">
                {date
                  ? format(date, 'd MMM yyyy', { locale })
                  : placeholder ?? t('common.selectDate')}
              </span>
            </button>
          </Popover.Trigger>
          <Popover.Portal>
            <Popover.Content
              side="bottom"
              align="start"
              sideOffset={8}
              collisionPadding={16}
              className="z-[70] rounded-2xl border-none bg-transparent p-0 shadow-2xl outline-none"
            >
              <Calendar
                compact
                mode="single"
                selected={date}
                onSelect={(nextDate) => {
                  if (!nextDate) return;
                  onChange(format(nextDate, 'yyyy-MM-dd'));
                  setOpen(false);
                }}
                disabled={minDate ? { before: minDate } : undefined}
                locale={locale}
              />
            </Popover.Content>
          </Popover.Portal>
        </Popover.Root>
        {date ? (
          <button
            type="button"
            aria-label={t('common.clear')}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            onClick={() => onChange('')}
          >
            <X className="h-4 w-4" />
          </button>
        ) : null}
      </div>
    </div>
  );
}
