import type { BudgetResponse } from '../../types/budget.types';

export interface BudgetMetrics {
  savingsDeduction: number;
  effectiveGlobalLimit: number;
  globalRemainingAmount: number;
  assignableSubBudgetsCapacity: number;
  globalProgress: number;
}

export function calculateBudgetMetrics(
  globalBudget: BudgetResponse | undefined,
  categoryBudgets: BudgetResponse[],
): BudgetMetrics {
  if (!globalBudget) {
    return {
      savingsDeduction: 0,
      effectiveGlobalLimit: 0,
      globalRemainingAmount: 0,
      assignableSubBudgetsCapacity: 0,
      globalProgress: 0,
    };
  }

  const savingsDeduction = globalBudget.savingsValue == null
    ? 0
    : globalBudget.savingsType === 'PERCENTAGE'
      ? globalBudget.totalAmount * (globalBudget.savingsValue / 100)
      : globalBudget.savingsValue;
  const effectiveGlobalLimit = Math.max(0, globalBudget.totalAmount - savingsDeduction);
  const globalRemainingAmount = Math.max(0, effectiveGlobalLimit - globalBudget.spentAmount);
  const assignedAmount = categoryBudgets.reduce((total, budget) => total + budget.totalAmount, 0);
  const assignableSubBudgetsCapacity = Math.max(0, effectiveGlobalLimit - assignedAmount);
  const globalProgress = effectiveGlobalLimit > 0
    ? Math.min(100, Number(((globalBudget.spentAmount / effectiveGlobalLimit) * 100).toFixed(2)))
    : 0;

  return {
    savingsDeduction,
    effectiveGlobalLimit,
    globalRemainingAmount,
    assignableSubBudgetsCapacity,
    globalProgress,
  };
}
