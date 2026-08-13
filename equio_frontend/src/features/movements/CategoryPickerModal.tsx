import { useState } from 'react';
import { Modal } from '../../components/ui/Modal';
import type { CategoryResponse } from '../../types/category.types';
import { useCategories } from '../../hooks/useCategories';
import { NewCategoryModal } from '../categories/NewCategoryModal';
import { useSharedElementModal } from '../../hooks/useSharedElementModal';
import { useI18n } from '../../i18n/i18nContextValue';

interface CategoryPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (category: CategoryResponse) => void;
}

export function CategoryPickerModal({ isOpen, onClose, onSelect }: CategoryPickerModalProps) {
  const { categories, isLoading } = useCategories();
  const { t } = useI18n();
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const { triggerRect: catTriggerRect, captureTrigger: captureCatTrigger } = useSharedElementModal();

  return (
    <>
      <Modal isOpen={isOpen && !isNewModalOpen} onClose={onClose} title={t('common.categories')}>
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-4 mt-4">
          <button onClick={(e) => { captureCatTrigger(e); setIsNewModalOpen(true); }} className="flex flex-col items-center justify-center gap-2 p-4 rounded-2xl hover:bg-neutral-50 dark:hover:bg-neutral-700/60 transition-colors group">
            <div className="w-14 h-14 rounded-full border-2 border-dashed border-neutral-300 dark:border-neutral-600 flex items-center justify-center text-neutral-400 dark:text-neutral-400 group-hover:border-primary-500 group-hover:text-primary-500 transition-colors">
              <span className="text-2xl">+</span>
            </div>
            <span className="text-xs font-medium text-neutral-600 dark:text-neutral-300 group-hover:text-primary-600 dark:group-hover:text-primary-400">{t('categories.newShort')}</span>
          </button>

          {isLoading ? (
            <div className="col-span-3 text-center py-4 text-neutral-500 dark:text-neutral-400">{t('common.loading')}</div>
          ) : (
            categories.map((cat) => (
              <button key={cat.id} onClick={() => { onSelect(cat); onClose(); }} className="flex flex-col items-center justify-center gap-2 p-2 rounded-2xl hover:bg-neutral-50 dark:hover:bg-neutral-700/60 transition-colors">
                <div className="w-14 h-14 rounded-full flex items-center justify-center text-2xl shadow-sm transition-transform hover:scale-105" style={{ backgroundColor: `${cat.color || '#cbd5e1'}20`, color: cat.color || '#475569' }}>
                  {cat.icon || t('common.folderIcon')}
                </div>
                <span className="text-xs font-medium text-neutral-600 dark:text-neutral-300 truncate w-full text-center">{cat.name}</span>
              </button>
            ))
          )}
        </div>
      </Modal>

      <NewCategoryModal isOpen={isNewModalOpen} onClose={() => setIsNewModalOpen(false)} onSuccess={(cat) => { onSelect(cat); setIsNewModalOpen(false); onClose(); }} triggerRect={catTriggerRect} />
    </>
  );
}
