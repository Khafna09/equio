export type MovementType = 'INCOME' | 'EXPENSE';

export interface MovementResponse {
  id: number;
  amount: number;
  type: MovementType;
  description?: string;
  date: string;
  categoryId: number | null;
  categoryName: string | null;
  categoryColor?: string;
  categoryIcon?: string;
  createdAt: string;
  source?: 'MANUAL' | 'GOAL_CONTRIBUTION' | 'GOAL_WITHDRAWAL' | 'LEGACY_GOAL_TRANSFER';
}

export interface CreateMovementRequest {
  amount: number;
  type: MovementType;
  description?: string;
  categoryId?: number | null;
  date?: string;
}

export interface MovementFilters {
  type?: MovementType;
  categoryId?: number;
  startDate?: string;
  endDate?: string;
  startAt?: string;
}

export interface MovementCursor {
  beforeDate: string;
  beforeId: number;
}

export interface MovementPage {
  items: MovementResponse[];
  nextCursor: MovementCursor | null;
}
