import { describe, expect, it } from 'vitest';
import { formatClock, nextWeekdayAt } from '../shared/time';

// All expectations are in Pittsburgh time, regardless of the machine's zone.
describe('nextWeekdayAt (America/New_York)', () => {
  it('Monday afternoon -> Tuesday 8:45 EST (13:45 UTC)', () => {
    expect(nextWeekdayAt('08:45', new Date('2026-11-09T20:00:00Z')).toISOString()).toBe('2026-11-10T13:45:00.000Z');
  });

  it('Monday early morning -> same day', () => {
    expect(nextWeekdayAt('08:45', new Date('2026-11-09T11:00:00Z')).toISOString()).toBe('2026-11-09T13:45:00.000Z');
  });

  it('Friday evening -> Monday', () => {
    expect(nextWeekdayAt('08:45', new Date('2026-11-13T23:00:00Z')).toISOString()).toBe('2026-11-16T13:45:00.000Z');
  });

  it('late Thursday night in Pittsburgh is still Thursday, even though it is Friday in UTC', () => {
    // 2026-11-13T03:30Z is Thu 10:30 PM in Pittsburgh -> next weekday is Fri
    expect(nextWeekdayAt('08:45', new Date('2026-11-13T03:30:00Z')).toISOString()).toBe('2026-11-13T13:45:00.000Z');
  });

  it('uses EDT in summer (12:45 UTC)', () => {
    expect(nextWeekdayAt('08:45', new Date('2026-07-14T20:00:00Z')).toISOString()).toBe('2026-07-15T12:45:00.000Z');
  });

  it('rejects bad input', () => {
    expect(() => nextWeekdayAt('8.45')).toThrow();
    expect(() => nextWeekdayAt('25:00')).toThrow();
  });

  it('formats clock times in Pittsburgh time', () => {
    expect(formatClock('2026-11-10T13:45:00.000Z')).toBe('8:45 AM');
  });
});
