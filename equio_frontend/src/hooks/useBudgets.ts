import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getApiErrorMessage } from '../utils/apiError';
import { budgetsApi } from '../api/budgets.api';
import type { BudgetCapabilities, BudgetMode, BudgetResponse, BudgetRequest } from '../types/budget.types';
import { useI18n } from '../i18n/i18nContextValue';
import { invalidateDomains, privateQueryKey, queryKeys, queryStaleTimes } from '../api/queryCache';
import { useAuth } from '../contexts/authContextValue';

export function useBudgets() {
  const { user } = useAuth();
  const { t } = useI18n();
  const queryClient = useQueryClient();

  const {
    data: budgets = [],
    isLoading,
    error,
    refetch
  } = useQuery<BudgetResponse[]>({
    queryKey: privateQueryKey(user?.id, queryKeys.budgets.active),
    enabled: Boolean(user),
    queryFn: budgetsApi.getAll,
    staleTime: queryStaleTimes.financial,
  });

  const {
    data: capabilities,
    isLoading: isCapabilitiesLoading,
    error: capabilitiesError,
  } = useQuery<BudgetCapabilities>({
    queryKey: privateQueryKey(user?.id, queryKeys.budgets.capabilities),
    enabled: Boolean(user),
    queryFn: budgetsApi.getCapabilities,
    staleTime: queryStaleTimes.reference,
  });

  const {
    data: historyBudgets = [],
    isLoading: isHistoryLoading,
    error: historyError,
    refetch: refetchHistory
  } = useQuery<BudgetResponse[]>({
    queryKey: privateQueryKey(user?.id, queryKeys.budgets.history),
    enabled: Boolean(user),
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
    onSuccess: () => invalidateDomains(queryClient, ['budgets', 'dashboard', 'savings']),
  });

  const closeMutation = useMutation({
    mutationFn: async (id: number) => {
      return await budgetsApi.close(id);
    },
    onSuccess: () => invalidateDomains(queryClient, ['budgets', 'dashboard', 'savings']),
  });

  const linkMutation = useMutation({
    mutationFn: ({ globalBudgetId, budgetId }: { globalBudgetId: number; budgetId: number }) =>
      budgetsApi.link(globalBudgetId, budgetId),
    onSuccess: () => invalidateDomains(queryClient, ['budgets', 'dashboard']),
  });

  const detachMutation = useMutation({
    mutationFn: ({ globalBudgetId, budgetId }: { globalBudgetId: number; budgetId: number }) =>
      budgetsApi.detach(globalBudgetId, budgetId),
    onSuccess: () => invalidateDomains(queryClient, ['budgets', 'dashboard']),
  });

  const modeMutation = useMutation({
    mutationFn: (mode: BudgetMode) => budgetsApi.changeMode(mode),
    onSuccess: () => invalidateDomains(queryClient, ['profile', 'budgets']),
  });

  return {
    budgets,
    capabilities,
    isCapabilitiesLoading,
    capabilitiesError: capabilitiesError ? getApiErrorMessage(capabilitiesError, t('common.loadBudgetsError')) : null,
    historyBudgets,
    isLoading,
    isHistoryLoading,
    historyError: historyError ? getApiErrorMessage(historyError, t('common.loadBudgetsError')) : null,
    error: error ? getApiErrorMessage(error, t('common.loadBudgetsError')) : null,
    refetch,
    refetchHistory,
    createBudget: createMutation.mutateAsync,
    updateBudget: updateMutation.mutateAsync,
    deleteBudget: deleteMutation.mutateAsync,
    closeBudget: closeMutation.mutateAsync,
    linkBudget: linkMutation.mutateAsync,
    detachBudget: detachMutation.mutateAsync,
    changeBudgetMode: modeMutation.mutateAsync,
    isChangingBudgetMode: modeMutation.isPending,
  };
}
