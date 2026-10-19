import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { setHours, setMinutes } from 'date-fns';
import { enUS, es } from 'date-fns/locale';
import { Modal } from './Modal';
import { Calendar } from './Calendar';
import { Button } from './Button';
import { useI18n } from '../../i18n/i18nContextValue';
import { useTimeFormat } from '../../hooks/useTimeFormat';

interface DateTimePickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialDate: Date;
  onSave: (date: Date) => void;
}

interface TimeFieldProps {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
}

function TimeField({ label, value, min, max, onChange }: TimeFieldProps) {
  const setWithinRange = (nextValue: number) => {
    if (nextValue < min || nextValue > max || Number.isNaN(nextValue)) return;
    onChange(nextValue);
  };

  const decrement = () => onChange(value === min ? max : value - 1);
  const increment = () => onChange(value === max ? min : value + 1);

  return (
    <div className="w-[68px]">
      <span className="mb-1.5 block text-center text-xs font-semibold uppercase text-muted-foreground">
        {label}
      </span>
      <div className="overflow-hidden rounded-lg border border-border bg-card shadow-sm">
        <button
          type="button"
          aria-label={`${label} -`}
          onClick={increment}
          className="flex h-7 w-full items-center justify-center text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <ChevronUp className="h-4 w-4" />
        </button>
        <input
          type="text"
          inputMode="numeric"
          aria-label={label}
          value={String(value).padStart(2, '0')}
          onChange={(event) => setWithinRange(Number(event.target.value))}
          className="h-9 w-full border-y border-border bg-transparent text-center text-base font-semibold text-foreground outline-none focus:bg-primary/5"
        />
        <button
          type="button"
          aria-label={`${label} +`}
          onClick={decrement}
          className="flex h-7 w-full items-center justify-center text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <ChevronDown className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

export function DateTimePickerModal({
  isOpen,
  onClose,
  initialDate,
  onSave,
}: DateTimePickerModalProps) {
  const { t, language } = useI18n();
  const { is24Hour } = useTimeFormat();
  const [selectedDate, setSelectedDate] = useState(initialDate);
  const [hour, setHour] = useState(initialDate.getHours());
  const [minute, setMinute] = useState(initialDate.getMinutes());

  const locale = language === 'es' ? es : enUS;
  const period = hour >= 12 ? 'PM' : 'AM';
  const displayHour = is24Hour ? hour : hour % 12 || 12;

  const handleClose = () => {
    setSelectedDate(initialDate);
    setHour(initialDate.getHours());
    setMinute(initialDate.getMinutes());
    onClose();
  };

  const handleConfirm = () => {
    const dateWithHour = setHours(selectedDate, hour);
    onSave(setMinutes(dateWithHour, minute));
    onClose();
  };

  const handleHourChange = (nextDisplayHour: number) => {
    if (is24Hour) {
      setHour(nextDisplayHour);
      return;
    }

    setHour((period === 'PM' ? 12 : 0) + (nextDisplayHour % 12));
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={t('components.dateTimeTitle')} className="max-w-[500px]">
      <div className="mt-1 space-y-4">
        <div className="flex items-start justify-start gap-5">
          <Calendar
            compact
            mode="single"
            selected={selectedDate}
            onSelect={(date) => date && setSelectedDate(date)}
            locale={locale}
            className="shrink-0"
          />
          <div className="min-w-0 pt-6">
            <div className="flex items-end gap-2">
              <TimeField
                label={t('components.hour')}
                value={displayHour}
                min={is24Hour ? 0 : 1}
                max={is24Hour ? 23 : 12}
                onChange={handleHourChange}
              />
              <span className="pb-8 text-xl font-semibold text-muted-foreground">:</span>
              <TimeField
                label={t('components.minute')}
                value={minute}
                min={0}
                max={59}
                onChange={setMinute}
              />
            </div>
            {!is24Hour ? (
              <div className="mt-3 grid grid-cols-2 rounded-lg bg-muted p-1">
                {(['AM', 'PM'] as const).map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setHour(option === period ? hour : (hour + 12) % 24)}
                    className={`h-8 rounded-md text-xs font-medium transition-colors ${
                      period === option
                        ? 'bg-card text-primary shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {option}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-border pt-4">
          <Button variant="outline" onClick={handleClose}>
            {t('components.dateCancel')}
          </Button>
          <Button onClick={handleConfirm}>{t('components.dateSave')}</Button>
        </div>
      </div>
    </Modal>
  );
}