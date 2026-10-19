import { describe, expect, it } from 'vitest';
import type { BudgetResponse } from '../../types/budget.types';
import { calculateBudgetMetrics } from './budgetMetrics';

const globalBudget = (overrides: Partial<BudgetResponse> = {}): BudgetResponse => ({
  id: 1,
  name: 'General',
  totalAmount: 1000,
  spentAmount: 200,
  remainingAmount: 800,
  progressPercentage: 20,
  isFixed: true,
  categoryId: null,
  categoryName: null,
  categoryColor: null,
  categoryIcon: null,
  parentBudgetId: null,
  scope: 'GLOBAL',
  status: 'ACTIVE',
  savingsType: 'PERCENTAGE',
  savingsValue: 10,
  assignableAmount: 900,
  allocatedAmount: 0,
  unallocatedAmount: 900,
  canLink: false,
  canDetach: false,
  canClose: true,
  isOverBudget: false,
  createdAt: '2026-08-01T00:00:00',
  ...overrides,
});

const categoryBudget = (id: number, totalAmount: number): BudgetResponse => ({
  ...globalBudget({ id, totalAmount, savingsType: null, savingsValue: null }),
  categoryId: id,
  categoryName: `Category ${id}`,
  parentBudgetId: 1,
  scope: 'LINKED_CATEGORY',
});

describe('calculateBudgetMetrics', () => {
  it('shows a fully consumed allowance when all funds are reserved and expenses exist', () => {
    expect(calculateBudgetMetrics(globalBudget({ savingsValue: 100 }), []).globalProgress).toBe(100);
    expect(calculateBudgetMetrics(globalBudget({ savingsValue: 100, spentAmount: 0 }), []).globalProgress).toBe(0);
  });

  it('excludes closed children and budgets outside the current general budget', () => {
    const metrics = calculateBudgetMetrics(globalBudget(), [
      categoryBudget(2, 100),
      { ...categoryBudget(3, 200), status: 'CLOSED' },
      { ...categoryBudget(4, 300), parentBudgetId: 99 },
      { ...categoryBudget(5, 400), parentBudgetId: null },
    ]);
    expect(metrics.assignableSubBudgetsCapacity).toBe(800);
  });

  it('deducts savings and existing sub-budget assignments', () => {
    const metrics = calculateBudgetMetrics(
      globalBudget(),
      [categoryBudget(2, 300), categoryBudget(3, 250)],
    );

    expect(metrics.savingsDeduction).toBe(100);
    expect(metrics.effectiveGlobalLimit).toBe(900);
    expect(metrics.globalRemainingAmount).toBe(700);
    expect(metrics.assignableSubBudgetsCapacity).toBe(350);
    expect(metrics.globalProgress).toBe(22.22);
  });

  it('never exposes negative remaining capacity or progress above 100', () => {
    const metrics = calculateBudgetMetrics(
      globalBudget({ spentAmount: 1200, savingsType: 'FIXED', savingsValue: 100 }),
      [categoryBudget(2, 1000)],
    );

    expect(metrics.globalRemainingAmount).toBe(0);
    expect(metrics.assignableSubBudgetsCapacity).toBe(0);
    expect(metrics.globalProgress).toBe(100);
  });
});
