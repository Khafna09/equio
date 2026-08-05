import { useState } from 'react';
import { useCategories } from '../../hooks/useCategories';
import { Button } from '../../components/ui/Button';
import { Trash2, Pencil, Plus } from 'lucide-react';
import { NewCategoryModal } from './NewCategoryModal';
import type { CategoryResponse } from '../../types/category.types';
import { getCategoryBadgeStyle } from '../../utils/categoryStyle';
import { useI18n } from '../../i18n/I18nContext';

export function CategoriesManager() {
  const { categories, isLoading, deleteCategory } = useCategories();
  const { t } = useI18n();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [categoryToEdit, setCategoryToEdit] = useState<CategoryResponse | null>(null);

  if (isLoading) {
    return <div className="p-4 text-neutral-500 dark:text-neutral-400">{t('categories.loading')}</div>;
  }

  const handleDelete = async (id: number, name: string) => {
    if (confirm(t('categories.deleteConfirm', { name }))) {
      try {
        await deleteCategory(id);
      } catch {
        alert(t('categories.deleteError'));
      }
    }
  };

  const handleOpenCreate = () => {
    setCategoryToEdit(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (category: CategoryResponse) => {
    setCategoryToEdit(category);
    setIsModalOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center pb-4 border-b border-neutral-100 dark:border-neutral-800">
        <div>
          <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">{t('categories.title')}</h3>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            {categories.length} {categories.length === 1 ? t('categories.configuredOne') : t('categories.configuredMany')}
          </p>
        </div>
        <Button variant="primary" size="sm" onClick={handleOpenCreate} className="flex items-center gap-1.5">
          <Plus className="w-4 h-4" /> {t('common.newCategory')}
        </Button>
      </div>

      {categories.length === 0 ? (
        <div className="text-center py-12 bg-neutral-50 dark:bg-neutral-800/50 rounded-2xl border border-dashed border-neutral-200 dark:border-neutral-700">
          <p className="text-neutral-500 dark:text-neutral-400 font-medium mb-3">{t('categories.empty')}</p>
          <Button variant="primary" size="sm" onClick={handleOpenCreate}>
            <Plus className="w-4 h-4 mr-1" /> {t('categories.createFirst')}
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {categories.map(cat => (
            <div key={cat.id} className="flex items-center justify-between p-4 bg-white dark:bg-neutral-800 border border-neutral-200/80 dark:border-neutral-700 rounded-2xl shadow-sm hover:shadow-md transition-all group">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-11 h-11 rounded-2xl flex items-center justify-center text-xl shrink-0 border transition-transform hover:scale-105" style={getCategoryBadgeStyle(cat.color)}>
                  {cat.icon || t('common.folderIcon')}
                </div>
                <span className="font-semibold text-neutral-900 dark:text-white truncate text-sm">{cat.name}</span>
              </div>

              <div className="flex items-center gap-1 opacity-90 group-hover:opacity-100 transition-opacity">
                <button onClick={() => handleOpenEdit(cat)} className="p-2 text-neutral-400 hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-950/40 rounded-xl transition-colors" title={t('common.editCategory')}>
                  <Pencil className="w-4 h-4" />
                </button>
                <button onClick={() => handleDelete(cat.id, cat.name)} className="p-2 text-neutral-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-xl transition-colors" title={t('categories.deleteError')}>
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <NewCategoryModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} categoryToEdit={categoryToEdit} onSuccess={() => setIsModalOpen(false)} />
    </div>
  );
}
