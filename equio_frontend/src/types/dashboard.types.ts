export interface CategorySummary {
  categoryName: string | null;
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
  expenseCategories: CategorySummary[];
  topCategories: CategorySummary[];
}
