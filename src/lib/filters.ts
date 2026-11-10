export interface BudgetFilter {
  maxRent: number | null;
  maxUtilities: number | null;
  /**
   * When both limits are set, compare the home's rent + utilities against
   * their sum. A $750 rent with $400 utilities fits a $1,000 + $250 budget.
   */
  matchTotal: boolean;
}

export function budgetMatch(rent: number, utilities: number, f: BudgetFilter): boolean {
  const { maxRent, maxUtilities, matchTotal } = f;
  if (matchTotal && maxRent !== null && maxUtilities !== null) {
    return rent + utilities <= maxRent + maxUtilities;
  }
  if (maxRent !== null && rent > maxRent) return false;
  if (maxUtilities !== null && utilities > maxUtilities) return false;
  return true;
}

/** Text from a number box -> a whole, non-negative amount, or null when empty or invalid. */
export function parseAmount(text: string): number | null {
  const cleaned = text.replace(/[$,\s]/g, '');
  if (cleaned === '') return null;
  const n = Number(cleaned);
  return Number.isFinite(n) && n >= 0 ? Math.round(n) : null;
}
