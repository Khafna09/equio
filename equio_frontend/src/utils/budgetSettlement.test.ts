import { describe, expect, it } from 'vitest';
import type { BudgetResponse } from '../types/budget.types';
import { calculateBudgetSettlement } from './budgetSettlement';

const globalBudget: BudgetResponse = {
  id: 1,
  name: 'Global',
  totalAmount: 1000,
  spentAmount: 650,
  remainingAmount: 250,
  progressPercentage: 72.22,
  isFixed: false,
  categoryId: null,
  categoryName: null,
  categoryColor: null,
  categoryIcon: null,
  parentBudgetId: null,
  scope: 'GLOBAL',
  status: 'ACTIVE',
  savingsType: 'PERCENTAGE',
  savingsValue: 10,
  savingsPoolContribution: 0,
  assignableAmount: 900,
  allocatedAmount: 0,
  unallocatedAmount: 900,
  canLink: false,
  canDetach: false,
  canClose: true,
  isOverBudget: false,
  createdAt: '2026-09-01T00:00:00',
};

describe('calculateBudgetSettlement', () => {
  it('adds reserved savings and the positive unused spendable balance', () => {
    expect(calculateBudgetSettlement(globalBudget)).toBe(350);
  });

  it('does not credit category budgets independently', () => {
    expect(calculateBudgetSettlement({ ...globalBudget, categoryId: 3 })).toBe(0);
  });

  it('never credits a negative unused balance', () => {
    expect(calculateBudgetSettlement({ ...globalBudget, remainingAmount: 0, savingsType: 'FIXED', savingsValue: 80 }))
      .toBe(80);
  });
});
