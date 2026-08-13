import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getApiErrorMessage } from '../utils/apiError';
import { savingsApi } from '../api/savings.api';
import type { SavingGoalResponse, SavingGoalRequest, FundRequest } from '../types/saving.types';
import { useI18n } from '../i18n/i18nContextValue';

export function useSavings() {
  const { t } = useI18n();
  const queryClient = useQueryClient();

  const {
    data: savings = [],
    isLoading,
    error,
    refetch
  } = useQuery<SavingGoalResponse[]>({
    queryKey: ['savings'],
    queryFn: async () => {
      return await savingsApi.getAll();
    }
  });

  const createMutation = useMutation({
    mutationFn: async (data: SavingGoalRequest) => {
      return await savingsApi.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['savings'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    }
  });

  const fundMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: FundRequest }) => {
      return await savingsApi.addOrWithdrawFund(id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['savings'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['movements'] });
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
    }
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: SavingGoalRequest }) => {
      return await savingsApi.update(id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['savings'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return await savingsApi.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['savings'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    }
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
