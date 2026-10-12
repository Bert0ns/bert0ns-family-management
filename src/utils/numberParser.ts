/**
 * Financial Number Parser & Exact Math Utilities
 * Supports European (1.250,50), US (1,250.50), and Plain (1250,50 / 1250.50) localized inputs.
 * Cent-exact arithmetic eliminates IEEE 754 precision accumulation drift.
 */

/**
 * Converts a decimal monetary amount to integer cents.
 */
export function toCents(amount: number): number {
  if (!Number.isFinite(amount)) return 0;
  return Math.round(amount * 100);
}

/**
 * Converts integer cents back to decimal monetary amount.
 */
export function fromCents(cents: number): number {
  if (!Number.isFinite(cents)) return 0;
  return Math.round(cents) / 100;
}

/**
 * Rounds a floating-point number to exactly two decimal places.
 */
export function roundToTwoDecimals(amount: number): number {
  if (!Number.isFinite(amount)) return NaN;
  return Math.round(amount * 100) / 100;
}

/**
 * Sums an array of amounts using integer cents to prevent floating-point drift.
 */
export function sumAmounts(amounts: (number | undefined | null)[]): number {
  const totalCents = amounts.reduce<number>((acc, amt) => {
    if (typeof amt !== 'number' || !Number.isFinite(amt)) return acc;
    return acc + Math.round(amt * 100);
  }, 0);
  return totalCents / 100;
}

/**
 * Sums an array of items by numeric selector using integer cents.
 */
export function sumBy<T>(items: T[], selector: (item: T) => number | undefined | null): number {
  const totalCents = items.reduce<number>((acc, item) => {
    const val = selector(item);
    if (typeof val !== 'number' || !Number.isFinite(val)) return acc;
    return acc + Math.round(val * 100);
  }, 0);
  return totalCents / 100;
}

/**
 * Parses localized financial number strings across European, US, and plain notations.
 * Examples:
 * - "1.250,50" -> 1250.50 (European with dots for thousands, comma for decimals)
 * - "1,250.50" -> 1250.50 (US standard with commas for thousands, dot for decimals)
 * - "1250,50"  -> 1250.50 (Plain comma decimal)
 * - "1250.50"  -> 1250.50 (Plain dot decimal)
 * - "€ 1.250,50" -> 1250.50
 * - "-1.250,50" -> -1250.50
 *
 * Returns NaN for invalid strings or empty inputs.
 */
export function parseLocalizedNumber(input: string | number | null | undefined): number {
  if (input === null || input === undefined) return NaN;

  if (typeof input === 'number') {
    if (!Number.isFinite(input)) return NaN;
    return roundToTwoDecimals(input);
  }

  const raw = String(input).trim();
  if (!raw) return NaN;

  // Check for negative sign
  const isNegative = raw.startsWith('-') || /^[^\d]*-[^\d]*\d/.test(raw);

  // Strip non-digit characters except dots, commas
  const cleaned = raw.replace(/[^\d.,]/g, '');
  if (!cleaned) return NaN;

  const firstDot = cleaned.indexOf('.');
  const lastDot = cleaned.lastIndexOf('.');
  const firstComma = cleaned.indexOf(',');
  const lastComma = cleaned.lastIndexOf(',');

  let canonical: string;

  if (lastDot !== -1 && lastComma !== -1) {
    // Both dots and commas exist
    if (lastComma > lastDot) {
      // European format: "1.250,50" or "1.250.000,50"
      // Dots are thousands separators; comma is decimal separator
      const withoutDots = cleaned.replace(/\./g, '');
      canonical = withoutDots.replace(/,/g, '.');
    } else {
      // US format: "1,250.50" or "1,250,000.50"
      // Commas are thousands separators; dot is decimal separator
      canonical = cleaned.replace(/,/g, '');
    }
  } else if (lastComma !== -1) {
    // Only commas present
    if (firstComma !== lastComma) {
      // Multiple commas: e.g. "1,250,000" -> thousands separators
      canonical = cleaned.replace(/,/g, '');
    } else {
      // Single comma: e.g. "1250,50" -> decimal separator
      canonical = cleaned.replace(',', '.');
    }
  } else if (lastDot !== -1) {
    // Only dots present
    if (firstDot !== lastDot) {
      // Multiple dots: e.g. "1.250.000" -> European thousands separators
      canonical = cleaned.replace(/\./g, '');
    } else {
      // Single dot: e.g. "1250.50" -> decimal separator
      canonical = cleaned;
    }
  } else {
    // Digits only
    canonical = cleaned;
  }

  const parsed = parseFloat(canonical);
  if (!Number.isFinite(parsed)) return NaN;

  const result = isNegative ? -Math.abs(parsed) : Math.abs(parsed);
  return roundToTwoDecimals(result);
}
