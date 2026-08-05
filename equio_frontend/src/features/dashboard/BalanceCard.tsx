import { Card } from '../../components/ui/Card';
import { ArrowDownRight, ArrowUpRight, DollarSign } from 'lucide-react';
import { NumberTicker } from '../../components/ui/number-ticker';
import { BorderBeam } from '../../components/ui/border-beam';
import { useCurrency } from '../../hooks/useCurrency';
import { useI18n } from '../../i18n/I18nContext';

interface BalanceCardProps {
  title: string;
  amount: number;
  type: 'balance' | 'income' | 'expense';
  trend?: string;
  globalBudgetAmount?: number | null;
  savingsDeduction?: number | null;
}

export function BalanceCard({ title, amount, type, globalBudgetAmount, savingsDeduction }: BalanceCardProps) {
  const { symbol, formatCurrency } = useCurrency();
  const { t } = useI18n();
  const config = {
    balance: {
      icon: <DollarSign className="w-5 h-5" />,
      iconBg: 'bg-primary-100 dark:bg-primary-950/50 text-primary-600 dark:text-primary-300',
      textColor: 'text-neutral-900 dark:text-white',
    },
    income: {
      icon: <ArrowDownRight className="w-5 h-5" />,
      iconBg: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400',
      textColor: 'text-emerald-600 dark:text-emerald-400',
    },
    expense: {
      icon: <ArrowUpRight className="w-5 h-5" />,
      iconBg: 'bg-danger-50 dark:bg-rose-950/40 text-danger-600 dark:text-rose-400',
      textColor: 'text-danger-600 dark:text-rose-400',
    },
  }[type];

  return (
    <Card className={`dashboard-card relative p-6 flex flex-col gap-3 overflow-hidden border-transparent hover:shadow-md transition-shadow group bg-white dark:bg-neutral-800/90 dark:border-neutral-700/60`}>
      {type === 'balance' && (
        <BorderBeam size={250} duration={12} delay={9} colorFrom="#6C5CE7" colorTo="#B6AEF0" className="opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
      )}
      <div className="flex items-center justify-between relative z-10">
        <p className="text-sm font-medium text-neutral-500 dark:text-neutral-400">{title}</p>
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${config.iconBg}`}>
          {config.icon}
        </div>
      </div>
      <div className="relative z-10">
        <p className={`text-3xl font-bold tracking-tight ${config.textColor}`}>
          {type === 'balance' ? (
            <>{symbol}<NumberTicker value={amount} decimalPlaces={2} delay={0.2} /></>
          ) : (
            formatCurrency(amount)
          )}
        </p>
        {globalBudgetAmount != null && (
          <div className="mt-2 text-xs text-neutral-500 dark:text-neutral-400 bg-neutral-100 dark:bg-neutral-900 px-3 py-1.5 rounded-lg inline-block border border-neutral-200 dark:border-neutral-700">
            {t('dashboard.budget')}: <span className="font-semibold text-neutral-900 dark:text-white">{formatCurrency(globalBudgetAmount)}</span>
            {savingsDeduction != null && savingsDeduction > 0 && (
              <span className="ml-2 pl-2 border-l border-neutral-300 dark:border-neutral-700">
                {t('dashboard.savings')}: <span className="font-semibold text-neutral-900 dark:text-white">-{formatCurrency(savingsDeduction)}</span>
              </span>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}
