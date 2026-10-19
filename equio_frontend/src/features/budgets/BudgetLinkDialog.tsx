import { useQuery } from '@tanstack/react-query';
import { CalendarRange, Link2, Unlink } from 'lucide-react';
import { useState } from 'react';
import { format, parseISO } from 'date-fns';
import { enUS, es } from 'date-fns/locale';
import { budgetsApi } from '../../api/budgets.api';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { useCurrency } from '../../hooks/useCurrency';
import { useI18n } from '../../i18n/i18nContextValue';
import type { BudgetResponse } from '../../types/budget.types';
import { getApiErrorMessage } from '../../utils/apiError';
import { privateQueryKey } from '../../api/queryCache';
import { useAuth } from '../../contexts/authContextValue';

interface BudgetLinkDialogProps {
  isOpen: boolean;
  budget: BudgetResponse | null;
  globalBudget: BudgetResponse | null;
  onClose: () => void;
  onConfirm: (globalBudgetId: number, budgetId: number) => Promise<void>;
}

export function BudgetLinkDialog({
  isOpen,
  budget,
  globalBudget,
  onClose,
  onConfirm,
}: BudgetLinkDialogProps) {
  const { t, language } = useI18n();
  const { user } = useAuth();
  const { formatCurrency } = useCurrency();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const previewQuery = useQuery({
    queryKey: privateQueryKey(user?.id, ['budgets', 'link-preview', globalBudget?.id, budget?.id]),
    queryFn: () => budgetsApi.previewLink(budget!.id, globalBudget!.id),
    enabled: Boolean(user) && isOpen && budget != null && globalBudget != null,
    staleTime: 0,
    retry: false,
  });

  const confirm = async () => {
    if (!budget || !globalBudget || isSubmitting) return;
    setSubmitError(null);
    setIsSubmitting(true);
    try {
      await onConfirm(globalBudget.id, budget.id);
      onClose();
    } catch (error: unknown) {
      setSubmitError(getApiErrorMessage(error, t('budgets.actionError'), t));
    } finally {
      setIsSubmitting(false);
    }
  };

  const previewError = previewQuery.error
    ? getApiErrorMessage(previewQuery.error, t('budgets.linkPreviewError'), t)
    : null;
  const formatDate = (value: string | null) => value
    ? format(parseISO(value), 'PP', { locale: language === 'es' ? es : enUS })
    : t('budgets.continuousPeriod');

  return (
    <Modal isOpen={isOpen} onClose={() => !isSubmitting && onClose()} title={t('budgets.linkTitle')}>
      <div className="mt-4 space-y-5">
        <div className="flex items-start gap-3 rounded-lg border border-primary-100 bg-primary-50 p-4 text-sm text-primary-950 dark:border-primary-900 dark:bg-primary-950/30 dark:text-primary-100">
          <Link2 className="mt-0.5 h-5 w-5 shrink-0 text-primary-600 dark:text-primary-400" />
          <p>{t('budgets.linkDescription', { name: budget?.name ?? '' })}</p>
        </div>

        {previewQuery.isLoading ? (
          <p className="py-5 text-center text-sm text-neutral-500 dark:text-neutral-400">{t('budgets.linkPreviewLoading')}</p>
        ) : previewError ? (
          <div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-300">
            <p>{previewError}</p>
            <Button className="mt-3" variant="secondary" onClick={() => previewQuery.refetch()}>{t('common.retry')}</Button>
          </div>
        ) : previewQuery.data ? (
          <div className="grid grid-cols-2 gap-3">
            <PreviewMetric label={t('budgets.linkNewPeriod')} value={`${formatDate(previewQuery.data.startDate)} - ${formatDate(previewQuery.data.endDate)}`} icon={<CalendarRange />} />
            <PreviewMetric label={t('budgets.linkAssimilatedSpent')} value={formatCurrency(previewQuery.data.assimilatedSpentAmount)} />
            <PreviewMetric label={t('budgets.linkLimit')} value={formatCurrency(previewQuery.data.budgetLimit)} />
            <PreviewMetric
              label={t('budgets.linkRemainingCapacity')}
              value={formatCurrency(Math.max(0, previewQuery.data.globalUnallocatedAfterLink))}
              danger={previewQuery.data.globalUnallocatedAfterLink < 0}
            />
          </div>
        ) : null}

        {(submitError || (previewQuery.data?.globalUnallocatedAfterLink ?? 0) < 0) && (
          <p role="alert" className="text-sm text-rose-600 dark:text-rose-400">
            {submitError ?? t('budgets.linkInsufficientCapacity')}
          </p>
        )}

        <div className="flex justify-end gap-3 border-t border-neutral-100 pt-4 dark:border-neutral-700">
          <Button variant="secondary" disabled={isSubmitting} onClick={onClose}>{t('common.cancel')}</Button>
          <Button
            variant="primary"
            isLoading={isSubmitting}
            disabled={!previewQuery.data || previewQuery.data.globalUnallocatedAfterLink < 0}
            onClick={confirm}
          >
            <Link2 className="h-4 w-4" /> {t('budgets.linkConfirm')}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

interface BudgetDetachDialogProps {
  isOpen: boolean;
  budget: BudgetResponse | null;
  onClose: () => void;
  onConfirm: (globalBudgetId: number, budgetId: number) => Promise<void>;
}

export function BudgetDetachDialog({ isOpen, budget, onClose, onConfirm }: BudgetDetachDialogProps) {
  const { t } = useI18n();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const confirm = async () => {
    if (!budget?.parentBudgetId || isSubmitting) return;
    setSubmitError(null);
    setIsSubmitting(true);
    try {
      await onConfirm(budget.parentBudgetId, budget.id);
      onClose();
    } catch (error: unknown) {
      setSubmitError(getApiErrorMessage(error, t('budgets.actionError'), t));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={() => !isSubmitting && onClose()} title={t('budgets.detachTitle')}>
      <div className="mt-4 space-y-5">
        <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-100">
          <Unlink className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
          <p>{t('budgets.detachDescription', { name: budget?.name ?? '' })}</p>
        </div>
        {submitError && <p role="alert" className="text-sm text-rose-600 dark:text-rose-400">{submitError}</p>}
        <div className="flex justify-end gap-3 border-t border-neutral-100 pt-4 dark:border-neutral-700">
          <Button variant="secondary" disabled={isSubmitting} onClick={onClose}>{t('common.cancel')}</Button>
          <Button variant="primary" isLoading={isSubmitting} onClick={confirm}>
            <Unlink className="h-4 w-4" /> {t('budgets.detachConfirm')}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function PreviewMetric({ label, value, icon, danger = false }: { label: string; value: string; icon?: React.ReactNode; danger?: boolean }) {
  return (
    <div className="rounded-lg border border-neutral-200 p-3 dark:border-neutral-700">
      <p className="flex items-center gap-1.5 text-xs font-medium text-neutral-500 dark:text-neutral-400">
        {icon}<span>{label}</span>
      </p>
      <p className={`mt-1 text-sm font-bold ${danger ? 'text-rose-600 dark:text-rose-400' : 'text-neutral-900 dark:text-white'}`}>{value}</p>
    </div>
  );
}
