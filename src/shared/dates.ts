const WEEKDAYS = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"] as const;
const MONTHS_SHORT = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

export function parseIso(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function toIso(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function addDays(iso: string, days: number): string {
  const date = parseIso(iso);
  date.setDate(date.getDate() + days);
  return toIso(date);
}

export function mondayOf(iso: string): string {
  const date = parseIso(iso);
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);
  return toIso(date);
}

export function weekDates(mondayIso: string): string[] {
  return Array.from({ length: 7 }, (_, i) => addDays(mondayIso, i));
}

export function weekdayLabel(iso: string): string {
  return WEEKDAYS[parseIso(iso).getDay()];
}

export function boardHeader(iso: string): string {
  const date = parseIso(iso);
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${WEEKDAYS[date.getDay()]} ${mm}/${dd}`;
}

export function weekRangeLabel(mondayIso: string): string {
  const start = parseIso(mondayIso);
  const end = parseIso(addDays(mondayIso, 6));
  const sameMonth = start.getMonth() === end.getMonth();
  if (sameMonth) {
    return `${MONTHS_SHORT[start.getMonth()]} ${start.getDate()} – ${end.getDate()}, ${end.getFullYear()}`;
  }
  return `${MONTHS_SHORT[start.getMonth()]} ${start.getDate()} – ${MONTHS_SHORT[end.getMonth()]} ${end.getDate()}, ${end.getFullYear()}`;
}

export function isWeekend(iso: string): boolean {
  const day = parseIso(iso).getDay();
  return day === 0 || day === 6;
}

export function todayIso(): string {
  return toIso(new Date());
}
