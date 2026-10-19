export type BudgetScope = 'GLOBAL' | 'LINKED_CATEGORY' | 'INDEPENDENT_CATEGORY';
export type BudgetMode = 'NORMAL' | 'ADVANCED';

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
  scope: BudgetScope;
  status: 'ACTIVE' | 'CLOSED';
  savingsType: 'PERCENTAGE' | 'FIXED' | null;
  savingsValue: number | null;
  savingsPoolContribution?: number;
  assignableAmount: number | null;
  allocatedAmount: number | null;
  unallocatedAmount: number | null;
  canLink: boolean;
  canDetach: boolean;
  canClose: boolean;
  isOverBudget: boolean;
  createdAt: string;
  nextStartDate?: string;
}

export interface BudgetCapabilities {
  advancedModeEnabled: boolean;
  canCreateIndependent: boolean;
  canLinkBudgets: boolean;
}

export interface BudgetModeResponse {
  mode: BudgetMode;
}

export interface BudgetLinkPreview {
  globalBudgetId: number;
  budgetId: number;
  startDate: string;
  endDate: string | null;
  budgetLimit: number;
  assimilatedSpentAmount: number;
  globalAssignableAmount: number;
  globalAllocatedAmount: number;
  globalUnallocatedAfterLink: number;
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

export interface BudgetHistoryCategory {
  categoryId: number | null;
  categoryName: string;
  categoryColor: string | null;
  categoryIcon: string | null;
  limitAmount: number | null;
  spentAmount: number;
  percentage: number | null;
  withinLimit: boolean | null;
}

export interface BudgetHistoryExpense {
  movementId: number;
  date: string;
  description: string | null;
  categoryName: string;
  amount: number;
}

export interface BudgetHistoryMovement {
  movementId: number;
  date: string;
  type: 'INCOME' | 'EXPENSE';
  description: string | null;
  categoryId: number | null;
  categoryName: string;
  categoryColor: string | null;
  categoryIcon: string | null;
  amount: number;
}

export interface BudgetGoalContribution {
  goalName: string;
  amount: number;
}

export interface BudgetTimelinePoint {
  date: string;
  actual: number;
  ideal: number;
}

export interface BudgetCategoryChange {
  categoryName: string;
  amount: number;
}

export interface BudgetPeriodComparison {
  previousBudgetId: number;
  previousStartDate: string;
  previousEndDate: string;
  previousExpenses: number;
  expenseChangePercentage: number | null;
  greatestReduction: BudgetCategoryChange | null;
  greatestIncrease: BudgetCategoryChange | null;
}

export interface BudgetHistoryReport {
  budgetId: number;
  budgetName: string;
  scope: Exclude<BudgetScope, 'LINKED_CATEGORY'>;
  startDate: string;
  endDate: string;
  totalAmount: number;
  spendingLimit: number;
  totalSpent: number;
  remainingAmount: number;
  exceededAmount: number;
  spentPercentage: number;
  successful: boolean;
  categoriesWithinLimit: number;
  categoriesWithLimit: number;
  configuredSavings: number;
  goalContributions: number;
  goalContributionDetails: BudgetGoalContribution[];
  totalIncome: number;
  totalExpenses: number;
  balance: number;
  retainedSavings: number;
  savingsRate: number;
  averageDailySpend: number;
  highestSpendingDay: { date: string; amount: number } | null;
  mostExpensiveWeekday: { dayOfWeek: string; amount: number; percentage: number } | null;
  weekendExpensePercentage: number;
  categories: BudgetHistoryCategory[];
  topCategories: BudgetHistoryCategory[];
  highestExpenses: BudgetHistoryExpense[];
  movements: BudgetHistoryMovement[];
  timeline: BudgetTimelinePoint[];
  comparison: BudgetPeriodComparison | null;
  generatedAt: string;
}
