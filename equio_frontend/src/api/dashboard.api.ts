import apiClient from './apiClient';
import type { DashboardPeriod, DashboardSummaryResponse } from '../types/dashboard.types';

export const dashboardApi = {
  getSummary: async (period: DashboardPeriod, referenceDate: string) => {
    const response = await apiClient.get<DashboardSummaryResponse>('/dashboard/summary', {
      params: { period, referenceDate }
    });
    return response.data;
  }
};
