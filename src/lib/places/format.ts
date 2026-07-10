export function formatCurrency(n: number): string {
  if (n >= 1_000_000) {
    return `$${(n / 1_000_000).toFixed(2)}m`;
  }
  if (n >= 1_000) {
    return `$${Math.round(n / 1_000)}k`;
  }
  return `$${Math.round(n)}`;
}

/** Full salary-style amount, e.g. $78,500 */
export function formatSalary(n: number): string {
  return new Intl.NumberFormat("en-NZ", {
    style: "currency",
    currency: "NZD",
    maximumFractionDigits: 0,
  }).format(Math.round(n));
}

export function formatRent(n: number): string {
  return `$${Math.round(n)}/wk`;
}

export function formatPercent(n: number, digits = 1): string {
  const sign = n > 0 ? "+" : "";
  return `${sign}${(n * 100).toFixed(digits)}%`;
}

export function formatMultiple(n: number): string {
  return `${n.toFixed(1)}×`;
}
