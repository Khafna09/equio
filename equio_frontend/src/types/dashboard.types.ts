export type DashboardPeriod = 'AUTO' | 'BUDGET' | 'MONTH' | 'FORTNIGHT' | 'WEEK';
export type DashboardCalendarPeriod = Extract<DashboardPeriod, 'MONTH' | 'FORTNIGHT' | 'WEEK'>;

export interface CategorySummary {
  categoryName: string | null;
  categoryColor?: string;
  categoryIcon?: string;
  totalSpent: number;
  percentage: number;
}

export interface DashboardBudgetOption {
  id: number;
  name: string;
  scope: 'GLOBAL' | 'INDEPENDENT_CATEGORY';
  startDate: string;
  endDate: string;
}

export interface DashboardSummaryResponse {
  accountingStartAt?: string;
  totalIncome: number;
  totalExpense: number;
  balance: number;
  globalBudgetAmount: number | null;
  savingsDeduction: number | null;
  selectedBudgetId: number | null;
  selectedBudgetName: string | null;
  selectedBudgetScope: DashboardBudgetOption['scope'] | null;
  activeBudgets: DashboardBudgetOption[];
  expenseCategories: CategorySummary[];
  topCategories: CategorySummary[];
  period: Exclude<DashboardPeriod, 'AUTO'>;
  startDate: string;
  endDate: string;
  hasActiveBudget: boolean;
}
