/** Formats a number as euros in the style used on the site, e.g. 12540 -> "€ 12,540". */
export function formatCurrency(value: number): string {
  const sign = value < 0 ? '-' : '';
  const amount = Math.abs(value).toLocaleString('en-IE', { maximumFractionDigits: 2 });
  return `${sign}€ ${amount}`;
}

/** Formats a number with a fixed number of decimals and thousands separators, e.g. 1234.5 -> "1,234.5". */
export function formatNumber(value: number, decimals = 0): string {
  return value.toLocaleString('en-IE', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}
