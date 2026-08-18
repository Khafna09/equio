import { QueryClient } from '@tanstack/react-query';
import { describe, expect, it, vi } from 'vitest';
import { invalidateDomains, queryKeys } from './queryCache';

describe('query cache contracts', () => {
  it('builds stable keys for parameterized queries', () => {
    const filters = { type: 'EXPENSE' as const, categoryId: 3 };

    expect(queryKeys.movements.list(filters)).toEqual(['movements', filters]);
    expect(queryKeys.dashboard.summary(8, 2026)).toEqual(['dashboard', 8, 2026]);
  });

  it('invalidates every requested domain from its root key', async () => {
    const queryClient = new QueryClient();
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries');

    await invalidateDomains(queryClient, ['movements', 'dashboard', 'budgets']);

    expect(invalidate).toHaveBeenCalledTimes(3);
    expect(invalidate).toHaveBeenCalledWith({ queryKey: queryKeys.movements.root });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: queryKeys.dashboard.root });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: queryKeys.budgets.root });
  });
});
