const isoDatePattern = /^(\d{4})-(\d{2})-(\d{2})$/;

export function riyadhToday(now = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Riyadh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);
  const values = Object.fromEntries(
    parts.map(({ type, value }) => [type, value]),
  );
  return `${values.year}-${values.month}-${values.day}`;
}

// Rejects values that pass the ISO shape but are not real calendar dates,
// e.g. 2026-13-45 or 2026-02-30.
export function isValidIsoDate(value: string): boolean {
  const match = isoDatePattern.exec(value);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

export function isValidPastIsoDate(value: string): boolean {
  if (!isValidIsoDate(value)) return false;
  return new Date(`${value}T00:00:00Z`).getTime() < Date.now();
}
