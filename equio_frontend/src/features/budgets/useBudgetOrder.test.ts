import { describe, expect, it } from 'vitest';
import type { BudgetResponse } from '../../types/budget.types';
import { moveBudget, orderBudgets, parseBudgetOrder } from './useBudgetOrder';

const budget = (id: number): BudgetResponse => ({
  id,
  name: `Budget ${id}`,
  totalAmount: 100,
  spentAmount: 0,
  remainingAmount: 100,
  progressPercentage: 0,
  isFixed: true,
  categoryId: id,
  categoryName: `Category ${id}`,
  categoryColor: null,
  categoryIcon: null,
  parentBudgetId: 1,
  status: 'ACTIVE',
  savingsType: null,
  savingsValue: null,
  isOverBudget: false,
  createdAt: '2026-08-01T00:00:00',
});

describe('budget ordering', () => {
  it('rejects malformed persisted values and removes duplicate ids', () => {
    expect(parseBudgetOrder('not-json')).toEqual([]);
    expect(parseBudgetOrder('[3,1,3]')).toEqual([3, 1]);
    expect(parseBudgetOrder('[1,-2]')).toEqual([]);
  });

  it('keeps new budgets after the persisted order', () => {
    expect(orderBudgets([budget(1), budget(2), budget(3)], [3, 1]).map(({ id }) => id))
      .toEqual([3, 1, 2]);
  });

  it('moves a budget without mutating the source list', () => {
    const source = [budget(1), budget(2), budget(3)];
    expect(moveBudget(source, 1, 3).map(({ id }) => id)).toEqual([2, 3, 1]);
    expect(source.map(({ id }) => id)).toEqual([1, 2, 3]);
  });
});
