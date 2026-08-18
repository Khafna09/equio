import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getApiErrorMessage } from '../utils/apiError';
import { budgetsApi } from '../api/budgets.api';
import type { BudgetResponse, BudgetRequest } from '../types/budget.types';
import { useI18n } from '../i18n/i18nContextValue';
import { invalidateDomains, queryKeys, queryStaleTimes } from '../api/queryCache';

export function useBudgets() {
  const { t } = useI18n();
  const queryClient = useQueryClient();

  const {
    data: budgets = [],
    isLoading,
    error,
    refetch
  } = useQuery<BudgetResponse[]>({
    queryKey: queryKeys.budgets.active,
    queryFn: budgetsApi.getAll,
    staleTime: queryStaleTimes.financial,
  });

  const {
    data: historyBudgets = [],
    isLoading: isHistoryLoading,
    refetch: refetchHistory
  } = useQuery<BudgetResponse[]>({
    queryKey: queryKeys.budgets.history,
    queryFn: budgetsApi.getHistory,
    staleTime: queryStaleTimes.financial,
  });

  const createMutation = useMutation({
    mutationFn: async (data: BudgetRequest) => {
      return await budgetsApi.create(data);
    },
    onSuccess: () => invalidateDomains(queryClient, ['budgets', 'dashboard']),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: BudgetRequest }) => {
      return await budgetsApi.update(id, data);
    },
    onSuccess: () => invalidateDomains(queryClient, ['budgets', 'dashboard']),
  });

  const deleteMutation = useMutation({
    mutationFn: async ({ id, cascade = false }: { id: number, cascade?: boolean }) => {
      return await budgetsApi.delete(id, cascade);
    },
    onSuccess: () => invalidateDomains(queryClient, ['budgets', 'dashboard']),
  });

  const closeMutation = useMutation({
    mutationFn: async (id: number) => {
      return await budgetsApi.close(id);
    },
    onSuccess: () => invalidateDomains(queryClient, ['budgets', 'dashboard']),
  });

  return {
    budgets,
    historyBudgets,
    isLoading,
    isHistoryLoading,
    error: error ? getApiErrorMessage(error, t('common.loadBudgetsError')) : null,
    refetch,
    refetchHistory,
    createBudget: createMutation.mutateAsync,
    updateBudget: updateMutation.mutateAsync,
    deleteBudget: deleteMutation.mutateAsync,
    closeBudget: closeMutation.mutateAsync
  };
}
