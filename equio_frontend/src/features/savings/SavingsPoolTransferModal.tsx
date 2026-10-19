import { useMemo, useState } from 'react';
import { Landmark, Target } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { Select } from '../../components/ui/Select';
import { useCurrency } from '../../hooks/useCurrency';
import { useI18n } from '../../i18n/i18nContextValue';
import type { BudgetResponse } from '../../types/budget.types';
import type { SavingGoalResponse } from '../../types/saving.types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  balance: number;
  goals: SavingGoalResponse[];
  budgets: BudgetResponse[];
  isProcessing: boolean;
  onTransferToGoal: (goalId: number, amount: number) => Promise<unknown>;
  onTransferToBudget: (budgetId: number, amount: number) => Promise<unknown>;
}

export function SavingsPoolTransferModal({
  isOpen, onClose, balance, goals, budgets, isProcessing,
  onTransferToGoal, onTransferToBudget,
}: Props) {
  const { t } = useI18n();
  const { formatCurrency } = useCurrency();
  const [destination, setDestination] = useState<'goal' | 'budget'>('goal');
  const [targetId, setTargetId] = useState<number | ''>('');
  const [amount, setAmount] = useState('');
  const [error, setError] = useState<string | null>(null);

  const availableGoals = useMemo(() => goals.filter(goal => !goal.isCompleted), [goals]);
  const activeBudgets = useMemo(() => budgets.filter(
    budget => budget.status === 'ACTIVE' && budget.parentBudgetId === null && budget.categoryId === null,
  ), [budgets]);
  const options = useMemo(() => destination === 'goal'
    ? availableGoals.map(goal => ({ value: goal.id, label: goal.name }))
    : activeBudgets.map(budget => ({ value: budget.id, label: budget.name })),
  [activeBudgets, availableGoals, destination]);

  const selectedTargetId = options.some(option => option.value === targetId)
    ? targetId
    : (options[0]?.value ?? '');

  const submit = async () => {
    const numericAmount = Number(amount);
    if (!selectedTargetId || !Number.isFinite(numericAmount) || numericAmount <= 0 || numericAmount > balance) {
      setError(t('savings.poolInvalidAmount'));
      return;
    }
    try {
      setError(null);
      if (destination === 'goal') await onTransferToGoal(Number(selectedTargetId), numericAmount);
      else await onTransferToBudget(Number(selectedTargetId), numericAmount);
      setAmount('');
      onClose();
    } catch {
      setError(t('savings.poolTransferError'));
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={() => !isProcessing && onClose()} title={t('savings.poolTransferTitle')}>
      <div className="space-y-5">
        <p className="text-sm text-neutral-500 dark:text-neutral-400">
          {t('savings.poolAvailable', { amount: formatCurrency(balance) })}
        </p>
        <div className="grid grid-cols-2 gap-2 rounded-xl bg-neutral-100 dark:bg-neutral-900 p-1">
          <button type="button" onClick={() => { setDestination('goal'); setTargetId(''); setError(null); }} className={`flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${destination === 'goal' ? 'bg-white dark:bg-neutral-700 text-primary-600 shadow-sm' : 'text-neutral-500'}`}>
            <Target className="h-4 w-4" /> {t('savings.poolToGoal')}
          </button>
          <button type="button" onClick={() => { setDestination('budget'); setTargetId(''); setError(null); }} className={`flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${destination === 'budget' ? 'bg-white dark:bg-neutral-700 text-primary-600 shadow-sm' : 'text-neutral-500'}`}>
            <Landmark className="h-4 w-4" /> {t('savings.poolToBudget')}
          </button>
        </div>
        <Select
          value={selectedTargetId}
          onChange={value => setTargetId(Number(value))}
          options={options}
          placeholder={destination === 'goal' ? t('savings.poolSelectGoal') : t('savings.poolSelectBudget')}
          disabled={options.length === 0}
        />
        {options.length === 0 && <p className="text-sm text-amber-600 dark:text-amber-400">{destination === 'goal' ? t('savings.poolNoGoals') : t('savings.poolNoBudget')}</p>}
        <Input label={t('savings.poolAmount')} type="number" min="0.01" step="0.01" max={balance} value={amount} onChange={event => setAmount(event.target.value)} />
        {error && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{error}</p>}
        <div className="flex justify-end gap-3 border-t border-neutral-100 dark:border-neutral-700 pt-4">
          <Button variant="secondary" onClick={onClose} disabled={isProcessing}>{t('common.cancel')}</Button>
          <Button variant="primary" onClick={submit} isLoading={isProcessing} disabled={options.length === 0}>{t('savings.poolConfirmTransfer')}</Button>
        </div>
      </div>
    </Modal>
  );
}
