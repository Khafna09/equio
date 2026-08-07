import { useState } from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { useBudgets } from '../../hooks/useBudgets';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, ChevronDown, ChevronUp, RefreshCw, CheckCircle, XCircle } from 'lucide-react';
import ReactECharts from 'echarts-for-react';
import { useCurrency } from '../../hooks/useCurrency';
import { useI18n } from '../../i18n/I18nContext';

interface BudgetHistoryListProps {
  onReuse: (budget: any) => void;
}

export function BudgetHistoryList({ onReuse }: BudgetHistoryListProps) {
  const { historyBudgets: rawHistory, isHistoryLoading } = useBudgets();
  const { formatCurrency: formatCurrencyHook } = useCurrency();
  const { t, language } = useI18n();
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const formatCurrency = (val: number) => formatCurrencyHook(val, { maximumFractionDigits: 0 });

  // Filtrar y ordenar los presupuestos cerrados (más recientes primero)
  const historyBudgets = rawHistory
    .filter(b => !b.parentBudgetId) // Raíces (globales o independientes cerrados)
    .sort((a, b) => new Date(b.endDate || b.createdAt).getTime() - new Date(a.endDate || a.createdAt).getTime());

  if (isHistoryLoading) {
    return (
      <div className="py-12 text-center text-neutral-500 dark:text-neutral-400 animate-pulse bg-neutral-50 dark:bg-neutral-900 rounded-2xl border border-neutral-100 dark:border-neutral-700">
        {t('budgets.historyLoading')}
      </div>
    );
  }

  if (historyBudgets.length === 0) {
    return (
      <div className="py-16 flex flex-col items-center justify-center bg-neutral-50 dark:bg-neutral-900/50 border border-neutral-200 dark:border-neutral-700 rounded-3xl text-center">
        <div className="w-16 h-16 bg-white dark:bg-neutral-800 shadow-sm text-neutral-400 rounded-full flex items-center justify-center mb-4">
          <Calendar className="w-8 h-8" />
        </div>
        <h3 className="text-lg font-bold text-neutral-900 dark:text-white mb-2">{t('budgets.noHistory')}</h3>
        <p className="text-neutral-500 dark:text-neutral-400 max-w-sm text-sm">
          {t('budgets.historyEmpty')}
        </p>
      </div>
    );
  }


  return (
    <div className="space-y-4">
      {historyBudgets.map(budget => {
        const isExpanded = expandedId === budget.id;
        const progress = budget.totalAmount > 0 
          ? Math.min(100, (budget.spentAmount / budget.totalAmount) * 100) 
          : 0;
        
        const isSuccess = progress <= 100;
        
        // Obtener sub-presupuestos asociados
        const childBudgets = rawHistory.filter(b => b.parentBudgetId === budget.id);

        const chartOption = {
          tooltip: { trigger: 'item' },
          series: [
            {
              name: t('common.expense'),
              type: 'pie',
              radius: ['60%', '90%'],
              avoidLabelOverlap: false,
              label: { show: false, position: 'center' },
              labelLine: { show: false },
              data: [
                { value: budget.spentAmount, name: t('budgets.spent'), itemStyle: { color: isSuccess ? '#10B981' : '#EF4444' } },
                { value: Math.max(0, budget.totalAmount - budget.spentAmount), name: t('budgets.remaining'), itemStyle: { color: '#E5E7EB' } }
              ]
            }
          ]
        };

        return (
          <Card key={budget.id} className="overflow-hidden shadow-sm">
            <div 
              className="p-5 flex items-center justify-between cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
              onClick={() => setExpandedId(isExpanded ? null : budget.id)}
            >
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${isSuccess ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                  {isSuccess ? <CheckCircle className="w-6 h-6" /> : <XCircle className="w-6 h-6" />}
                </div>
                <div>
                  <h4 className="font-semibold text-neutral-900 dark:text-white text-lg">{budget.name}</h4>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">
                    {budget.isFixed ? t('budgets.continuousPeriod') : t('budgets.validRange', { start: budget.startDate ?? '', end: budget.endDate ?? '' })}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-6">
                <div className="text-right">
                  <div className="font-bold text-neutral-900 dark:text-white">{formatCurrency(budget.spentAmount)}</div>
                  <div className="text-xs text-neutral-500 dark:text-neutral-400">{language === 'en' ? 'of' : 'de'} {formatCurrency(budget.totalAmount)}</div>
                </div>
                <div className="text-neutral-400">
                  {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                </div>
              </div>
            </div>

            <AnimatePresence>
              {isExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="border-t border-neutral-100 dark:border-neutral-700"
                >
                  <div className="p-5 flex flex-col md:flex-row gap-8 items-start bg-neutral-50 dark:bg-neutral-900/30">
                    
                    <div className="w-full md:w-1/3 flex flex-col items-center">
                      <div className="h-32 w-full relative">
                        <ReactECharts option={chartOption} style={{ height: '100%', width: '100%' }} />
                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                          <span className={`text-xl font-bold ${isSuccess ? 'text-green-600' : 'text-red-600'}`}>
                            {progress.toFixed(0)}%
                          </span>
                        </div>
                      </div>
                      <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400 mt-2 text-center">
                        {isSuccess ? 'Dentro del límite' : 'Excediste el límite'}
                      </span>
                    </div>

                    <div className="w-full md:w-2/3">
                      <h5 className="text-sm font-semibold text-neutral-900 dark:text-white mb-3">Desglose por Categoría</h5>
                      {childBudgets.length > 0 ? (
                        <div className="space-y-3">
                          {childBudgets.map(child => {
                            const childProgress = child.totalAmount > 0 
                              ? (child.spentAmount / child.totalAmount) * 100 
                              : 0;
                            const isChildSuccess = childProgress <= 100;
                            return (
                              <div key={child.id} className="flex justify-between items-center text-sm">
                                <div className="flex items-center gap-2">
                                  <span>{child.categoryIcon}</span>
                                  <span className="font-medium text-neutral-700 dark:text-neutral-200">{child.categoryName}</span>
                                </div>
                                <div className="flex items-center gap-3">
                                  <span className={`font-semibold ${isChildSuccess ? 'text-green-600' : 'text-red-600'}`}>
                                    {formatCurrency(child.spentAmount)} <span className="text-neutral-400 font-normal">/ {formatCurrency(child.totalAmount)}</span>
                                  </span>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      ) : (
                        <p className="text-sm text-neutral-500 dark:text-neutral-400 italic">{t('budgets.noSubBudgets')}</p>
                      )}

                      {!budget.isFixed && (
                        <div className="mt-6 flex justify-end">
                          <Button 
                            variant="secondary" 
                            className="text-sm shadow-sm flex items-center gap-2"
                            onClick={(e) => {
                              e.stopPropagation();
                              onReuse(budget);
                            }}
                          >
                            <RefreshCw className="w-4 h-4" /> {t('budgets.reuseBudget')}
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </Card>
        );
      })}
    </div>
  );
}
