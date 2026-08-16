import { useState } from 'react';
import { Card } from '../../components/ui/Card';
import { ProgressBar } from '../../components/ui/ProgressBar';
import { MoreVertical, Pencil, Trash2, Check, X, GripVertical } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

import { getCategoryBadgeStyle } from '../../utils/categoryStyle';
import { useCurrency } from '../../hooks/useCurrency';
import { useI18n } from '../../i18n/i18nContextValue';
import type { BudgetResponse } from '../../types/budget.types';

interface BudgetCardProps {
  budget: BudgetResponse;
  onEdit: () => void;
  onDelete: () => void;
  onUpdateAmount: (newAmount: number) => Promise<void>;
  openMenuId: number | null;
  setOpenMenuId: (id: number | null) => void;
  isAdvancedMode?: boolean;
}

export function BudgetCard({ budget, onEdit, onDelete, onUpdateAmount, openMenuId, setOpenMenuId, isAdvancedMode = false }: BudgetCardProps) {
  const { formatCurrency: formatCurrencyHook } = useCurrency();
  const { t } = useI18n();
  const formatCurrency = (val: number) => formatCurrencyHook(val, { maximumFractionDigits: 0 });
  const [isEditingAmount, setIsEditingAmount] = useState(false);
  const [editAmount, setEditAmount] = useState(String(budget.totalAmount));
  const [isSaving, setIsSaving] = useState(false);

  const handleSaveAmount = async () => {
    const val = parseFloat(editAmount);
    if (isNaN(val) || val <= 0) return;

    setIsSaving(true);
    try {
      await onUpdateAmount(val);
      setIsEditingAmount(false);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card className="p-5 flex flex-col justify-between overflow-visible relative min-h-[220px]">
      <div className="flex justify-between items-start mb-6">
        <div className="flex items-center gap-3 min-w-0">
          <div
            className="w-11 h-11 rounded-2xl flex items-center justify-center text-xl shrink-0 border"
            style={getCategoryBadgeStyle(budget.categoryColor ?? undefined)}
          >
            {budget.categoryIcon || t('common.folderIcon')}
          </div>
          <div className="min-w-0">
            <h3 className="font-semibold text-neutral-900 dark:text-white text-lg flex items-center gap-2 truncate">
              {isAdvancedMode ? budget.name : (budget.categoryName || t('common.category'))}
              {isAdvancedMode && budget.parentBudgetId && (
                <span className="text-[10px] bg-primary-50 text-primary-600 px-1.5 py-0.5 rounded-md font-medium uppercase tracking-wider">
                  {t('budgets.linked')}
                </span>
              )}
              {isAdvancedMode && !budget.parentBudgetId && (
                <span className="text-[10px] bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400 px-1.5 py-0.5 rounded-md font-medium uppercase tracking-wider">
                  {t('budgets.independent')}
                </span>
              )}
            </h3>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate">
              {isAdvancedMode ? (budget.categoryName || t('common.category')) : t('budgets.subBudgetLabel')}
            </p>
          </div>
        </div>
        <div className="relative z-10 flex items-center gap-1">
          <span 
            className="text-neutral-300 dark:text-neutral-600 hover:text-neutral-500 dark:hover:text-neutral-400 p-1 rounded-lg cursor-grab active:cursor-grabbing transition-colors"
            title={t('budgets.dragToReorder')}
          >
            <GripVertical className="w-4 h-4" />
          </span>
          <button
            onClick={() => setOpenMenuId(openMenuId === budget.id ? null : budget.id)}
            className="text-neutral-400 dark:text-neutral-500 hover:text-neutral-600 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-700 p-1 rounded-lg transition-colors"
          >
            <MoreVertical className="w-5 h-5" />
          </button>
          {openMenuId === budget.id && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setOpenMenuId(null)}
              />
              <div className="absolute right-0 mt-1 w-48 bg-white dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 rounded-xl shadow-lg z-20 py-1 overflow-hidden">
                <button
                  onClick={() => {
                    setOpenMenuId(null);
                    onEdit();
                  }}
                  className="w-full px-4 py-2 text-left text-sm text-neutral-700 dark:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-neutral-700/60 flex items-center gap-2"
                >
                  <Pencil className="w-4 h-4" /> {t('budgets.editBudget')}
                </button>
                <button
                  onClick={() => {
                    setOpenMenuId(null);
                    onDelete();
                  }}
                  className="w-full px-4 py-2 text-left text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 flex items-center gap-2"
                >
                  <Trash2 className="w-4 h-4" /> {t('common.delete')}
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      <div>
        <div className="flex items-end gap-1 mb-2">
          <span className="text-4xl font-bold text-neutral-900 dark:text-white tracking-tight">
            {formatCurrency(budget.spentAmount)}
          </span>
        </div>

        <div className="flex justify-between items-center text-sm mb-4 min-h-[32px]">
          <AnimatePresence mode="wait">
            {!isEditingAmount ? (
              <motion.div
                key="display"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="flex items-center gap-2"
              >
                <span className="text-neutral-500 dark:text-neutral-400 font-medium">{t('common.of')} {formatCurrency(budget.totalAmount)}</span>
                <button
                  onClick={() => setIsEditingAmount(true)}
                  className="text-neutral-300 hover:text-neutral-500 dark:hover:text-neutral-300 dark:text-neutral-400 transition-colors"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
              </motion.div>
            ) : (
              <motion.div
                key="edit"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="flex items-center gap-1"
              >
                <span className="text-neutral-500 dark:text-neutral-400 font-medium">{t('common.of')}</span>
                <input
                  type="number"
                  value={editAmount}
                  onChange={(e) => setEditAmount(e.target.value)}
                  className="w-20 px-2 py-1 text-sm bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded outline-none focus:border-primary-500 font-medium"
                  autoFocus
                  onKeyDown={(e) => e.key === 'Enter' && handleSaveAmount()}
                />
                <button
                  onClick={handleSaveAmount}
                  disabled={isSaving}
                  className="p-1 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-950/30 rounded transition-colors"
                >
                  <Check className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setIsEditingAmount(false)}
                  disabled={isSaving}
                  className="p-1 text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </motion.div>
            )}
          </AnimatePresence>
          <span className="font-semibold" style={{ color: budget.progressPercentage >= 90 ? '#F43F5E' : (budget.progressPercentage >= 70 ? '#F59E0B' : '#10B981') }}>
            {budget.progressPercentage}%
          </span>
        </div>
        <ProgressBar percentage={budget.progressPercentage} />
      </div>
    </Card>
  );
}