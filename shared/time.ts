// Time helpers. Commute times are always planned in Pittsburgh's time zone,
// never the server's or the browser's.

export const CITY_TZ = 'America/New_York';

interface ZonedParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  weekday: number; // 0 = Sunday
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function zonedParts(date: Date, tz = CITY_TZ): ZonedParts {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    weekday: 'short',
    hourCycle: 'h23',
  }).formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
  return {
    year: Number(get('year')),
    month: Number(get('month')),
    day: Number(get('day')),
    hour: Number(get('hour')) % 24,
    minute: Number(get('minute')),
    weekday: WEEKDAYS.indexOf(get('weekday')),
  };
}

/** UTC instant for a wall-clock time in `tz`. Handles DST. */
export function zonedTimeToUtc(year: number, month: number, day: number, hour: number, minute: number, tz = CITY_TZ): Date {
  const target = Date.UTC(year, month - 1, day, hour, minute);
  let guess = target;
  // Two passes converge, including across DST changes.
  for (let i = 0; i < 2; i++) {
    const p = zonedParts(new Date(guess), tz);
    const asIfUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute);
    guess += target - asIfUtc;
  }
  return new Date(guess);
}

export function parseHHMM(value: string): { hour: number; minute: number } | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!m) return null;
  const hour = Number(m[1]);
  const minute = Number(m[2]);
  if (hour > 23 || minute > 59) return null;
  return { hour, minute };
}

/**
 * The next weekday (Mon-Fri) at `hhmm` Pittsburgh time that is still in the
 * future. Today counts if it is a weekday and the time has not passed.
 */
export function nextWeekdayAt(hhmm: string, now: Date = new Date(), tz = CITY_TZ): Date {
  const t = parseHHMM(hhmm);
  if (!t) throw new Error(`Invalid time "${hhmm}". Use HH:MM, for example 08:45.`);
  const today = zonedParts(now, tz);
  for (let offset = 0; offset < 8; offset++) {
    // Walk calendar days using noon UTC so DST never skips a date.
    const d = new Date(Date.UTC(today.year, today.month - 1, today.day + offset, 12));
    const weekday = d.getUTCDay();
    if (weekday === 0 || weekday === 6) continue;
    const candidate = zonedTimeToUtc(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate(), t.hour, t.minute, tz);
    if (candidate.getTime() > now.getTime()) return candidate;
  }
  throw new Error('Could not find a weekday');
}

export function formatClock(iso: string | Date, tz = CITY_TZ): string {
  return new Intl.DateTimeFormat('en-US', { timeZone: tz, hour: 'numeric', minute: '2-digit' }).format(new Date(iso));
}

export function formatDay(iso: string | Date, tz = CITY_TZ): string {
  return new Intl.DateTimeFormat('en-US', { timeZone: tz, weekday: 'short', month: 'short', day: 'numeric' }).format(new Date(iso));
}

/** Minutes since local midnight in `tz`. */
export function minutesOfDay(date: Date, tz = CITY_TZ): number {
  const p = zonedParts(date, tz);
  return p.hour * 60 + p.minute;
}
