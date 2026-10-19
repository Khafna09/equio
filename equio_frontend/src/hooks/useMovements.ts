import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getApiErrorMessage } from '../utils/apiError';
import { movementsApi } from '../api/movements.api';
import type { MovementResponse, CreateMovementRequest, MovementFilters } from '../types/movement.types';
import { useI18n } from '../i18n/i18nContextValue';
import { invalidateDomains, privateQueryKey, queryKeys, queryStaleTimes } from '../api/queryCache';
import { useAuth } from '../contexts/authContextValue';

export function useMovements(filters?: MovementFilters, options: { enabled?: boolean; limit?: number } = {}) {
  const { user } = useAuth();
  const { t } = useI18n();
  const queryClient = useQueryClient();

  const {
    data: movements = [],
    isLoading,
    error,
    refetch
  } = useQuery<MovementResponse[]>({
    queryKey: privateQueryKey(user?.id, options.limit
      ? queryKeys.movements.recent(filters, options.limit) : queryKeys.movements.list(filters)),
    queryFn: ({ signal }) => options.limit
      ? movementsApi.getPage(filters, null, options.limit, signal).then((page) => page.items)
      : movementsApi.getAll(filters),
    staleTime: queryStaleTimes.financial,
    enabled: Boolean(user) && (options.enabled ?? true),
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
    error: error ? getApiErrorMessage(error, t('common.loadMovementsError'), t) : null,
    refetch,
    createMovement: createMutation.mutateAsync,
    updateMovement: updateMutation.mutateAsync,
    deleteMovement: deleteMutation.mutateAsync
  };
}
