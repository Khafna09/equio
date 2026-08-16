import apiClient from './apiClient';
import type { BudgetHistoryReport, BudgetRequest, BudgetResponse } from '../types/budget.types';

export const budgetsApi = {
  getAll: async () => {
    const response = await apiClient.get<BudgetResponse[]>('/budgets');
    return response.data;
  },

  getHistory: async () => {
    const response = await apiClient.get<BudgetResponse[]>('/budgets/history');
    return response.data;
  },

  getHistoryReport: async (id: number) => {
    const response = await apiClient.get<BudgetHistoryReport>(`/budgets/history/${id}/report`);
    return response.data;
  },

  downloadHistoryReport: async (id: number) => {
    const response = await apiClient.get<Blob>(`/budgets/history/${id}/report.pdf`, {
      responseType: 'blob',
    });
    return response.data;
  },
  getById: async (id: number) => {
    const response = await apiClient.get<BudgetResponse>(`/budgets/${id}`);
    return response.data;
  },

  create: async (data: BudgetRequest) => {
    const response = await apiClient.post<BudgetResponse>('/budgets', data);
    return response.data;
  },

  update: async (id: number, data: BudgetRequest) => {
    const response = await apiClient.put<BudgetResponse>(`/budgets/${id}`, data);
    return response.data;
  },

  delete: async (id: number, cascade: boolean = false) => {
    await apiClient.delete(`/budgets/${id}?cascade=${cascade}`);
  },

  close: async (id: number) => {
    const response = await apiClient.patch<BudgetResponse>(`/budgets/${id}/close`);
    return response.data;
  }
};
