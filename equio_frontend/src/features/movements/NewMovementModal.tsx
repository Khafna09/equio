import { useState, useEffect } from 'react';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { useMovements } from '../../hooks/useMovements';
import { useCategories } from '../../hooks/useCategories';
import { NewCategoryForm } from '../categories/NewCategoryForm';
import type { CategoryResponse } from '../../types/category.types';
import { CategorySelector } from '../categories/CategorySelector';
import { AlignLeft, Calendar, ArrowLeft } from 'lucide-react';
import { format, isSameMinute } from 'date-fns';
import { es, enUS } from 'date-fns/locale';
import { DateTimePickerModal } from '../../components/ui/DateTimePickerModal';
import type { TriggerRect } from '../../hooks/useSharedElementModal';
import { AnimatePresence, motion } from 'framer-motion';
import { useCurrency } from '../../hooks/useCurrency';
import { useTimeFormat } from '../../hooks/useTimeFormat';
import { useI18n } from '../../i18n/i18nContextValue';
import { getApiErrorMessage } from '../../utils/apiError';
import { MAX_MONEY_AMOUNT, parsePositiveMoney } from '../../utils/moneyInput';

interface NewMovementModalProps {
  isOpen: boolean;
  onClose: () => void;
  triggerRect?: TriggerRect | null;
}

