import { useMemo, useState } from 'react';
import type { BudgetResponse } from '../../types/budget.types';
import { getLocalStorageItem, setLocalStorageItem } from '../../utils/browserStorage';

const STORAGE_KEY = 'equio_category_budgets_order';
const MAX_STORED_IDS = 200;

export function parseBudgetOrder(value: string | null): number[] {
  if (!value) return [];
  try {
    const parsed: unknown = JSON.parse(value);
    if (!Array.isArray(parsed) || !parsed.every((id) => Number.isSafeInteger(id) && id > 0)) {
      return [];
    }
    return [...new Set(parsed as number[])].slice(0, MAX_STORED_IDS);
  } catch {
    return [];
  }
}

export function orderBudgets(
  budgets: BudgetResponse[],
  storedOrder: number[],
): BudgetResponse[] {
  const byId = new Map(budgets.map((budget) => [budget.id, budget]));
  const ordered: BudgetResponse[] = [];
  for (const id of storedOrder) {
    const budget = byId.get(id);
    if (!budget) continue;
    ordered.push(budget);
    byId.delete(id);
  }
  byId.forEach((budget) => ordered.push(budget));
  return ordered;
}

export function moveBudget(
  budgets: BudgetResponse[],
  activeId: number,
  overId: number,
): BudgetResponse[] {
  const oldIndex = budgets.findIndex((budget) => budget.id === activeId);
  const newIndex = budgets.findIndex((budget) => budget.id === overId);
  if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) return budgets;

  const reordered = [...budgets];
  const [activeBudget] = reordered.splice(oldIndex, 1);
  reordered.splice(newIndex, 0, activeBudget);
  return reordered;
}

export function useBudgetOrder(budgets: BudgetResponse[]) {
  const [storedOrder, setStoredOrder] = useState<number[]>(() =>
    parseBudgetOrder(getLocalStorageItem(STORAGE_KEY)),
  );
  const orderedBudgets = useMemo(
    () => orderBudgets(budgets, storedOrder),
    [budgets, storedOrder],
  );

  const reorder = (activeId: number, overId: number) => {
    const nextBudgets = moveBudget(orderedBudgets, activeId, overId);
    if (nextBudgets === orderedBudgets) return;
    const nextOrder = nextBudgets.map((budget) => budget.id);
    setStoredOrder(nextOrder);
    setLocalStorageItem(STORAGE_KEY, JSON.stringify(nextOrder));
  };

  return { orderedBudgets, reorder };
}
