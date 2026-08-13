import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { categoriesApi } from '../api/categories.api';
import type { CategoryRequest, CategoryResponse } from '../types/category.types';
import { getApiErrorMessage } from '../utils/apiError';
import { useI18n } from '../i18n/i18nContextValue';

export function useCategories() {
  const { t } = useI18n();
  const queryClient = useQueryClient();

  const {
    data: categories = [],
    isLoading,
    error,
    refetch
  } = useQuery<CategoryResponse[]>({
    queryKey: ['categories'],
    queryFn: async () => {
      return await categoriesApi.getAll();
    }
  });

  const createMutation = useMutation({
    mutationFn: async (data: CategoryRequest) => {
      return await categoriesApi.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
    }
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: CategoryRequest }) => {
      return await categoriesApi.update(id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return await categoriesApi.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
    }
  });

  return {
    categories,
    isLoading,
    error: error ? getApiErrorMessage(error, t('common.loadCategoriesError')) : null,
    refetch,
    createCategory: createMutation.mutateAsync,
    updateCategory: updateMutation.mutateAsync,
    deleteCategory: deleteMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending
  };
}
