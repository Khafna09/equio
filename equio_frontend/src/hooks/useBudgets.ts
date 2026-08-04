import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { budgetsApi } from '../api/budgets.api';
import type { BudgetResponse, BudgetRequest } from '../types/budget.types';

export function useBudgets() {
  const queryClient = useQueryClient();

  const {
    data: budgets = [],
    isLoading,
    error,
    refetch
  } = useQuery<BudgetResponse[]>({
    queryKey: ['budgets', 'active'],
    queryFn: async () => {
      return await budgetsApi.getAll();
    }
  });

  const {
    data: historyBudgets = [],
    isLoading: isHistoryLoading,
    refetch: refetchHistory
  } = useQuery<BudgetResponse[]>({
    queryKey: ['budgets', 'history'],
    queryFn: async () => {
      return await budgetsApi.getHistory();
    }
  });

  const createMutation = useMutation({
    mutationFn: async (data: BudgetRequest) => {
      return await budgetsApi.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    }
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: BudgetRequest }) => {
      return await budgetsApi.update(id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async ({ id, cascade = false }: { id: number, cascade?: boolean }) => {
      return await budgetsApi.delete(id, cascade);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    }
  });

  const closeMutation = useMutation({
    mutationFn: async (id: number) => {
      return await budgetsApi.close(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    }
  });

  return { 
    budgets, 
    historyBudgets,
    isLoading, 
    isHistoryLoading,
    error: error ? (error as any).response?.data?.message || 'Error al cargar presupuestos' : null, 
    refetch, 
    refetchHistory,
    createBudget: createMutation.mutateAsync,
    updateBudget: updateMutation.mutateAsync,
    deleteBudget: deleteMutation.mutateAsync,
    closeBudget: closeMutation.mutateAsync
  };
}

