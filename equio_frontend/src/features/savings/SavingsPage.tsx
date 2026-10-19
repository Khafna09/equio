import { useState } from 'react';
import { useSavings } from '../../hooks/useSavings';
import { useBudgets } from '../../hooks/useBudgets';
import { Card } from '../../components/ui/Card';
import { MagicCard } from '../../components/ui/magic-card';
import { Button } from '../../components/ui/Button';
import { SavingGoalModal } from './SavingGoalModal';
import { EditGoalModal } from './EditGoalModal';
import { FundModal } from './FundModal';
import { ArrowRightLeft, MoreHorizontal, PiggyBank, Plus, ShieldCheck, Target } from 'lucide-react';
import type { SavingGoalResponse } from '../../types/saving.types';
import { format } from 'date-fns';
import { es, enUS } from 'date-fns/locale';
import { useSharedElementModal } from '../../hooks/useSharedElementModal';
import { useCurrency } from '../../hooks/useCurrency';
import { getDeterministicFallbackImage } from '../../utils/unsplash';
import { useI18n } from '../../i18n/i18nContextValue';
import { SavingsPoolTransferModal } from './SavingsPoolTransferModal';
import { AnimatePresence, motion } from 'framer-motion';
import { useSavingsPool } from '../../hooks/useSavingsPool';

