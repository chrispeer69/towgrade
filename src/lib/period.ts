// UTC-based to match Supabase server clock; review period is keyed off the
// row's server-side created_at, so the client-side label must agree.
export function currentQuarter(date: Date = new Date()): string {
  const year = date.getUTCFullYear();
  const q = Math.floor(date.getUTCMonth() / 3) + 1;
  return `${year}-Q${q}`;
}

// "2026-Q2" → "Q2 2026" for display. Storage form (YYYY-Qn) is preserved
// in the database; this helper only flips presentation order.
export function formatPeriod(period: string): string {
  const m = /^(\d{4})-(Q[1-4])$/.exec(period);
  if (!m) return period;
  return `${m[2]} ${m[1]}`;
}
