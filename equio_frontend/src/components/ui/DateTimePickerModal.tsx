import { useState, useEffect, useRef } from 'react';
import { Modal } from './Modal';
import { DayPicker } from 'react-day-picker';
import { es, enUS } from 'date-fns/locale';
import { setHours, setMinutes } from 'date-fns';
import { Button } from './Button';
import 'react-day-picker/dist/style.css';
import { useI18n } from '../../i18n/I18nContext';

interface DateTimePickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialDate: Date;
  onSave: (date: Date) => void;
}

export function DateTimePickerModal({ isOpen, onClose, initialDate, onSave }: DateTimePickerModalProps) {
  const { t, language } = useI18n();
  const [date, setDate] = useState<Date>(initialDate);
  const [hour, setHour] = useState<number>(initialDate.getHours());
  const [minute, setMinute] = useState<number>(initialDate.getMinutes());

  const hourRef = useRef<HTMLDivElement>(null);
  const minuteRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      setDate(initialDate);
      setHour(initialDate.getHours());
      setMinute(initialDate.getMinutes());
    }
  }, [isOpen, initialDate]);

  useEffect(() => {
    // Auto-scroll to selected time
    if (isOpen && hourRef.current && minuteRef.current) {
      const selectedHourButton = hourRef.current.querySelector(`[data-value="${hour}"]`) as HTMLElement;
      if (selectedHourButton) {
        hourRef.current.scrollTop = selectedHourButton.offsetTop - hourRef.current.offsetHeight / 2 + selectedHourButton.offsetHeight / 2;
      }
      const selectedMinuteButton = minuteRef.current.querySelector(`[data-value="${minute}"]`) as HTMLElement;
      if (selectedMinuteButton) {
        minuteRef.current.scrollTop = selectedMinuteButton.offsetTop - minuteRef.current.offsetHeight / 2 + selectedMinuteButton.offsetHeight / 2;
      }
    }
  }, [isOpen, hour, minute]);

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
    <Modal isOpen={isOpen} onClose={onClose} title={language === 'en' ? 'Date and time' : 'Fecha y hora'}>
      <style>{css}</style>
      <div className="flex flex-col md:flex-row gap-6 mt-4">
        
        {/* Calendar Side */}
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

        {/* Time Side */}
        <div className="w-full md:w-32 flex gap-4 justify-center items-start">
          <div className="flex flex-col items-center">
            <span className="text-xs font-semibold text-neutral-400 dark:text-neutral-400 mb-2 uppercase">{language === 'en' ? 'Hour' : 'Hora'}</span>
            <div ref={hourRef} className="h-[280px] w-14 overflow-y-auto no-scrollbar scroll-smooth flex flex-col gap-1 border border-neutral-100 dark:border-neutral-700 rounded-xl p-1 shadow-inner bg-neutral-50 dark:bg-neutral-900" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
              <style>{`.no-scrollbar::-webkit-scrollbar { display: none; }`}</style>
              {Array.from({ length: 24 }).map((_, i) => (
                <button
                  key={i}
                  type="button"
                  data-value={i}
                  onClick={() => setHour(i)}
                  className={`py-2 text-sm font-medium rounded-lg transition-colors flex-shrink-0 ${hour === i ? 'bg-primary-500 text-white shadow-md' : 'text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-800'}`}
                >
                  {i.toString().padStart(2, '0')}
                </button>
              ))}
            </div>
          </div>
          
          <div className="text-xl font-bold text-neutral-300 dark:text-neutral-600 mt-10">:</div>

          <div className="flex flex-col items-center">
            <span className="text-xs font-semibold text-neutral-400 dark:text-neutral-400 mb-2 uppercase">Min</span>
            <div ref={minuteRef} className="h-[280px] w-14 overflow-y-auto no-scrollbar scroll-smooth flex flex-col gap-1 border border-neutral-100 dark:border-neutral-700 rounded-xl p-1 shadow-inner bg-neutral-50 dark:bg-neutral-900" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
              {Array.from({ length: 60 }).map((_, i) => (
                <button
                  key={i}
                  type="button"
                  data-value={i}
                  onClick={() => setMinute(i)}
                  className={`py-2 text-sm font-medium rounded-lg transition-colors flex-shrink-0 ${minute === i ? 'bg-primary-500 text-white shadow-md' : 'text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-800'}`}
                >
                  {i.toString().padStart(2, '0')}
                </button>
              ))}
            </div>
          </div>
        </div>

      </div>
      
      <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-neutral-100 dark:border-neutral-700">
        <Button variant="secondary" onClick={onClose}>{t('common.cancel')}</Button>
        <Button variant="primary" onClick={handleSave}>{t('common.save')}</Button>
      </div>
    </Modal>
  );
}
