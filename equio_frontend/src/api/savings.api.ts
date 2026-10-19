import apiClient from './apiClient';
import type { SavingGoalRequest, SavingGoalResponse, FundRequest, SavingsPoolResponse } from '../types/saving.types';

export const savingsApi = {
  getAll: async () => {
    const response = await apiClient.get<SavingGoalResponse[]>('/savings');
    return response.data;
  },

  getPool: async () => {
    const response = await apiClient.get<SavingsPoolResponse>('/savings/pool');
    return response.data;
  },

  transferPoolToGoal: async (goalId: number, amount: number) => {
    const response = await apiClient.post<SavingsPoolResponse>('/savings/pool/transfer-to-goal', { goalId, amount });
    return response.data;
  },

  transferPoolToBudget: async (budgetId: number, amount: number) => {
    const response = await apiClient.post<SavingsPoolResponse>('/savings/pool/transfer-to-budget', { budgetId, amount });
    return response.data;
  },

  getById: async (id: number) => {
    const response = await apiClient.get<SavingGoalResponse>(`/savings/${id}`);
    return response.data;
  },

  create: async (data: SavingGoalRequest) => {
    const response = await apiClient.post<SavingGoalResponse>('/savings', data);
    return response.data;
  },

  update: async (id: number, data: SavingGoalRequest) => {
    const response = await apiClient.put<SavingGoalResponse>(`/savings/${id}`, data);
    return response.data;
  },

  addOrWithdrawFund: async (id: number, data: FundRequest) => {
    const response = await apiClient.post<SavingGoalResponse>(`/savings/${id}/fund`, data);
    return response.data;
  },

  delete: async (id: number) => {
    await apiClient.delete(`/savings/${id}`);
  }
};
