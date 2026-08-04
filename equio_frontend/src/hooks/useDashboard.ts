import { useQuery } from '@tanstack/react-query';
import { dashboardApi } from '../api/dashboard.api';
import type { DashboardSummaryResponse } from '../types/dashboard.types';

export function useDashboard(month?: number, year?: number) {
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
    error: error ? (error as any).response?.data?.message || 'Error al cargar el dashboard' : null,
    refetch
  };
}
