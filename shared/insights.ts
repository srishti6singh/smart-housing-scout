// Plain-language findings that compare a listing's claims with the evidence.
import type { BathroomCheck, CostBreakdown, CommuteResult, LeaseTerms, Listing } from './types';

/* ---------- Commute: distance vs time ---------- */

export interface CommuteRank {
  id: string;
  street: string;
  distanceKm: number;
  totalMinutes: number;
}

/** Ignore differences smaller than this; they are within schedule noise. */
export const MEANINGFUL_MINUTES = 3;

export interface CommuteInsight {
  kind: 'closerButSlower' | 'fartherButFaster';
  otherId: string;
  otherStreet: string;
  minutes: number;
  text: string;
}

/**
 * For one home, find the most surprising comparison:
 * - a farther home that is faster ("Closer than Penn Ave, but 14 min slower"), or
 * - a closer home that is slower ("Farther than Semple St, but 14 min faster").
 */
export function commuteInsight(target: CommuteRank, all: CommuteRank[]): CommuteInsight | null {
  const others = all.filter((o) => o.id !== target.id);

  const fasterFarther = others
    .filter((o) => o.distanceKm > target.distanceKm && target.totalMinutes - o.totalMinutes >= MEANINGFUL_MINUTES)
    .sort((a, b) => a.totalMinutes - b.totalMinutes || a.distanceKm - b.distanceKm)[0];
  if (fasterFarther) {
    const minutes = target.totalMinutes - fasterFarther.totalMinutes;
    return {
      kind: 'closerButSlower',
      otherId: fasterFarther.id,
      otherStreet: fasterFarther.street,
      minutes,
      text: `Closer than ${fasterFarther.street}, but ${minutes} min slower`,
    };
  }

  const slowerCloser = others
    .filter((o) => o.distanceKm < target.distanceKm && o.totalMinutes - target.totalMinutes >= MEANINGFUL_MINUTES)
    // Compare with the closest slower home: that is the one a renter would pick by distance.
    .sort((a, b) => a.distanceKm - b.distanceKm)[0];
  if (slowerCloser) {
    const minutes = slowerCloser.totalMinutes - target.totalMinutes;
    return {
      kind: 'fartherButFaster',
      otherId: slowerCloser.id,
      otherStreet: slowerCloser.street,
      minutes,
      text: `Farther than ${slowerCloser.street}, but ${minutes} min faster`,
    };
  }
  return null;
}

/** When the closest home is not the fastest, explain it in one sentence. */
export function closestVsFastest(all: CommuteRank[]): { closest: CommuteRank; fastest: CommuteRank; minutes: number } | null {
  if (all.length < 2) return null;
  const closest = [...all].sort((a, b) => a.distanceKm - b.distanceKm)[0];
  const fastest = [...all].sort((a, b) => a.totalMinutes - b.totalMinutes || a.distanceKm - b.distanceKm)[0];
  const minutes = closest.totalMinutes - fastest.totalMinutes;
  if (closest.id === fastest.id || minutes < MEANINGFUL_MINUTES) return null;
  return { closest, fastest, minutes };
}

/* ---------- Bathroom Detective ---------- */

export function verifiedBathCount(b: BathroomCheck): number {
  return b.verifiedFull + b.verifiedHalf * 0.5;
}

export function bathMismatch(b: BathroomCheck): boolean {
  return Math.abs(b.listed - verifiedBathCount(b)) > 0.01;
}

export function describeBaths(b: BathroomCheck): string {
  const parts = [`${b.verifiedFull} full`];
  if (b.verifiedHalf > 0) parts.push(`${b.verifiedHalf} half`);
  return parts.join(' + ');
}

export function bathMismatchText(b: BathroomCheck): string | null {
  if (!bathMismatch(b)) return null;
  const listed = `${b.listed} bath${b.listed === 1 ? '' : 's'}`;
  return `Listed as ${listed}, but verified as ${describeBaths(b)}. ${b.note ?? 'A half bath has a toilet and sink but no shower or tub.'}`;
}

/* ---------- Lease flexibility ---------- */

export function leaseFlexibility(lease: LeaseTerms): { score: number; max: 4; reasons: string[] } {
  let score = 0;
  const reasons: string[] = [];
  if (Math.min(...lease.lengthsMonths) < 12) {
    score += 1;
    reasons.push(`${Math.min(...lease.lengthsMonths)}-month lease available`);
  }
  if (lease.earlyTermination && lease.earlyTermination !== 'Not allowed') {
    score += 1;
    reasons.push('Early termination allowed');
  }
  if (lease.sublease === 'yes') {
    score += 1;
    reasons.push('Sublease allowed');
  } else if (lease.sublease === 'with approval') {
    score += 0.5;
    reasons.push('Sublease with approval');
  }
  if (lease.noticeDays <= 30) {
    score += 1;
    reasons.push(`${lease.noticeDays}-day notice`);
  }
  return { score, max: 4, reasons };
}

/* ---------- Ratings ---------- */

export function overallRating(listing: Pick<Listing, 'ratings'>): number {
  const r = listing.ratings;
  return Math.round(((r.responsiveness + r.maintenance + r.noise + r.heating) / 4) * 10) / 10;
}

/* ---------- Flags ---------- */

export interface Flag {
  id: string;
  severity: 'red' | 'amber';
  label: string;
}

export const HIDDEN_COST_FLAG_SHARE = 0.2;
export const EARLY_ARRIVAL_FLAG_MIN = 10;

export function getFlags(listing: Listing, cost: CostBreakdown, commute?: CommuteResult | null): Flag[] {
  const flags: Flag[] = [];
  if (bathMismatch(listing.bathroom)) {
    flags.push({ id: 'baths', severity: 'red', label: `Bath count: listed ${listing.bathroom.listed}, verified ${describeBaths(listing.bathroom)}` });
  }
  if (cost.extra >= cost.rent * HIDDEN_COST_FLAG_SHARE) {
    flags.push({ id: 'cost', severity: 'amber', label: `Utilities add $${cost.extra} a month (${Math.round((cost.extra / cost.rent) * 100)}% of rent)` });
  }
  if (commute && commute.earlyArrival >= EARLY_ARRIVAL_FLAG_MIN) {
    flags.push({ id: 'early', severity: 'amber', label: `Only bus that makes it arrives ${commute.earlyArrival} min early` });
  }
  if (listing.ratings.heating < 3) {
    flags.push({ id: 'heat', severity: 'amber', label: `Past tenants rate winter heating ${listing.ratings.heating.toFixed(1)} of 5` });
  }
  if (listing.lease.deposit > listing.rent) {
    flags.push({ id: 'deposit', severity: 'amber', label: `Deposit is more than one month’s rent ($${listing.lease.deposit.toLocaleString('en-US')})` });
  }
  return flags;
}
