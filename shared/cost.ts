import type { CostBreakdown, CostItem, Efficiency, Listing, Season, UtilityKey } from './types';

/**
 * SAMPLE utility factors. These are rough planning numbers, not quotes from
 * any utility. Every figure that comes out of them is labeled "estimate".
 *
 * Seasons: winter = Dec-Mar, summer = Jun-Sep, shoulder = the other 4 months.
 * "average" is the 12-month mean.
 */
export const UTILITY_FACTORS = {
  /** Electricity, $ per sq ft per month (lights, appliances, summer AC). */
  electricity: { winter: 0.085, summer: 0.12, shoulder: 0.07 },
  /** Extra electricity when the home heats with electricity, $ per sq ft per month. */
  electricHeat: { winter: 0.2, summer: 0, shoulder: 0.05 },
  /** Gas for heat, hot water and cooking, $ per sq ft per month. */
  gas: { winter: 0.17, summer: 0.025, shoulder: 0.06 },
  /** Water and sewer, flat $ per month plus $ per bedroom. */
  water: { base: 22, perBedroom: 16 },
  /** Internet, flat $ per month for a basic plan. */
  internet: 65,
  /** Renters insurance, flat $ per month. */
  insurance: 15,
  /** Multiplier on heating and cooling for older or newer buildings. */
  efficiency: { efficient: 0.85, average: 1, drafty: 1.4 } as Record<Efficiency, number>,
} as const;

type Band = { winter: number; summer: number; shoulder: number };

function seasonal(band: Band, season: Season): number {
  if (season === 'average') return (band.winter * 4 + band.summer * 4 + band.shoulder * 4) / 12;
  return band[season];
}

export const UTILITY_LABELS: Record<UtilityKey, string> = {
  electricity: 'Electricity',
  gas: 'Gas',
  water: 'Water and sewer',
  internet: 'Internet',
  insurance: 'Renters insurance',
};

export const UTILITY_ORDER: UtilityKey[] = ['electricity', 'gas', 'water', 'internet', 'insurance'];

/**
 * True monthly cost = rent + every utility the tenant pays.
 * `includedOverride` lets the user mark a utility as included in rent.
 */
export function computeTrueCost(
  listing: Pick<Listing, 'rent' | 'sqft' | 'beds' | 'utilities'>,
  season: Season = 'average',
  includedOverride?: Partial<Record<UtilityKey, boolean>>,
): CostBreakdown {
  const f = UTILITY_FACTORS;
  const { sqft, beds, utilities } = listing;
  const eff = f.efficiency[utilities.efficiency];
  // Efficiency affects all of gas (mostly heat) and half of electricity (cooling, electric heat).
  const elecEff = 1 + (eff - 1) / 2;

  let elecRate = seasonal(f.electricity, season) * elecEff;
  if (utilities.heating === 'electric') elecRate += seasonal(f.electricHeat, season) * eff;
  const gasRate = utilities.heating === 'gas' ? seasonal(f.gas, season) * eff : seasonal(f.gas, season) * 0.25;

  const raw: Record<UtilityKey, { amount: number; basis: string }> = {
    electricity: {
      amount: elecRate * sqft,
      basis: `${sqft.toLocaleString('en-US')} sq ft, ${utilities.heating === 'electric' ? 'electric heat' : 'no electric heat'}`,
    },
    gas: {
      amount: gasRate * sqft,
      basis: utilities.heating === 'gas' ? `Gas heat, ${utilities.efficiency} building` : 'Hot water and cooking only',
    },
    water: { amount: f.water.base + f.water.perBedroom * beds, basis: `${beds} bedroom${beds === 1 ? '' : 's'}` },
    internet: { amount: f.internet, basis: 'Basic plan' },
    insurance: { amount: f.insurance, basis: 'Basic renters policy' },
  };

  const items: CostItem[] = UTILITY_ORDER.map((key) => {
    const included = includedOverride?.[key] ?? utilities.included.includes(key);
    return {
      key,
      label: UTILITY_LABELS[key],
      amount: Math.round(raw[key].amount),
      included,
      estimate: true,
      basis: raw[key].basis,
    };
  });

  const extra = items.filter((i) => !i.included).reduce((sum, i) => sum + i.amount, 0);
  return { rent: listing.rent, season, items, extra, total: listing.rent + extra };
}
