import type { BudgetResponse } from '../types/budget.types';

export function calculateBudgetSettlement(budget: BudgetResponse | null): number {
  if (!budget || budget.parentBudgetId !== null || budget.categoryId !== null) return 0;
  const reserved = budget.savingsType === 'FIXED'
    ? (budget.savingsValue ?? 0)
    : budget.savingsType === 'PERCENTAGE'
      ? (budget.totalAmount - (budget.savingsPoolContribution ?? 0)) * (budget.savingsValue ?? 0) / 100
      : 0;
  return reserved + Math.max(budget.remainingAmount, 0);
}
