import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { cn } from '../../utils/classNames';
import { useI18n } from '../../i18n/I18nContext';

export interface SelectOption {
  value: string | number;
  label: React.ReactNode;
  icon?: React.ReactNode;
}

interface SelectProps {
  value: string | number;
  onChange: (value: any) => void;
  options: SelectOption[];
  placeholder?: string;
  className?: string;
  contentClassName?: string;
  disabled?: boolean;
}

export function Select({
  value,
  onChange,
  options,
  placeholder,
  className,
  contentClassName,
  disabled = false,
}: SelectProps) {
  const { t } = useI18n();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((opt) => String(opt.value) === String(value));

  // Cerrar al hacer clic fuera del componente
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  return (
    <div ref={containerRef} className="relative w-full">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50/80 dark:bg-neutral-800 text-sm font-medium text-neutral-900 dark:text-white transition-all shadow-sm focus:outline-none hover:bg-neutral-100/80 dark:hover:bg-neutral-700/60',
          isOpen && 'ring-2 ring-primary-500/20 border-primary-500 bg-white dark:bg-neutral-800',
          disabled && 'opacity-50 cursor-not-allowed',
          className
        )}
      >
        <div className="flex items-center gap-2 truncate">
          {selectedOption?.icon && <span className="shrink-0">{selectedOption.icon}</span>}
          <span className="truncate">{selectedOption ? selectedOption.label : (placeholder ?? t('common.selectOption'))}</span>
        </div>
        <ChevronDown
          className={cn(
            'w-4 h-4 text-neutral-400 dark:text-neutral-400 shrink-0 transition-transform duration-200',
            isOpen && 'rotate-180 text-primary-600 dark:text-primary-400'
          )}
        />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 4, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className={cn(
              'absolute left-0 right-0 z-50 mt-1 max-h-56 overflow-y-auto rounded-xl border border-neutral-200/90 dark:border-neutral-700 bg-white dark:bg-neutral-800 p-1.5 shadow-xl backdrop-blur-md',
              contentClassName
            )}
          >
            {options.length === 0 ? (
              <div className="p-3 text-center text-xs text-neutral-400">{t('common.noData')}</div>
            ) : (
              options.map((opt) => {
                const isSelected = String(opt.value) === String(value);
                return (
                  <button
                    key={String(opt.value)}
                    type="button"
                    onClick={() => {
                      onChange(opt.value);
                      setIsOpen(false);
                    }}
                    className={cn(
                      'w-full flex items-center justify-between px-3 py-2 text-xs md:text-sm font-medium rounded-lg transition-all text-left group',
                      isSelected
                        ? 'bg-primary-50 dark:bg-primary-950/40 text-primary-700 dark:text-primary-300 font-semibold'
                        : 'text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-700/60'
                    )}
                  >
                    <div className="flex items-center gap-2 truncate">
                      {opt.icon && <span className="shrink-0">{opt.icon}</span>}
                      <span className="truncate">{opt.label}</span>
                    </div>
                    {isSelected && <Check className="w-4 h-4 text-primary-600 dark:text-primary-400 shrink-0 ml-2" />}
                  </button>
                );
              })
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
