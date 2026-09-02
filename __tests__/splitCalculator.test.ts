import { calculateEqualSplits } from '@/services/splitCalculator';

describe('calculateEqualSplits (Edge Case & Precision Unit Tests)', () => {
  it('handles standard 2-way split evenly', () => {
    const splits = calculateEqualSplits(50, ['mem_1', 'mem_2']);
    expect(splits).toHaveLength(2);
    expect(splits[0].share_amount).toBe(25);
    expect(splits[0].percentage).toBe(50);
    expect(splits[1].share_amount).toBe(25);
    expect(splits[1].percentage).toBe(50);
  });

  it('adjusts penny precision so the sum matches the exact total amount in 3-way split', () => {
    const splits = calculateEqualSplits(100.0, ['mem_1', 'mem_2', 'mem_3']);
    expect(splits).toHaveLength(3);

    const sum = splits.reduce((acc, s) => acc + s.share_amount, 0);
    expect(sum).toBeCloseTo(100.0, 2);

    expect(splits[0].share_amount).toBe(33.33);
    expect(splits[1].share_amount).toBe(33.33);
    expect(splits[2].share_amount).toBe(33.34);
  });

  it('handles 1-way split correctly (100% share)', () => {
    const splits = calculateEqualSplits(84.5, ['mem_1']);
    expect(splits).toHaveLength(1);
    expect(splits[0].share_amount).toBe(84.5);
    expect(splits[0].percentage).toBe(100);
  });

  it('returns an empty array when total amount is 0 or negative', () => {
    expect(calculateEqualSplits(0, ['mem_1', 'mem_2'])).toEqual([]);
    expect(calculateEqualSplits(-25.5, ['mem_1', 'mem_2'])).toEqual([]);
  });

  it('returns an empty array when memberIds is empty or undefined', () => {
    expect(calculateEqualSplits(100, [])).toEqual([]);
    expect(calculateEqualSplits(100, undefined as any)).toEqual([]);
  });

  it('handles 7-way fractional division accurately', () => {
    const members = ['m1', 'm2', 'm3', 'm4', 'm5', 'm6', 'm7'];
    const splits = calculateEqualSplits(1000.0, members);
    expect(splits).toHaveLength(7);

    const sum = splits.reduce((acc, s) => acc + s.share_amount, 0);
    expect(Math.round(sum * 100) / 100).toBe(1000.0);
  });
});
