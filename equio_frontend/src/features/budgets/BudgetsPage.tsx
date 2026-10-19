import { format, parseISO, isValid } from 'date-fns';
import { es, enUS } from 'date-fns/locale';
import { useState, useMemo } from 'react';
import { useBudgets } from '../../hooks/useBudgets';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { ProgressBar } from '../../components/ui/ProgressBar';
import { BudgetDrawer } from './BudgetDrawer';
import { BudgetCard } from './BudgetCard';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../components/ui/Tabs';
import { PiggyBank, MoreVertical, Calendar, Pencil, AlertTriangle, Wallet, XOctagon, Plus } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { EmptyBudgetState } from './EmptyBudgetState';
import { InlineBudgetForm } from './InlineBudgetForm';
import { BudgetHistoryList } from './BudgetHistoryList';
import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, rectSortingStrategy, sortableKeyboardCoordinates, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useCurrency } from '../../hooks/useCurrency';
import { useI18n } from '../../i18n/i18nContextValue';
import type { BudgetResponse } from '../../types/budget.types';
import { SavingsCard } from './SavingsCard';
import { useBudgetOrder } from './useBudgetOrder';
import { calculateBudgetMetrics } from './budgetMetrics';
import { BudgetActionModals } from './BudgetActionModals';
import { getApiErrorMessage } from '../../utils/apiError';
import { BudgetDetachDialog, BudgetLinkDialog } from './BudgetLinkDialog';
import { BudgetModeSelector } from './BudgetModeSelector';
import { BudgetModeTransitionDialog } from './BudgetModeTransitionDialog';
import { useProfile } from '../../hooks/useProfile';
interface SortableBudgetCardProps {
  budget: BudgetResponse;
  openMenuId: number | null;
  setOpenMenuId: (id: number | null) => void;
  isAdvancedMode: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onUpdateAmount: (amount: number) => Promise<void>;
  onLink?: () => void;
  onDetach?: () => void;
  onClose?: () => void;
}
function SortableBudgetCard({
  budget,
  openMenuId,
  setOpenMenuId,
  isAdvancedMode,
  onEdit,
  onDelete,
  onUpdateAmount,
  onLink,
  onDetach,
  onClose,
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
        onLink={onLink}
        onDetach={onDetach}
        onClose={onClose}
      />
    </div>
  );
}

