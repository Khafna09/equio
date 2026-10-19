import { EChart } from '../../components/charts/EChart';
import type { CategorySummary } from '../../types/dashboard.types';
import { useCurrency } from '../../hooks/useCurrency';
import { useI18n } from '../../i18n/i18nContextValue';
import { escapeHtml } from '../../utils/escapeHtml';

interface DonutTooltipParams {
  name?: string;
  value?: number | string;
  percent?: number;
}
interface DonutChartProps {
  data: CategorySummary[];
  topCategories: CategorySummary[];
}

export function DonutChart({ data: categories, topCategories }: DonutChartProps) {
  const { formatCurrency: formatCurrencyHook } = useCurrency();
  const { t } = useI18n();
  const formatCurrency = (val: number) => formatCurrencyHook(val, { maximumFractionDigits: 0 });

  const chartData = categories.map((cat) => ({
    value: cat.totalSpent,
    name: cat.categoryName ?? t('common.otherExpenses'),
    itemStyle: { color: cat.categoryColor || '#6366F1' },
  }));

  const totalExpense = categories.reduce((sum, c) => sum + c.totalSpent, 0);

  const option = {
    tooltip: {
      trigger: 'item',
      formatter: (params: DonutTooltipParams) => {
        const value = escapeHtml(formatCurrency(Number(params.value ?? 0)));
        const percentage = `${Number(params.percent ?? 0).toFixed(1)}%`;

        return `<div style="font-family: 'Plus Jakarta Sans', sans-serif;">
          <div style="font-size: 12px; font-weight: 600; margin-bottom: 5px;">${escapeHtml(params.name ?? '')}</div>
          <div style="display: flex; align-items: baseline; gap: 8px;">
            <span style="font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', monospace; font-size: 14px; font-weight: 700; font-variant-numeric: tabular-nums;">${value}</span>
            <span style="font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', monospace; font-size: 12px; font-weight: 600; font-variant-numeric: tabular-nums; color: #7c3aed;">${percentage}</span>
          </div>
        </div>`;
      },
      backgroundColor: '#ffffff',
      borderColor: '#e5e4e7',
      textStyle: { color: '#111827', fontFamily: 'Plus Jakarta Sans', fontSize: 12 },
      padding: [8, 12],
      borderRadius: 12,
      extraCssText: 'box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);'
    },
    series: [
      {
        name: t('common.expenses'),
        type: 'pie',
        radius: ['68%', '88%'],
        avoidLabelOverlap: false,
        itemStyle: {
          borderRadius: 6,
          borderColor: '#fff',
          borderWidth: 3
        },
        label: {
          show: false,
          position: 'center'
        },
        emphasis: {
          scale: true,
          scaleSize: 6
        },
        labelLine: {
          show: false
        },
        data: chartData.length > 0 ? chartData : [{ value: 1, name: t('dashboard.noExpenses'), itemStyle: { color: '#F3F4F6' } }]
      }
    ]
  };

  return (
    <div className="flex flex-col items-center w-full">
      <div className="relative w-48 h-48 flex items-center justify-center my-2">
        <EChart
          option={option} 
          style={{ height: '100%', width: '100%' }}
        />
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
          <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">{t('dashboard.periodExpenses').toUpperCase()}</span>
          <span className="text-2xl font-bold text-neutral-900 dark:text-white tracking-tight mt-0.5">
            {formatCurrency(totalExpense)}
          </span>
        </div>
      </div>

      <div className="w-full mt-4 space-y-3 border-t border-neutral-100 dark:border-neutral-700 pt-4">
        {topCategories.map((cat) => (
          <div key={cat.categoryName ?? 'uncategorized'} className="flex items-center justify-between text-sm font-semibold">
            <div className="flex items-center gap-2.5 min-w-0">
              <span 
                className="w-2.5 h-2.5 rounded-full shrink-0" 
                style={{ backgroundColor: cat.categoryColor || '#6366F1' }} 
              />
              <span className="text-neutral-700 dark:text-neutral-200 truncate">{cat.categoryName ?? t('common.otherExpenses')}</span>
            </div>
            <span className="text-neutral-900 dark:text-white font-bold ml-4 shrink-0">{formatCurrency(cat.totalSpent)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
