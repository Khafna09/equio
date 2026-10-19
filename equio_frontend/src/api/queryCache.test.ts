import { QueryClient } from '@tanstack/react-query';
import { describe, expect, it, vi } from 'vitest';
import { clearSessionCache, invalidateDomains, privateQueryKey, queryKeys } from './queryCache';

describe('query cache contracts', () => {
  it('isolates fresh financial data between accounts', async () => {
    const client = new QueryClient();
    client.setQueryData(privateQueryKey(1, queryKeys.profile.root), { name: 'A' });
    const accountB = await client.fetchQuery({
      queryKey: privateQueryKey(2, queryKeys.profile.root),
      queryFn: async () => ({ name: 'B' }), staleTime: 300_000,
    });
    expect(accountB.name).toBe('B');
    clearSessionCache(client);
    expect(client.getQueryCache().getAll()).toHaveLength(0);
    expect(client.getMutationCache().getAll()).toHaveLength(0);
  });

  it('does not restore cleared data when an old request completes', async () => {
    const client = new QueryClient();
    let complete!: (value: string) => void;
    const pending = client.fetchQuery({
      queryKey: privateQueryKey(1, queryKeys.budgets.active),
      queryFn: () => new Promise<string>((resolve) => { complete = resolve; }),
    }).catch(() => undefined);
    clearSessionCache(client);
    complete('private account A data');
    await pending;
    expect(client.getQueryCache().getAll()).toHaveLength(0);
  });
  it('builds stable keys for parameterized queries', () => {
    const filters = { type: 'EXPENSE' as const, categoryId: 3 };

    expect(queryKeys.movements.list(filters)).toEqual(['movements', filters]);
    expect(queryKeys.movements.pages(filters)).toEqual(['movements', 'pages', filters]);
    expect(queryKeys.movements.recent(filters, 5)).toEqual(['movements', 'recent', filters, 5]);
    expect(queryKeys.movements.dates('2026-10-01', '2026-10-31')).toEqual(['movements', 'dates', '2026-10-01', '2026-10-31']);
    expect(queryKeys.budgets.report(7)).toEqual(['budgets', 'report', 7]);
    expect(queryKeys.dashboard.summary('BUDGET', '2026-08-05')).toEqual(['dashboard', 'BUDGET', '2026-08-05']);
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

  it('keeps period results separate and invalidates them all after budget changes', async () => {
    const queryClient = new QueryClient();
    const periods = ['AUTO', 'BUDGET', 'MONTH', 'FORTNIGHT', 'WEEK'] as const;
    for (const period of periods) {
      queryClient.setQueryData(queryKeys.dashboard.summary(period, '2026-08-05'), { period });
    }
    await invalidateDomains(queryClient, ['dashboard']);
    for (const period of periods) {
      const key = queryKeys.dashboard.summary(period, '2026-08-05');
      expect(queryClient.getQueryData(key)).toEqual({ period });
      expect(queryClient.getQueryState(key)?.isInvalidated).toBe(true);
    }
    queryClient.clear();
  });

  it('isolates budget reports and invalidates them after financial changes', async () => {
    const client = new QueryClient();
    const a = privateQueryKey(1, queryKeys.budgets.report(7));
    const b = privateQueryKey(1, queryKeys.budgets.report(8));
    const other = privateQueryKey(2, queryKeys.budgets.report(7));
    client.setQueryData(a, { budgetId: 7 });
    client.setQueryData(b, { budgetId: 8 });
    expect(client.getQueryData(other)).toBeUndefined();
    await invalidateDomains(client, ['budgets']);
    expect(client.getQueryState(a)?.isInvalidated).toBe(true);
    expect(client.getQueryState(b)?.isInvalidated).toBe(true);
    client.clear();
  });
});
