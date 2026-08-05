import { Modal } from '../../components/ui/Modal';
import type { CategoryResponse } from '../../types/category.types';
import type { TriggerRect } from '../../hooks/useSharedElementModal';
import { NewCategoryForm } from './NewCategoryForm';
import { useI18n } from '../../i18n/I18nContext';

interface NewCategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (category: CategoryResponse) => void;
  categoryToEdit?: CategoryResponse | null;
  triggerRect?: TriggerRect | null;
}

export function NewCategoryModal({ isOpen, onClose, onSuccess, categoryToEdit, triggerRect }: NewCategoryModalProps) {
  const { t } = useI18n();

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={categoryToEdit ? t('common.editCategory') : t('common.newCategory')} containerClassName="z-[60]" triggerRect={triggerRect}>
      <NewCategoryForm
        categoryToEdit={categoryToEdit}
        onSuccess={(cat) => {
          onSuccess(cat);
          onClose();
        }}
        onCancel={onClose}
      />
    </Modal>
  );
}
