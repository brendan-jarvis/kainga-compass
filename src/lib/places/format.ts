export function formatCurrency(n: number): string {
  if (n >= 1_000_000) {
    return `$${(n / 1_000_000).toFixed(2)}m`;
  }
  if (n >= 1_000) {
    return `$${Math.round(n / 1_000)}k`;
  }
  return `$${Math.round(n)}`;
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
