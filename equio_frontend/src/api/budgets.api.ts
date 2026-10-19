import apiClient from './apiClient';
import type { BudgetCapabilities, BudgetHistoryReport, BudgetLinkPreview, BudgetMode, BudgetModeResponse, BudgetRequest, BudgetResponse } from '../types/budget.types';

const MAX_REPORT_PDF_BYTES = 25 * 1024 * 1024;

export const budgetsApi = {
  getAll: async () => {
    const response = await apiClient.get<BudgetResponse[]>('/budgets');
    return response.data;
  },

  getHistory: async () => {
    const response = await apiClient.get<BudgetResponse[]>('/budgets/history');
    return response.data;
  },

  getCapabilities: async () => {
    const response = await apiClient.get<BudgetCapabilities>('/budgets/capabilities');
    return response.data;
  },

  changeMode: async (mode: BudgetMode) => {
    const response = await apiClient.put<BudgetModeResponse>('/budgets/mode', { mode });
    return response.data;
  },

  previewLink: async (budgetId: number, globalBudgetId: number) => {
    const response = await apiClient.get<BudgetLinkPreview>(`/budgets/${budgetId}/preview-link`, {
      params: { globalId: globalBudgetId },
    });
    return response.data;
  },

  link: async (globalBudgetId: number, budgetId: number) => {
    const response = await apiClient.post<BudgetResponse>(`/budgets/${globalBudgetId}/children/${budgetId}`);
    return response.data;
  },

  detach: async (globalBudgetId: number, budgetId: number) => {
    const response = await apiClient.delete<BudgetResponse>(`/budgets/${globalBudgetId}/children/${budgetId}`);
    return response.data;
  },

  getHistoryReport: async (id: number, signal?: AbortSignal) => {
    const response = await apiClient.get<BudgetHistoryReport>(`/budgets/history/${id}/report`, { signal });
    return response.data;
  },

  downloadHistoryReport: async (id: number) => {
    const response = await apiClient.get<Blob>(`/budgets/history/${id}/report.pdf`, {
      responseType: 'blob',
      timeout: 45_000,
    });
    const contentType = String(response.headers['content-type'] ?? response.data.type).toLowerCase();
    const signature = await response.data.slice(0, 5).text();
    if (!contentType.includes('application/pdf')
        || signature !== '%PDF-'
        || response.data.size > MAX_REPORT_PDF_BYTES) {
      throw new Error('Invalid PDF response');
    }
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
