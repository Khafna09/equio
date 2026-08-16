import { useState } from 'react';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { useSavings } from '../../hooks/useSavings';
import type { SavingGoalResponse } from '../../types/saving.types';
import confetti from 'canvas-confetti';
import { useCurrency } from '../../hooks/useCurrency';
import { getApiErrorMessage } from '../../utils/apiError';
import { MAX_MONEY_AMOUNT, parsePositiveMoney } from '../../utils/moneyInput';

import type { TriggerRect } from '../../hooks/useSharedElementModal';
import { useI18n } from '../../i18n/i18nContextValue';

interface FundModalProps {
  isOpen: boolean;
  onClose: () => void;
  goal: SavingGoalResponse | null;
  operation: 'ADD' | 'WITHDRAW';
  triggerRect?: TriggerRect | null;
}

export function FundModal({ isOpen, onClose, goal, operation, triggerRect }: FundModalProps) {
  const { fundGoal } = useSavings();
  const { t } = useI18n();
  const { symbol, formatCurrency } = useCurrency();
  const [amount, setAmount] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const currentGoal = goal;

  const isAdd = operation === 'ADD';
  const title = isAdd ? t('savings.addToGoal') : t('savings.withdrawFromGoal');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const numericAmount = parsePositiveMoney(amount);
    if (!currentGoal || numericAmount === null) {
      setSubmitError(t('common.invalidAmount'));
      return;
    }

    setSubmitError(null);
    setIsSubmitting(true);
    try {
      await fundGoal(currentGoal.id, {
        amount: numericAmount,
        operation
      });

      if (isAdd) {
        confetti({
          particleCount: 80,
          spread: 60,
          origin: { y: 0.7 }
        });
      }

      onClose();
      setAmount('');
    } catch (error: unknown) {
      setSubmitError(getApiErrorMessage(error, t('savings.updateError')));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} triggerRect={triggerRect}>
      <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-6">
        {currentGoal && (
          <div className="text-center">
            <p className="text-sm font-medium text-neutral-500 dark:text-neutral-400 mb-1">{currentGoal.name}</p>
            <p className="text-lg font-bold text-neutral-900 dark:text-white">
              {t('common.current')}: {formatCurrency(currentGoal.currentAmount)}
            </p>
          </div>
        )}

        <div className="flex flex-col items-center justify-center my-4">
          <span className="text-neutral-500 dark:text-neutral-400 font-medium mb-1">{symbol}</span>
          <input 
            type="number" 
            step="0.01"
            min="0.01"
            value={amount}
            onChange={(e) => {
              setAmount(e.target.value);
              setSubmitError(null);
            }}
            placeholder="0.00"
            className="text-6xl font-bold text-center text-neutral-900 dark:text-white bg-transparent outline-none w-full placeholder:text-neutral-300 dark:placeholder:text-neutral-600"
            required
            max={currentGoal
              ? Math.min(
                  MAX_MONEY_AMOUNT,
                  isAdd
                    ? Math.max(0, currentGoal.targetAmount - currentGoal.currentAmount)
                    : currentGoal.currentAmount,
                )
              : MAX_MONEY_AMOUNT}
          />
        </div>

        {submitError ? (
          <div className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700 dark:bg-rose-950/30 dark:text-rose-300">
            {submitError}
          </div>
        ) : null}

        <Button 
          type="submit" 
          variant={isAdd ? 'primary' : 'outline'} 
          className="w-full mt-4"
          isLoading={isSubmitting}
        >
          {isAdd ? t('savings.confirmContribution') : t('savings.confirmWithdrawal')}
        </Button>
      </form>
    </Modal>
  );
}
