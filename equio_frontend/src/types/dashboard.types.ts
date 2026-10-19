export type DashboardPeriod = 'AUTO' | 'BUDGET' | 'MONTH' | 'FORTNIGHT' | 'WEEK';
export type DashboardCalendarPeriod = Extract<DashboardPeriod, 'MONTH' | 'FORTNIGHT' | 'WEEK'>;

export interface CategorySummary {
  categoryName: string | null;
  categoryColor?: string;
  categoryIcon?: string;
  totalSpent: number;
  percentage: number;
}

export interface DashboardSummaryResponse {
  accountingStartAt?: string;
  totalIncome: number;
  totalExpense: number;
  balance: number;
  globalBudgetAmount: number | null;
  savingsDeduction: number | null;
  expenseCategories: CategorySummary[];
  topCategories: CategorySummary[];
  period: Exclude<DashboardPeriod, 'AUTO'>;
  startDate: string;
  endDate: string;
  hasActiveBudget: boolean;
}
