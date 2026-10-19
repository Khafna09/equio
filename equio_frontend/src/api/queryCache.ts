import type { QueryClient } from '@tanstack/react-query';
import type { MovementFilters } from '../types/movement.types';
import type { DashboardPeriod } from '../types/dashboard.types';

const SECOND = 1_000;

export const queryKeys = {
  budgets: {
    root: ['budgets'] as const,
    active: ['budgets', 'active'] as const,
    history: ['budgets', 'history'] as const,
    report: (id: number | null) => ['budgets', 'report', id] as const,
    capabilities: ['budgets', 'capabilities'] as const,
  },
  categories: {
    root: ['categories'] as const,
  },
  dashboard: {
    root: ['dashboard'] as const,
    summary: (period: DashboardPeriod, referenceDate: string) => ['dashboard', period, referenceDate] as const,
  },
  movements: {
    root: ['movements'] as const,
    list: (filters?: MovementFilters) => ['movements', filters] as const,
    pages: (filters?: MovementFilters) => ['movements', 'pages', filters] as const,
    recent: (filters: MovementFilters | undefined, size: number) => ['movements', 'recent', filters, size] as const,
    dates: (startDate: string, endDate: string) => ['movements', 'dates', startDate, endDate] as const,
  },
  profile: {
    root: ['profile'] as const,
  },
  savings: {
    root: ['savings'] as const,
    goals: ['savings', 'goals'] as const,
    pool: ['savings', 'pool'] as const,
  },
} as const;

export const queryStaleTimes = {
  financial: 15 * SECOND,
  reference: 5 * 60 * SECOND,
  profile: 5 * 60 * SECOND,
} as const;

type QueryDomain = keyof typeof queryKeys;

export function privateQueryKey(userId: number | undefined, key: readonly unknown[]) {
  return [key[0], 'user', userId ?? null, ...key.slice(1)] as const;
}

export function clearSessionCache(queryClient: QueryClient): void {
  // Cancellation prevents late responses from restoring the previous session's data.
  void queryClient.cancelQueries().catch(() => undefined);
  queryClient.clear();
}

export async function invalidateDomains(
  queryClient: QueryClient,
  domains: readonly QueryDomain[],
): Promise<void> {
  await Promise.all(domains.map((domain) =>
    queryClient.invalidateQueries({ queryKey: queryKeys[domain].root })
  ));
}
