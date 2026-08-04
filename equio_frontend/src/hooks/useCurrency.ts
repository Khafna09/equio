import { useProfile } from './useProfile';
import { formatCurrency as formatCurrencyUtil, getCurrencySymbol } from '../utils/formatCurrency';

export function useCurrency() {
  const { profile } = useProfile();
  const currency = profile?.currency || 'PEN';
  const symbol = getCurrencySymbol(currency);

  const format = (
    value: number,
    options?: { maximumFractionDigits?: number; minimumFractionDigits?: number }
  ) => {
    return formatCurrencyUtil(value, currency, options);
  };

  return {
    currency,
    symbol,
    formatCurrency: format
  };
}