export function SavingsPage() {
  const { savings, isLoading } = useSavings();
  const {
    savingsPool, isLoading: isPoolLoading, isTransferPending,
    transferPoolToGoal, transferPoolToBudget,
  } = useSavingsPool();
  const { budgets } = useBudgets();
  const { triggerRect, captureTrigger } = useSharedElementModal();
  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);
  const [editGoal, setEditGoal] = useState<SavingGoalResponse | null>(null);
  const [balanceView, setBalanceView] = useState<'goals' | 'pool'>('goals');
  const [isPoolModalOpen, setIsPoolModalOpen] = useState(false);

  const [fundModalState, setFundModalState] = useState<{ isOpen: boolean; goal: SavingGoalResponse | null; operation: 'ADD' | 'WITHDRAW' }>({
    isOpen: false,
    goal: null,
    operation: 'ADD'
  });

  const { formatCurrency: formatCurrencyHook } = useCurrency();
  const { t, language } = useI18n();
  const formatCurrency = (val: number) => formatCurrencyHook(val, { maximumFractionDigits: 0 });

  const totalSaved = savings.reduce((acc, curr) => acc + curr.currentAmount, 0);
  const totalTarget = savings.reduce((acc, curr) => acc + curr.targetAmount, 0);
  const totalProgress = totalTarget > 0 ? (totalSaved / totalTarget) * 100 : 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold text-neutral-900 dark:text-white tracking-tight">{t('savings.title')}</h1>
          <p className="text-neutral-500 dark:text-neutral-400 mt-1">{t('savings.subtitle')}</p>
        </div>
      </div>
      <div className="flex flex-col lg:flex-row gap-6">
        <Card className="flex-1 min-h-[230px] p-6 md:p-8 bg-white dark:bg-neutral-800 border-none shadow-sm rounded-[2rem] flex flex-col justify-center">
          <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={balanceView}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="flex w-full flex-col items-center gap-8 md:flex-row"
          >
          <div className="flex flex-col items-center justify-center text-center w-full md:w-auto shrink-0">
            <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-3 ${balanceView === 'pool' ? 'bg-primary-50 dark:bg-primary-950/40' : 'bg-emerald-50 dark:bg-emerald-950/40'}`}>
              {balanceView === 'pool'
                ? <PiggyBank className="w-10 h-10 text-primary-600 dark:text-primary-400" />
                : <ShieldCheck className="w-10 h-10 text-emerald-600 dark:text-emerald-400" />}
            </div>
            <h3 className="text-lg font-bold text-neutral-900 dark:text-white leading-tight min-h-[44px] flex items-center justify-center">
              {balanceView === 'pool' ? t('savings.poolTitle') : t('savings.globalBalance')}
            </h3>
          </div>

          <div className="flex-1 w-full flex flex-col justify-center">
            <div className="mb-5 h-8 flex items-center justify-end">
              {(savingsPool.balance > 0 || balanceView === 'pool') && (
                <div className="inline-flex rounded-xl bg-neutral-100 dark:bg-neutral-900 p-1">
                  <button type="button" onClick={() => setBalanceView('goals')} className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${balanceView === 'goals' ? 'bg-white dark:bg-neutral-700 text-emerald-700 dark:text-emerald-300 shadow-sm' : 'text-neutral-500'}`}>
                    <Target className="h-4 w-4" /> {t('savings.goalsBalance')}
                  </button>
                  <button type="button" onClick={() => setBalanceView('pool')} className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${balanceView === 'pool' ? 'bg-white dark:bg-neutral-700 text-primary-700 dark:text-primary-300 shadow-sm' : 'text-neutral-500'}`}>
                    <PiggyBank className="h-4 w-4" /> {t('savings.poolShort')}
                  </button>
                </div>
              )}
            </div>
            <div className="flex justify-between items-end mb-2 min-h-[44px]">
              <div>
                <p className="text-xs font-semibold text-neutral-400 mb-0.5">{t('savings.currentBalance')}</p>
                <p className="text-4xl font-bold text-neutral-900 dark:text-white leading-none">
                  {isPoolLoading && balanceView === 'pool' ? '...' : formatCurrency(balanceView === 'pool' ? savingsPool.balance : totalSaved)}
                </p>
              </div>
              <div className="text-right h-10 flex items-end justify-end">
                {balanceView === 'goals' ? (
                  <div className="flex flex-col justify-end">
                    <p className="text-xs font-semibold text-neutral-400 mb-0.5">{t('savings.goal')}</p>
                    <p className="text-2xl font-bold text-neutral-900 dark:text-white leading-none">{formatCurrency(totalTarget)}</p>
                  </div>
                ) : savingsPool.balance > 0 ? (
                  <Button variant="primary" className="rounded-xl h-9 text-xs font-semibold px-3.5" onClick={() => setIsPoolModalOpen(true)}>
                    <ArrowRightLeft className="h-3.5 w-3.5 mr-1.5" /> {t('savings.poolUseFunds')}
                  </Button>
                ) : (
                  <div className="h-9" />
                )}
              </div>
            </div>
            <div className="mt-4 h-6 flex items-center">
              {balanceView === 'goals' ? (
                <div className="w-full h-3 bg-emerald-50 dark:bg-neutral-700/80 rounded-full overflow-hidden border border-transparent dark:border-neutral-600/40">
                  <div className="h-full bg-emerald-400 rounded-full transition-all duration-500" style={{ width: `${Math.min(totalProgress, 100)}%` }} />
                </div>
              ) : (
                <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate w-full">{t('savings.poolDescription')}</p>
              )}
            </div>
          </div>
          </motion.div>
          </AnimatePresence>
        </Card>

        <div className="lg:w-[350px] shrink-0 border-2 border-dashed border-primary-200 dark:border-primary-800 bg-primary-50/30 dark:bg-primary-950/20 rounded-[2rem] p-8 flex flex-col justify-center">
          <h3 className="text-lg font-bold text-primary-900 dark:text-primary-300 mb-2">{t('savings.newGoalTitle')}</h3>
          <p className="text-neutral-500 dark:text-neutral-400 text-sm mb-6 leading-relaxed">
            {t('savings.newGoalHint')}
          </p>
          <button
            onClick={(e) => {
              captureTrigger(e);
              setIsGoalModalOpen(true);
            }}
            className="w-full py-3.5 border border-primary-300 dark:border-primary-700 border-dashed rounded-full text-primary-600 dark:text-primary-300 font-semibold flex items-center justify-center gap-2 hover:bg-primary-50 dark:hover:bg-primary-950/50 transition-colors"
          >
            <Plus className="w-5 h-5" />
            {t('savings.newGoal')}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {isLoading ? (
          <div className="col-span-full py-12 text-center text-neutral-500 dark:text-neutral-400 animate-pulse">
            {t('savings.loading')}
          </div>
        ) : savings.length === 0 ? (
          <div className="col-span-full py-16 flex flex-col items-center justify-center bg-white dark:bg-neutral-800 rounded-[2rem] border border-primary-100/50 dark:border-neutral-700 shadow-sm shadow-primary-500/5">
            <div className="w-16 h-16 bg-primary-50 dark:bg-primary-950/50 text-primary-500 dark:text-primary-400 rounded-full flex items-center justify-center mb-4">
              <span className="text-2xl">🎯</span>
            </div>
            <h3 className="text-xl font-bold text-neutral-900 dark:text-white mb-2">{t('savings.emptyTitle')}</h3>
            <p className="text-neutral-500 dark:text-neutral-400 text-center max-w-md">
              {t('savings.emptyHint')}
            </p>
          </div>
        ) : (
          savings.map((goal) => {
            const displayImageUrl = goal.imageUrl || getDeterministicFallbackImage(goal.id ? String(goal.id) : goal.name);

            return (
              <div key={goal.id} className="h-full">
                <MagicCard gradientColor="#8B5CF6" className="p-3 bg-white dark:bg-neutral-800 border border-primary-100/50 dark:border-neutral-700 shadow-sm shadow-primary-500/5 hover:shadow-md hover:shadow-primary-500/10 hover:-translate-y-1 transition-all duration-300 rounded-[2.5rem] flex flex-col h-full min-h-[300px]">
                  <div className="relative h-38 w-full shrink-0 rounded-[2rem] overflow-hidden shadow-inner">
                    <img
                      src={displayImageUrl}
                      alt={goal.name}
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

                    {goal.tag && (
                      <div className="absolute top-3 right-3 bg-black/40 backdrop-blur-md text-white text-[10px] font-bold uppercase tracking-wider px-3.5 py-1 rounded-xl border border-white/20 shadow-sm">
                        {goal.tag}
                      </div>
                    )}

                    <div className="absolute bottom-3 left-4 pr-4">
                      <h3 className="text-white text-xl font-bold leading-tight mb-0.5 drop-shadow-md capitalize">{goal.name}</h3>
                      <p className="text-white/90 text-[11px] font-semibold drop-shadow-sm">
                        {goal.deadline
                          ? t('savings.nextDeadline', { date: format(new Date(goal.deadline), 'MMMM yyyy', { locale: language === 'en' ? enUS : es }) })
                          : t('savings.noDeadline')}
                      </p>
                    </div>
                  </div>

                    <div className="px-3 pt-3 pb-2 flex flex-col flex-1 justify-between w-full">
                      <div>
                        <div className="flex justify-between items-end mb-2">
                          <div className="text-neutral-900 dark:text-white font-bold text-base">
                            {formatCurrency(goal.currentAmount)} <span className="text-neutral-400 font-semibold text-xs">/ {formatCurrency(goal.targetAmount)}</span>
                          </div>
                          <div className="text-primary-600 font-bold text-xs">
                            {goal.progressPercentage}%
                          </div>
                        </div>

                        <div className="w-full h-2 bg-primary-50 rounded-full overflow-hidden mb-3">
                          <div
                            className="h-full bg-primary-500 rounded-full transition-all duration-500"
                            style={{ width: `${Math.min(goal.progressPercentage, 100)}%` }}
                          />
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          variant="primary"
                          data-contribution-goal-id={goal.id}
                          className="flex-1 rounded-2xl py-2.5 bg-primary-600 hover:bg-primary-700 font-semibold text-xs"
                          onClick={(e) => {
                            captureTrigger(e);
                            setFundModalState({ isOpen: true, goal, operation: 'ADD' });
                          }}
                        >
                          {t('savings.contribute')}
                        </Button>
                        <Button
                          variant="secondary"
                          className="flex-1 rounded-2xl py-2.5 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-200 font-semibold text-xs border-none"
                          onClick={(e) => {
                            captureTrigger(e);
                            setFundModalState({ isOpen: true, goal, operation: 'WITHDRAW' });
                          }}
                        >
                          {t('savings.withdraw')}
                        </Button>
                        <button
                          type="button"
                          className="w-10 h-10 shrink-0 rounded-2xl bg-neutral-50 dark:bg-neutral-900 hover:bg-neutral-100 dark:hover:bg-neutral-700 text-neutral-500 dark:text-neutral-400 flex items-center justify-center transition-colors border border-neutral-100 dark:border-neutral-700"
                          onClick={(e) => {
                            captureTrigger(e);
                            setEditGoal(goal);
                          }}
                          title={t('savings.editGoal')}
                        >
                          <MoreHorizontal className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </MagicCard>
                </div>
              );
            })
        )}
      </div>

      <SavingGoalModal isOpen={isGoalModalOpen} onClose={() => setIsGoalModalOpen(false)} triggerRect={triggerRect} />
      <EditGoalModal isOpen={Boolean(editGoal)} onClose={() => setEditGoal(null)} goal={editGoal} triggerRect={triggerRect} />

      <FundModal
        isOpen={fundModalState.isOpen}
        onClose={() => setFundModalState(prev => ({ ...prev, isOpen: false }))}
        goal={fundModalState.goal}
        operation={fundModalState.operation}
        triggerRect={triggerRect}
      />
      <SavingsPoolTransferModal
        isOpen={isPoolModalOpen}
        onClose={() => setIsPoolModalOpen(false)}
        balance={savingsPool.balance}
        goals={savings}
        budgets={budgets}
        isProcessing={isTransferPending}
        onTransferToGoal={transferPoolToGoal}
        onTransferToBudget={transferPoolToBudget}
      />
    </div>
  );
}
