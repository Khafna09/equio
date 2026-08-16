import { useState } from 'react';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { DatePicker } from '../../components/ui/DatePicker';
import { Button } from '../../components/ui/Button';
import { useSavings } from '../../hooks/useSavings';
import { fetchUnsplashGoalImage } from '../../utils/unsplash';
import { getApiErrorMessage } from '../../utils/apiError';
import { MAX_MONEY_AMOUNT, parsePositiveMoney } from '../../utils/moneyInput';

import type { TriggerRect } from '../../hooks/useSharedElementModal';
import { useI18n } from '../../i18n/i18nContextValue';

interface SavingGoalModalProps {
  isOpen: boolean;
  onClose: () => void;
  triggerRect?: TriggerRect | null;
}

export function SavingGoalModal({ isOpen, onClose, triggerRect }: SavingGoalModalProps) {
  const { createGoal } = useSavings();
  const { t } = useI18n();
  const [name, setName] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [deadline, setDeadline] = useState('');
  const [tag, setTag] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = name.trim();
    const parsedTarget = parsePositiveMoney(targetAmount);
    if (!cleanName) {
      setSubmitError(t('common.invalidForm'));
      return;
    }
    if (parsedTarget === null) {
      setSubmitError(t('common.invalidAmount'));
      return;
    }

    const goalData = {
      name: cleanName,
      targetAmount: parsedTarget,
      deadline: deadline || undefined,
      tag: tag.trim() || undefined,
    };

    setSubmitError(null);
    setIsSubmitting(true);
    try {
      const searchQuery = [goalData.name, goalData.tag].filter(Boolean).join(' ');
      const imageUrl = await fetchUnsplashGoalImage(searchQuery);
      await createGoal({ ...goalData, imageUrl });
      setName('');
      setTargetAmount('');
      setDeadline('');
      setTag('');
      onClose();
    } catch (error: unknown) {
      setSubmitError(getApiErrorMessage(error, t('savings.createError')));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t('savings.newGoalModal')} triggerRect={triggerRect}>
      <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-4">
        <Input 
          label={t('savings.goalName')} 
          placeholder={t('savings.goalExample')} 
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={100}
          required
        />
        
        <Input 
          label={t('savings.targetAmount')} 
          type="number" 
          step="0.01"
          min="0.01"
          max={MAX_MONEY_AMOUNT}
          placeholder="0.00" 
          value={targetAmount}
          onChange={(e) => setTargetAmount(e.target.value)}
          required
        />

        <Input 
          label={t('savings.tagLabel')} 
          placeholder={t('savings.tagExample')} 
          value={tag}
          onChange={(e) => setTag(e.target.value.toUpperCase())}
          maxLength={50}
        />
          <DatePicker
            label={t('savings.deadline')}
            value={deadline}
            onChange={setDeadline}
            minDate={new Date()}
          />

        {submitError ? (
          <div className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700 dark:bg-rose-950/30 dark:text-rose-300">
            {submitError}
          </div>
        ) : null}

        <Button 
          type="submit" 
          variant="primary" 
          className="w-full mt-4"
          isLoading={isSubmitting}
        >
          {t('savings.createGoal')}
        </Button>
      </form>
    </Modal>
  );
}