export function NewMovementModal({ isOpen, onClose, triggerRect }: NewMovementModalProps) {
  const { createMovement } = useMovements(undefined, { enabled: false });
  const { categories, isLoading: isCategoriesLoading } = useCategories();
  const { symbol } = useCurrency();
  const { formatTime } = useTimeFormat();
  const { t, language } = useI18n();

  const [viewMode, setViewMode] = useState<'MOVEMENT' | 'NEW_CATEGORY'>('MOVEMENT');
  const [type, setType] = useState<'EXPENSE' | 'INCOME'>('EXPENSE');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState<Date>(() => new Date());
  const [initialDate, setInitialDate] = useState<Date>(() => new Date());
  const [selectedCategory, setSelectedCategory] = useState<CategoryResponse | null>(null);

  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const resetForm = () => {
    const now = new Date();
    setDate(now);
    setInitialDate(now);
    setAmount('');
    setDescription('');
    setSelectedCategory(null);
    setSubmitError(null);
    setViewMode('MOVEMENT');
    setType('EXPENSE');
  };

  useEffect(() => {
    if (!isOpen) return;
    const timeoutId = window.setTimeout(resetForm, 0);
    return () => window.clearTimeout(timeoutId);
  }, [isOpen]);

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (val.includes('-')) return;
    setAmount(val);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parsePositiveMoney(amount);
    if (parsedAmount === null) {
      setSubmitError(t('common.invalidAmount'));
      return;
    }
    if (date.getTime() > Date.now()) {
      setSubmitError(t('common.invalidDate'));
      return;
    }

    setSubmitError(null);
    setIsSubmitting(true);
    try {
      await createMovement({
        amount: parsedAmount,
        type,
        description,
        categoryId: selectedCategory?.id,
        date: format(date, "yyyy-MM-dd'T'HH:mm:ss")
      });
      resetForm();
      onClose();
    } catch (error: unknown) {
      setSubmitError(getApiErrorMessage(error, t('movements.saveMovementError'), t));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={handleClose}
        title={viewMode === 'MOVEMENT' ? t('movements.newMovement') : t('movements.newCategory')}
        triggerRect={triggerRect}
        isDeemphasized={isDatePickerOpen}
      >
        <AnimatePresence mode="wait">
          {viewMode === 'MOVEMENT' ?(
            <motion.form
              key="movement-form"
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
              transition={{ duration: 0.2 }}
              onSubmit={handleSubmit}
              noValidate
              className="mt-4 flex flex-col gap-5"
            >
              <div className="flex justify-center w-full">
                <div className={`w-full p-1 rounded-2xl transition-colors duration-300 ${type === 'EXPENSE' ?'bg-rose-50/80 dark:bg-rose-950/40 border border-rose-100 dark:border-rose-900/50' : 'bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900/50'}`}>
                  <div className="flex relative w-full rounded-xl p-0.5 overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setType('EXPENSE')}
                      className={`flex-1 py-2 text-sm font-semibold rounded-lg relative z-10 transition-colors duration-200 focus:outline-none ${type === 'EXPENSE' ?'text-rose-700 dark:text-rose-400 font-bold' : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:text-neutral-200 dark:hover:text-neutral-200'}`}
                    >
                      {type === 'EXPENSE' && (
                        <motion.div
                          layoutId="active-type-pill"
                          className="absolute inset-0 bg-white dark:bg-neutral-800 rounded-lg shadow-sm"
                          transition={{ duration: 0.3, ease: [0.2, 0, 0, 1] }}
                          style={{ zIndex: -1 }}
                        />
                      )}
                      {t('common.expense')}
                    </button>
                    <button
                      type="button"
                      onClick={() => setType('INCOME')}
                      className={`flex-1 py-2 text-sm font-semibold rounded-lg relative z-10 transition-colors duration-200 focus:outline-none ${type === 'INCOME' ?'text-emerald-700 dark:text-emerald-400 font-bold' : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:text-neutral-200 dark:hover:text-neutral-200'}`}
                    >
                      {type === 'INCOME' && (
                        <motion.div
                          layoutId="active-type-pill"
                          className="absolute inset-0 bg-white dark:bg-neutral-800 rounded-lg shadow-sm"
                          transition={{ duration: 0.3, ease: [0.2, 0, 0, 1] }}
                          style={{ zIndex: -1 }}
                        />
                      )}
                      {t('common.incomeSingular')}
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex flex-col items-center justify-center my-2">
                <span className="text-xs font-bold text-neutral-400 dark:text-neutral-400 uppercase tracking-wider mb-2">
                  {type === 'EXPENSE' ? t('movements.expenseQuestion') : t('movements.incomeQuestion')}
                </span>
                <div className="flex items-center justify-center gap-1">
                  <span className={`text-3xl font-bold transition-colors ${type === 'EXPENSE' ?'text-red-400' : 'text-emerald-400'}`}>{symbol}</span>
                  <input 
                    type="number" 
                    min="0.01"
                    max={MAX_MONEY_AMOUNT}
                    step="0.01"
                    value={amount}
                    onChange={handleAmountChange}
                    placeholder="0"
                    className="text-5xl font-bold text-center text-neutral-900 dark:text-white bg-transparent outline-none max-w-[200px] placeholder:text-neutral-300 dark:placeholder:text-neutral-600 focus:placeholder:opacity-0 transition-opacity"
                    required
                  />
                </div>
                <div className={`w-12 h-1 rounded-full mt-2 transition-colors ${type === 'EXPENSE' ?'bg-red-500' : 'bg-emerald-500'}`} />
              </div>

              <CategorySelector
                categories={categories}
                isLoading={isCategoriesLoading}
                selectedCategoryId={selectedCategory?.id}
                onSelectCategory={setSelectedCategory}
                onNewCategory={() => setViewMode('NEW_CATEGORY')}
                optional
              />

              <div className="flex gap-3">
                <div className="w-2/5 relative">
                  <button
                    type="button"
                    onClick={() => setIsDatePickerOpen(true)}
                    className="w-full flex items-center gap-2 pl-3 pr-2 py-3 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-2xl text-xs text-neutral-900 dark:text-white focus:outline-none focus:border-primary-500 font-medium hover:bg-neutral-100 dark:hover:bg-neutral-700 dark:hover:bg-neutral-800 transition-colors text-left"
                  >
                    <Calendar className="w-4 h-4 text-neutral-400 shrink-0" />
                    <span className="truncate">
                      {format(date, 'd MMM, yyyy', { locale: language === 'en' ?enUS : es })}
                      {!isSameMinute(date, initialDate) && ` - ${formatTime(date)}`}
                    </span>
                  </button>
                </div>

                <div className="w-3/5 relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-neutral-400">
                    <AlignLeft className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    placeholder={t('common.optionalNote')}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    maxLength={150}
                    className="w-full pl-9 pr-3 py-3 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-2xl text-xs text-neutral-900 dark:text-white placeholder:text-neutral-400 dark:placeholder:text-neutral-500 focus:outline-none focus:border-primary-500"
                  />
                </div>
              </div>

              {submitError && (
                <div className="p-3 rounded-xl bg-tertiary-50 text-tertiary-600 dark:bg-tertiary-950/35 dark:text-tertiary-300 text-sm">
                  {submitError}
                </div>
              )}

              <Button 
                type="submit" 
                variant="primary" 
                className={`w-full py-3.5 text-base font-semibold transition-colors ${type === 'EXPENSE' ?'bg-rose-500 hover:bg-rose-600' : 'bg-emerald-500 hover:bg-emerald-600'}`}
                isLoading={isSubmitting}
                disabled={parsePositiveMoney(amount) === null}
              >
                {type === 'EXPENSE' ?t('movements.saveExpense') : t('movements.saveIncome')} &rarr;
              </Button>
            </motion.form>
          ) : (
            <motion.div
              key="category-form"
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 16 }}
              transition={{ duration: 0.2 }}
            >
              <div className="flex items-center gap-2 mb-3">
                <button
                  type="button"
                  onClick={() => setViewMode('MOVEMENT')}
                  className="p-1.5 text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded-full transition-colors flex items-center gap-1.5 text-xs font-semibold px-3"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>{t('common.back')}</span>
                </button>
              </div>

              <NewCategoryForm
                onSuccess={(newCat) => {
                  setSelectedCategory(newCat);
                  setViewMode('MOVEMENT');
                }}
                onCancel={() => setViewMode('MOVEMENT')}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </Modal>

      <DateTimePickerModal
        isOpen={isDatePickerOpen}
        onClose={() => setIsDatePickerOpen(false)}
        initialDate={date}
        onSave={(newDate) => setDate(newDate)}
      />
    </>
  );
}
