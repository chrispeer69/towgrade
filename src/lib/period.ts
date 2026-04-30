// UTC-based to match Supabase server clock; review period is keyed off the
// row's server-side created_at, so the client-side label must agree.
export function currentQuarter(date: Date = new Date()): string {
  const year = date.getUTCFullYear();
  const q = Math.floor(date.getUTCMonth() / 3) + 1;
  return `${year}-Q${q}`;
}
