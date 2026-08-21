/**
 * Stage 29 — presentation-only formatting helpers, local to the Analytics
 * page (not part of `lib/analytics/`, which stays free of UI concerns).
 * Every calculation-layer value that can be `null` (no data / divide-by-zero)
 * renders as an em dash here — never `NaN`/`Infinity`/`undefined`.
 */

export function formatCents(cents: number): string {
  return (cents / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 });
}

export function formatPercent(value: number | null, fractionDigits = 1): string {
  if (value === null) return '—';
  return `${(value * 100).toFixed(fractionDigits)}%`;
}

export function formatCount(value: number | null): string {
  if (value === null) return '—';
  return value.toLocaleString('en-US');
}

/** `null` (no comparison available) means the caller should omit any change indicator entirely. */
export function formatChange(changePct: number | null): string | null {
  if (changePct === null) return null;
  const sign = changePct > 0 ? '+' : '';
  return `${sign}${(changePct * 100).toFixed(1)}%`;
}

export function formatTemplateLabel(variant: string): string {
  return variant.replace(/_/g, ' ');
}
