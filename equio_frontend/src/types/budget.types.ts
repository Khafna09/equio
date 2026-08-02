export interface BudgetResponse {
  id: number;
  name: string;
  totalAmount: number;
  spentAmount: number;
  remainingAmount: number;
  progressPercentage: number;
  isFixed: boolean;
  startDate?: string;
  endDate?: string;
  categoryId: number | null;
  categoryName: string | null;
  categoryColor: string | null;
  categoryIcon: string | null;
  parentBudgetId: number | null;
  status: 'ACTIVE' | 'CLOSED';
  savingsType: 'PERCENTAGE' | 'FIXED' | null;
  savingsValue: number | null;
  isOverBudget: boolean;
  createdAt: string;
  nextStartDate?: string;
}

export interface BudgetRequest {
  name: string;
  totalAmount: number;
  isFixed: boolean;
  startDate?: string;
  endDate?: string;
  categoryId?: number;
  parentBudgetId?: number;
  savingsType?: 'PERCENTAGE' | 'FIXED';
  savingsValue?: number;
  retroactiveCatchUp?: boolean;
  subBudgetsToAdopt?: number[];
  isIndependent?: boolean;
}
