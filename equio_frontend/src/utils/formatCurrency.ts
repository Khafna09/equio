const CURRENCY_LOCALES: Record<string, string> = {
  PEN: 'es-PE',
  USD: 'en-US',
  EUR: 'es-ES',
  MXN: 'es-MX',
  COP: 'es-CO',
  CLP: 'es-CL',
};

export function getCurrencySymbol(currencyCode: string = 'PEN'): string {
  switch (currencyCode) {
    case 'PEN': return 'S/.';
    case 'USD': return '$';
    case 'EUR': return '€';
    case 'MXN': return '$';
    case 'COP': return '$';
    case 'CLP': return '$';
    default: return '$';
  }
}

export function formatCurrency(
  value: number,
  currencyCode: string = 'PEN',
  options?: { maximumFractionDigits?: number; minimumFractionDigits?: number }
): string {
  const currency = currencyCode || 'PEN';
  const locale = CURRENCY_LOCALES[currency] || 'es-PE';

  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currency,
      maximumFractionDigits: options?.maximumFractionDigits ?? 2,
      minimumFractionDigits: options?.minimumFractionDigits ?? (options?.maximumFractionDigits === 0 ? 0 : 2)
    }).format(value);
  } catch (e) {
    return `${getCurrencySymbol(currency)} ${value.toFixed(2)}`;
  }
}
