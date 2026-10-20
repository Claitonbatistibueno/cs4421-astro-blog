/** Formats a number as euros in the style used on the site, e.g. 12540 -> "€ 12,540". */
export function formatCurrency(value: number): string {
  const sign = value < 0 ? '-' : '';
  const amount = Math.abs(value).toLocaleString('en-IE', { maximumFractionDigits: 2 });
  return `${sign}€ ${amount}`;
}
