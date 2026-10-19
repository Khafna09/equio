import { useInfiniteQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { movementsApi } from '../api/movements.api';
import { privateQueryKey, queryKeys, queryStaleTimes } from '../api/queryCache';
import { useAuth } from '../contexts/authContextValue';
import { useI18n } from '../i18n/i18nContextValue';
import type { MovementCursor, MovementFilters } from '../types/movement.types';
import { getApiErrorMessage } from '../utils/apiError';

export function useMovementPages(filters?: MovementFilters) {
  const { user } = useAuth();
  const { t } = useI18n();
  const query = useInfiniteQuery({
    queryKey: privateQueryKey(user?.id, queryKeys.movements.pages(filters)),
    initialPageParam: null as MovementCursor | null,
    queryFn: ({ pageParam, signal }) => movementsApi.getPage(filters, pageParam, 50, signal),
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    enabled: Boolean(user),
    staleTime: queryStaleTimes.financial,
  });
  const movements = useMemo(() => query.data?.pages.flatMap((page) => page.items) ?? [], [query.data]);
  return {
    ...query,
    movements,
    error: query.error ? getApiErrorMessage(query.error, t('common.loadMovementsError'), t) : null,
  };
}
