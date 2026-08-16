import { useState } from 'react';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { useMovements } from '../../hooks/useMovements';
import { useCategories } from '../../hooks/useCategories';
import { NewCategoryForm } from '../categories/NewCategoryForm';
import type { CategoryResponse } from '../../types/category.types';
import type { MovementResponse } from '../../types/movement.types';
import { AlignLeft, Plus, Check, Calendar, Trash2, ArrowLeft } from 'lucide-react';
import { format, isSameMinute, parseISO, isValid } from 'date-fns';
import { es, enUS } from 'date-fns/locale';
import { DateTimePickerModal } from '../../components/ui/DateTimePickerModal';
import type { TriggerRect } from '../../hooks/useSharedElementModal';
import { AnimatePresence, motion } from 'framer-motion';
import { useCurrency } from '../../hooks/useCurrency';
import { useTimeFormat } from '../../hooks/useTimeFormat';
import { useI18n } from '../../i18n/i18nContextValue';
import { getApiErrorMessage } from '../../utils/apiError';

interface EditMovementModalProps {
  isOpen: boolean;
  onClose: () => void;
  movement: MovementResponse | null;
  triggerRect?: TriggerRect | null;
}

function parseMovementDate(movement: MovementResponse | null): Date {
  const rawDate = movement?.date || movement?.createdAt;
  if (!rawDate) return new Date();
  try {
    const parsed = parseISO(rawDate);
    return isValid(parsed) ? parsed : new Date();
  } catch {
    return new Date();
  }
}

export function EditMovementModal(props: EditMovementModalProps) {
  const key = `${props.isOpen ? 'open' : 'closed'}-${props.movement?.id ?? 'none'}`;
  return <EditMovementModalContent key={key} {...props} />;
}

