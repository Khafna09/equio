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
}

export interface CreateMovementRequest {
  amount: number;
  type: MovementType;
  description?: string;
  categoryId?: number | null;
  date?: string;
}
