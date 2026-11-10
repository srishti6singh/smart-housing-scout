import { describe, expect, it } from 'vitest';
import { budgetMatch, parseAmount } from '../src/lib/filters';

const both = { maxRent: 1000, maxUtilities: 250, matchTotal: true };

describe('budgetMatch', () => {
  it('matches on total when both limits are set: $750 rent + $400 utilities fits $1,000 + $250', () => {
    expect(budgetMatch(750, 400, both)).toBe(true);
  });

  it('rejects a home whose total is over the combined budget', () => {
    expect(budgetMatch(1000, 300, both)).toBe(false);
  });

  it('accepts a total exactly at the limit', () => {
    expect(budgetMatch(1000, 250, both)).toBe(true);
  });

  it('checks each limit separately when total matching is off', () => {
    const strict = { ...both, matchTotal: false };
    expect(budgetMatch(750, 400, strict)).toBe(false);
    expect(budgetMatch(900, 200, strict)).toBe(true);
  });

  it('uses only the limit that is set', () => {
    expect(budgetMatch(1200, 50, { maxRent: 1000, maxUtilities: null, matchTotal: true })).toBe(false);
    expect(budgetMatch(900, 999, { maxRent: 1000, maxUtilities: null, matchTotal: true })).toBe(true);
    expect(budgetMatch(2000, 200, { maxRent: null, maxUtilities: 250, matchTotal: true })).toBe(true);
    expect(budgetMatch(500, 300, { maxRent: null, maxUtilities: 250, matchTotal: true })).toBe(false);
  });

  it('accepts everything with no limits', () => {
    expect(budgetMatch(5000, 900, { maxRent: null, maxUtilities: null, matchTotal: true })).toBe(true);
  });
});

describe('parseAmount', () => {
  it('reads plain and formatted amounts', () => {
    expect(parseAmount('1000')).toBe(1000);
    expect(parseAmount('$1,250')).toBe(1250);
    expect(parseAmount(' 99.6 ')).toBe(100);
  });

  it('treats empty, negative, and non-numbers as no limit', () => {
    expect(parseAmount('')).toBeNull();
    expect(parseAmount('-5')).toBeNull();
    expect(parseAmount('abc')).toBeNull();
  });
});