export function BudgetsPage() {
  const {
    budgets,
    capabilities,
    isLoading,
    error,
    refetch,
    deleteBudget,
    closeBudget,
    updateBudget,
    createBudget,
    linkBudget,
    detachBudget,
    changeBudgetMode,
    isChangingBudgetMode,
  } = useBudgets();
  const { profile, isLoading: isProfileLoading } = useProfile();
  const { formatCurrency: formatCurrencyHook } = useCurrency();
  const { t, language } = useI18n();
  const formatCurrency = (val: number) => formatCurrencyHook(val, { maximumFractionDigits: 0 });
  const formatExactPeriod = (startDate?: string | null, endDate?: string | null) => {
    if (!startDate || !endDate) return t('budgets.continuousMonthlyCycle');
    try {
      const s = parseISO(startDate.includes('T') ? startDate : `${startDate}T00:00:00`);
      const e = parseISO(endDate.includes('T') ? endDate : `${endDate}T00:00:00`);
      if (isValid(s) && isValid(e)) {
        const loc = language === 'es' ? es : enUS;
        const startFormatted = format(s, 'd MMM', { locale: loc });
        const endFormatted = format(e, 'd MMM yyyy', { locale: loc });
        return t('budgets.dateRange', { start: startFormatted, end: endFormatted });
      }
    } catch {
      // fallback
    }
    return t('budgets.dateRange', { start: startDate, end: endDate });
  };

  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<string | number | null>(null);
  const [budgetToEdit, setBudgetToEdit] = useState<Partial<BudgetResponse> | null>(null);
  const [drawerIsGlobal, setDrawerIsGlobal] = useState(true);
  
  const isAdvancedMode = profile?.budgetMode === 'ADVANCED';
  
  const [isCloseModalOpen, setIsCloseModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isSubBudgetDeleteModalOpen, setIsSubBudgetDeleteModalOpen] = useState(false);
  const [budgetActionTarget, setBudgetActionTarget] = useState<BudgetResponse | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [deleteCascade, setDeleteCascade] = useState<boolean>(false);
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [isDetachModalOpen, setIsDetachModalOpen] = useState(false);
  const [isModeTransitionOpen, setIsModeTransitionOpen] = useState(false);
  const [resumeModeTransition, setResumeModeTransition] = useState(false);
  const [modeError, setModeError] = useState<string | null>(null);
  const dragSensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );
  const activeBudgets = useMemo(() => budgets.filter(b => b.status === 'ACTIVE'), [budgets]);
  const globalBudget = activeBudgets.find(b => !b.categoryId);
  const categoryBudgets = useMemo(
    () => activeBudgets.filter(b => b.categoryId),
    [activeBudgets]
  );
  const linkedBudgets = useMemo(
    () => categoryBudgets.filter((budget) => budget.parentBudgetId != null),
    [categoryBudgets]
  );
  const independentBudgets = useMemo(
    () => categoryBudgets.filter((budget) => budget.parentBudgetId == null),
    [categoryBudgets]
  );
  const { orderedBudgets: orderedCategoryBudgets, reorder } = useBudgetOrder(categoryBudgets);
  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    reorder(Number(active.id), Number(over.id));
  };
  const {
    savingsDeduction,
    effectiveGlobalLimit,
    globalRemainingAmount,
    assignableSubBudgetsCapacity,
    globalProgress,
  } = calculateBudgetMetrics(globalBudget, categoryBudgets);
  const handleUpdateAmount = async (budget: BudgetResponse, newAmount: number) => {
    await updateBudget({
      id: budget.id,
      data: {
        name: budget.categoryName || budget.name,
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
  const handleInlineSave = async (categoryId: number, amount: number, categoryName: string) => {
    if (!globalBudget) return;
    
    await createBudget({
      name: categoryName,
      totalAmount: amount,
      isFixed: globalBudget.isFixed,
      startDate: globalBudget.startDate,
      endDate: globalBudget.endDate,
      categoryId: categoryId,
      parentBudgetId: globalBudget.id
    });
  };
  const openLinkDialog = (budget: BudgetResponse) => {
    setBudgetActionTarget(budget);
    setIsLinkModalOpen(true);
  };
  const openDetachDialog = (budget: BudgetResponse) => {
    setBudgetActionTarget(budget);
    setIsDetachModalOpen(true);
  };
  const openCloseDialog = (budget: BudgetResponse) => {
    setBudgetActionTarget(budget);
    setActionError(null);
    setIsCloseModalOpen(true);
  };
  const openDrawer = (isGlobal: boolean = true) => {
    const resolvedIsGlobal = !isAdvancedMode && !globalBudget ? true : isGlobal;
    setBudgetToEdit(null);
    setDrawerIsGlobal(resolvedIsGlobal);
    setIsDrawerOpen(true);
  };
  const handleDrawerClose = () => {
    setIsDrawerOpen(false);
    if (resumeModeTransition) {
      setResumeModeTransition(false);
      setIsModeTransitionOpen(true);
    }
  };
  const changeMode = async (advanced: boolean) => {
    if (advanced === isAdvancedMode || isChangingBudgetMode) return;
    setModeError(null);
    if (!advanced && independentBudgets.length > 0) {
      setIsModeTransitionOpen(true);
      return;
    }
    try {
      await changeBudgetMode(advanced ? 'ADVANCED' : 'NORMAL');
    } catch (error: unknown) {
      setModeError(getApiErrorMessage(error, t('budgets.actionError'), t));
    }
  };
  const enableNormalMode = async () => {
    setModeError(null);
    try {
      await changeBudgetMode('NORMAL');
      setIsModeTransitionOpen(false);
    } catch (error: unknown) {
      setModeError(getApiErrorMessage(error, t('budgets.actionError'), t));
    }
  };
  const requestGuidedLink = (budget: BudgetResponse) => {
    setIsModeTransitionOpen(false);
    setResumeModeTransition(true);
    openLinkDialog(budget);
  };
  const closeLinkDialog = () => {
    setIsLinkModalOpen(false);
    if (resumeModeTransition) {
      setResumeModeTransition(false);
      setIsModeTransitionOpen(true);
    }
  };
  const createGlobalFromTransition = () => {
    setIsModeTransitionOpen(false);
    setResumeModeTransition(true);
    openDrawer(true);
  };
  const handleCloseBudget = async () => {
    if (!budgetActionTarget || isProcessing) return;
    setActionError(null);
    setIsProcessing(true);
    try {
      await closeBudget(budgetActionTarget.id);
      setIsCloseModalOpen(false);
    } catch (error: unknown) {
      setActionError(getApiErrorMessage(error, t('budgets.actionError'), t));
    } finally {
      setIsProcessing(false);
    }
  };
  const handleDeleteBudget = async () => {
    if (!budgetActionTarget || isProcessing) return;
    setActionError(null);
    setIsProcessing(true);
    try {
      const cascade = isAdvancedMode ? deleteCascade : true;
      await deleteBudget({ id: budgetActionTarget.id, cascade });
      setIsDeleteModalOpen(false);
    } catch (error: unknown) {
      setActionError(getApiErrorMessage(error, t('budgets.actionError'), t));
    } finally {
      setIsProcessing(false);
    }
  };
  const handleDeleteSubBudget = async () => {
    if (!budgetActionTarget || isProcessing) return;
    setActionError(null);
    setIsProcessing(true);
    try {
      await deleteBudget({ id: budgetActionTarget.id, cascade: false });
      setIsSubBudgetDeleteModalOpen(false);
    } catch (error: unknown) {
      setActionError(getApiErrorMessage(error, t('budgets.actionError'), t));
    } finally {
      setIsProcessing(false);
    }
  };
  if ((isLoading || isProfileLoading) && activeBudgets.length === 0 && budgets.length === 0) {
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
        <BudgetModeSelector
          advanced={isAdvancedMode}
          disabled={isProfileLoading
            || isChangingBudgetMode
            || (!isAdvancedMode && capabilities?.advancedModeEnabled === false)}
          onChange={(advanced) => void changeMode(advanced)}
        />
        {modeError && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{modeError}</p>}
      </div>
      <Tabs defaultValue="dashboard" className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="dashboard">{t('budgets.dashboardTab')}</TabsTrigger>
          <TabsTrigger value="history">{t('budgets.historyTab')}</TabsTrigger>
        </TabsList>
        <TabsContent value="dashboard" className="space-y-8 mt-0">
          {error ? (
            <div role="alert" className="flex items-center gap-3 text-red-600 dark:text-red-400">
              <span>{error}</span>
              <Button variant="secondary" onClick={() => refetch()}>{t('common.retry')}</Button>
            </div>
          ) : activeBudgets.length === 0 ? (
            isAdvancedMode ? (
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                <button
                  type="button"
                  onClick={() => openDrawer(true)}
                  className="min-h-[220px] rounded-2xl border-2 border-dashed border-primary-200 bg-white p-7 text-left transition-colors hover:border-primary-400 hover:bg-primary-50 dark:border-primary-900 dark:bg-neutral-800 dark:hover:bg-primary-950/30"
                >
                  <Wallet className="mb-5 h-8 w-8 text-primary-500" />
                  <span className="block text-lg font-bold text-neutral-900 dark:text-white">{t('budgets.configureGlobal')}</span>
                  <span className="mt-2 block text-sm text-neutral-500 dark:text-neutral-400">{t('budgets.noGlobalDescription')}</span>
                </button>
                <button
                  type="button"
                  onClick={() => openDrawer(false)}
                  className="min-h-[220px] rounded-2xl border-2 border-dashed border-neutral-200 bg-white p-7 text-left transition-colors hover:border-primary-300 hover:bg-primary-50 dark:border-neutral-700 dark:bg-neutral-800 dark:hover:bg-primary-950/30"
                >
                  <Plus className="mb-5 h-8 w-8 text-primary-500" />
                  <span className="block text-lg font-bold text-neutral-900 dark:text-white">{t('budgets.createIndependent')}</span>
                  <span className="mt-2 block text-sm text-neutral-500 dark:text-neutral-400">{t('budgets.createIndependentHint')}</span>
                </button>
              </div>
            ) : <EmptyBudgetState onOpenDrawer={() => openDrawer(true)} />
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
                    {t('budgets.noGlobalDescription')}
                  </p>
                  <Button variant="primary" onClick={() => openDrawer(true)} className="shadow-lg shadow-primary-500/30 relative z-10 font-semibold px-6 py-2.5">
                    <span aria-hidden="true">{t('common.sparkles')}</span> {t('budgets.configureGlobal')}
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
                        {globalBudget.isFixed ? (
                          <span
                            className="group relative inline-grid grid-cols-1 grid-rows-1 items-center bg-primary-50 dark:bg-primary-950/50 text-primary-600 dark:text-primary-300 px-3 py-1 rounded-full text-xs font-semibold shadow-sm cursor-default select-none transition-colors hover:bg-primary-100/70 dark:hover:bg-primary-900/60"
                            title={formatExactPeriod(globalBudget.startDate, globalBudget.endDate)}
                          >
                            <span className="col-start-1 row-start-1 flex items-center justify-center gap-1.5 transition-all duration-200 group-hover:opacity-0 group-hover:scale-95 whitespace-nowrap">
                              <Calendar className="w-3.5 h-3.5 shrink-0" />
                              <span>{t('budgets.continuousMonthlyCycle')}</span>
                            </span>
                            <span className="col-start-1 row-start-1 flex items-center justify-center gap-1.5 opacity-0 scale-95 transition-all duration-200 group-hover:opacity-100 group-hover:scale-100 whitespace-nowrap pointer-events-none">
                              <Calendar className="w-3.5 h-3.5 shrink-0 text-primary-500 dark:text-primary-400" />
                              <span>{formatExactPeriod(globalBudget.startDate, globalBudget.endDate)}</span>
                            </span>
                          </span>
                        ) : (
                          <span className="bg-primary-50 dark:bg-primary-950/50 text-primary-600 dark:text-primary-300 px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 shadow-sm">
                            <Calendar className="w-3.5 h-3.5 shrink-0" />
                            <span>{formatExactPeriod(globalBudget.startDate, globalBudget.endDate)}</span>
                          </span>
                        )}
                      </div>
                      
                      <div className="relative z-20">
                        <button 
                          onClick={() => setOpenMenuId(openMenuId === 'global' ? null : 'global')}
                          aria-label={t('budgets.moreActions')}
                          aria-expanded={openMenuId === 'global'}
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
                                    setActionError(null);
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
                                    setActionError(null);
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
                  <SavingsCard key={`${globalBudget.id}-${globalBudget.savingsType}-${globalBudget.savingsValue}`} globalBudget={globalBudget} onUpdateBudget={updateBudget} />
                </div>
              )}
              <div className="pt-4 border-t border-neutral-100 dark:border-neutral-800">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-semibold text-neutral-600 dark:text-neutral-300 tracking-tight">
                    {isAdvancedMode ? t('budgets.linkedBudgetsTitle') : t('budgets.categoriesTitle')}
                  </h2>
                  <span className="bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 px-2 py-1 rounded-md text-xs font-semibold">{t('budgets.subcategoriesCount', { count: linkedBudgets.length })}</span>
                </div>
                
                <DndContext sensors={dragSensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                  <SortableContext items={orderedCategoryBudgets.filter((budget) => budget.parentBudgetId != null).map((budget) => budget.id)} strategy={rectSortingStrategy}>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {orderedCategoryBudgets.filter((budget) => budget.parentBudgetId != null).map((budget) => (
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
                            setActionError(null);
                            setIsSubBudgetDeleteModalOpen(true);
                          }}
                          onDetach={() => openDetachDialog(budget)}
                          onClose={() => openCloseDialog(budget)}
                          onUpdateAmount={(amount) => handleUpdateAmount(budget, amount)}
                        />
                      ))}
                      {globalBudget ? (
                        <InlineBudgetForm
                          key={globalBudget.id}
                          onSave={handleInlineSave}
                          globalBudgetRemaining={assignableSubBudgetsCapacity}
                          assignedCategoryIds={categoryBudgets.map((budget) => budget.categoryId!)}
                        />
                      ) : !isAdvancedMode ? (
                        <div className="border-2 border-dashed border-neutral-200 dark:border-neutral-700/50 rounded-3xl p-6 flex flex-col items-center justify-center text-center text-neutral-400 dark:text-neutral-500 min-h-[220px] bg-neutral-50/50 dark:bg-neutral-900/50">
                          <Wallet className="w-8 h-8 mb-2 opacity-50" />
                          <p className="font-medium text-sm">{t('budgets.requiresGlobal')}</p>
                          <p className="text-xs mt-1 px-4">{t('budgets.requiresGlobalHint')}</p>
                        </div>
                      ) : null}
                    </div>
                  </SortableContext>
                </DndContext>
              </div>
              {isAdvancedMode && (
                <div className="pt-4 border-t border-neutral-100 dark:border-neutral-800">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h2 className="text-lg font-semibold text-neutral-700 dark:text-neutral-200 tracking-tight">{t('budgets.independentBudgetsTitle')}</h2>
                      <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">{t('budgets.independentBudgetsDescription')}</p>
                    </div>
                    <span className="bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 px-2 py-1 rounded-md text-xs font-semibold">{t('budgets.subcategoriesCount', { count: independentBudgets.length })}</span>
                  </div>
                  <DndContext sensors={dragSensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                    <SortableContext items={orderedCategoryBudgets.filter((budget) => budget.parentBudgetId == null).map((budget) => budget.id)} strategy={rectSortingStrategy}>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {orderedCategoryBudgets.filter((budget) => budget.parentBudgetId == null).map((budget) => (
                          <SortableBudgetCard
                            key={budget.id}
                            budget={budget}
                            openMenuId={typeof openMenuId === 'number' ? openMenuId : null}
                            setOpenMenuId={setOpenMenuId}
                            isAdvancedMode
                            onEdit={() => {
                              setBudgetToEdit(budget);
                              setIsDrawerOpen(true);
                            }}
                            onDelete={() => {
                              setBudgetActionTarget(budget);
                              setActionError(null);
                              setIsSubBudgetDeleteModalOpen(true);
                            }}
                            onLink={() => openLinkDialog(budget)}
                            onClose={() => openCloseDialog(budget)}
                            onUpdateAmount={(amount) => handleUpdateAmount(budget, amount)}
                          />
                        ))}
                        <button
                          type="button"
                          className="border-2 border-dashed border-primary-200/60 rounded-2xl p-6 flex flex-col items-center justify-center text-center text-neutral-500 dark:text-neutral-400 hover:bg-primary-50 dark:hover:bg-primary-950/30 hover:border-primary-300 dark:hover:border-primary-700 transition-colors min-h-[220px] group"
                          onClick={() => openDrawer(false)}
                        >
                          <span className="w-12 h-12 bg-white dark:bg-neutral-800 rounded-full flex items-center justify-center shadow-sm mb-3 group-hover:text-primary-500 dark:group-hover:text-primary-400 transition-colors">
                            <Plus className="w-6 h-6" />
                          </span>
                          <span className="font-medium text-sm text-neutral-700 dark:text-neutral-200">{t('budgets.createIndependent')}</span>
                          <span className="text-xs mt-1 px-4">{t('budgets.createIndependentHint')}</span>
                        </button>
                      </div>
                    </SortableContext>
                  </DndContext>
                </div>
              )}
            </>
          )}
        </TabsContent>
        <TabsContent value="history" className="mt-0">
          <BudgetHistoryList />
        </TabsContent>
      </Tabs>
      <BudgetDrawer 
        isOpen={isDrawerOpen} 
        onClose={handleDrawerClose}
        budgetToEdit={budgetToEdit}
        defaultIsGlobal={drawerIsGlobal}
        isAdvancedMode={isAdvancedMode}
        independentBudgets={independentBudgets}
      />
      <BudgetLinkDialog
        isOpen={isLinkModalOpen}
        budget={budgetActionTarget}
        globalBudget={globalBudget ?? null}
        onClose={closeLinkDialog}
        onConfirm={(globalBudgetId, budgetId) => linkBudget({ globalBudgetId, budgetId }).then(() => undefined)}
      />
      <BudgetDetachDialog
        isOpen={isDetachModalOpen}
        budget={budgetActionTarget}
        onClose={() => setIsDetachModalOpen(false)}
        onConfirm={(globalBudgetId, budgetId) => detachBudget({ globalBudgetId, budgetId }).then(() => undefined)}
      />
      <BudgetModeTransitionDialog
        isOpen={isModeTransitionOpen}
        independentBudgets={independentBudgets}
        globalBudget={globalBudget}
        isChangingMode={isChangingBudgetMode}
        modeError={modeError}
        onClose={() => setIsModeTransitionOpen(false)}
        onCreateGlobal={createGlobalFromTransition}
        onRequestLink={requestGuidedLink}
        onCloseBudget={(budgetId) => closeBudget(budgetId)}
        onDeleteBudget={(budgetId) => deleteBudget({ id: budgetId, cascade: false })}
        onEnableNormalMode={enableNormalMode}
      />
      <BudgetActionModals
        closeOpen={isCloseModalOpen}
        deleteOpen={isDeleteModalOpen}
        deleteSubBudgetOpen={isSubBudgetDeleteModalOpen}
        isAdvancedMode={isAdvancedMode}
        isProcessing={isProcessing}
        actionError={actionError}
        deleteCascade={deleteCascade}
        target={budgetActionTarget}
        onCloseClose={() => setIsCloseModalOpen(false)}
        onDeleteClose={() => setIsDeleteModalOpen(false)}
        onDeleteSubBudgetClose={() => setIsSubBudgetDeleteModalOpen(false)}
        onDeleteCascadeChange={setDeleteCascade}
        onConfirmClose={handleCloseBudget}
        onConfirmDelete={handleDeleteBudget}
        onConfirmDeleteSubBudget={handleDeleteSubBudget}
      />
    </div>
  );
}
