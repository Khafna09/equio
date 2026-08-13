import { useQuery } from '@tanstack/react-query';
import { getApiErrorMessage } from '../utils/apiError';
import { dashboardApi } from '../api/dashboard.api';
import type { DashboardSummaryResponse } from '../types/dashboard.types';
import { useI18n } from '../i18n/i18nContextValue';

export function useDashboard(month?: number, year?: number) {
  const { t } = useI18n();
  const {
    data,
    isLoading,
    error,
    refetch
  } = useQuery<DashboardSummaryResponse>({
    queryKey: ['dashboard', month, year],
    queryFn: async () => {
      return await dashboardApi.getSummary(month, year);
    }
  });

  return {
    data: data || null,
    isLoading,
    error: error ? getApiErrorMessage(error, t('common.loadDashboardError')) : null,
    refetch
  };
}
