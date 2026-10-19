import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { savingsApi } from '../api/savings.api';
import { invalidateDomains, privateQueryKey, queryKeys, queryStaleTimes } from '../api/queryCache';
import { useAuth } from '../contexts/authContextValue';
import type { SavingsPoolResponse } from '../types/saving.types';

export function useSavingsPool() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: savingsPool = { balance: 0, updatedAt: null }, isLoading } = useQuery<SavingsPoolResponse>({
    queryKey: privateQueryKey(user?.id, queryKeys.savings.pool),
    enabled: Boolean(user),
    queryFn: savingsApi.getPool,
    staleTime: queryStaleTimes.financial,
  });
  const transferToGoal = useMutation({
    mutationFn: ({ goalId, amount }: { goalId: number; amount: number }) =>
      savingsApi.transferPoolToGoal(goalId, amount),
    onSuccess: () => invalidateDomains(queryClient, ['savings', 'dashboard']),
  });
  const transferToBudget = useMutation({
    mutationFn: ({ budgetId, amount }: { budgetId: number; amount: number }) =>
      savingsApi.transferPoolToBudget(budgetId, amount),
    onSuccess: () => invalidateDomains(queryClient, ['savings', 'budgets', 'dashboard']),
  });

  return {
    savingsPool,
    isLoading,
    transferPoolToGoal: (goalId: number, amount: number) => transferToGoal.mutateAsync({ goalId, amount }),
    transferPoolToBudget: (budgetId: number, amount: number) => transferToBudget.mutateAsync({ budgetId, amount }),
    isTransferPending: transferToGoal.isPending || transferToBudget.isPending,
  };
}
