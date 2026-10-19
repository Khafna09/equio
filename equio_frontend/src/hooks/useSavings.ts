import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getApiErrorMessage } from '../utils/apiError';
import { savingsApi } from '../api/savings.api';
import type { SavingGoalResponse, SavingGoalRequest, FundRequest } from '../types/saving.types';
import { useI18n } from '../i18n/i18nContextValue';
import { invalidateDomains, privateQueryKey, queryKeys, queryStaleTimes } from '../api/queryCache';
import { useAuth } from '../contexts/authContextValue';

export function useSavings() {
  const { user } = useAuth();
  const { t } = useI18n();
  const queryClient = useQueryClient();

  const {
    data: savings = [],
    isLoading,
    error,
    refetch
  } = useQuery<SavingGoalResponse[]>({
    queryKey: privateQueryKey(user?.id, queryKeys.savings.goals),
    enabled: Boolean(user),
    queryFn: savingsApi.getAll,
    staleTime: queryStaleTimes.financial,
  });

  const createMutation = useMutation({
    mutationFn: async (data: SavingGoalRequest) => {
      return await savingsApi.create(data);
    },
    onSuccess: () => invalidateDomains(queryClient, ['savings', 'dashboard']),
  });

  const fundMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: FundRequest }) => {
      return await savingsApi.addOrWithdrawFund(id, data);
    },
    onSuccess: () => invalidateDomains(
      queryClient,
      ['savings', 'dashboard', 'movements', 'budgets'],
    ),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: SavingGoalRequest }) => {
      return await savingsApi.update(id, data);
    },
    onSuccess: () => invalidateDomains(queryClient, ['savings', 'dashboard']),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return await savingsApi.delete(id);
    },
    onSuccess: () => invalidateDomains(queryClient, ['savings', 'dashboard']),
  });

  return {
    savings,
    isLoading,
    error: error ? getApiErrorMessage(error, t('common.loadSavingsError')) : null,
    refetch,
    createGoal: createMutation.mutateAsync,
    updateGoal: async (id: number, data: SavingGoalRequest) => await updateMutation.mutateAsync({ id, data }),
    deleteGoal: async (id: number) => await deleteMutation.mutateAsync(id),
    fundGoal: async (id: number, data: FundRequest) => await fundMutation.mutateAsync({ id, data })
  };
}
