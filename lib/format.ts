/** Date formatting. Pure, no locale lookup — the design specifies UK long form. */

const SHORT = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

const LONG = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function parts(iso: string): [number, number, number] | null {
  const p = String(iso ?? "").split("-");
  if (p.length !== 3) return null;
  const [y, m, d] = p.map(Number);
  if (!Number.isInteger(y) || !Number.isInteger(m) || !Number.isInteger(d)) return null;
  if (m < 1 || m > 12) return null;
  return [y, m, d];
}

/** "2023-05-20" → "20 May 2023". Returns the input unchanged if unparseable. */
export function formatDate(iso: string): string {
  const p = parts(iso);
  if (!p) return iso ?? "";
  return `${p[2]} ${SHORT[p[1] - 1]} ${p[0]}`;
}

/** "2026-08-13" → "13 August 2026". */
export function formatDateLong(iso: string): string {
  const p = parts(iso);
  if (!p) return iso ?? "";
  return `${p[2]} ${LONG[p[1] - 1]} ${p[0]}`;
}

/** Today in the server's local timezone as yyyy-mm-dd, for date-input defaults. */
export function todayIso(now: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/** "1 ride" / "2 rides" — the design writes these out rather than using "(s)". */
export function plural(n: number, one: string, many = `${one}s`): string {
  return `${n} ${n === 1 ? one : many}`;
}
