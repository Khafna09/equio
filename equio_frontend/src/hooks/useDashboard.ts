import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { getApiErrorMessage } from '../utils/apiError';
import { dashboardApi } from '../api/dashboard.api';
import type { DashboardPeriod, DashboardSummaryResponse } from '../types/dashboard.types';
import { format } from 'date-fns';
import { useI18n } from '../i18n/i18nContextValue';
import { privateQueryKey, queryKeys, queryStaleTimes } from '../api/queryCache';
import { useAuth } from '../contexts/authContextValue';

export function useDashboard(period: DashboardPeriod = 'AUTO') {
  const { user } = useAuth();
  const { t } = useI18n();
  const referenceDate = format(new Date(), 'yyyy-MM-dd');
  const {
    data,
    isLoading,
    isPlaceholderData,
    error,
    refetch
  } = useQuery<DashboardSummaryResponse>({
    queryKey: privateQueryKey(user?.id, queryKeys.dashboard.summary(period, referenceDate)),
    enabled: Boolean(user),
    queryFn: () => dashboardApi.getSummary(period, referenceDate),
    staleTime: queryStaleTimes.financial,
    placeholderData: (previous, query) => query?.queryKey[2] === user?.id
      ? keepPreviousData(previous) : undefined,
  });

  return {
    data: data || null,
    isLoading: isLoading || isPlaceholderData,
    isTransitioning: isPlaceholderData,
    error: error ? getApiErrorMessage(error, t('common.loadDashboardError')) : null,
    refetch
  };
}
