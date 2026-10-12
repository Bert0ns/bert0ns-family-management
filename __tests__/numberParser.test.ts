import {
  parseLocalizedNumber,
  toCents,
  fromCents,
  roundToTwoDecimals,
  sumAmounts,
  sumBy,
} from '@/utils/numberParser';

describe('numberParser (Unit Tests & Exact Monetary Math)', () => {
  describe('parseLocalizedNumber', () => {
    it('correctly parses European format ("1.250,50")', () => {
      expect(parseLocalizedNumber('1.250,50')).toBe(1250.5);
    });

    it('correctly parses US format ("1,250.50")', () => {
      expect(parseLocalizedNumber('1,250.50')).toBe(1250.5);
    });

    it('correctly parses plain comma format ("1250,50")', () => {
      expect(parseLocalizedNumber('1250,50')).toBe(1250.5);
    });

    it('correctly parses plain dot format ("1250.50")', () => {
      expect(parseLocalizedNumber('1250.50')).toBe(1250.5);
    });

    it('correctly parses integer strings and spaces', () => {
      expect(parseLocalizedNumber('1250')).toBe(1250);
      expect(parseLocalizedNumber(' 1 250,50 ')).toBe(1250.5);
      expect(parseLocalizedNumber('0')).toBe(0);
      expect(parseLocalizedNumber('0,00')).toBe(0);
    });

    it('correctly parses currency symbols and whitespace', () => {
      expect(parseLocalizedNumber('€ 1.250,50')).toBe(1250.5);
      expect(parseLocalizedNumber('$1,250.50')).toBe(1250.5);
      expect(parseLocalizedNumber('1.250,50 €')).toBe(1250.5);
    });

    it('correctly parses large multi-group numbers', () => {
      expect(parseLocalizedNumber('1.250.000,50')).toBe(1250000.5);
      expect(parseLocalizedNumber('1,250,000.50')).toBe(1250000.5);
      expect(parseLocalizedNumber('1.250.000')).toBe(1250000);
      expect(parseLocalizedNumber('1,250,000')).toBe(1250000);
    });

    it('correctly parses negative amounts', () => {
      expect(parseLocalizedNumber('-1.250,50')).toBe(-1250.5);
      expect(parseLocalizedNumber('- 1,250.50')).toBe(-1250.5);
      expect(parseLocalizedNumber('-50,25')).toBe(-50.25);
    });

    it('handles numeric input with rounding', () => {
      expect(parseLocalizedNumber(1250.5)).toBe(1250.5);
      expect(parseLocalizedNumber(12.3456)).toBe(12.35);
      expect(parseLocalizedNumber(0)).toBe(0);
    });

    it('returns NaN for invalid or empty inputs', () => {
      expect(parseLocalizedNumber('')).toBeNaN();
      expect(parseLocalizedNumber('   ')).toBeNaN();
      expect(parseLocalizedNumber('abc')).toBeNaN();
      expect(parseLocalizedNumber(null)).toBeNaN();
      expect(parseLocalizedNumber(undefined)).toBeNaN();
    });
  });

  describe('Cents conversion & rounding', () => {
    it('converts amounts to integer cents', () => {
      expect(toCents(12.5)).toBe(1250);
      expect(toCents(0.1 + 0.2)).toBe(30);
      expect(toCents(0)).toBe(0);
    });

    it('converts integer cents back to decimal amount', () => {
      expect(fromCents(1250)).toBe(12.5);
      expect(fromCents(30)).toBe(0.3);
      expect(fromCents(0)).toBe(0);
    });

    it('rounds to 2 decimals accurately', () => {
      expect(roundToTwoDecimals(12.345)).toBe(12.35);
      expect(roundToTwoDecimals(12.344)).toBe(12.34);
    });
  });

  describe('Cent-exact summations (preventing floating point drift)', () => {
    it('sumAmounts eliminates IEEE 754 drift (0.1 + 0.2 = 0.3)', () => {
      // Normal JS: 0.1 + 0.2 === 0.30000000000000004
      expect(0.1 + 0.2).not.toBe(0.3);
      expect(sumAmounts([0.1, 0.2])).toBe(0.3);
      expect(sumAmounts([19.99, 5.01, 0.05])).toBe(25.05);
      expect(sumAmounts([])).toBe(0);
      expect(sumAmounts([null, undefined, 10.5])).toBe(10.5);
    });

    it('sumBy calculates exact totals across object items', () => {
      const items = [{ amt: 0.1 }, { amt: 0.2 }, { amt: 0.7 }];
      expect(sumBy(items, (i) => i.amt)).toBe(1.0);
    });
  });
});
