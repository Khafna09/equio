import type { QueryClient } from '@tanstack/react-query';
import type { MovementFilters } from '../types/movement.types';

const SECOND = 1_000;

export const queryKeys = {
  budgets: {
    root: ['budgets'] as const,
    active: ['budgets', 'active'] as const,
    history: ['budgets', 'history'] as const,
  },
  categories: {
    root: ['categories'] as const,
  },
  dashboard: {
    root: ['dashboard'] as const,
    summary: (month?: number, year?: number) => ['dashboard', month, year] as const,
  },
  movements: {
    root: ['movements'] as const,
    list: (filters?: MovementFilters) => ['movements', filters] as const,
  },
  profile: {
    root: ['profile'] as const,
  },
  savings: {
    root: ['savings'] as const,
  },
} as const;

export const queryStaleTimes = {
  financial: 15 * SECOND,
  reference: 5 * 60 * SECOND,
  profile: 5 * 60 * SECOND,
} as const;

type QueryDomain = keyof typeof queryKeys;

export async function invalidateDomains(
  queryClient: QueryClient,
  domains: readonly QueryDomain[],
): Promise<void> {
  await Promise.all(domains.map((domain) =>
    queryClient.invalidateQueries({ queryKey: queryKeys[domain].root })
  ));
}
