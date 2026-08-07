import { useState, useEffect } from 'react';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { useSavings } from '../../hooks/useSavings';
import { fetchUnsplashGoalImage } from '../../utils/unsplash';
import type { SavingGoalResponse } from '../../types/saving.types';
import { Trash2 } from 'lucide-react';

import type { TriggerRect } from '../../hooks/useSharedElementModal';
import { useI18n } from '../../i18n/I18nContext';

interface EditGoalModalProps {
  isOpen: boolean;
  onClose: () => void;
  goal: SavingGoalResponse | null;
  triggerRect?: TriggerRect | null;
}

export function EditGoalModal({ isOpen, onClose, goal, triggerRect }: EditGoalModalProps) {
  const { updateGoal, deleteGoal } = useSavings();
  const { t } = useI18n();
  const [name, setName] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [deadline, setDeadline] = useState('');
  const [tag, setTag] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (goal && isOpen) {
      setName(goal.name);
      setTargetAmount(goal.targetAmount.toString());
      setDeadline(goal.deadline ? goal.deadline.substring(0, 10) : '');
      setTag(goal.tag || '');
    }
  }, [goal, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!goal || !name || !targetAmount) return;

    const updatedData = {
      name,
      targetAmount: parseFloat(targetAmount),
      deadline: deadline || undefined,
      tag: tag || undefined,
    };

    onClose();

    (async () => {
      try {
        let imageUrl = goal.imageUrl;
        if (updatedData.tag !== goal.tag || updatedData.name !== goal.name) {
          const searchQuery = [updatedData.name, updatedData.tag].filter(Boolean).join(' ');
          if (searchQuery) {
            imageUrl = (await fetchUnsplashGoalImage(searchQuery)) || imageUrl;
          }
        }

        await updateGoal(goal.id, {
          ...updatedData,
          imageUrl
        });
      } catch (error) {
        console.error('Background goal update failed:', error);
      }
    })();
  };

  const handleDelete = async () => {
    if (!goal) return;
    if (!confirm(t('savings.deleteConfirm'))) return;

    setIsDeleting(true);
    try {
      await deleteGoal(goal.id);
      onClose();
    } catch (error) {
      console.error(error);
      alert(t('savings.deleteError'));
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t('savings.editGoalModal')} triggerRect={triggerRect}>
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

        <div className="flex gap-3 mt-4">
          <Button 
            type="button" 
            variant="secondary" 
            className="py-3 px-4 text-rose-500 hover:bg-rose-50 hover:text-rose-600 border-none bg-neutral-100"
            onClick={handleDelete}
            isLoading={isDeleting}
          >
            <Trash2 className="w-5 h-5" />
          </Button>

          <Button 
            type="submit" 
            variant="primary" 
            className="flex-1 py-3"
            disabled={isDeleting}
          >
            {t('common.saveChanges')}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