function EditMovementModalContent({ isOpen, onClose, movement, triggerRect }: EditMovementModalProps) {
  const { updateMovement, deleteMovement } = useMovements();
  const { categories, isLoading: isCategoriesLoading } = useCategories();
  const { symbol } = useCurrency();
  const { formatTime } = useTimeFormat();
  const { t, language } = useI18n();
  const parsedInitialDate = parseMovementDate(movement);
  const initialCategory = movement?.categoryId != null
    ? categories.find((category) => category.id === movement.categoryId) ?? {
        id: movement.categoryId,
        name: movement.categoryName ?? t('common.uncategorized'),
        color: movement.categoryColor,
        icon: movement.categoryIcon,
      }
    : null;

  const [viewMode, setViewMode] = useState<'MOVEMENT' | 'NEW_CATEGORY'>('MOVEMENT');
  const [type, setType] = useState<'EXPENSE' | 'INCOME'>(movement?.type ?? 'EXPENSE');
  const [amount, setAmount] = useState(movement ? String(movement.amount) : '');
  const [description, setDescription] = useState(movement?.description ?? '');
  const [date, setDate] = useState<Date>(parsedInitialDate);
  const [selectedCategory, setSelectedCategory] = useState<CategoryResponse | null>(initialCategory);

  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [initialDate] = useState<Date>(parsedInitialDate);

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (val.includes('-')) return;
    setAmount(val);
  };

  const handleClose = () => {
    setViewMode('MOVEMENT');
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!movement) return;

    const parsedAmount = Math.abs(parseFloat(amount));
    if (isNaN(parsedAmount) || parsedAmount <= 0) return;

    setSubmitError(null);
    setIsSubmitting(true);
    try {
      await updateMovement({
        id: movement.id,
        data: {
          amount: parsedAmount,
          type,
          description,
          categoryId: selectedCategory?.id ?? null,
          date: format(date, "yyyy-MM-dd'T'HH:mm:ss")
        }
      });
      handleClose();
    } catch (error: unknown) {
      setSubmitError(getApiErrorMessage(error, t('movements.updateMovementError')));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!movement) return;
    if (!window.confirm(t('movements.deleteConfirm'))) return;

    setIsDeleting(true);
    try {
      await deleteMovement(movement.id);
      handleClose();
    } catch (error: unknown) {
      setSubmitError(getApiErrorMessage(error, t('movements.deleteMovementError')));
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={handleClose}
        title={viewMode === 'MOVEMENT' ? t('movements.editMovement') : t('movements.newCategory')}
        triggerRect={triggerRect}
        isDeemphasized={isDatePickerOpen}
      >
        <AnimatePresence mode="wait">
          {viewMode === 'MOVEMENT' ? (
            <motion.form
              key="movement-edit-form"
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
              transition={{ duration: 0.2 }}
              onSubmit={handleSubmit}
              noValidate
              className="mt-4 flex flex-col gap-5"
            >
              <div className="flex justify-center w-full">
                <div className={`w-full p-1 rounded-2xl transition-colors duration-300 ${type === 'EXPENSE' ? 'bg-rose-50/80 dark:bg-rose-950/40 border border-rose-100 dark:border-rose-900/50' : 'bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900/50'}`}>
                  <div className="flex relative w-full rounded-xl p-0.5 overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setType('EXPENSE')}
                      className={`flex-1 py-2 text-sm font-semibold rounded-lg relative z-10 transition-colors duration-200 focus:outline-none ${type === 'EXPENSE' ? 'text-rose-700 dark:text-rose-400 font-bold' : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:text-neutral-200 dark:hover:text-neutral-200'}`}
                    >
                      {type === 'EXPENSE' && (
                        <motion.div
                          layoutId="active-edit-type-pill"
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
                      className={`flex-1 py-2 text-sm font-semibold rounded-lg relative z-10 transition-colors duration-200 focus:outline-none ${type === 'INCOME' ? 'text-emerald-700 dark:text-emerald-400 font-bold' : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:text-neutral-200 dark:hover:text-neutral-200'}`}
                    >
                      {type === 'INCOME' && (
                        <motion.div
                          layoutId="active-edit-type-pill"
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
                  <span className={`text-3xl font-bold transition-colors ${type === 'EXPENSE' ? 'text-red-400' : 'text-emerald-400'}`}>{symbol}</span>
                  <input 
                    type="number" 
                    min="0"
                    step="1"
                    value={amount}
                    onChange={handleAmountChange}
                    placeholder="0"
                    className="text-5xl font-bold text-center text-neutral-900 dark:text-white bg-transparent outline-none max-w-[200px] placeholder:text-neutral-300 dark:placeholder:text-neutral-600 focus:placeholder:opacity-0 transition-opacity"
                    required
                  />
                </div>
                <div className={`w-12 h-1 rounded-full mt-2 transition-colors ${type === 'EXPENSE' ? 'bg-red-500' : 'bg-emerald-500'}`} />
              </div>

              <div>
                <span className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 block text-center mb-3">
                  {t('common.selectCategoryOptional')}
                </span>

                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-40 overflow-y-auto p-1">
                  {isCategoriesLoading ? (
                    <div className="col-span-full text-center py-3 text-xs text-neutral-400">{t('categories.loading')}</div>
                  ) : (
                    categories.map((cat) => {
                      const isSelected = selectedCategory?.id === cat.id;
                      const catColor = cat.color || '#6366F1';

                      return (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => setSelectedCategory(isSelected ? null : cat)}
                          className={`
                            relative flex flex-col items-center justify-center p-2 rounded-xl transition-all duration-200 min-h-[64px]
                            ${isSelected ? 'ring-2 ring-offset-1 scale-[1.02] shadow-sm' : 'hover:scale-[1.02]'}
                          `}
                          style={{
                            backgroundColor: `${catColor}18`,
                            color: catColor,
                            borderColor: isSelected ? catColor : 'transparent'
                          }}
                        >
                          {isSelected && (
                            <div 
                              className="absolute top-1 right-1 w-3.5 h-3.5 rounded-full flex items-center justify-center text-white text-[9px]"
                              style={{ backgroundColor: catColor }}
                            >
                              <Check className="w-2.5 h-2.5" />
                            </div>
                          )}
                          <span className="text-lg mb-0.5">{cat.icon || t('common.folderIcon')}</span>
                          <span className="text-[11px] font-semibold truncate max-w-full text-center leading-tight">{cat.name}</span>
                        </button>
                      );
                    })
                  )}

                  <button
                    type="button"
                    onClick={() => setViewMode('NEW_CATEGORY')}
                    className="flex flex-col items-center justify-center p-2 rounded-xl border border-dashed border-neutral-300 dark:border-neutral-700 text-neutral-400 dark:text-neutral-400 hover:border-primary-400 hover:text-primary-500 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-all min-h-[64px]"
                  >
                    <Plus className="w-4 h-4 mb-0.5" />
                    <span className="text-[11px] font-medium">{t('categories.newShort')}</span>
                  </button>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="w-2/5 relative">
                  <button
                    type="button"
                    onClick={() => setIsDatePickerOpen(true)}
                    className="w-full flex items-center gap-2 pl-3 pr-2 py-3 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-2xl text-xs text-neutral-900 dark:text-white focus:outline-none focus:border-primary-500 font-medium hover:bg-neutral-100 dark:hover:bg-neutral-700 dark:hover:bg-neutral-800 transition-colors text-left"
                  >
                    <Calendar className="w-4 h-4 text-neutral-400 shrink-0" />
                    <span className="truncate">
                      {format(date, 'd MMM, yyyy', { locale: language === 'en' ? enUS : es })}
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
                    className="w-full pl-9 pr-3 py-3 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-2xl text-xs text-neutral-900 dark:text-white placeholder:text-neutral-400 dark:placeholder:text-neutral-500 focus:outline-none focus:border-primary-500"
                  />
                </div>
              </div>

              {submitError && (
                <div className="p-3 rounded-xl bg-tertiary-50 text-tertiary-600 text-sm">
                  {submitError}
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <Button
                  type="button"
                  variant="secondary"
                  className="py-3.5 px-4 text-rose-500 hover:bg-rose-50 hover:text-rose-600 border-none bg-neutral-100 dark:bg-neutral-800"
                  onClick={handleDelete}
                  isLoading={isDeleting}
                  disabled={isSubmitting}
                >
                  <Trash2 className="w-5 h-5" />
                </Button>
                <Button 
                  type="submit" 
                  variant="primary" 
                  className={`flex-1 py-3.5 text-base font-semibold transition-colors ${type === 'EXPENSE' ? 'bg-rose-500 hover:bg-rose-600' : 'bg-emerald-500 hover:bg-emerald-600'}`}
                  isLoading={isSubmitting}
                  disabled={!amount || parseFloat(amount) <= 0 || isDeleting}
                >
                  {t('common.saveChanges')} &rarr;
                </Button>
              </div>
            </motion.form>
          ) : (
            <motion.div
              key="category-edit-form"
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
