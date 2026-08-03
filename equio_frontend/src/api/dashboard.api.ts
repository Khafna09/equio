import apiClient from './apiClient';
import type { DashboardSummaryResponse } from '../types/dashboard.types';

export const dashboardApi = {
  getSummary: async (month?: number, year?: number) => {
    const response = await apiClient.get<DashboardSummaryResponse>('/dashboard/summary', {
      params: { month, year }
    });
    return response.data;
  }
};
