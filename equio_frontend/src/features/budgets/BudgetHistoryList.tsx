import { useState, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import { enUS, es } from 'date-fns/locale';
import { EChart } from '../../components/charts/EChart';
import {
  AlertTriangle,
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Download,
  PiggyBank,
  ReceiptText,
  Rows3,
  RotateCw,
  Target,
  Trash2,
  TrendingDown,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { budgetsApi } from '../../api/budgets.api';
import { privateQueryKey, queryKeys, queryStaleTimes } from '../../api/queryCache';
import { useAuth } from '../../contexts/authContextValue';
import { useBudgets } from '../../hooks/useBudgets';
import { useCurrency } from '../../hooks/useCurrency';
import { useI18n } from '../../i18n/i18nContextValue';
import { useTimeFormat } from '../../hooks/useTimeFormat';
import { getApiErrorMessage, getApiErrorMessageAsync } from '../../utils/apiError';
import type { BudgetHistoryReport, BudgetResponse } from '../../types/budget.types';
import { BudgetHistoryMovementsDrawer } from './BudgetHistoryMovementsDrawer';

interface SummaryMetricProps {
  icon: ReactNode;
  label: string;
  value: string;
  detail?: string;
  tone?: 'neutral' | 'success' | 'danger';
}

function SummaryMetric({ icon, label, value, detail, tone = 'neutral' }: SummaryMetricProps) {
  const toneClass = {
    neutral: 'text-neutral-700 bg-neutral-100 dark:text-neutral-200 dark:bg-neutral-800',
    success: 'text-emerald-700 bg-emerald-50 dark:text-emerald-300 dark:bg-emerald-950/40',
    danger: 'text-rose-700 bg-rose-50 dark:text-rose-300 dark:bg-rose-950/40',
  }[tone];

  return (
    <Card className="p-4">
      <div className={`mb-3 flex h-9 w-9 items-center justify-center rounded-lg ${toneClass}`}>{icon}</div>
      <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400">{label}</p>
      <p className="mt-1 text-xl font-bold text-neutral-950 dark:text-white">{value}</p>
      {detail ? <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">{detail}</p> : null}
    </Card>
  );
}

function SectionTitle({ children }: { children: ReactNode }) {
  return <h3 className="mb-4 text-base font-semibold text-neutral-900 dark:text-white">{children}</h3>;
}

export function BudgetHistoryList() {
  const { historyBudgets: rawHistory, isHistoryLoading, historyError, refetchHistory, deleteBudget } = useBudgets();
  const { formatCurrency } = useCurrency();
  const { t, language } = useI18n();
  const { user } = useAuth();
  const { formatTime } = useTimeFormat();
  const locale = language === 'es' ? es : enUS;
  const [selection, setSelection] = useState<{ userId: number; budgetId: number } | null>(null);
  const selectedBudget = selection?.userId === user?.id
    ? rawHistory.find((budget) => budget.id === selection?.budgetId) ?? null : null;
  const { data: report = null, isLoading: isLoadingReport, error: reportError, refetch: refetchReport } = useQuery({
    queryKey: privateQueryKey(user?.id, queryKeys.budgets.report(selectedBudget?.id ?? null)),
    queryFn: ({ signal }) => budgetsApi.getHistoryReport(selectedBudget!.id, signal),
    enabled: Boolean(user && selectedBudget), staleTime: queryStaleTimes.financial,
  });
  const [isDownloading, setIsDownloading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isMovementsOpen, setIsMovementsOpen] = useState(false);
  const [operationError, setActionError] = useState<string | null>(null);
  const actionError = operationError ?? (reportError
    ? getApiErrorMessage(reportError, t('budgets.historyReportError'), t) : null);

  const historyBudgets = rawHistory
    .filter((budget) => !budget.parentBudgetId)
    .sort((a, b) => new Date(b.endDate || b.createdAt).getTime() - new Date(a.endDate || a.createdAt).getTime());

  const formatDate = (value?: string) => {
    if (!value) return t('budgets.dateUnavailable');
    return format(parseISO(value), 'd MMM yyyy', { locale });
  };

  const formatPercent = (value: number) => `${value.toFixed(1)}%`;

  const formatWeekday = (weekday: string) => {
    const indexes: Record<string, number> = {
      MONDAY: 1,
      TUESDAY: 2,
      WEDNESDAY: 3,
      THURSDAY: 4,
      FRIDAY: 5,
      SATURDAY: 6,
      SUNDAY: 7,
    };
    const day = indexes[weekday] ?? 1;
    return new Intl.DateTimeFormat(language === 'es' ? 'es-PE' : 'en-US', { weekday: 'long' })
      .format(new Date(2024, 0, day));
  };

  const openReport = (budget: BudgetResponse) => {
    if (!user) return;
    setSelection({ userId: user.id, budgetId: budget.id });
    setActionError(null);
  };

  const handleDownload = async () => {
    if (!selectedBudget) return;
    setIsDownloading(true);
    setActionError(null);
    try {
      const blob = await budgetsApi.downloadHistoryReport(selectedBudget.id);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `budget-report-${selectedBudget.id}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (error) {
      setActionError(await getApiErrorMessageAsync(error, t('budgets.historyPdfError'), t));
    } finally {
      setIsDownloading(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedBudget) return;
    setIsDeleting(true);
    setActionError(null);
    try {
      await deleteBudget({ id: selectedBudget.id, cascade: true });
      setIsDeleteOpen(false);
      setSelection(null);
      setIsMovementsOpen(false);
    } catch (error) {
      setActionError(getApiErrorMessage(error, t('budgets.historyDeleteError'), t));
      setIsDeleteOpen(false);
    } finally {
      setIsDeleting(false);
    }
  };

  if (isHistoryLoading) {
    return (
      <div className="rounded-xl border border-neutral-200 bg-neutral-50 py-12 text-center text-neutral-500 animate-pulse dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-400">
        {t('budgets.historyLoading')}
      </div>
    );
  }

  if (selectedBudget) {
    return (
      <div className="space-y-8">
        <div className="flex flex-col gap-4 border-b border-neutral-200 pb-5 dark:border-neutral-700 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => { setSelection(null); setActionError(null); setIsMovementsOpen(false); }} aria-label={t('budgets.backToHistory')}>
              <ArrowLeft />
            </Button>
            <div className="min-w-0">
              <h2 className="truncate text-xl font-bold text-neutral-950 dark:text-white">{t('budgets.historyDetailTitle')}</h2>
              <p className="text-sm text-neutral-500 dark:text-neutral-400">
                {formatDate(selectedBudget.startDate)} - {formatDate(selectedBudget.endDate)}
              </p>
              <p className="mt-1 text-xs font-medium text-primary-600 dark:text-primary-400">
                {selectedBudget.scope === 'GLOBAL'
                  ? t('budgets.globalBudget')
                  : t('budgets.independentHistoryLabel', { category: selectedBudget.categoryName ?? t('common.category') })}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2 self-end sm:self-auto">
            <Button variant="outline" onClick={() => setIsMovementsOpen(true)} disabled={!report} icon={<Rows3 />}>
              {t('budgets.viewAllMovements')}
            </Button>
            <Button variant="outline" onClick={handleDownload} isLoading={isDownloading} disabled={!report} icon={<Download />}>
              {t('budgets.downloadPdf')}
            </Button>
            <Button variant="destructive" size="icon" onClick={() => setIsDeleteOpen(true)} aria-label={t('budgets.deleteHistoryBudget')}>
              <Trash2 />
            </Button>
          </div>
        </div>

        {actionError ? (
          <div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-300">
            {actionError}
            {reportError && <Button variant="ghost" onClick={() => void refetchReport()} icon={<RotateCw />}>{t('common.retry')}</Button>}
          </div>
        ) : null}

        {isLoadingReport ? (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {Array.from({ length: 8 }, (_, index) => <div key={index} className="h-32 animate-pulse rounded-lg bg-neutral-100 dark:bg-neutral-800" />)}
          </div>
        ) : report ? (
          <BudgetHistoryDetail
            report={report}
            formatCurrency={formatCurrency}
            formatDate={formatDate}
            formatPercent={formatPercent}
            formatWeekday={formatWeekday}
            t={t}
          />
        ) : null}

        <BudgetHistoryMovementsDrawer
          isOpen={isMovementsOpen}
          onClose={() => setIsMovementsOpen(false)}
          movements={report?.movements ?? []}
          formatCurrency={formatCurrency}
          formatDate={formatDate}
          formatTime={formatTime}
          t={t}
        />

        <Modal isOpen={isDeleteOpen} onClose={() => !isDeleting && setIsDeleteOpen(false)} title={t('budgets.deleteHistoryBudget')}>
          <div className="space-y-5 pt-2">
            <div className="flex gap-3 rounded-lg border border-rose-200 bg-rose-50 p-4 text-rose-800 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-200">
              <AlertTriangle className="h-5 w-5 shrink-0" />
              <p className="text-sm">{t('budgets.deleteHistoryWarning')}</p>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsDeleteOpen(false)} disabled={isDeleting}>{t('common.cancel')}</Button>
              <Button variant="destructive" onClick={handleDelete} isLoading={isDeleting}>{t('common.delete')}</Button>
            </div>
          </div>
        </Modal>
      </div>
    );
  }

  if (historyError) {
    return (
      <div role="alert" className="flex items-center gap-3 text-red-600 dark:text-red-400">
        <span>{historyError}</span>
        <Button variant="secondary" onClick={() => refetchHistory()}>{t('common.retry')}</Button>
      </div>
    );
  }

  if (historyBudgets.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-neutral-200 bg-neutral-50 py-16 text-center dark:border-neutral-700 dark:bg-neutral-900/50">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-white text-neutral-400 shadow-sm dark:bg-neutral-800">
          <CalendarDays className="h-7 w-7" />
        </div>
        <h3 className="mb-2 text-lg font-bold text-neutral-900 dark:text-white">{t('budgets.noHistory')}</h3>
        <p className="max-w-sm text-sm text-neutral-500 dark:text-neutral-400">{t('budgets.historyEmpty')}</p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-neutral-200 overflow-hidden rounded-lg border border-neutral-200 bg-white dark:divide-neutral-700 dark:border-neutral-700 dark:bg-neutral-800">
      {historyBudgets.map((budget) => (
        <button
          key={budget.id}
          type="button"
          onClick={() => openReport(budget)}
          className="flex w-full items-center justify-between gap-4 px-4 py-4 text-left transition-colors hover:bg-neutral-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary-500 dark:hover:bg-neutral-700/50"
        >
          <span className="flex min-w-0 items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-neutral-100 text-neutral-500 dark:bg-neutral-700 dark:text-neutral-300">
              <CalendarDays className="h-4 w-4" />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold text-neutral-900 dark:text-white">
                {budget.scope === 'GLOBAL' ? t('budgets.globalBudget') : (budget.categoryName || t('common.category'))}
              </span>
              <span className="block text-xs text-neutral-500 dark:text-neutral-400">{t('common.to')} {formatDate(budget.endDate)}</span>
            </span>
          </span>
          <ChevronRight className="h-5 w-5 shrink-0 text-neutral-400" />
        </button>
      ))}
    </div>
  );
}

interface DetailProps {
  report: BudgetHistoryReport;
  formatCurrency: (value: number, options?: Intl.NumberFormatOptions) => string;
  formatDate: (value?: string) => string;
  formatPercent: (value: number) => string;
  formatWeekday: (value: string) => string;
  t: ReturnType<typeof useI18n>['t'];
}

function BudgetHistoryDetail({ report, formatCurrency, formatDate, formatPercent, formatWeekday, t }: DetailProps) {  const localizedCategory = (name: string) => name === 'Uncategorized' ? t('common.uncategorized') : name;
  const resultText = report.successful
    ? t('budgets.historySuccessSummary', {
        percentage: report.spentPercentage.toFixed(0),
        amount: formatCurrency(report.remainingAmount),
      })
    : t('budgets.historyExceededSummary', {
        amount: formatCurrency(report.exceededAmount),
        exceeded: Math.max(0, report.categoriesWithLimit - report.categoriesWithinLimit),
        total: report.categoriesWithLimit,
      });

  const categoryRate = report.categoriesWithLimit > 0
    ? t('budgets.categorySuccessRate', { successful: report.categoriesWithinLimit, total: report.categoriesWithLimit })
    : t('budgets.noCategoryLimits');

  const chartOption = {
    animationDuration: 500,
    grid: { left: 10, right: 18, top: 20, bottom: 10, containLabel: true },
    tooltip: {
      trigger: 'axis',
      valueFormatter: (value: number | string) => formatCurrency(Number(value)),
    },
    legend: {
      data: [t('budgets.actualSpending'), t('budgets.idealSpending')],
      bottom: 0,
      textStyle: { color: '#71717a', fontSize: 11 },
    },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: report.timeline.map((point) => formatDate(point.date)),
      axisLabel: { color: '#71717a', fontSize: 10, hideOverlap: true },
      axisLine: { lineStyle: { color: '#d4d4d8' } },
    },
    yAxis: {
      type: 'value',
      axisLabel: { color: '#71717a', fontSize: 10, formatter: (value: number) => formatCurrency(value, { maximumFractionDigits: 0 }) },
      splitLine: { lineStyle: { color: '#e4e4e7', type: 'dashed' } },
    },
    series: [
      {
        name: t('budgets.actualSpending'),
        type: 'line',
        smooth: true,
        showSymbol: false,
        data: report.timeline.map((point) => point.actual),
        lineStyle: { color: '#7c3aed', width: 3 },
        itemStyle: { color: '#7c3aed' },
      },
      {
        name: t('budgets.idealSpending'),
        type: 'line',
        smooth: true,
        showSymbol: false,
        data: report.timeline.map((point) => point.ideal),
        lineStyle: { color: '#71717a', width: 2, type: 'dashed' },
        itemStyle: { color: '#71717a' },
      },
    ],
  };

  const comparisonText = report.comparison?.expenseChangePercentage == null
    ? t('budgets.noComparableTrend')
    : report.comparison.expenseChangePercentage < 0
      ? t('budgets.spentLessThanPrevious', { percentage: Math.abs(report.comparison.expenseChangePercentage).toFixed(1) })
      : report.comparison.expenseChangePercentage > 0
        ? t('budgets.spentMoreThanPrevious', { percentage: report.comparison.expenseChangePercentage.toFixed(1) })
        : t('budgets.spentSameAsPrevious');

  return (
    <div className="space-y-9">
      <section className={`flex items-start gap-4 rounded-lg border p-5 ${report.successful ? 'border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/30' : 'border-rose-200 bg-rose-50 dark:border-rose-900 dark:bg-rose-950/30'}`}>
        {report.successful
          ? <CheckCircle2 className="mt-0.5 h-6 w-6 shrink-0 text-emerald-600 dark:text-emerald-400" />
          : <AlertTriangle className="mt-0.5 h-6 w-6 shrink-0 text-rose-600 dark:text-rose-400" />}
        <div>
          <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${report.successful ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200' : 'bg-rose-100 text-rose-800 dark:bg-rose-900 dark:text-rose-200'}`}>
            {report.successful ? t('budgets.completedSuccessfully') : t('budgets.exceeded')}
          </span>
          <p className="mt-2 text-sm font-medium text-neutral-800 dark:text-neutral-100">{resultText}</p>
          <p className="mt-1 text-xs text-neutral-600 dark:text-neutral-300">{categoryRate}</p>
        </div>
      </section>

      <section>
        <SectionTitle>{t('budgets.periodSummary')}</SectionTitle>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <SummaryMetric icon={<ReceiptText />} label={t('budgets.spentOfTotal')} value={`${formatCurrency(report.totalSpent)} / ${formatCurrency(report.spendingLimit)}`} detail={`${formatPercent(report.spentPercentage)} ${t('budgets.consumed')}`} tone={report.successful ? 'success' : 'danger'} />
          <SummaryMetric icon={<Wallet />} label={t('budgets.periodIncome')} value={formatCurrency(report.totalIncome)} detail={t('budgets.inflow')} tone="success" />
          <SummaryMetric icon={<PiggyBank />} label={t('budgets.realSavingsRate')} value={formatPercent(report.savingsRate)} detail={formatCurrency(report.retainedSavings)} tone="success" />
          <SummaryMetric icon={<Clock3 />} label={t('budgets.dailyAverage')} value={formatCurrency(report.averageDailySpend)} detail={t('budgets.perDay')} />
        </div>
      </section>

      <section className="border-t border-neutral-200 pt-7 dark:border-neutral-700">
        <SectionTitle>{t('budgets.cashFlow')}</SectionTitle>
        <div className="grid divide-y divide-neutral-200 overflow-hidden rounded-lg border border-neutral-200 dark:divide-neutral-700 dark:border-neutral-700 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          <div className="p-4">
            <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400">{t('budgets.inflows')}</p>
            <p className="mt-1 text-lg font-bold text-emerald-600 dark:text-emerald-400">+{formatCurrency(report.totalIncome)}</p>
          </div>
          <div className="p-4">
            <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400">{t('budgets.outflows')}</p>
            <p className="mt-1 text-lg font-bold text-rose-600 dark:text-rose-400">-{formatCurrency(report.totalExpenses)}</p>
          </div>
          <div className="p-4">
            <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400">{t('budgets.netBalance')}</p>
            <p className={`mt-1 text-lg font-bold ${report.balance >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
              {report.balance >= 0 ? '+' : '-'}{formatCurrency(Math.abs(report.balance))}
            </p>
          </div>
        </div>
        <p className="mt-3 text-xs text-neutral-500 dark:text-neutral-400">{t('budgets.incomeBudgetNote')}</p>
      </section>

      <section className="border-t border-neutral-200 pt-7 dark:border-neutral-700">
        <SectionTitle>{t('budgets.spendingTimeline')}</SectionTitle>
        <div className="h-72 w-full">
          <EChart option={chartOption} style={{ height: '100%', width: '100%' }} />
        </div>
      </section>

      <section className="grid gap-8 border-t border-neutral-200 pt-7 dark:border-neutral-700 lg:grid-cols-2">
        <div>
          <SectionTitle>{t('budgets.categoryConsumption')}</SectionTitle>
          {report.categories.length > 0 ? (
            <div className="space-y-4">
              {report.categories.map((category) => (
                <div key={category.categoryId ?? category.categoryName}>
                  <div className="mb-1.5 flex items-center justify-between gap-3 text-sm">
                    <span className="flex min-w-0 items-center gap-2 font-medium text-neutral-800 dark:text-neutral-100">
                      <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: category.categoryColor || '#a1a1aa' }} />
                      <span className="truncate">{localizedCategory(category.categoryName)}</span>
                    </span>
                    <span className={category.withinLimit === false ? 'font-semibold text-rose-600 dark:text-rose-400' : 'font-semibold text-neutral-900 dark:text-white'}>
                      {formatCurrency(category.spentAmount)}{category.limitAmount != null ? ` / ${formatCurrency(category.limitAmount)}` : ''}
                    </span>
                  </div>
                  {category.limitAmount != null ? (
                    <div className="h-2 overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
                      <div className={`h-full rounded-full ${category.withinLimit === false ? 'bg-rose-500' : 'bg-emerald-500'}`} style={{ width: `${Math.min(100, category.percentage ?? 0)}%` }} />
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          ) : <p className="text-sm text-neutral-500 dark:text-neutral-400">{t('budgets.noCategoryConsumption')}</p>}
        </div>

        <div>
          <SectionTitle>{t('budgets.topSpendingCategories')}</SectionTitle>
          {report.topCategories.length > 0 ? (
            <ol className="space-y-3">
              {report.topCategories.map((category, index) => (
                <li key={category.categoryId ?? category.categoryName} className="flex items-center justify-between gap-3 border-b border-neutral-100 pb-3 text-sm last:border-0 dark:border-neutral-800">
                  <span className="flex min-w-0 items-center gap-3">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-neutral-100 text-xs font-bold text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">{index + 1}</span>
                    <span className="truncate font-medium text-neutral-800 dark:text-neutral-100">{localizedCategory(category.categoryName)}</span>
                  </span>
                  <span className="font-bold text-neutral-950 dark:text-white">{formatCurrency(category.spentAmount)}</span>
                </li>
              ))}
            </ol>
          ) : <p className="text-sm text-neutral-500 dark:text-neutral-400">{t('budgets.noCategoryConsumption')}</p>}
        </div>
      </section>

      <section className="border-t border-neutral-200 pt-7 dark:border-neutral-700">
        <SectionTitle>{t('budgets.spendingHabits')}</SectionTitle>
        <div className="grid gap-4 md:grid-cols-3">
          <div className="border-l-2 border-primary-500 pl-4">
            <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400">{t('budgets.highestSpendingDay')}</p>
            <p className="mt-1 text-sm font-semibold text-neutral-900 dark:text-white">
              {report.highestSpendingDay ? `${formatDate(report.highestSpendingDay.date)} - ${formatCurrency(report.highestSpendingDay.amount)}` : t('budgets.noExpensesRecorded')}
            </p>
          </div>
          <div className="border-l-2 border-amber-500 pl-4">
            <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400">{t('budgets.mostExpensiveWeekday')}</p>
            <p className="mt-1 text-sm font-semibold capitalize text-neutral-900 dark:text-white">
              {report.mostExpensiveWeekday ? `${formatWeekday(report.mostExpensiveWeekday.dayOfWeek)} - ${formatCurrency(report.mostExpensiveWeekday.amount)}` : t('budgets.noExpensesRecorded')}
            </p>
          </div>
          <div className="border-l-2 border-cyan-500 pl-4">
            <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400">{t('budgets.weekendShare')}</p>
            <p className="mt-1 text-sm font-semibold text-neutral-900 dark:text-white">{formatPercent(report.weekendExpensePercentage)}</p>
          </div>
        </div>
      </section>

      <section className="grid gap-8 border-t border-neutral-200 pt-7 dark:border-neutral-700 lg:grid-cols-2">
        <div>
          <SectionTitle>{t('budgets.highestExpenses')}</SectionTitle>
          {report.highestExpenses.length > 0 ? (
            <div className="space-y-3">
              {report.highestExpenses.map((expense) => (
                <div key={expense.movementId} className="flex items-center justify-between gap-3 border-b border-neutral-100 pb-3 text-sm last:border-0 dark:border-neutral-800">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-neutral-800 dark:text-neutral-100">{expense.description || localizedCategory(expense.categoryName)}</p>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">{formatDate(expense.date)} · {localizedCategory(expense.categoryName)}</p>
                  </div>
                  <span className="shrink-0 font-bold text-rose-600 dark:text-rose-400">{formatCurrency(expense.amount)}</span>
                </div>
              ))}
            </div>
          ) : <p className="text-sm text-neutral-500 dark:text-neutral-400">{t('budgets.noExpensesRecorded')}</p>}
        </div>

        <div>
          <SectionTitle>{t('budgets.savingsAndGoals')}</SectionTitle>
          <div className="grid grid-cols-2 gap-3">
            <SummaryMetric icon={<PiggyBank />} label={t('budgets.configuredSavings')} value={formatCurrency(report.configuredSavings)} />
            <SummaryMetric icon={<Target />} label={t('budgets.goalContributions')} value={formatCurrency(report.goalContributions)} />
          </div>
          {report.goalContributionDetails.length > 0 ? (
            <div className="mt-4 space-y-2">
              {report.goalContributionDetails.map((contribution) => (
                <div key={contribution.goalName} className="flex justify-between text-sm">
                  <span className="text-neutral-600 dark:text-neutral-300">{contribution.goalName}</span>
                  <span className="font-semibold text-neutral-900 dark:text-white">{formatCurrency(contribution.amount)}</span>
                </div>
              ))}
            </div>
          ) : <p className="mt-4 text-sm text-neutral-500 dark:text-neutral-400">{t('budgets.noGoalContributions')}</p>}
        </div>
      </section>

      <section className="border-t border-neutral-200 pt-7 dark:border-neutral-700">
        <SectionTitle>{t('budgets.previousPeriodComparison')}</SectionTitle>
        {report.comparison ? (
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-lg bg-neutral-50 p-4 dark:bg-neutral-900/50">
              <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400">{t('budgets.generalTrend')}</p>
              <p className="mt-2 text-sm font-semibold text-neutral-900 dark:text-white">{comparisonText}</p>
            </div>
            <div className="rounded-lg bg-emerald-50 p-4 dark:bg-emerald-950/30">
              <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300"><TrendingDown className="h-4 w-4" /><span className="text-xs font-semibold">{t('budgets.greatestReduction')}</span></div>
              <p className="mt-2 text-sm font-semibold text-neutral-900 dark:text-white">
                {report.comparison.greatestReduction ? `${localizedCategory(report.comparison.greatestReduction.categoryName)} · ${formatCurrency(report.comparison.greatestReduction.amount)}` : t('budgets.noReduction')}
              </p>
            </div>
            <div className="rounded-lg bg-rose-50 p-4 dark:bg-rose-950/30">
              <div className="flex items-center gap-2 text-rose-700 dark:text-rose-300"><TrendingUp className="h-4 w-4" /><span className="text-xs font-semibold">{t('budgets.greatestIncrease')}</span></div>
              <p className="mt-2 text-sm font-semibold text-neutral-900 dark:text-white">
                {report.comparison.greatestIncrease ? `${localizedCategory(report.comparison.greatestIncrease.categoryName)} · ${formatCurrency(report.comparison.greatestIncrease.amount)}` : t('budgets.noIncrease')}
              </p>
            </div>
          </div>
        ) : <p className="text-sm text-neutral-500 dark:text-neutral-400">{t('budgets.noPreviousPeriod')}</p>}
      </section>
    </div>
  );
}
