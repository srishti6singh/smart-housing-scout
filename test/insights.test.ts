import { describe, expect, it } from 'vitest';
import { getCampus } from '../shared/campuses';
import { distanceKm } from '../shared/geo';
import {
  bathMismatch,
  bathMismatchText,
  closestVsFastest,
  commuteInsight,
  leaseFlexibility,
  type CommuteRank,
} from '../shared/insights';
import { LISTINGS, getListing } from '../shared/listings';
import { buildMockRoutesResponse } from '../shared/mockCommute';
import { parseRoutesResponse } from '../shared/parseRoute';
import { nextWeekdayAt } from '../shared/time';

const ranks: CommuteRank[] = [
  { id: 'a', street: 'Semple St', distanceKm: 1.2, totalMinutes: 39 },
  { id: 'b', street: 'Penn Ave', distanceKm: 3.6, totalMinutes: 18 },
  { id: 'c', street: 'Forbes Ave', distanceKm: 2.0, totalMinutes: 21 },
  { id: 'd', street: 'Atwood St', distanceKm: 1.4, totalMinutes: 37 },
];

describe('commuteInsight', () => {
  it('says when a closer home is slower than a farther one', () => {
    expect(commuteInsight(ranks[0], ranks)?.text).toBe('Closer than Penn Ave, but 21 min slower');
  });

  it('says when a farther home is faster', () => {
    expect(commuteInsight(ranks[1], ranks)?.text).toBe('Farther than Semple St, but 21 min faster');
  });

  it('ignores differences under 3 minutes', () => {
    const near: CommuteRank[] = [
      { id: 'x', street: 'X St', distanceKm: 1, totalMinutes: 20 },
      { id: 'y', street: 'Y St', distanceKm: 2, totalMinutes: 18 },
    ];
    expect(commuteInsight(near[0], near)).toBeNull();
    expect(commuteInsight(near[1], near)).toBeNull();
  });

  it('returns nothing when distance and time agree', () => {
    const ordered: CommuteRank[] = [
      { id: 'x', street: 'X St', distanceKm: 1, totalMinutes: 15 },
      { id: 'y', street: 'Y St', distanceKm: 2, totalMinutes: 25 },
    ];
    expect(commuteInsight(ordered[0], ordered)).toBeNull();
    expect(closestVsFastest(ordered)).toBeNull();
  });
});

describe('closestVsFastest', () => {
  it('names the closest and the fastest home', () => {
    const r = closestVsFastest(ranks)!;
    expect(r.closest.street).toBe('Semple St');
    expect(r.fastest.street).toBe('Penn Ave');
    expect(r.minutes).toBe(21);
  });
});

describe('Bathroom Detective', () => {
  it('flags 2 listed vs 1 full + 1 half', () => {
    const b = getListing('shady-ellsworth')!.bathroom;
    expect(bathMismatch(b)).toBe(true);
    expect(bathMismatchText(b)).toMatch(/^Listed as 2 baths, but verified as 1 full \+ 1 half\./);
  });

  it('accepts 1.5 listed as 1 full + 1 half', () => {
    expect(bathMismatch(getListing('sq-beechwood')!.bathroom)).toBe(false);
  });
});

describe('leaseFlexibility', () => {
  it('scores each flexibility feature', () => {
    expect(leaseFlexibility({ lengthsMonths: [6, 12], deposit: 0, earlyTermination: 'One month', sublease: 'yes', noticeDays: 30, availableFrom: '' }).score).toBe(4);
    expect(leaseFlexibility({ lengthsMonths: [12], deposit: 0, earlyTermination: 'Not allowed', sublease: 'no', noticeDays: 90, availableFrom: '' }).score).toBe(0);
  });
});

describe('sample data traps (mock commutes to CMU, 8:45 AM)', () => {
  const arriveBy = nextWeekdayAt('08:45', new Date('2026-11-09T20:00:00Z'));
  const campus = getCampus('cmu');
  const all: CommuteRank[] = LISTINGS.map((l) => {
    const r = parseRoutesResponse(buildMockRoutesResponse({ listingId: l.id, campusId: 'cmu', origin: l, arriveBy }), arriveBy.toISOString())!;
    return { id: l.id, street: l.street, distanceKm: distanceKm(l, campus.building), totalMinutes: r.totalMinutes };
  });

  it('closest home is not the fastest; a farther direct bus wins', () => {
    const r = closestVsFastest(all)!;
    expect(r.closest.id).toBe('oak-semple');
    expect(r.fastest.id).toBe('pb-penn');
  });

  it('best-reviewed home has the longest commute', () => {
    const slowest = [...all].sort((a, b) => b.totalMinutes - a.totalMinutes)[0];
    expect(['sq-beechwood', 'shady-walnut']).toContain(slowest.id);
    expect(all.find((a) => a.id === 'sq-beechwood')!.totalMinutes).toBeGreaterThanOrEqual(40);
  });

  it('is deterministic', () => {
    const l = LISTINGS[0];
    const a = buildMockRoutesResponse({ listingId: l.id, campusId: 'cmu', origin: l, arriveBy });
    const b = buildMockRoutesResponse({ listingId: l.id, campusId: 'cmu', origin: l, arriveBy });
    expect(a).toEqual(b);
  });
});
