import { useState, useEffect, useRef } from 'react';
import { Modal } from './Modal';
import { DayPicker } from 'react-day-picker';
import { es, enUS } from 'date-fns/locale';
import { setHours, setMinutes } from 'date-fns';
import { Button } from './Button';
import 'react-day-picker/dist/style.css';
import { useI18n } from '../../i18n/i18nContextValue';
import { useTimeFormat } from '../../hooks/useTimeFormat';

interface DateTimePickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialDate: Date;
  onSave: (date: Date) => void;
}

export function DateTimePickerModal(props: DateTimePickerModalProps) {
  const key = `${props.isOpen ? 'open' : 'closed'}-${props.initialDate.getTime()}`;
  return <DateTimePickerModalContent key={key} {...props} />;
}

function DateTimePickerModalContent({ isOpen, onClose, initialDate, onSave }: DateTimePickerModalProps) {
  const { t, language } = useI18n();
  const { is24Hour } = useTimeFormat();
  const [date, setDate] = useState<Date>(initialDate);
  const [hour, setHour] = useState<number>(initialDate.getHours());
  const [minute, setMinute] = useState<number>(initialDate.getMinutes());
  const period = hour >= 12 ? 'PM' : 'AM';
  const selectedDisplayHour = is24Hour ? hour : (hour % 12 || 12);
  const hourOptions = is24Hour
    ? Array.from({ length: 24 }, (_, index) => index)
    : Array.from({ length: 12 }, (_, index) => index + 1);

  const hourRef = useRef<HTMLDivElement>(null);
  const minuteRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Auto-scroll to selected time
    if (isOpen && hourRef.current && minuteRef.current) {
      const selectedHourButton = hourRef.current.querySelector(`[data-value="${selectedDisplayHour}"]`) as HTMLElement;
      if (selectedHourButton) {
        hourRef.current.scrollTop = selectedHourButton.offsetTop - hourRef.current.offsetHeight / 2 + selectedHourButton.offsetHeight / 2;
      }
      const selectedMinuteButton = minuteRef.current.querySelector(`[data-value="${minute}"]`) as HTMLElement;
      if (selectedMinuteButton) {
        minuteRef.current.scrollTop = selectedMinuteButton.offsetTop - minuteRef.current.offsetHeight / 2 + selectedMinuteButton.offsetHeight / 2;
      }
    }
  }, [isOpen, minute, selectedDisplayHour]);

  const handleSave = () => {
    if (!date) return;
    let newDate = setHours(date, hour);
    newDate = setMinutes(newDate, minute);
    onSave(newDate);
    onClose();
  };

  const css = `
    .rdp {
      --rdp-cell-size: 40px;
      --rdp-accent-color: #10B981;
      --rdp-background-color: #ecfdf5;
      margin: 0;
    }
    .rdp-day_selected {
      font-weight: bold;
    }
    .dark .rdp {
      --rdp-background-color: #064e3b;
      color: #f3f4f6;
    }
    .dark .rdp-day {
      color: #f3f4f6;
    }
    .dark .rdp-day_outside {
      color: #6b7280;
    }
    .dark .rdp-caption_label,
    .dark .rdp-nav_button {
      color: #f3f4f6;
    }
  `;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t('components.dateTimeTitle')}>
      <style>{css}</style>
      <div className="flex flex-col md:flex-row gap-6 mt-4">
        
        <div className="flex-1 border-b md:border-b-0 md:border-r border-neutral-100 dark:border-neutral-700 pb-6 md:pb-0 md:pr-6 flex justify-center">
          <DayPicker
            mode="single"
            selected={date}
            onSelect={(d) => d && setDate(d)}
            locale={language === 'en' ? enUS : es}
            showOutsideDays
            className="p-3 bg-white dark:bg-neutral-900 rounded-xl border border-neutral-100 dark:border-neutral-700 text-neutral-900 dark:text-white shadow-sm"
          />
        </div>

        <div className="w-full md:w-52 flex flex-wrap gap-4 justify-center items-start">
          <div className="flex flex-col items-center">
            <span className="text-xs font-semibold text-neutral-400 dark:text-neutral-400 mb-2 uppercase">{t('components.hour')}</span>
            <div ref={hourRef} className="h-[280px] w-14 overflow-y-auto no-scrollbar scroll-smooth flex flex-col gap-1 border border-neutral-100 dark:border-neutral-700 rounded-xl p-1 shadow-inner bg-neutral-50 dark:bg-neutral-900" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
              <style>{`.no-scrollbar::-webkit-scrollbar { display: none; }`}</style>
              {hourOptions.map((displayHour) => (
                <button
                  key={displayHour}
                  type="button"
                  data-value={displayHour}
                  onClick={() => {
                    if (is24Hour) {
                      setHour(displayHour);
                      return;
                    }
                    const normalizedHour = displayHour % 12;
                    setHour(period === 'PM' ? normalizedHour + 12 : normalizedHour);
                  }}
                  className={`py-2 text-sm font-medium rounded-lg transition-colors flex-shrink-0 ${selectedDisplayHour === displayHour ? 'bg-primary-500 text-white shadow-md' : 'text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-800'}`}
                >
                  {displayHour.toString().padStart(2, '0')}
                </button>
              ))}
            </div>
          </div>

          <div className="text-xl font-bold text-neutral-300 dark:text-neutral-600 mt-10">:</div>

          <div className="flex flex-col items-center">
            <span className="text-xs font-semibold text-neutral-400 dark:text-neutral-400 mb-2 uppercase">{t('components.minute')}</span>
            <div ref={minuteRef} className="h-[280px] w-14 overflow-y-auto no-scrollbar scroll-smooth flex flex-col gap-1 border border-neutral-100 dark:border-neutral-700 rounded-xl p-1 shadow-inner bg-neutral-50 dark:bg-neutral-900" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
              {Array.from({ length: 60 }).map((_, minuteOption) => (
                <button
                  key={minuteOption}
                  type="button"
                  data-value={minuteOption}
                  onClick={() => setMinute(minuteOption)}
                  className={`py-2 text-sm font-medium rounded-lg transition-colors flex-shrink-0 ${minute === minuteOption ? 'bg-primary-500 text-white shadow-md' : 'text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-800'}`}
                >
                  {minuteOption.toString().padStart(2, '0')}
                </button>
              ))}
            </div>
          </div>

          {!is24Hour && (
            <div className="w-full flex justify-center gap-1 rounded-xl bg-neutral-100 dark:bg-neutral-900 p-1">
              {(['AM', 'PM'] as const).map((nextPeriod) => (
                <button
                  key={nextPeriod}
                  type="button"
                  onClick={() => {
                    if (nextPeriod === period) return;
                    setHour((currentHour) => nextPeriod === 'PM' ? currentHour + 12 : currentHour - 12);
                  }}
                  className={`flex-1 rounded-lg px-3 py-2 text-xs font-bold transition-colors ${period === nextPeriod ? 'bg-primary-500 text-white shadow-sm' : 'text-neutral-500 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-800'}`}
                >
                  {nextPeriod}
                </button>
              ))}
            </div>
          )}
        </div>

      </div>
      
      <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-neutral-100 dark:border-neutral-700">
        <Button variant="secondary" onClick={onClose}>{t('common.cancel')}</Button>
        <Button variant="primary" onClick={handleSave}>{t('common.save')}</Button>
      </div>
    </Modal>
  );
}
