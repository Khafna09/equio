import { Plus, Check } from 'lucide-react';
import type { CategoryResponse } from '../../types/category.types';
import { getCategoryBadgeStyle } from '../../utils/categoryStyle';
import { useI18n } from '../../i18n/I18nContext';

interface CategorySelectorProps {
  categories: CategoryResponse[];
  isLoading: boolean;
  selectedCategoryId?: number;
  onSelectCategory: (category: CategoryResponse | null) => void;
  onNewCategory: () => void;
}

export function CategorySelector({ categories, isLoading, selectedCategoryId, onSelectCategory, onNewCategory }: CategorySelectorProps) {
  const { t } = useI18n();

  return (
    <div>
      <span className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 block text-center mb-3">
        {t('common.selectCategory')}
      </span>

      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-40 overflow-y-auto p-1">
        {isLoading ? (
          <div className="col-span-full text-center py-3 text-xs text-neutral-400">{t('categories.loading')}</div>
        ) : (
          categories.map((cat) => {
            const isSelected = selectedCategoryId === cat.id;
            const badgeStyle = getCategoryBadgeStyle(cat.color);

            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => onSelectCategory(isSelected ? null : cat)}
                className={`relative flex flex-col items-center justify-center p-2 rounded-2xl transition-all duration-200 min-h-[64px] border ${isSelected ? 'ring-2 ring-offset-1 scale-[1.02] shadow-sm' : 'hover:scale-[1.02]'}`}
                style={{ ...badgeStyle, borderColor: isSelected ? (cat.color || '#6366F1') : badgeStyle.borderColor }}
              >
                {isSelected && (
                  <div className="absolute top-1 right-1 w-3.5 h-3.5 rounded-full flex items-center justify-center text-white text-[9px]" style={{ backgroundColor: cat.color }}>
                    <Check className="w-2.5 h-2.5" />
                  </div>
                )}
                <span className="text-lg mb-0.5">{cat.icon || t('common.folderIcon')}</span>
                <span className="text-[11px] font-semibold truncate max-w-full text-center leading-tight">{cat.name}</span>
              </button>
            );
          })
        )}

        <button type="button" onClick={onNewCategory} className="flex flex-col items-center justify-center p-2 rounded-xl border border-dashed border-neutral-300 dark:border-neutral-700 text-neutral-400 hover:border-primary-400 hover:text-primary-500 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-all min-h-[64px]">
          <Plus className="w-4 h-4 mb-0.5" />
          <span className="text-[11px] font-medium">{t('categories.newShort')}</span>
        </button>
      </div>
    </div>
  );
}
