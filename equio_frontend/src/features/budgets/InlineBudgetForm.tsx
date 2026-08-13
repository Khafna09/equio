import { useState, useRef } from 'react';
import { Card } from '../../components/ui/Card';
import { useCategories } from '../../hooks/useCategories';
import { Select } from '../../components/ui/Select';
import { Plus, Check, X } from 'lucide-react';
import { useGSAP } from '@gsap/react';
import { gsap } from 'gsap';
import { Flip } from 'gsap/Flip';
import { useCurrency } from '../../hooks/useCurrency';
import { useI18n } from '../../i18n/i18nContextValue';

gsap.registerPlugin(Flip);
gsap.registerPlugin(useGSAP);

interface InlineBudgetFormProps {
  onSave: (categoryId: number, amount: number) => Promise<void>;
  globalBudgetRemaining: number;
}

export function InlineBudgetForm({ onSave, globalBudgetRemaining }: InlineBudgetFormProps) {
  const { categories } = useCategories();
  const { formatCurrency } = useCurrency();
  const { t } = useI18n();
  const [isExpanded, setIsExpanded] = useState(false);
  const [categoryId, setCategoryId] = useState<number | ''>('');
  const [amount, setAmount] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const amountVal = parseFloat(amount) || 0;
  const isOverLimit = amountVal > globalBudgetRemaining;

  const categoryOptions = categories.map((c) => ({
    value: c.id,
    label: c.name,
    icon: <span className="text-sm md:text-base">{c.icon || t('common.folderIcon')}</span>
  }));

  const toggleExpand = () => {
    const state = Flip.getState(containerRef.current);
    setIsExpanded(!isExpanded);
    if (!isExpanded) {
      setCategoryId('');
      setAmount('');
    }

    setTimeout(() => {
      Flip.from(state, {
        duration: 0.4,
        ease: 'power2.out',
        absolute: true,
      });
    }, 0);
  };

  const handleSave = async () => {
    if (!categoryId || amountVal <= 0 || isOverLimit) {
      if (isOverLimit && inputRef.current) {
        gsap.fromTo(
          inputRef.current,
          { x: -5 },
          { x: 5, duration: 0.05, yoyo: true, repeat: 5, onComplete: () => gsap.set(inputRef.current, { x: 0 }) }
        );
      }
      return;
    }

    setIsSaving(true);
    try {
      await onSave(categoryId as number, amountVal);
      toggleExpand();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div ref={containerRef} className="transition-all duration-300 min-w-0">
      <Card
        className={`h-full min-h-[220px] border-dashed border-2 flex flex-col justify-center transition-colors ${
          isExpanded
            ? 'border-primary-300 dark:border-primary-700 bg-white dark:bg-neutral-800 p-5 shadow-sm overflow-visible'
            : 'border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900/50 hover:bg-neutral-100/70 dark:hover:bg-neutral-800 hover:border-primary-300 cursor-pointer items-center'
        }`}
        onClick={() => !isExpanded && toggleExpand()}
      >
        {!isExpanded ? (
          <>
            <div className="w-10 h-10 rounded-full bg-white dark:bg-neutral-800 shadow-sm flex items-center justify-center text-primary-500 mb-2">
              <Plus className="w-5 h-5" />
            </div>
            <span className="text-sm font-semibold text-neutral-600 dark:text-neutral-300">{t('budgets.addCategory')}</span>
          </>
        ) : (
          <div className="w-full min-w-0" onClick={(e) => e.stopPropagation()}>
            <div className="flex flex-col gap-3">
              <div className="min-w-0">
                <label className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 mb-1 block">
                  {t('common.category')}
                </label>
                <Select
                  options={categoryOptions}
                  value={categoryId}
                  onChange={(val) => setCategoryId(val)}
                  placeholder={t('common.selectCategory')}
                  className="bg-white dark:bg-neutral-900"
                />
              </div>

              <div className="min-w-0">
                <div className="flex flex-wrap justify-between gap-1 mb-1">
                  <label className="text-xs font-semibold text-neutral-500 dark:text-neutral-400">
                    {t('budgets.assignedAmount')}
                  </label>
                  <span className={`text-[11px] font-semibold ${isOverLimit ? 'text-red-500' : 'text-emerald-600 dark:text-emerald-400'}`}>
                    {isOverLimit ? t('budgets.overLimit') : `${t('common.available')}: ${formatCurrency(globalBudgetRemaining)}`}
                  </span>
                </div>
                <input
                  ref={inputRef}
                  type="number"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className={`w-full px-3.5 py-2.5 bg-white dark:bg-neutral-900 border rounded-xl text-sm font-medium text-neutral-900 dark:text-white placeholder:text-neutral-400 dark:placeholder:text-neutral-500 focus:outline-none transition-all ${isOverLimit ? 'border-red-400 focus:border-red-500 ring-2 ring-red-500/20' : 'border-neutral-200 dark:border-neutral-700 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20'}`}
                  placeholder="0.00"
                />
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={isSaving || isOverLimit || !categoryId || !amount}
                  className="p-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center transition-all shadow-sm active:scale-95"
                  title={t('budgets.saveSubBudget')}
                >
                  <Check className="w-5 h-5" />
                </button>
                <button
                  type="button"
                  onClick={toggleExpand}
                  className="p-2.5 bg-neutral-100 dark:bg-neutral-700/80 text-neutral-600 dark:text-neutral-300 rounded-xl hover:bg-neutral-200 dark:hover:bg-neutral-700 flex items-center justify-center transition-all active:scale-95"
                  title={t('common.cancel')}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
