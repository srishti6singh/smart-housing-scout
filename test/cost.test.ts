import { describe, expect, it } from 'vitest';
import { computeTrueCost } from '../shared/cost';
import { getListing } from '../shared/listings';
import type { UtilityProfile } from '../shared/types';

const home = (utilities: Partial<UtilityProfile> = {}) => ({
  rent: 1000,
  sqft: 1000,
  beds: 2,
  utilities: { included: [], heating: 'gas' as const, efficiency: 'average' as const, ...utilities },
});

describe('computeTrueCost', () => {
  it('matches a hand-calculated 12-month average', () => {
    const c = computeTrueCost(home());
    const byKey = Object.fromEntries(c.items.map((i) => [i.key, i.amount]));
    // electricity (0.085+0.12+0.07)/3 * 1000 = 91.67 -> 92
    // gas         (0.17+0.025+0.06)/3 * 1000 = 85
    // water       22 + 16*2 = 54; internet 65; insurance 15
    expect(byKey).toEqual({ electricity: 92, gas: 85, water: 54, internet: 65, insurance: 15 });
    expect(c.extra).toBe(311);
    expect(c.total).toBe(1311);
    expect(c.items.every((i) => i.estimate)).toBe(true);
  });

  it('excludes utilities the landlord includes', () => {
    const c = computeTrueCost(home({ included: ['gas', 'water'] }));
    expect(c.extra).toBe(311 - 85 - 54);
    expect(c.items.find((i) => i.key === 'gas')!.included).toBe(true);
  });

  it('lets the user override what is included', () => {
    const base = computeTrueCost(home());
    const toggled = computeTrueCost(home(), 'average', { internet: true });
    expect(toggled.total).toBe(base.total - 65);
    const untoggled = computeTrueCost(home({ included: ['internet'] }), 'average', { internet: false });
    expect(untoggled.total).toBe(base.total);
  });

  it('costs more in winter for gas heat, and more for drafty buildings', () => {
    expect(computeTrueCost(home(), 'winter').total).toBeGreaterThan(computeTrueCost(home(), 'summer').total);
    expect(computeTrueCost(home({ efficiency: 'drafty' })).total).toBeGreaterThan(computeTrueCost(home()).total);
  });

  it('total always equals rent plus non-included items', () => {
    for (const season of ['average', 'winter', 'summer'] as const) {
      const c = computeTrueCost(home({ included: ['water'] }), season);
      const manual = c.rent + c.items.filter((i) => !i.included).reduce((s, i) => s + i.amount, 0);
      expect(c.total).toBe(manual);
    }
  });

  it('sample trap: cheapest rent is not the cheapest home', () => {
    const cheap = getListing('gf-greenfield')!;
    const c = computeTrueCost(cheap);
    expect(c.extra / c.rent).toBeGreaterThan(0.4);
  });
});
