import { AlertTriangle, Trash2 } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { useCurrency } from '../../hooks/useCurrency';
import { useI18n } from '../../i18n/i18nContextValue';
import type { BudgetResponse } from '../../types/budget.types';

interface BudgetActionModalsProps {
  closeOpen: boolean;
  deleteOpen: boolean;
  deleteSubBudgetOpen: boolean;
  isAdvancedMode: boolean;
  isProcessing: boolean;
  deleteCascade: boolean;
  target: BudgetResponse | null;
  onCloseClose: () => void;
  onDeleteClose: () => void;
  onDeleteSubBudgetClose: () => void;
  onDeleteCascadeChange: (cascade: boolean) => void;
  onConfirmClose: () => void;
  onConfirmDelete: () => void;
  onConfirmDeleteSubBudget: () => void;
}

export function BudgetActionModals({
  closeOpen,
  deleteOpen,
  deleteSubBudgetOpen,
  isAdvancedMode,
  isProcessing,
  deleteCascade,
  target,
  onCloseClose,
  onDeleteClose,
  onDeleteSubBudgetClose,
  onDeleteCascadeChange,
  onConfirmClose,
  onConfirmDelete,
  onConfirmDeleteSubBudget,
}: BudgetActionModalsProps) {
  const { t } = useI18n();
  const { formatCurrency } = useCurrency();

  return (
    <>
      <Modal
        isOpen={closeOpen}
        onClose={() => !isProcessing && onCloseClose()}
        title={t('budgets.closePeriodNow')}
      >
        <div className="mt-4">
          <div className="flex items-start gap-4 p-4 bg-orange-50 dark:bg-orange-950/30 text-orange-900 dark:text-orange-100 border border-orange-200 dark:border-orange-900/60 rounded-xl mb-6">
            <AlertTriangle className="w-6 h-6 shrink-0 mt-0.5 text-orange-600" />
            <div className="text-sm">
              <p className="font-semibold mb-1 text-base">{t('budgets.closeQuestion')}</p>
              <p className="text-orange-800 dark:text-orange-200 opacity-90">
                {t('budgets.closeDescription')}
              </p>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" disabled={isProcessing} onClick={onCloseClose}>
              {t('common.cancel')}
            </Button>
            <Button
              variant="primary"
              className="bg-orange-500 hover:bg-orange-600 focus:ring-orange-500 border-none shadow-sm shadow-orange-500/20"
              isLoading={isProcessing}
              onClick={onConfirmClose}
            >
              {t('budgets.closeBudget')}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={deleteOpen}
        onClose={() => !isProcessing && onDeleteClose()}
        title={t('budgets.deletePermanently')}
      >
        <div className="mt-4">
          <div className="flex items-start gap-4 p-4 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/60 rounded-xl mb-6">
            <Trash2 className="w-6 h-6 shrink-0 mt-0.5 text-red-600" />
            <div className="text-sm text-red-900 dark:text-red-100 w-full">
              <p className="font-semibold mb-3 text-base">{t('budgets.deleteWarning')}</p>
              {!isAdvancedMode ? (
                <p className="mt-4 mb-2 opacity-90">{t('budgets.deleteGlobalCascade')}</p>
              ) : (
                <div className="space-y-3 mt-4 w-full">
                  <DeleteOption
                    checked={deleteCascade}
                    title={t('budgets.deleteAll')}
                    description={t('budgets.deleteAllHint')}
                    onChange={() => onDeleteCascadeChange(true)}
                  />
                  <DeleteOption
                    checked={!deleteCascade}
                    title={t('budgets.deleteOnlyTotal')}
                    description={t('budgets.deleteOnlyTotalHint')}
                    onChange={() => onDeleteCascadeChange(false)}
                  />
                </div>
              )}
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2 border-t border-neutral-100 dark:border-neutral-700">
            <Button variant="secondary" disabled={isProcessing} onClick={onDeleteClose}>
              {t('common.cancel')}
            </Button>
            <Button
              variant="primary"
              className="bg-red-600 hover:bg-red-700 focus:ring-red-500 border-none shadow-sm shadow-red-500/20"
              isLoading={isProcessing}
              onClick={onConfirmDelete}
            >
              {t('common.delete')}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={deleteSubBudgetOpen}
        onClose={() => !isProcessing && onDeleteSubBudgetClose()}
        title={t('budgets.deleteSubTitle')}
      >
        <div className="mt-4">
          <div className="flex items-start gap-4 p-4 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/60 rounded-xl mb-6">
            <Trash2 className="w-6 h-6 shrink-0 mt-0.5 text-red-600" />
            <div className="text-sm text-red-900 dark:text-red-100">
              <p className="font-semibold mb-1 text-base">
                {t('budgets.deleteSubQuestion', {
                  name: target?.categoryName || target?.name || '',
                })}
              </p>
              <p className="text-red-700 dark:text-red-300 text-xs leading-relaxed mt-2">
                {t('budgets.deleteSubDescription', {
                  amount: formatCurrency(target?.totalAmount ?? 0),
                })}
              </p>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2 border-t border-neutral-100 dark:border-neutral-700">
            <Button variant="secondary" disabled={isProcessing} onClick={onDeleteSubBudgetClose}>
              {t('common.cancel')}
            </Button>
            <Button
              variant="primary"
              className="bg-red-600 hover:bg-red-700 focus:ring-red-500 border-none shadow-sm shadow-red-600/20"
              isLoading={isProcessing}
              onClick={onConfirmDeleteSubBudget}
            >
              {t('budgets.deleteSubButton')}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}

interface DeleteOptionProps {
  checked: boolean;
  title: string;
  description: string;
  onChange: () => void;
}

function DeleteOption({ checked, title, description, onChange }: DeleteOptionProps) {
  return (
    <label className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${checked ? 'bg-white dark:bg-red-950/40 border-red-300 dark:border-red-700 shadow-sm' : 'border-transparent hover:bg-red-100/50 dark:hover:bg-red-950/40'}`}>
      <input
        type="radio"
        name="cascade"
        className="mt-1 accent-red-600 w-4 h-4"
        checked={checked}
        onChange={onChange}
      />
      <span>
        <span className="font-medium block">{title}</span>
        <span className="text-xs opacity-80 block">{description}</span>
      </span>
    </label>
  );
}
