export const MAX_MONEY_AMOUNT = 9_999_999_999.99;

export function parsePositiveMoney(value: string): number | null {
  const normalized = value.trim();
  if (!/^(?:0|[1-9]\d{0,9})(?:\.\d{1,2})?$/.test(normalized)) {
    return null;
  }

  const amount = Number(normalized);
  return Number.isFinite(amount) && amount > 0 && amount <= MAX_MONEY_AMOUNT
    ? amount
    : null;
}
