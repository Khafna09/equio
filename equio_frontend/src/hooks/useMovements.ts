import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getApiErrorMessage } from '../utils/apiError';
import { movementsApi } from '../api/movements.api';
import type { MovementResponse, CreateMovementRequest, MovementFilters } from '../types/movement.types';
import { useI18n } from '../i18n/i18nContextValue';
import { invalidateDomains, queryKeys, queryStaleTimes } from '../api/queryCache';

export function useMovements(filters?: MovementFilters) {
  const { t } = useI18n();
  const queryClient = useQueryClient();

  const {
    data: movements = [],
    isLoading,
    error,
    refetch
  } = useQuery<MovementResponse[]>({
    queryKey: queryKeys.movements.list(filters),
    queryFn: () => movementsApi.getAll(filters),
    staleTime: queryStaleTimes.financial,
  });

  const createMutation = useMutation({
    mutationFn: async (data: CreateMovementRequest) => {
      return await movementsApi.create(data);
    },
    onSuccess: () => invalidateDomains(queryClient, ['movements', 'dashboard', 'budgets']),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: CreateMovementRequest }) => {
      return await movementsApi.update(id, data);
    },
    onSuccess: () => invalidateDomains(queryClient, ['movements', 'dashboard', 'budgets']),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return await movementsApi.delete(id);
    },
    onSuccess: () => invalidateDomains(queryClient, ['movements', 'dashboard', 'budgets']),
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
