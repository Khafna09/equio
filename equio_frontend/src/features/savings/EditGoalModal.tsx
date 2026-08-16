import { useState } from 'react';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { DatePicker } from '../../components/ui/DatePicker';
import { Button } from '../../components/ui/Button';
import { useSavings } from '../../hooks/useSavings';
import { fetchUnsplashGoalImage } from '../../utils/unsplash';
import type { SavingGoalResponse } from '../../types/saving.types';
import { Trash2 } from 'lucide-react';

import type { TriggerRect } from '../../hooks/useSharedElementModal';
import { useI18n } from '../../i18n/i18nContextValue';

interface EditGoalModalProps {
  isOpen: boolean;
  onClose: () => void;
  goal: SavingGoalResponse | null;
  triggerRect?: TriggerRect | null;
}

export function EditGoalModal(props: EditGoalModalProps) {
  const key = `${props.isOpen ? 'open' : 'closed'}-${props.goal?.id ?? 'none'}`;
  return <EditGoalModalContent key={key} {...props} />;
}

function EditGoalModalContent({ isOpen, onClose, goal, triggerRect }: EditGoalModalProps) {
  const { updateGoal, deleteGoal } = useSavings();
  const { t } = useI18n();
  const [name, setName] = useState(goal?.name ?? '');
  const [targetAmount, setTargetAmount] = useState(goal ? String(goal.targetAmount) : '');
  const [deadline, setDeadline] = useState(goal?.deadline?.substring(0, 10) ?? '');
  const [tag, setTag] = useState(goal?.tag ?? '');
  const [isDeleting, setIsDeleting] = useState(false);

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
      } catch {
        alert(t('savings.updateError'));
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
    } catch {
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
          <DatePicker
            label={t('savings.deadline')}
            value={deadline}
            onChange={setDeadline}
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
