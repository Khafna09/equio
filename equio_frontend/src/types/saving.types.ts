export interface SavingGoalResponse {
  id: number;
  name: string;
  targetAmount: number;
  currentAmount: number;
  remainingAmount: number;
  progressPercentage: number;
  deadline?: string;
  isCompleted: boolean;
  budgetId?: number;
  budgetName?: string;
  createdAt: string;
  tag?: string;
  imageUrl?: string;
}

export interface SavingGoalRequest {
  name: string;
  targetAmount: number;
  deadline?: string;
  budgetId?: number;
  tag?: string;
  imageUrl?: string;
}

export interface FundRequest {
  amount: number;
  operation: 'ADD' | 'WITHDRAW';
}
