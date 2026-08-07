import { useState, useEffect } from 'react';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Button } from '../../components/ui/Button';
import { useBudgets } from '../../hooks/useBudgets';
import { useCategories } from '../../hooks/useCategories';
import { useCurrency } from '../../hooks/useCurrency';
import { format } from 'date-fns';
import { es, enUS } from 'date-fns/locale';
import { CategorySelector } from '../categories/CategorySelector';
import { NewCategoryForm } from '../categories/NewCategoryForm';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, X } from 'lucide-react';
import { createPortal } from 'react-dom';
import { useI18n } from '../../i18n/I18nContext';

interface BudgetDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  budgetToEdit?: any;
  defaultIsGlobal?: boolean;
  isAdvancedMode?: boolean;
  independentBudgets?: any[];
}

export function BudgetDrawer({ 
  isOpen, 
  onClose, 
  budgetToEdit, 
  defaultIsGlobal = true,
  isAdvancedMode = false,
  independentBudgets = []
}: BudgetDrawerProps) {
  const { createBudget, updateBudget, budgets } = useBudgets();
  const { categories, isLoading: isCategoriesLoading } = useCategories();
  const { symbol } = useCurrency();
  const { t, language } = useI18n();

  const [viewMode, setViewMode] = useState<'FORM' | 'NEW_CATEGORY'>('FORM');
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');

  // Alcance
  const [isGlobal, setIsGlobal] = useState(true);
  const [categoryId, setCategoryId] = useState<number | ''>('');

  // Periodo
  const [isFixed, setIsFixed] = useState(true);
  const [startDay, setStartDay] = useState(1);
  const [startDate, setStartDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [catchUpOption, setCatchUpOption] = useState<'RETROACTIVE' | 'FROM_TODAY'>('RETROACTIVE');
  const [futureRenewDay, setFutureRenewDay] = useState<number | ''>('');
  const [hasInteractedWithPeriod, setHasInteractedWithPeriod] = useState(false);
  
  // Modos Avanzados
  const [selectedSubBudgetsToAdopt, setSelectedSubBudgetsToAdopt] = useState<number[]>([]);
  const [isIndependentCategory, setIsIndependentCategory] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const globalBudget = budgets.find(b => b.status === 'ACTIVE' && !b.categoryId);

  useEffect(() => {
    if (isOpen) {
      setCatchUpOption('RETROACTIVE');
      if (budgetToEdit) {
        setName(budgetToEdit.name || '');
        setAmount(budgetToEdit.totalAmount ? String(budgetToEdit.totalAmount) : '');
        setIsGlobal(!budgetToEdit.categoryId);
        setCategoryId(budgetToEdit.categoryId || '');
        setIsFixed(budgetToEdit.isFixed);
        
        if (budgetToEdit.isFixed) {
          if (budgetToEdit.startDate) {
            const day = new Date(budgetToEdit.startDate + 'T00:00:00').getDate();
            setStartDay(day || 1);
          }
        } else {
          if (budgetToEdit.startDate) setStartDate(budgetToEdit.startDate);
          if (budgetToEdit.endDate) setEndDate(budgetToEdit.endDate);
        }
      } else {
        setName('');
        setAmount('');
        setIsGlobal(defaultIsGlobal);
        setCategoryId('');
        if (globalBudget && !defaultIsGlobal) {
          setIsFixed(globalBudget.isFixed);
          if (globalBudget.isFixed) {
            if (globalBudget.startDate) {
              const day = new Date(globalBudget.startDate + 'T00:00:00').getDate();
              setStartDay(day || 1);
            }
          } else {
            if (globalBudget.startDate) setStartDate(globalBudget.startDate);
            if (globalBudget.endDate) setEndDate(globalBudget.endDate);
          }
        } else {
          setIsFixed(true);
          setStartDay(1);
          setStartDate(format(new Date(), 'yyyy-MM-dd'));
          setEndDate(format(new Date(), 'yyyy-MM-dd'));
        }
      }
      setSubmitError(null);
      setViewMode('FORM');
      setHasInteractedWithPeriod(false);
      setFutureRenewDay('');
    }
  }, [isOpen, budgetToEdit, globalBudget, defaultIsGlobal]);

  const handleClose = () => {
    setViewMode('FORM');
    onClose();
  };

  const submitData = async () => {
    setSubmitError(null);
    setIsSubmitting(true);
    try {
      let finalStartDate = startDate;
      let finalEndDate = endDate;
      let isRetroactive = false;

      if (isFixed) {
        const today = new Date();
        const todayDay = today.getDate();
        const currentMonth = today.getMonth();
        const currentYear = today.getFullYear();

        if (budgetToEdit) {
          finalStartDate = budgetToEdit.startDate;
          finalEndDate = budgetToEdit.endDate;
          isRetroactive = false;
        } else {
          const renewDay = Number(futureRenewDay) || 1;
          let effectiveCatchUpOption = catchUpOption;
          if (!isAdvancedMode && renewDay === todayDay) {
            effectiveCatchUpOption = 'FROM_TODAY';
          }

          if (effectiveCatchUpOption === 'RETROACTIVE') {
            if (!isAdvancedMode) {
              // Modo Normal: Retroactivo desde el da elegido del mes correspondiente
              let cycleStart: Date;
              if (renewDay > todayDay) {
                 cycleStart = new Date(currentYear, currentMonth - 1, renewDay);
              } else {
                 cycleStart = new Date(currentYear, currentMonth, renewDay);
              }
              const cycleEnd = new Date(cycleStart);
              cycleEnd.setMonth(cycleEnd.getMonth() + 1);
              cycleEnd.setDate(cycleEnd.getDate() - 1);
              
              finalStartDate = format(cycleStart, 'yyyy-MM-dd');
              finalEndDate = format(cycleEnd, 'yyyy-MM-dd');
              isRetroactive = true;
            } else {
              // Modo Avanzado (opcin 1): Retroactivo siempre desde el da 1 de este mes
              const start = new Date(currentYear, currentMonth, 1);
              const end = new Date(currentYear, currentMonth + 1, 0);
              finalStartDate = format(start, 'yyyy-MM-dd');
              finalEndDate = format(end, 'yyyy-MM-dd');
              isRetroactive = true;
            }
          } else {
            // Opcin 2 / Desde Hoy: Empezar hoy en $0 y definir da de reinicio futuro
            finalStartDate = format(today, 'yyyy-MM-dd');
            
            let nextCycleStart: Date;
            if (renewDay > todayDay) {
              nextCycleStart = new Date(currentYear, currentMonth, renewDay);
            } else {
              nextCycleStart = new Date(currentYear, currentMonth + 1, renewDay);
            }
            
            const firstCycleEnd = new Date(nextCycleStart);
            firstCycleEnd.setDate(firstCycleEnd.getDate() - 1);

            finalEndDate = format(firstCycleEnd, 'yyyy-MM-dd');
            isRetroactive = false;
          }
        }
      }

      const data = {
        name: isGlobal ? 'Presupuesto Global' : name,
        totalAmount: parseFloat(amount),
        isFixed,
        startDate: finalStartDate,
        endDate: finalEndDate,
        categoryId: isGlobal ? undefined : (categoryId as number),
        retroactiveCatchUp: isRetroactive,
        subBudgetsToAdopt: (isGlobal && isAdvancedMode) ? selectedSubBudgetsToAdopt : undefined,
        isIndependent: (!isGlobal && isAdvancedMode) ? isIndependentCategory : false
      };

      if (budgetToEdit) {
        await updateBudget({ id: budgetToEdit.id, data });
      } else {
        await createBudget(data);
      }
      handleClose();
    } catch (error: any) {
      const backendMessage = error?.response?.data?.message;
      setSubmitError(backendMessage || error?.message || t('budgetDrawer.saveError'));
      setViewMode('FORM');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount) return;
    if (!isGlobal && (!categoryId || !name)) return;
    if (!isAdvancedMode && isFixed && !budgetToEdit && !futureRenewDay) return;
    submitData();
  };

  const isGlobalDisabled = !budgetToEdit && globalBudget != null;
  const isCategoryDisabled = !budgetToEdit && !globalBudget && !isAdvancedMode;

  useEffect(() => {
    if (isGlobalDisabled && !budgetToEdit) {
      setIsGlobal(false);
    }
  }, [isGlobalDisabled, budgetToEdit]);

  if (typeof window === 'undefined') return null;

  const renderFormMode = () => (
    <motion.form 
      key="budget-form"
      initial={{ opacity: 0, x: -16 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -16 }}
      transition={{ duration: 0.2 }}
      onSubmit={handleSubmit} 
      className="flex flex-col gap-4"
    >
      <div className="text-center">
        <label className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider mb-1 block">
          {t('budgetDrawer.limitAmount')}
        </label>
        <div className="flex items-center justify-center">
          <span className="text-[32px] font-semibold text-neutral-400 mr-1">{symbol}</span>
          <input
            type="number"
            step="0.01"
            placeholder="0.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full text-[32px] text-center font-semibold text-neutral-900 dark:text-white bg-transparent border-none outline-none focus:ring-0 p-0 placeholder:text-neutral-300 dark:placeholder:text-neutral-600 dark:text-neutral-300"
            required
            autoFocus
          />
        </div>
        <div className="h-px bg-neutral-200 dark:bg-neutral-700 mt-1 mx-12 transition-colors focus-within:bg-primary-500" />
      </div>

      {!budgetToEdit ? (
        <div className="space-y-4">
          {(!isCategoryDisabled || isAdvancedMode) && (
            <div>
              <label className="text-[12px] font-semibold text-neutral-400 uppercase tracking-wider mb-2 block">{t('budgetDrawer.scope')}</label>
              <div className="flex gap-2 p-1 bg-neutral-100 dark:bg-neutral-800 rounded-xl relative">
                {/* Highlight background */}
                <motion.div 
                  className="absolute inset-y-1 rounded-lg bg-white dark:bg-neutral-700 shadow-sm"
                  layoutId="scope-highlight"
                  initial={false}
                  animate={{
                    left: isGlobal ? '4px' : '50%',
                    right: isGlobal ? '50%' : '4px'
                  }}
                  transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                />
                <button
                  type="button"
                  disabled={isGlobalDisabled}
                  className={`relative z-10 flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${isGlobalDisabled ? 'opacity-50 cursor-not-allowed text-neutral-400' : isGlobal ? 'text-neutral-900 dark:text-white font-semibold' : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-white'}`}
                  onClick={() => setIsGlobal(true)}
                >
                  {t('budgetDrawer.global')} {isGlobalDisabled && `(${t('budgetDrawer.alreadyExists')})`}
                </button>
                <button
                  type="button"
                  disabled={isCategoryDisabled}
                  className={`relative z-10 flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${isCategoryDisabled ? 'opacity-50 cursor-not-allowed text-neutral-400' : !isGlobal ? 'text-neutral-900 dark:text-white font-semibold' : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-white'}`}
                  onClick={() => setIsGlobal(false)}
                >
                  {t('budgetDrawer.byCategory')} {isCategoryDisabled && `(${t('budgetDrawer.requiresGlobal')})`}
                </button>
              </div>
            </div>
          )}

          {!isGlobal && (
            <div className="space-y-4 bg-neutral-50 dark:bg-neutral-900 p-4 rounded-2xl border border-neutral-100 dark:border-neutral-700">
              <Input
                label={t('budgetDrawer.descriptiveName')}
                placeholder={t('budgetDrawer.weekendExample')}
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
              <CategorySelector
                categories={categories}
                isLoading={isCategoriesLoading}
                selectedCategoryId={categoryId as number}
                onSelectCategory={(cat) => setCategoryId(cat ? cat.id : '')}
                onNewCategory={() => setViewMode('NEW_CATEGORY')}
              />
              
              {isAdvancedMode && globalBudget && (
                <div className="pt-2 border-t border-neutral-200 dark:border-neutral-700 mt-4">
                  <label className="flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors bg-white dark:bg-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800 shadow-sm border-neutral-200 dark:border-neutral-700">
                    <input 
                      type="checkbox" 
                      className="mt-1 accent-primary-600 w-4 h-4 rounded"
                      checked={isIndependentCategory}
                      onChange={(e) => setIsIndependentCategory(e.target.checked)}
                    />
                    <div>
                      <div className="font-medium text-sm text-neutral-900 dark:text-white">{t('budgetDrawer.keepIndependent')}</div>
                      <div className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">{t('budgetDrawer.keepIndependentHint')}</div>
                    </div>
                  </label>
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        !isGlobal && (
          <div className="space-y-4 bg-neutral-50 dark:bg-neutral-900 p-4 rounded-2xl border border-neutral-100 dark:border-neutral-700">
            <Input
              label={t('budgetDrawer.descriptiveName')}
              placeholder={t('budgetDrawer.weekendExample')}
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
            <CategorySelector
              categories={categories}
              isLoading={isCategoriesLoading}
              selectedCategoryId={categoryId as number}
              onSelectCategory={(cat) => setCategoryId(cat ? cat.id : '')}
              onNewCategory={() => setViewMode('NEW_CATEGORY')}
            />
          </div>
        )
      )}

      {isGlobal && isAdvancedMode && !budgetToEdit && independentBudgets.length > 0 && (
        <div className="space-y-4 bg-primary-50/50 dark:bg-primary-950/30 p-4 rounded-2xl border border-primary-100 dark:border-primary-800">
          <h4 className="text-sm font-semibold text-primary-900 dark:text-primary-200">{t('budgetDrawer.linkIndependent')}</h4>
          <p className="text-xs text-primary-700 dark:text-primary-300">{t('budgetDrawer.linkIndependentHint')}</p>
          <div className="space-y-2 max-h-40 overflow-y-auto pr-2">
            {independentBudgets.map(ib => (
              <label key={ib.id} className="flex items-center gap-3 p-2 rounded-lg bg-white dark:bg-neutral-800 border border-primary-100 cursor-pointer hover:bg-primary-50 dark:hover:bg-primary-950/40 transition-colors">
                <input 
                  type="checkbox"
                  className="accent-primary-600 w-4 h-4 rounded"
                  checked={selectedSubBudgetsToAdopt.includes(ib.id)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedSubBudgetsToAdopt([...selectedSubBudgetsToAdopt, ib.id]);
                    } else {
                      setSelectedSubBudgetsToAdopt(selectedSubBudgetsToAdopt.filter(id => id !== ib.id));
                    }
                  }}
                />
                <div className="flex-1 flex justify-between items-center text-sm">
                  <span className="font-medium text-neutral-900 dark:text-white">{ib.name}</span>
                  <span className="text-neutral-500 dark:text-neutral-400">${ib.totalAmount}</span>
                </div>
              </label>
            ))}
          </div>
        </div>
      )}

      {(isGlobal || !globalBudget || (isAdvancedMode && isIndependentCategory)) && (
        <div className="space-y-4">
          <div>
            <label className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider mb-1.5 block">{t('budgetDrawer.period')} {budgetToEdit && `(${t('budgetDrawer.notEditable')})`}</label>
            <div className={`flex gap-2 p-1 bg-neutral-100 dark:bg-neutral-800 rounded-xl relative ${budgetToEdit ? 'opacity-60 pointer-events-none' : ''}`}>
              <motion.div 
                className="absolute inset-y-1 rounded-lg bg-white dark:bg-neutral-800 shadow-sm"
                layoutId="period-highlight"
                initial={false}
                animate={{
                  left: isFixed ? '4px' : '50%',
                  right: isFixed ? '50%' : '4px'
                }}
                transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
              />
              <button
                type="button"
                disabled={!!budgetToEdit}
                className={`relative z-10 flex-1 py-1.5 text-xs sm:text-sm font-medium rounded-lg transition-colors ${isFixed ? 'text-neutral-900 dark:text-white font-semibold' : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-white'}`}
                onClick={() => setIsFixed(true)}
              >
                 {t('common.monthly')}
              </button>
              <button
                type="button"
                disabled={!!budgetToEdit}
                className={`relative z-10 flex-1 py-1.5 text-xs sm:text-sm font-medium rounded-lg transition-colors ${!isFixed ? 'text-neutral-900 dark:text-white font-semibold' : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-white'}`}
                onClick={() => setIsFixed(false)}
              >
                 {t('common.byDates')}
              </button>
            </div>
          </div>

          <AnimatePresence mode="popLayout">
            {isFixed ? (
              <motion.div 
                key="monthly"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-3"
              >
                {!budgetToEdit ? (
                  isAdvancedMode ? (
                    // -------- MODO AVANZADO --------
                    <div className="space-y-3">
                      <label className="text-xs font-semibold text-neutral-400 uppercase tracking-wider block">
                        {t('budgetDrawer.startMonthlyQuestion')}
                      </label>

                      {/* Opcin 1: Sincronizar desde un da pasado */}
                      <div 
                        className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                          catchUpOption === 'RETROACTIVE' 
                            ? 'bg-purple-50/70 dark:bg-primary-950/40 border-primary-500 shadow-sm' 
                            : 'bg-neutral-50 dark:bg-neutral-900/70 border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800'
                        }`}
                        onClick={() => setCatchUpOption('RETROACTIVE')}
                      >
                        <div className="flex items-start gap-3">
                          <input
                            type="radio"
                            name="catchUpOption"
                            checked={catchUpOption === 'RETROACTIVE'}
                            onChange={() => setCatchUpOption('RETROACTIVE')}
                            className="mt-1 text-primary-600 focus:ring-primary-500"
                          />
                          <div className="flex-1 space-y-1">
                            <div className="font-bold text-sm text-neutral-900 dark:text-white">
                              {t('budgetDrawer.syncMonth')}
                            </div>
                            <p className="text-xs text-neutral-500 dark:text-neutral-400">
                              {t('budgetDrawer.syncMonthHint')}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Opcin 2: {t('budgetDrawer.startToday')} */}
                      <div 
                        className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                          catchUpOption === 'FROM_TODAY' 
                            ? 'bg-purple-50/70 dark:bg-primary-950/40 border-primary-500 shadow-sm' 
                            : 'bg-neutral-50 dark:bg-neutral-900/70 border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800'
                        }`}
                        onClick={() => setCatchUpOption('FROM_TODAY')}
                      >
                        <div className="flex items-start gap-3">
                          <input
                            type="radio"
                            name="catchUpOption"
                            checked={catchUpOption === 'FROM_TODAY'}
                            onChange={() => setCatchUpOption('FROM_TODAY')}
                            className="mt-1 text-primary-600 focus:ring-primary-500"
                          />
                          <div className="flex-1 space-y-2">
                            <div className="font-bold text-sm text-neutral-900 dark:text-white">
                              {t('budgetDrawer.startToday')}
                            </div>
                            <p className="text-xs text-neutral-500 dark:text-neutral-400">
                              {t('budgetDrawer.startTodayHint')}
                            </p>

                            {catchUpOption === 'FROM_TODAY' && (
                              <motion.div 
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                className="pt-3 flex items-center justify-between border-t border-purple-200/60"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <span className="text-xs font-semibold text-neutral-700 dark:text-neutral-200">{t('budgetDrawer.futureStartDay')}</span>
                                <div className="w-28">
                                  <Select
                                    value={futureRenewDay}
                                    onChange={(val) => setFutureRenewDay(Number(val))}
                                    options={Array.from({ length: 31 }, (_, i) => ({ value: i + 1, label: `${t('common.day')} ${i + 1}` }))}
                                  />
                                </div>
                              </motion.div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    // -------- MODO NORMAL (Revelacin Progresiva) --------
                    <div className="space-y-3">
                      <div className="space-y-1">
                        <label className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider block">
                          {t('budgetDrawer.monthStartQuestion')}
                        </label>
                        <Select
                          value={futureRenewDay}
                          onChange={(val) => {
                            const num = Number(val);
                            setFutureRenewDay(num);
                            setHasInteractedWithPeriod(true);
                          }}
                          placeholder={t('budgetDrawer.selectStartDay')}
                          options={Array.from({ length: 31 }, (_, i) => ({ value: i + 1, label: t('budgetDrawer.dayEachMonth', { day: i + 1 }) }))}
                        />
                      </div>

                      <AnimatePresence mode="popLayout">
                        {hasInteractedWithPeriod && futureRenewDay !== '' && futureRenewDay !== new Date().getDate() && (
                          <motion.div 
                            initial={{ opacity: 0, y: -8, height: 0 }}
                            animate={{ opacity: 1, y: 0, height: 'auto' }}
                            exit={{ opacity: 0, y: -8, height: 0 }}
                            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                            className="space-y-2 pt-2 border-t border-neutral-100 dark:border-neutral-700 overflow-hidden"
                          >
                            <label className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider block">
                              {t('budgetDrawer.measureStart')}
                            </label>
                            
                            {/* Tarjeta A */}
                            <motion.div 
                              whileTap={{ scale: 0.98 }}
                              className={`p-3 rounded-xl border transition-all cursor-pointer ${
                                catchUpOption === 'RETROACTIVE' 
                                  ? 'bg-primary-50/30 dark:bg-primary-950/40 border-primary-600 shadow-[0_2px_8px_rgba(108,92,231,0.08)] opacity-100' 
                                  : 'bg-white dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800 hover:border-neutral-300 opacity-60'
                              }`}
                              onClick={() => setCatchUpOption('RETROACTIVE')}
                            >
                              <div className="flex items-start gap-2.5">
                                {/* Custom Radio Circle */}
                                <div className={`mt-0.5 flex-shrink-0 w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors ${
                                  catchUpOption === 'RETROACTIVE' ? 'border-primary-600' : 'border-neutral-300'
                                }`}>
                                  <motion.div 
                                    initial={false}
                                    animate={{ scale: catchUpOption === 'RETROACTIVE' ? 1 : 0 }}
                                    transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                                    className="w-2 h-2 rounded-full bg-primary-600"
                                  />
                                </div>
                                <div className="flex-1 space-y-0.5">
                                  <div className="font-bold text-xs sm:text-sm text-neutral-900 dark:text-white">
                                    {t('budgetDrawer.includeMonthExpenses')}
                                  </div>
                                  <p className="text-[11px] leading-tight text-neutral-500 dark:text-neutral-400">
                                    {(() => {
                                      const today = new Date();
                                      const targetDay = Number(futureRenewDay) || 1;
                                      let cycleStart: Date;
                                      if (targetDay > today.getDate()) {
                                         cycleStart = new Date(today.getFullYear(), today.getMonth() - 1, targetDay);
                                      } else {
                                         cycleStart = new Date(today.getFullYear(), today.getMonth(), targetDay);
                                      }
                                      const diffTime = Math.abs(today.getTime() - cycleStart.getTime());
                                      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                                      const monthName = format(cycleStart, 'MMMM', { locale: language === 'en' ? enUS : es });
                                      const capitalizedMonth = monthName.charAt(0).toUpperCase() + monthName.slice(1);
                                      return t('budgetDrawer.includeMonthExpensesHint', { day: targetDay, month: capitalizedMonth, count: diffDays, plural: diffDays !== 1 ? 's' : '' });
                                    })()}
                                  </p>
                                </div>
                              </div>
                            </motion.div>

                            {/* Tarjeta B */}
                            <motion.div 
                              whileTap={{ scale: 0.98 }}
                              className={`p-3 rounded-xl border transition-all cursor-pointer ${
                                catchUpOption === 'FROM_TODAY' 
                                  ? 'bg-primary-50/30 dark:bg-primary-950/40 border-primary-600 shadow-[0_2px_8px_rgba(108,92,231,0.08)] opacity-100' 
                                  : 'bg-white dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800 hover:border-neutral-300 opacity-60'
                              }`}
                              onClick={() => setCatchUpOption('FROM_TODAY')}
                            >
                              <div className="flex items-start gap-2.5">
                                {/* Custom Radio Circle */}
                                <div className={`mt-0.5 flex-shrink-0 w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors ${
                                  catchUpOption === 'FROM_TODAY' ? 'border-primary-600' : 'border-neutral-300'
                                }`}>
                                  <motion.div 
                                    initial={false}
                                    animate={{ scale: catchUpOption === 'FROM_TODAY' ? 1 : 0 }}
                                    transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                                    className="w-2 h-2 rounded-full bg-primary-600"
                                  />
                                </div>
                                <div className="flex-1 space-y-0.5">
                                  <div className="font-bold text-xs sm:text-sm text-neutral-900 dark:text-white">
                                    {t('budgetDrawer.startFromZeroToday')}
                                  </div>
                                  <p className="text-[11px] leading-tight text-neutral-500 dark:text-neutral-400">
                                    {(() => {
                                      const today = new Date();
                                      const targetDay = Number(futureRenewDay) || 1;
                                      
                                      let nextCycleStart: Date;
                                      if (targetDay > today.getDate()) {
                                        nextCycleStart = new Date(today.getFullYear(), today.getMonth(), targetDay);
                                      } else {
                                        nextCycleStart = new Date(today.getFullYear(), today.getMonth() + 1, targetDay);
                                      }
                                      
                                      const firstCycleEnd = new Date(nextCycleStart);
                                      firstCycleEnd.setDate(firstCycleEnd.getDate() - 1);
                                      
                                      const endMonthName = format(firstCycleEnd, 'MMMM', { locale: language === 'en' ? enUS : es });
                                      const capitalizedEndMonth = endMonthName.charAt(0).toUpperCase() + endMonthName.slice(1);
                                      
                                      return t('budgetDrawer.startFromZeroHint', { day: firstCycleEnd.getDate(), month: capitalizedEndMonth });
                                    })()}
                                  </p>
                                </div>
                              </div>
                            </motion.div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  )
                ) : (
                  <div className="flex items-center justify-between p-4 bg-neutral-50 dark:bg-neutral-900 rounded-xl border border-neutral-100 dark:border-neutral-700 opacity-60">
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-neutral-700 dark:text-neutral-200">{t('budgetDrawer.startDayLocked')}</span>
                      <span className="text-xs text-neutral-400">{t('budgetDrawer.activeCycle')}</span>
                    </div>
                    <select 
                      className="px-4 py-2 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg text-sm font-medium focus:outline-none shadow-sm cursor-not-allowed"
                      value={startDay}
                      disabled
                    >
                      <option value={startDay}>{t('common.day')} {startDay}</option>
                    </select>
                  </div>
                )}
              </motion.div>
            ) : (
              <motion.div 
                key="dates"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="flex gap-4 p-4 bg-neutral-50 dark:bg-neutral-900 rounded-xl border border-neutral-100 dark:border-neutral-700"
              >
                <div className="flex-1">
                  <Input
                    type="date"
                    label={t('common.startDate')}
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    required={!isFixed}
                  />
                </div>
                <div className="flex-1">
                  <Input
                    type="date"
                    label={t('common.endDate')}
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    required={!isFixed}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {submitError && (
        <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-300 text-sm font-medium">
          {submitError}
        </div>
      )}

      <div className="mt-auto pt-3 border-t border-neutral-100 dark:border-neutral-700/80 pb-4 sticky bottom-0 bg-white dark:bg-neutral-800">
        <Button
          type="submit"
          variant="primary"
          className="w-full shadow-[0_0_20px_-5px_rgba(124,58,237,0.4)]"
          isLoading={isSubmitting}
          disabled={!amount || (!isGlobal && (!categoryId || !name)) || (!isAdvancedMode && isFixed && !budgetToEdit && !futureRenewDay)}
        >
          {budgetToEdit ? t('common.saveChanges') : t('budgetDrawer.createBudget')}
        </Button>
      </div>
    </motion.form>
  );

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={handleClose}
          />
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ duration: 0.3, ease: [0.2, 0, 0, 1] }}
            className="absolute top-0 right-0 h-full w-full sm:w-[500px] md:w-[520px] bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white border-l border-transparent dark:border-neutral-700/80 shadow-2xl flex flex-col rounded-l-2xl md:rounded-l-3xl overflow-hidden z-10"
          >
            <div className="flex items-center justify-between px-6 py-3.5 border-b border-neutral-100 dark:border-neutral-700/60 flex-shrink-0">
              <h2 className="text-[18px] font-bold text-neutral-900 dark:text-white">
                {viewMode === 'FORM' 
                  ? (budgetToEdit ? t('budgetDrawer.editBudget') : t('budgetDrawer.newBudget')) 
                  : t('budgetDrawer.newCategory')}
              </h2>
              <button
                onClick={handleClose}
                className="p-1.5 -mr-1.5 text-neutral-400 dark:text-neutral-500 hover:text-neutral-600 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-4 flex flex-col relative">
              <AnimatePresence mode="wait">
                {viewMode === 'FORM' && renderFormMode()}
                {viewMode === 'NEW_CATEGORY' && (
                  <motion.div
                    key="category-form"
                    initial={{ opacity: 0, x: 16 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 16 }}
                    transition={{ duration: 0.2 }}
                  >
                    <div className="flex items-center gap-2 mb-4">
                      <button
                        type="button"
                        onClick={() => setViewMode('FORM')}
                        className="p-2 text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded-full transition-colors flex items-center gap-2 text-sm font-semibold pr-4"
                      >
                        <ArrowLeft className="w-4 h-4" />
                        <span>{t('common.back')}</span>
                      </button>
                    </div>

                    <NewCategoryForm
                      onSuccess={(newCat) => {
                        setCategoryId(newCat.id);
                        setViewMode('FORM');
                      }}
                      onCancel={() => setViewMode('FORM')}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}
