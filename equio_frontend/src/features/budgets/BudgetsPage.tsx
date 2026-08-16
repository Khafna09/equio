import { useState, useEffect, useMemo } from 'react';
import { useBudgets } from '../../hooks/useBudgets';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { ProgressBar } from '../../components/ui/ProgressBar';
import { BudgetDrawer } from './BudgetDrawer';
import { BudgetCard } from './BudgetCard';
import { Modal } from '../../components/ui/Modal';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../components/ui/Tabs';
import { PiggyBank, MoreVertical, Calendar, Pencil, Trash2, AlertTriangle, Wallet, XOctagon, Plus, Construction } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { EmptyBudgetState } from './EmptyBudgetState';
import { InlineBudgetForm } from './InlineBudgetForm';
import { BudgetHistoryList } from './BudgetHistoryList';
import { DndContext, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, arrayMove, rectSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useCurrency } from '../../hooks/useCurrency';
import { useI18n } from '../../i18n/i18nContextValue';
import { getLocalStorageItem, setLocalStorageItem } from '../../utils/browserStorage';
import { getApiErrorMessage } from '../../utils/apiError';
import { MAX_MONEY_AMOUNT, parsePositiveMoney } from '../../utils/moneyInput';
import type { BudgetRequest, BudgetResponse } from '../../types/budget.types';
interface SortableBudgetCardProps {
  budget: BudgetResponse;
  openMenuId: number | null;
  setOpenMenuId: (id: number | null) => void;
  isAdvancedMode: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onUpdateAmount: (amount: number) => Promise<void>;
}
function SortableBudgetCard({
  budget,
  openMenuId,
  setOpenMenuId,
  isAdvancedMode,
  onEdit,
  onDelete,
  onUpdateAmount,
}: SortableBudgetCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: budget.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition: transition ?? 'transform 220ms cubic-bezier(0.22, 1, 0.36, 1)',
    zIndex: isDragging ? 50 : undefined,
  };
  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`h-full cursor-grab touch-none select-none active:cursor-grabbing ${isDragging ? 'scale-[1.02] opacity-95 shadow-2xl rounded-3xl' : ''}`}
    >
      <BudgetCard
        budget={budget}
        openMenuId={openMenuId}
        setOpenMenuId={setOpenMenuId}
        isAdvancedMode={isAdvancedMode}
        onEdit={onEdit}
        onDelete={onDelete}
        onUpdateAmount={onUpdateAmount}
      />
    </div>
  );
}
function SavingsCard({ globalBudget, onUpdateBudget }: {
  globalBudget?: BudgetResponse;
  onUpdateBudget: (input: { id: number; data: BudgetRequest }) => Promise<unknown>;
}) {
  const { currency, formatCurrency } = useCurrency();
  const { t } = useI18n();
  const [savingsType, setSavingsType] = useState<'PERCENTAGE' | 'FIXED'>(globalBudget?.savingsType || 'PERCENTAGE');
  const [savingsValue, setSavingsValue] = useState<string>(globalBudget?.savingsValue ? String(globalBudget.savingsValue) : '');
  const [enabled, setEnabled] = useState<boolean>(globalBudget?.savingsValue != null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const handleToggle = async () => {
    if (!globalBudget) return;
    const nextEnabled = !enabled;
    setEnabled(nextEnabled);
    if (!nextEnabled) {
      setSaveError(null);
      setIsSaving(true);
      try {
        await onUpdateBudget({
          id: globalBudget.id,
          data: {
            name: globalBudget.name,
            totalAmount: globalBudget.totalAmount,
            isFixed: globalBudget.isFixed,
            startDate: globalBudget.startDate,
            endDate: globalBudget.endDate,
            categoryId: globalBudget.categoryId ?? undefined,
            savingsType: undefined,
            savingsValue: undefined,
          }
        });
      } catch (error: unknown) {
        setEnabled(true);
        setSaveError(getApiErrorMessage(error, t('budgetDrawer.saveError')));
      } finally {
        setIsSaving(false);
      }
    }
  };
  const handleSave = async () => {
    if (!globalBudget || !savingsValue) return;
    const parsedValue = parsePositiveMoney(savingsValue);
    const isInvalid = parsedValue === null
      || (savingsType === 'PERCENTAGE' && parsedValue > 100)
      || (savingsType === 'FIXED' && parsedValue > globalBudget.totalAmount);
    if (isInvalid) {
      setSaveError(t('common.invalidAmount'));
      return;
    }

    setSaveError(null);
    setIsSaving(true);
    try {
      await onUpdateBudget({
        id: globalBudget.id,
        data: {
          name: globalBudget.name,
          totalAmount: globalBudget.totalAmount,
          isFixed: globalBudget.isFixed,
          startDate: globalBudget.startDate,
          endDate: globalBudget.endDate,
          categoryId: globalBudget.categoryId ?? undefined,
          savingsType,
          savingsValue: parsedValue,
        }
      });
    } catch (error: unknown) {
      setSaveError(getApiErrorMessage(error, t('budgetDrawer.saveError')));
    } finally {
      setIsSaving(false);
    }
  };
  if (!globalBudget) {
    return null;
  }
  return (
    <Card className="p-5 md:p-6 flex flex-col justify-between h-full relative overflow-hidden bg-gradient-to-br from-white to-primary-50/20 dark:from-neutral-800 dark:to-primary-950/20 border-primary-100/50 dark:border-neutral-700">
      <div className="absolute top-0 right-0 w-32 h-32 bg-primary-100/30 dark:bg-primary-900/20 rounded-bl-full -mr-10 -mt-10 pointer-events-none" />
      <div className="flex justify-between items-center mb-4 relative z-10">
        <div className="flex items-center gap-2">
          <PiggyBank className="w-5 h-5 text-primary-500 dark:text-primary-400" />
          <h3 className="text-xl font-semibold text-neutral-900 dark:text-white">{t('budgets.savingsCardTitle')}</h3>
        </div>
        
        <button
          type="button"
          onClick={handleToggle}
          disabled={isSaving}
          className={`w-11 h-6 rounded-full transition-colors relative focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 shadow-inner ${enabled ? 'bg-primary-500' : 'bg-neutral-200 dark:bg-neutral-700'}`}
        >
          <div className={`absolute top-1 left-1 bg-white dark:bg-neutral-800 w-4 h-4 rounded-full shadow-sm transition-transform ${enabled ? 'translate-x-5' : ''}`} />
        </button>
      </div>
      <AnimatePresence mode="wait">
        {!enabled ? (
          <motion.div 
            key="disabled"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="py-6 text-center text-neutral-500 dark:text-neutral-400 text-sm relative z-10"
          >
            {t('budgets.savingsDisabled')}
          </motion.div>
        ) : (
          <motion.div 
            key="enabled"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-4 relative z-10"
          >
            <div className="flex items-center gap-2 p-1 bg-neutral-100 dark:bg-neutral-900 rounded-xl">
              <button
                type="button"
                className={`flex-1 py-1.5 px-3 rounded-lg font-medium text-xs transition-colors shadow-sm ${savingsType === 'PERCENTAGE' ? 'bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white' : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200'}`}
                onClick={() => setSavingsType('PERCENTAGE')}
              >
                {t('budgets.percentage')}
              </button>
              <button
                type="button"
                className={`flex-1 py-1.5 px-3 rounded-lg font-medium text-xs transition-colors shadow-sm ${savingsType === 'FIXED' ? 'bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white' : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200'}`}
                onClick={() => setSavingsType('FIXED')}
              >
                {t('budgets.fixedAmount')}
              </button>
            </div>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  type="number"
                  step={savingsType === 'PERCENTAGE' ? '1' : '0.01'}
                  min="0.01"
                  max={savingsType === 'PERCENTAGE' ? 100 : Math.min(MAX_MONEY_AMOUNT, globalBudget.totalAmount)}
                  placeholder={savingsType === 'PERCENTAGE' ? 'Ej: 20' : 'Ej: 1000'}
                  value={savingsValue}
                  onChange={(e) => setSavingsValue(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 text-sm font-semibold text-neutral-900 dark:text-white placeholder:text-neutral-400 dark:placeholder:text-neutral-500 focus:outline-none focus:border-primary-500 shadow-sm"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-neutral-400 dark:text-neutral-500">
                  {savingsType === 'PERCENTAGE' ? '%' : currency}
                </span>
              </div>
              <Button
                variant="primary"
                className="px-3 py-1.5 text-xs shadow-sm"
                onClick={handleSave}
                isLoading={isSaving}
                disabled={!savingsValue}
              >
                {t('budgets.apply')}
              </Button>
            </div>
            {saveError ? <p className="text-xs text-rose-600 dark:text-rose-400">{saveError}</p> : null}
            <p className="text-[11px] text-neutral-500 dark:text-neutral-400 bg-white/50 dark:bg-neutral-900/60 p-2 rounded-lg border border-neutral-100 dark:border-neutral-700">
              {savingsType === 'PERCENTAGE' && parsePositiveMoney(savingsValue) !== null
                ? t('budgets.autoReserve', {
                    amount: formatCurrency(globalBudget.totalAmount * ((parsePositiveMoney(savingsValue) ?? 0) / 100)),
                  })
                : t('budgets.protectedAmount')}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}
function loadCategoryBudgetOrder(): number[] {
  try {
    const stored = getLocalStorageItem('equio_category_budgets_order');
    if (!stored) return [];
    const parsed: unknown = JSON.parse(stored);
    if (!Array.isArray(parsed) || !parsed.every((id) => Number.isSafeInteger(id) && id > 0)) {
      return [];
    }
    return [...new Set(parsed as number[])].slice(0, 200);
  } catch {
    return [];
  }
}
export function BudgetsPage() {
  const { budgets, isLoading, deleteBudget, closeBudget, updateBudget, createBudget } = useBudgets();
  const { formatCurrency: formatCurrencyHook } = useCurrency();
  const { t } = useI18n();
  const formatCurrency = (val: number) => formatCurrencyHook(val, { maximumFractionDigits: 0 });
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<string | number | null>(null);
  const [budgetToEdit, setBudgetToEdit] = useState<Partial<BudgetResponse> | null>(null);
  const [drawerIsGlobal, setDrawerIsGlobal] = useState(true);
  
  const [isAdvancedMode, setIsAdvancedMode] = useState<boolean>(() => {
    return getLocalStorageItem('budgetAdvancedMode') === 'true';
  });
  useEffect(() => {
    setLocalStorageItem('budgetAdvancedMode', String(isAdvancedMode));
  }, [isAdvancedMode]);
  
  const [isCloseModalOpen, setIsCloseModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isSubBudgetDeleteModalOpen, setIsSubBudgetDeleteModalOpen] = useState(false);
  const [budgetActionTarget, setBudgetActionTarget] = useState<BudgetResponse | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [deleteCascade, setDeleteCascade] = useState<boolean>(false);
  const dragSensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    })
  );
  const activeBudgets = useMemo(() => budgets.filter(b => b.status === 'ACTIVE'), [budgets]);
  const globalBudget = activeBudgets.find(b => !b.categoryId);
  const categoryBudgets = useMemo(
    () => activeBudgets.filter(b => b.categoryId),
    [activeBudgets]
  );
  const [categoryBudgetOrder, setCategoryBudgetOrder] = useState<number[]>(loadCategoryBudgetOrder);
  const orderedCategoryBudgets = useMemo(() => {
    const byId = new Map(categoryBudgets.map((budget) => [budget.id, budget]));
    const ordered: BudgetResponse[] = [];
    for (const id of categoryBudgetOrder) {
      const budget = byId.get(id);
      if (budget) {
        ordered.push(budget);
        byId.delete(id);
      }
    }
    byId.forEach((budget) => ordered.push(budget));
    return ordered;
  }, [categoryBudgetOrder, categoryBudgets]);
  const saveCategoryBudgetOrder = (newOrder: BudgetResponse[]) => {
    const orderIds = newOrder.map((budget) => budget.id);
    setCategoryBudgetOrder(orderIds);
    setLocalStorageItem('equio_category_budgets_order', JSON.stringify(orderIds));
  };
  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    const oldIndex = orderedCategoryBudgets.findIndex((budget) => budget.id === active.id);
    const newIndex = orderedCategoryBudgets.findIndex((budget) => budget.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    saveCategoryBudgetOrder(arrayMove(orderedCategoryBudgets, oldIndex, newIndex));
  };
  const savingsDeduction = (!globalBudget || globalBudget.savingsValue == null) ? 0 : 
    (globalBudget.savingsType === 'PERCENTAGE' 
      ? globalBudget.totalAmount * (globalBudget.savingsValue / 100) 
      : globalBudget.savingsValue);
  
  const effectiveGlobalLimit = globalBudget ? Math.max(0, globalBudget.totalAmount - savingsDeduction) : 0;
  
  const globalRemainingAmount = globalBudget ? Math.max(0, effectiveGlobalLimit - globalBudget.spentAmount) : 0;
  // La capacidad asignable descuenta el ahorro y las asignaciones existentes.
  const totalSubBudgetsAmount = categoryBudgets.reduce((acc, b) => acc + b.totalAmount, 0);
  const assignableSubBudgetsCapacity = Math.max(0, effectiveGlobalLimit - totalSubBudgetsAmount);
  
  const globalProgress = (globalBudget && effectiveGlobalLimit > 0) 
    ? Math.min(100, Number(((globalBudget.spentAmount / effectiveGlobalLimit) * 100).toFixed(2))) 
    : 0;
  const handleUpdateAmount = async (budget: BudgetResponse, newAmount: number) => {
    await updateBudget({
      id: budget.id,
      data: {
        name: budget.name,
        totalAmount: newAmount,
        isFixed: budget.isFixed,
        startDate: budget.startDate,
        endDate: budget.endDate,
        categoryId: budget.categoryId ?? undefined,
        savingsType: budget.savingsType ?? undefined,
        savingsValue: budget.savingsValue ?? undefined
      }
    });
  };
  const handleInlineSave = async (categoryId: number, amount: number) => {
    if (!globalBudget) return;
    
    await createBudget({
      name: "Sub-presupuesto",
      totalAmount: amount,
      isFixed: globalBudget.isFixed,
      startDate: globalBudget.startDate,
      endDate: globalBudget.endDate,
      categoryId: categoryId,
      parentBudgetId: globalBudget.id
    });
  };
  const openDrawer = (isGlobal: boolean = true) => {
    const resolvedIsGlobal = !isAdvancedMode && !globalBudget ? true : isGlobal;
    setBudgetToEdit(null);
    setDrawerIsGlobal(resolvedIsGlobal);
    setIsDrawerOpen(true);
  };
  const handleCloseBudget = async () => {
    if (!budgetActionTarget) return;
    setIsProcessing(true);
    try {
      await closeBudget(budgetActionTarget.id);
      setIsCloseModalOpen(false);
    } finally {
      setIsProcessing(false);
    }
  };
  const handleDeleteBudget = async () => {
    if (!budgetActionTarget) return;
    setIsProcessing(true);
    try {
      const cascade = isAdvancedMode ? deleteCascade : true;
      await deleteBudget({ id: budgetActionTarget.id, cascade });
      setIsDeleteModalOpen(false);
    } finally {
      setIsProcessing(false);
    }
  };
  const handleDeleteSubBudget = async () => {
    if (!budgetActionTarget) return;
    setIsProcessing(true);
    try {
      await deleteBudget({ id: budgetActionTarget.id, cascade: false });
      setIsSubBudgetDeleteModalOpen(false);
    } finally {
      setIsProcessing(false);
    }
  };
  if (isLoading && activeBudgets.length === 0 && budgets.length === 0) {
    return (
      <div className="flex justify-center py-20 text-neutral-500 dark:text-neutral-400 animate-pulse">
        {t('budgets.loading')}
      </div>
    );
  }
  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold text-neutral-900 dark:text-white tracking-tight mb-2">{t('budgets.title')}</h1>
          <p className="text-neutral-500 dark:text-neutral-400">{t('budgets.subtitle')}</p>
        </div>
        <div className="flex items-center gap-3 bg-white dark:bg-neutral-800 px-4 py-2 rounded-xl shadow-sm border border-neutral-100 dark:border-neutral-700">
          <span className={`text-sm font-medium ${!isAdvancedMode ? 'text-neutral-900 dark:text-white' : 'text-neutral-400'}`}>{t('budgets.normalMode')}</span>
          <button
            type="button"
            onClick={() => setIsAdvancedMode(!isAdvancedMode)}
            className={`w-11 h-6 rounded-full transition-colors relative focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 shadow-inner ${isAdvancedMode ? 'bg-primary-500' : 'bg-neutral-200 dark:bg-neutral-700'}`}
          >
            <div className={`absolute top-1 left-1 bg-white dark:bg-neutral-800 w-4 h-4 rounded-full shadow-sm transition-transform ${isAdvancedMode ? 'translate-x-5' : ''}`} />
          </button>
          <span className={`text-sm font-medium ${isAdvancedMode ? 'text-primary-600 dark:text-primary-400' : 'text-neutral-400'}`}>{t('budgets.advancedMode')}</span>
        </div>
      </div>
      <Tabs defaultValue="dashboard" className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="dashboard">{t('budgets.dashboardTab')}</TabsTrigger>
          <TabsTrigger value="history">{t('budgets.historyTab')}</TabsTrigger>
        </TabsList>
        <TabsContent value="dashboard" className="space-y-8 mt-0">
          {isAdvancedMode ? (
            <div className="py-20 px-6 text-center bg-white dark:bg-neutral-800 rounded-3xl border border-neutral-100 dark:border-neutral-700 shadow-sm flex flex-col items-center justify-center min-h-[360px]">
              <div className="w-16 h-16 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-500 mb-4 shadow-sm">
                <Construction className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-neutral-900 dark:text-white mb-2">{t('budgets.advancedTitle')}</h3>
              <p className="text-neutral-500 dark:text-neutral-400 text-sm max-w-md leading-relaxed">
                Estamos trabajando en nuevas herramientas para la gestión avanzada de presupuestos independientes. Esta funcionalidad estará disponible muy pronto.
              </p>
            </div>
          ) : activeBudgets.length === 0 ? (
            <EmptyBudgetState onOpenDrawer={() => openDrawer(true)} />
          ) : (
            <>
              {!globalBudget && (
                <div className="bg-primary-50 dark:bg-primary-950/30 border border-primary-100 dark:border-primary-800/60 rounded-3xl p-6 md:p-8 text-center flex flex-col items-center justify-center relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-white/40 dark:from-primary-900/20 to-transparent pointer-events-none" />
                  <div className="w-14 h-14 bg-white dark:bg-neutral-800 rounded-full flex items-center justify-center text-primary-500 dark:text-primary-400 mb-4 shadow-sm relative z-10">
                    <Wallet className="w-7 h-7" />
                  </div>
                  <h3 className="text-xl font-bold text-primary-900 dark:text-primary-200 mb-2 relative z-10">{t('budgets.noGlobalTitle')}</h3>
                  <p className="text-primary-700 dark:text-primary-300 text-sm mb-6 max-w-md relative z-10">
                    Establece un límite total para tener un mejor control de tus finanzas y poder asignar topes de manera más estructurada a estas categorías.
                  </p>
                  <Button variant="primary" onClick={() => openDrawer(true)} className="shadow-lg shadow-primary-500/30 relative z-10 font-semibold px-6 py-2.5">
                    ✨ Configurar {t('budgets.globalBudget')}
                  </Button>
                </div>
              )}
              {globalBudget && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card className="p-5 md:p-6 overflow-visible relative border-t-4 border-t-primary-500 shadow-sm shadow-primary-500/10 border-primary-100/50 dark:border-neutral-700 rounded-3xl">
                    <div className="flex justify-between items-start mb-6">
                      <div className="flex items-center gap-2">
                        <Wallet className="w-5 h-5 text-primary-500" />
                        <h3 className="text-xl font-semibold text-neutral-900 dark:text-white tracking-tight">{t('budgets.globalBudget')}</h3>
                      </div>
                      
                      <div className="absolute top-6 left-1/2 -translate-x-1/2 md:static md:translate-x-0">
                        <span className="bg-primary-50 dark:bg-primary-950/50 text-primary-600 dark:text-primary-300 px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 shadow-sm">
                          <Calendar className="w-3.5 h-3.5" />
                          {globalBudget.isFixed ? t('budgets.continuousMonthlyCycle') : t('budgets.dateRange', { start: globalBudget.startDate ?? '', end: globalBudget.endDate ?? '' })}
                        </span>
                      </div>
                      
                      <div className="relative z-20">
                        <button 
                          onClick={() => setOpenMenuId(openMenuId === 'global' ? null : 'global')}
                          className="p-1.5 text-neutral-400 dark:text-neutral-500 hover:text-neutral-600 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-lg transition-colors"
                        >
                          <MoreVertical className="w-5 h-5" />
                        </button>
                        <AnimatePresence>
                          {openMenuId === 'global' && (
                            <>
                              <div className="fixed inset-0 z-10" onClick={() => setOpenMenuId(null)} />
                              <motion.div 
                                initial={{ opacity: 0, y: -5, scale: 0.95 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: -5, scale: 0.95 }}
                                transition={{ duration: 0.15 }}
                                className="absolute right-0 mt-1 w-56 bg-white dark:bg-neutral-800 border border-primary-100/50 dark:border-neutral-700 rounded-2xl shadow-lg shadow-primary-500/10 z-20 py-1 overflow-hidden origin-top-right"
                              >
                                <button
                                  onClick={() => {
                                    setOpenMenuId(null);
                                    setBudgetToEdit(globalBudget);
                                    setIsDrawerOpen(true);
                                  }}
                                  className="w-full px-4 py-2.5 text-left text-sm text-neutral-700 dark:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-neutral-700/60 flex items-center gap-3 transition-colors"
                                >
                                  <Pencil className="w-4 h-4 text-neutral-400" /> {t('budgets.editBudget')}
                                </button>
                                <div className="h-px bg-neutral-100 dark:bg-neutral-700 my-1 mx-2" />
                                <button
                                  onClick={() => {
                                    setOpenMenuId(null);
                                    setBudgetActionTarget(globalBudget);
                                    setIsCloseModalOpen(true);
                                  }}
                                  className="w-full px-4 py-2.5 text-left text-sm text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-950/30 flex items-center gap-3 transition-colors"
                                >
                                  <AlertTriangle className="w-4 h-4" /> {t('budgets.closePeriodNow')}
                                </button>
                                <button
                                  onClick={() => {
                                    setOpenMenuId(null);
                                    setBudgetActionTarget(globalBudget);
                                    setIsDeleteModalOpen(true);
                                  }}
                                  className="w-full px-4 py-2.5 text-left text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 flex items-center gap-3 transition-colors"
                                >
                                  <XOctagon className="w-4 h-4" /> {t('budgets.deletePermanently')}
                                </button>
                              </motion.div>
                            </>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>
                    
                    <div>
                      <div className="flex items-end gap-1.5 mb-2">
                        <span className="text-4xl md:text-5xl font-extrabold text-neutral-900 dark:text-white tracking-tighter">
                          {formatCurrency(globalBudget.spentAmount)}
                        </span>
                        <span className="text-neutral-500 dark:text-neutral-400 font-medium mb-1.5 text-lg">/ {formatCurrency(effectiveGlobalLimit)}</span>
                      </div>
                      
                      <div className="flex justify-between items-center text-sm mb-4 mt-4">
                        <span className="text-neutral-500 dark:text-neutral-400 font-medium">{t('common.available')}: <span className="text-neutral-900 dark:text-white font-semibold">{formatCurrency(globalRemainingAmount)}</span></span>
                        <span className="font-bold" style={{ color: globalProgress >= 90 ? '#e11d48' : (globalProgress >= 70 ? '#f59e0b' : '#059669') }}>
                          {globalProgress}%
                        </span>
                      </div>
                      <ProgressBar 
                        percentage={globalProgress} 
                        className="h-4"
                        barClassName={globalProgress >= 90 ? 'bg-danger-600' : (globalProgress >= 70 ? 'bg-orange-500' : 'bg-primary-500')}
                      />
                      {savingsDeduction > 0 && (
                        <div className="mt-3 pt-2 border-t border-neutral-100 dark:border-neutral-700 flex items-center gap-1.5 text-xs text-neutral-500 dark:text-neutral-400">
                          <PiggyBank className="w-3.5 h-3.5 text-primary-500 shrink-0" />
                          <span>{t('budgets.originalBudget')}: <strong className="text-neutral-700 dark:text-neutral-200 font-semibold">{formatCurrency(globalBudget.totalAmount)}</strong> (<strong className="text-primary-700 dark:text-primary-300 font-semibold">-{formatCurrency(savingsDeduction)}</strong> {t('budgets.inSavings')})</span>
                        </div>
                      )}
                    </div>
                  </Card>
                  <SavingsCard globalBudget={globalBudget} onUpdateBudget={updateBudget} />
                </div>
              )}
              <div className="pt-4 border-t border-neutral-100 dark:border-neutral-800">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-semibold text-neutral-600 dark:text-neutral-300 tracking-tight">{t('budgets.categoriesTitle')}</h2>
                  <span className="bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 px-2 py-1 rounded-md text-xs font-semibold">{t('budgets.subcategoriesCount', { count: categoryBudgets.length })}</span>
                </div>
                
                <DndContext sensors={dragSensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                  <SortableContext items={orderedCategoryBudgets.map((budget) => budget.id)} strategy={rectSortingStrategy}>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {orderedCategoryBudgets.map((budget) => (
                        <SortableBudgetCard
                          key={budget.id}
                          budget={budget}
                          openMenuId={typeof openMenuId === 'number' ? openMenuId : null}
                          setOpenMenuId={setOpenMenuId}
                          isAdvancedMode={isAdvancedMode}
                          onEdit={() => {
                            setBudgetToEdit(budget);
                            setIsDrawerOpen(true);
                          }}
                          onDelete={() => {
                            setBudgetActionTarget(budget);
                            setIsSubBudgetDeleteModalOpen(true);
                          }}
                          onUpdateAmount={(amount) => handleUpdateAmount(budget, amount)}
                        />
                      ))}
                      {globalBudget ? (
                        <InlineBudgetForm
                          onSave={handleInlineSave}
                          globalBudgetRemaining={assignableSubBudgetsCapacity}
                        />
                      ) : isAdvancedMode ? (
                        <div
                          className="border-2 border-dashed border-primary-200/50 rounded-3xl p-6 flex flex-col items-center justify-center text-center text-neutral-500 dark:text-neutral-400 hover:bg-primary-50 dark:hover:bg-primary-950/30 hover:border-primary-300 dark:hover:border-primary-700 transition-colors cursor-pointer min-h-[220px] group"
                          onClick={() => openDrawer(false)}
                        >
                          <div className="w-12 h-12 bg-white dark:bg-neutral-800 rounded-full flex items-center justify-center shadow-sm mb-3 dark:bg-neutral-800 group-hover:bg-primary-50 dark:group-hover:bg-primary-950/40 group-hover:text-primary-500 dark:group-hover:text-primary-400 transition-colors">
                            <Plus className="w-6 h-6" />
                          </div>
                          <p className="font-medium text-sm text-neutral-700 dark:text-neutral-200">{t('budgets.createIndependent')}</p>
                          <p className="text-xs mt-1 px-4">{t('budgets.createIndependentHint')}</p>
                        </div>
                      ) : (
                        <div className="border-2 border-dashed border-neutral-200 dark:border-neutral-700/50 rounded-3xl p-6 flex flex-col items-center justify-center text-center text-neutral-400 dark:text-neutral-500 min-h-[220px] bg-neutral-50/50 dark:bg-neutral-900/50">
                          <Wallet className="w-8 h-8 mb-2 opacity-50" />
                          <p className="font-medium text-sm">{t('budgets.requiresGlobal')}</p>
                          <p className="text-xs mt-1 px-4">{t('budgets.requiresGlobalHint')}</p>
                        </div>
                      )}
                    </div>
                  </SortableContext>
                </DndContext>
              </div>
            </>
          )}
        </TabsContent>
        <TabsContent value="history" className="mt-0">
          <BudgetHistoryList />
        </TabsContent>
      </Tabs>
      <BudgetDrawer 
        isOpen={isDrawerOpen} 
        onClose={() => setIsDrawerOpen(false)}
        budgetToEdit={budgetToEdit}
        defaultIsGlobal={drawerIsGlobal}
        isAdvancedMode={isAdvancedMode}
        independentBudgets={categoryBudgets.filter(b => !b.parentBudgetId)}
      />
      <Modal 
        isOpen={isCloseModalOpen} 
        onClose={() => !isProcessing && setIsCloseModalOpen(false)} 
        title={t('budgets.closePeriodNow')}
      >
        <div className="mt-4">
          <div className="flex items-start gap-4 p-4 bg-orange-50 dark:bg-orange-950/30 text-orange-900 dark:text-orange-100 border border-orange-200 dark:border-orange-900/60 rounded-xl mb-6">
            <AlertTriangle className="w-6 h-6 shrink-0 mt-0.5 text-orange-600" />
            <div className="text-sm">
              <p className="font-semibold mb-1 text-base">
                {t('budgets.closeQuestion')}
              </p>
              <p className="text-orange-800 dark:text-orange-200 opacity-90">
                {t('budgets.closeDescription')}
              </p>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button
              variant="secondary"
              disabled={isProcessing}
              onClick={() => setIsCloseModalOpen(false)}
            >
              {t('common.cancel')}
            </Button>
            <Button
              variant="primary"
              className="bg-orange-500 hover:bg-orange-600 focus:ring-orange-500 border-none shadow-sm shadow-orange-500/20"
              isLoading={isProcessing}
              onClick={handleCloseBudget}
            >
              {t('budgets.closeBudget')}
            </Button>
          </div>
        </div>
      </Modal>
      <Modal 
        isOpen={isDeleteModalOpen} 
        onClose={() => !isProcessing && setIsDeleteModalOpen(false)} 
        title={t('budgets.deletePermanently')}
      >
        <div className="mt-4">
          <div className="flex items-start gap-4 p-4 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/60 rounded-xl mb-6">
            <Trash2 className="w-6 h-6 shrink-0 mt-0.5 text-red-600" />
            <div className="text-sm text-red-900 dark:text-red-100 dark:text-red-100 w-full">
              <p className="font-semibold mb-3 text-base">
                {t('budgets.deleteWarning')}
              </p>
              
              {!isAdvancedMode ? (
                <div className="mt-4">
                  <p className="mb-2 opacity-90">{t('budgets.deleteGlobalCascade')}</p>
                </div>
              ) : (
                <div className="space-y-3 mt-4 w-full">
                  <label className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${deleteCascade ? 'bg-white dark:bg-red-950/40 border-red-300 dark:border-red-700 shadow-sm' : 'border-transparent hover:bg-red-100/50 dark:hover:bg-red-950/40'}`}>
                    <input 
                      type="radio" 
                      name="cascade" 
                      className="mt-1 accent-red-600 w-4 h-4"
                      checked={deleteCascade}
                      onChange={() => setDeleteCascade(true)}
                    />
                    <div>
                      <div className="font-medium">{t('budgets.deleteAll')}</div>
                      <div className="text-xs opacity-80">{t('budgets.deleteAllHint')}</div>
                    </div>
                  </label>
                  <label className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${!deleteCascade ? 'bg-white dark:bg-red-950/40 border-red-300 dark:border-red-700 shadow-sm' : 'border-transparent hover:bg-red-100/50 dark:hover:bg-red-950/40'}`}>
                    <input 
                      type="radio" 
                      name="cascade" 
                      className="mt-1 accent-red-600 w-4 h-4"
                      checked={!deleteCascade}
                      onChange={() => setDeleteCascade(false)}
                    />
                    <div>
                      <div className="font-medium">{t('budgets.deleteOnlyTotal')}</div>
                      <div className="text-xs opacity-80">{t('budgets.deleteOnlyTotalHint')}</div>
                    </div>
                  </label>
                </div>
              )}
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2 border-t border-neutral-100 dark:border-neutral-700">
            <Button
              variant="secondary"
              disabled={isProcessing}
              onClick={() => setIsDeleteModalOpen(false)}
            >
              {t('common.cancel')}
            </Button>
            <Button
              variant="primary"
              className="bg-red-600 hover:bg-red-700 focus:ring-red-500 border-none shadow-sm shadow-red-500/20"
              isLoading={isProcessing}
              onClick={handleDeleteBudget}
            >
              {t('common.delete')}
            </Button>
          </div>
        </div>
      </Modal>
      <Modal 
        isOpen={isSubBudgetDeleteModalOpen} 
        onClose={() => !isProcessing && setIsSubBudgetDeleteModalOpen(false)} 
        title={t('budgets.deleteSubButton')}
      >
        <div className="mt-4">
          <div className="flex items-start gap-4 p-4 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/60 rounded-xl mb-6">
            <Trash2 className="w-6 h-6 shrink-0 mt-0.5 text-red-600" />
            <div className="text-sm text-red-900 dark:text-red-100">
              <p className="font-semibold mb-1 text-base">
                ¿{t('common.delete')} el sub-presupuesto de "{budgetActionTarget?.categoryName || budgetActionTarget?.name}"?
              </p>
              <p className="text-red-700 dark:text-red-300 text-xs leading-relaxed mt-2">
                Se eliminará el límite configurado de <b>{budgetActionTarget ? formatCurrency(budgetActionTarget.totalAmount) : '$0'}</b>. Este cupo se liberará y volverá a estar disponible en tu {t('budgets.globalBudget')}. Tus movimientos de gastos pasados no se borrarán.
              </p>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2 border-t border-neutral-100 dark:border-neutral-700">
            <Button
              variant="secondary"
              disabled={isProcessing}
              onClick={() => setIsSubBudgetDeleteModalOpen(false)}
            >
              {t('common.cancel')}
            </Button>
            <Button
              variant="primary"
              className="bg-red-600 hover:bg-red-700 focus:ring-red-500 border-none shadow-sm shadow-red-600/20"
              isLoading={isProcessing}
              onClick={handleDeleteSubBudget}
            >
              {t('budgets.deleteSubButton')}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
