export interface CategorySummary {
  categoryName: string;
  categoryColor?: string;
  categoryIcon?: string;
  totalSpent: number;
  percentage: number;
}

export interface DashboardSummaryResponse {
  totalIncome: number;
  totalExpense: number;
  balance: number;
  globalBudgetAmount: number | null;
  savingsDeduction: number | null;
  topCategories: CategorySummary[];
}
