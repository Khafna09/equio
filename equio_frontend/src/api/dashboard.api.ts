import apiClient from './apiClient';
import type { DashboardPeriod, DashboardSummaryResponse } from '../types/dashboard.types';

export const dashboardApi = {
  getSummary: async (period: DashboardPeriod, referenceDate: string, budgetId?: number | null) => {
    const response = await apiClient.get<DashboardSummaryResponse>('/dashboard/summary', {
      params: { period, referenceDate, ...(budgetId != null ? { budgetId } : {}) }
    });
    return response.data;
  }
};
