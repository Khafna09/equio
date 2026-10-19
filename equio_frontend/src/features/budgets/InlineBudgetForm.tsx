import { useState, useRef } from 'react';
import { Card } from '../../components/ui/Card';
import { useCategories } from '../../hooks/useCategories';
import { Select } from '../../components/ui/Select';
import { Plus, Check, X } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { useGSAP } from '@gsap/react';
import { gsap } from 'gsap';
import { useCurrency } from '../../hooks/useCurrency';
import { useI18n } from '../../i18n/i18nContextValue';
import { getApiErrorMessage } from '../../utils/apiError';
import { MAX_MONEY_AMOUNT, parsePositiveMoney } from '../../utils/moneyInput';

gsap.registerPlugin(useGSAP);

interface InlineBudgetFormProps {
  onSave: (categoryId: number, amount: number, categoryName: string) => Promise<void>;
  globalBudgetRemaining: number;
  assignedCategoryIds: number[];
}

export function InlineBudgetForm({ onSave, globalBudgetRemaining, assignedCategoryIds }: InlineBudgetFormProps) {
  const { categories } = useCategories();
  const { formatCurrency } = useCurrency();
  const { t } = useI18n();
  const [isExpanded, setIsExpanded] = useState(false);
  const [categoryId, setCategoryId] = useState<number | ''>('');
  const [amount, setAmount] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);

  const parsedAmount = parsePositiveMoney(amount);
  const amountVal = parsedAmount ?? 0;
  const isOverLimit = amountVal > globalBudgetRemaining;

  const categoryOptions = categories.filter((c) => !assignedCategoryIds.includes(c.id)).map((c) => ({
    value: c.id,
    label: c.name,
    icon: <span className="text-sm md:text-base">{c.icon || t('common.folderIcon')}</span>
  }));

  const toggleExpand = () => {
    setIsExpanded((prev) => !prev);
    if (isExpanded) {
      setCategoryId('');
      setAmount('');
    }
  };

  const handleSave = async () => {
    if (isSaving || !categoryId || assignedCategoryIds.includes(Number(categoryId)) || parsedAmount === null || isOverLimit) {
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
    setSaveError(null);
    try {
      const category = categories.find((candidate) => candidate.id === Number(categoryId));
      if (!category) return;
      await onSave(category.id, parsedAmount, category.name);
      setIsExpanded(false);
      setCategoryId('');
      setAmount('');
    } catch (error: unknown) {
      setSaveError(getApiErrorMessage(error, t('budgetDrawer.saveError'), t));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-w-0">
      <Card
        className={`h-full min-h-[220px] border-dashed border-2 flex flex-col justify-center transition-colors ${
          isExpanded
            ? 'border-primary-300 dark:border-primary-700 bg-white dark:bg-neutral-800 p-5 shadow-sm overflow-visible'
            : 'border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900/50 hover:bg-neutral-100/70 dark:hover:bg-neutral-800 hover:border-primary-300 cursor-pointer items-center'
        }`}
        onClick={() => !isExpanded && toggleExpand()}
      >
        <AnimatePresence mode="wait" initial={false}>
          {!isExpanded ? (
            <motion.div
              key="collapsed"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="flex flex-col items-center justify-center w-full"
            >
              <div className="w-10 h-10 rounded-full bg-white dark:bg-neutral-800 shadow-sm flex items-center justify-center text-primary-500 mb-2">
                <Plus className="w-5 h-5" />
              </div>
              <span className="text-sm font-semibold text-neutral-600 dark:text-neutral-300">{t('budgets.addCategory')}</span>
            </motion.div>
          ) : (
            <motion.div
              key="form"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.15 }}
              className="w-full min-w-0"
              onClick={(e) => e.stopPropagation()}
            >
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
                    min="0.01"
                    max={MAX_MONEY_AMOUNT}
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className={`w-full px-3.5 py-2.5 bg-white dark:bg-neutral-900 border rounded-xl text-sm font-medium text-neutral-900 dark:text-white placeholder:text-neutral-400 dark:placeholder:text-neutral-500 focus:outline-none transition-all ${isOverLimit ? 'border-red-400 focus:border-red-500 ring-2 ring-red-500/20' : 'border-neutral-200 dark:border-neutral-700 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20'}`}
                    placeholder="0.00"
                  />
                </div>

                {saveError ? (
                  <p className="text-xs text-rose-600 dark:text-rose-400">{saveError}</p>
                ) : null}

                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={isSaving || isOverLimit || !categoryId || parsedAmount === null}
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
            </motion.div>
          )}
        </AnimatePresence>
      </Card>
    </div>
  );
}
