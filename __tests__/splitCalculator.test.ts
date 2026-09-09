import { calculateEqualSplits, calculateSettlements } from '@/services/splitCalculator';
import { Expense, FamilyMember } from '@/types';

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

describe('calculateSettlements (Household Debt Simplification)', () => {
  const memberA: FamilyMember = {
    id: 'm_a',
    family_id: 'fam_1',
    display_name: 'Alice',
    role: 'ADMIN',
    color_code: '#3B82F6',
  };
  const memberB: FamilyMember = {
    id: 'm_b',
    family_id: 'fam_1',
    display_name: 'Bob',
    role: 'MEMBER',
    color_code: '#10B981',
  };
  const memberC: FamilyMember = {
    id: 'm_c',
    family_id: 'fam_1',
    display_name: 'Charlie',
    role: 'MEMBER',
    color_code: '#F59E0B',
  };

  const members = [memberA, memberB, memberC];

  it('returns isBalanced: true when no expenses exist', () => {
    const result = calculateSettlements([], members);
    expect(result.isBalanced).toBe(true);
    expect(result.transfers).toHaveLength(0);
  });

  it('computes correct transfers when one member pays for all equally', () => {
    const expenses: Expense[] = [
      {
        id: 'exp_1',
        family_id: 'fam_1',
        paid_by_member_id: 'm_a',
        category_id: 'cat_1',
        transaction_date: '2026-08-10',
        merchant_name: 'Supermercato',
        amount: 90,
        created_at: '2026-08-10T10:00:00Z',
      },
    ];

    const result = calculateSettlements(expenses, members);
    expect(result.isBalanced).toBe(false);
    expect(result.transfers).toHaveLength(2);

    // Each owes 30 to Alice
    const transferB = result.transfers.find((t) => t.fromMember.id === 'm_b');
    const transferC = result.transfers.find((t) => t.fromMember.id === 'm_c');

    expect(transferB?.toMember.id).toBe('m_a');
    expect(transferB?.amount).toBe(30);

    expect(transferC?.toMember.id).toBe('m_a');
    expect(transferC?.amount).toBe(30);
  });

  it('correctly handles mutual expenses and settles the net difference', () => {
    const expenses: Expense[] = [
      {
        id: 'exp_1',
        family_id: 'fam_1',
        paid_by_member_id: 'm_a',
        category_id: 'cat_1',
        transaction_date: '2026-08-10',
        merchant_name: 'Spesa 1',
        amount: 60, // 20 each
        created_at: '2026-08-10T10:00:00Z',
      },
      {
        id: 'exp_2',
        family_id: 'fam_1',
        paid_by_member_id: 'm_b',
        category_id: 'cat_1',
        transaction_date: '2026-08-11',
        merchant_name: 'Spesa 2',
        amount: 30, // 10 each
        created_at: '2026-08-11T10:00:00Z',
      },
    ];

    // Total = 90. Share per person = 30.
    // Alice paid 60, share 30 -> Net: +30
    // Bob paid 30, share 30 -> Net: 0
    // Charlie paid 0, share 30 -> Net: -30
    // Only Charlie owes Alice 30!
    const result = calculateSettlements(expenses, members);
    expect(result.transfers).toHaveLength(1);
    expect(result.transfers[0].fromMember.id).toBe('m_c');
    expect(result.transfers[0].toMember.id).toBe('m_a');
    expect(result.transfers[0].amount).toBe(30);
  });
});
