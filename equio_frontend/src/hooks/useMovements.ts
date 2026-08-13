import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getApiErrorMessage } from '../utils/apiError';
import { movementsApi } from '../api/movements.api';
import type { MovementResponse, CreateMovementRequest } from '../types/movement.types';
import { useI18n } from '../i18n/i18nContextValue';

export function useMovements(filters?: { type?: string; categoryId?: number; startDate?: string; endDate?: string }) {
  const { t } = useI18n();
  const queryClient = useQueryClient();

  const {
    data: movements = [],
    isLoading,
    error,
    refetch
  } = useQuery<MovementResponse[]>({
    queryKey: ['movements', filters],
    queryFn: async () => {
      return await movementsApi.getAll(filters);
    }
  });

  const createMutation = useMutation({
    mutationFn: async (data: CreateMovementRequest) => {
      return await movementsApi.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['movements'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
    }
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: CreateMovementRequest }) => {
      return await movementsApi.update(id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['movements'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return await movementsApi.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['movements'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
    }
  });

  return {
    movements,
    isLoading,
    error: error ? getApiErrorMessage(error, t('common.loadMovementsError')) : null,
    refetch,
    createMovement: createMutation.mutateAsync,
    updateMovement: updateMutation.mutateAsync,
    deleteMovement: deleteMutation.mutateAsync
  };
}
