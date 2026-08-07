import { useState } from 'react';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { useSavings } from '../../hooks/useSavings';
import { fetchUnsplashGoalImage } from '../../utils/unsplash';

import type { TriggerRect } from '../../hooks/useSharedElementModal';
import { useI18n } from '../../i18n/I18nContext';

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !targetAmount) return;
    const goalData = {
      name,
      targetAmount: parseFloat(targetAmount),
      deadline: deadline || undefined,
      tag: tag || undefined,
    };
    onClose();
    setName('');
    setTargetAmount('');
    setDeadline('');
    setTag('');
    (async () => {
      try {
        const searchQuery = [goalData.name, goalData.tag].filter(Boolean).join(' ');
        const imageUrl = await fetchUnsplashGoalImage(searchQuery);

        await createGoal({
          ...goalData,
          imageUrl
        });
      } catch (error) {
        console.error('Background goal creation failed:', error);
      }
    })();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t('savings.newGoalModal')} triggerRect={triggerRect}>
      <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-4">
        <Input 
          label={t('savings.goalName')} 
          placeholder={t('savings.goalExample')} 
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
        
        <Input 
          label={t('savings.targetAmount')} 
          type="number" 
          step="0.01"
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
          maxLength={15}
        />

        <Input 
          label={t('savings.deadline')} 
          type="date" 
          value={deadline}
          onChange={(e) => setDeadline(e.target.value)}
        />

        <Button 
          type="submit" 
          variant="primary" 
          className="w-full mt-4"
        >
          {t('savings.createGoal')}
        </Button>
      </form>
    </Modal>
  );
}
