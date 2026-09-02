import {
  AnalyticsCalculator,
  calculateMonthlyMetrics,
  calculateCategoryBreakdown,
  calculateMemberContributions,
  calculateSpendingVelocity,
} from '@/services/analytics';
import { Expense, Category, FamilyMember } from '@/types';

describe('AnalyticsCalculator (Unit Tests & Edge Cases)', () => {
  const mockCategories: Category[] = [
    { id: 'cat_1', family_id: 'fam_1', name: 'Groceries', icon: 'ShoppingCart', color: '#10B981' },
    { id: 'cat_2', family_id: 'fam_1', name: 'Utilities', icon: 'Zap', color: '#6366F1' },
    { id: 'cat_3', family_id: 'fam_1', name: 'Dining', icon: 'Utensils', color: '#F59E0B' },
  ];

  const mockMembers: FamilyMember[] = [
    {
      id: 'mem_1',
      family_id: 'fam_1',
      display_name: 'Berto',
      role: 'ADMIN',
      color_code: '#4F46E5',
    },
    {
      id: 'mem_2',
      family_id: 'fam_1',
      display_name: 'Elena',
      role: 'ADMIN',
      color_code: '#10B981',
    },
    {
      id: 'mem_3',
      family_id: 'fam_1',
      display_name: 'Kid Tommy',
      role: 'MEMBER',
      color_code: '#F59E0B',
    },
  ];

  const mockExpenses: Expense[] = [
    {
      id: 'e1',
      family_id: 'fam_1',
      paid_by_member_id: 'mem_1',
      category_id: 'cat_1',
      transaction_date: '2026-08-05',
      merchant_name: 'Supermarket',
      amount: 150.0,
      created_at: '2026-08-05T00:00:00Z',
    },
    {
      id: 'e2',
      family_id: 'fam_1',
      paid_by_member_id: 'mem_2',
      category_id: 'cat_1',
      transaction_date: '2026-08-10',
      merchant_name: 'Bakery',
      amount: 50.0,
      created_at: '2026-08-10T00:00:00Z',
    },
    {
      id: 'e3',
      family_id: 'fam_1',
      paid_by_member_id: 'mem_1',
      category_id: 'cat_2',
      transaction_date: '2026-08-15',
      merchant_name: 'Power Co',
      amount: 100.0,
      created_at: '2026-08-15T00:00:00Z',
    },
  ];

  const calculator = new AnalyticsCalculator();

  describe('Monthly KPI Metrics', () => {
    it('calculates accurate total spend and burn rate during active month', () => {
      const metrics = calculateMonthlyMetrics(
        mockExpenses,
        mockCategories,
        mockMembers,
        '2026-08',
        new Date('2026-08-15T12:00:00Z'),
      );

      expect(metrics.totalSpend).toBe(300.0);
      expect(metrics.transactionCount).toBe(3);
      expect(metrics.dailyAverageBurn).toBeCloseTo(300 / 15, 1);
      expect(metrics.projectedMonthEnd).toBeCloseTo((300 / 15) * 31, 1);
      expect(metrics.topCategory?.category.name).toBe('Groceries');
      expect(metrics.topSpender?.member.display_name).toBe('Berto');
    });

    it('does not extrapolate past completed months', () => {
      const metrics = calculateMonthlyMetrics(
        mockExpenses,
        mockCategories,
        mockMembers,
        '2026-07',
        new Date('2026-08-15T12:00:00Z'),
      );

      expect(metrics.totalSpend).toBe(0);
      expect(metrics.projectedMonthEnd).toBe(0);
    });

    it('handles empty month with 0 expenses gracefully', () => {
      const metrics = calculateMonthlyMetrics([], mockCategories, mockMembers, '2026-08');

      expect(metrics.totalSpend).toBe(0);
      expect(metrics.dailyAverageBurn).toBe(0);
      expect(metrics.projectedMonthEnd).toBe(0);
      expect(metrics.transactionCount).toBe(0);
    });
  });

  describe('Category Breakdown', () => {
    it('computes correct category percentages and totals sorted descending', () => {
      const breakdown = calculateCategoryBreakdown(mockExpenses, mockCategories);

      expect(breakdown).toHaveLength(2); // Groceries and Utilities
      expect(breakdown[0].category.name).toBe('Groceries');
      expect(breakdown[0].total).toBe(200.0);
      expect(breakdown[0].percentage).toBeCloseTo(66.67, 1);
      expect(breakdown[0].transactionCount).toBe(2);

      expect(breakdown[1].category.name).toBe('Utilities');
      expect(breakdown[1].total).toBe(100.0);
      expect(breakdown[1].percentage).toBeCloseTo(33.33, 1);
      expect(breakdown[1].transactionCount).toBe(1);
    });

    it('handles empty expense array with 0 categories returned', () => {
      const breakdown = calculateCategoryBreakdown([], mockCategories);
      expect(breakdown).toEqual([]);
    });
  });

  describe('Member Contributions', () => {
    it('computes member spend share and includes inactive members with 0 spend', () => {
      const contributions = calculateMemberContributions(mockExpenses, mockMembers);

      expect(contributions).toHaveLength(3);
      expect(contributions[0].member.display_name).toBe('Berto');
      expect(contributions[0].total).toBe(250.0);
      expect(contributions[0].percentage).toBeCloseTo(83.33, 1);

      expect(contributions[1].member.display_name).toBe('Elena');
      expect(contributions[1].total).toBe(50.0);
      expect(contributions[1].percentage).toBeCloseTo(16.67, 1);

      expect(contributions[2].member.display_name).toBe('Kid Tommy');
      expect(contributions[2].total).toBe(0);
      expect(contributions[2].percentage).toBe(0);
    });
  });

  describe('Spending Velocity', () => {
    it('generates continuous cumulative spend data points across all days in the month', () => {
      const velocity = calculateSpendingVelocity(mockExpenses, '2026-08');

      expect(velocity).toHaveLength(31); // 31 days in August
      expect(velocity[0].cumulativeAmount).toBe(0); // Day 1
      expect(velocity[4].cumulativeAmount).toBe(150.0); // Day 5
      expect(velocity[9].cumulativeAmount).toBe(200.0); // Day 10
      expect(velocity[14].cumulativeAmount).toBe(300.0); // Day 15
      expect(velocity[30].cumulativeAmount).toBe(300.0); // Day 31
    });

    it('accurately handles leap year February (29 days)', () => {
      const leapYearExpense: Expense[] = [
        {
          id: 'leap_1',
          family_id: 'fam_1',
          paid_by_member_id: 'mem_1',
          category_id: 'cat_1',
          transaction_date: '2024-02-29',
          merchant_name: 'Leap Day Dinner',
          amount: 80.0,
          created_at: '2024-02-29T00:00:00Z',
        },
      ];

      const velocity = calculateSpendingVelocity(leapYearExpense, '2024-02');
      expect(velocity).toHaveLength(29);
      expect(velocity[28].dateStr).toBe('2024-02-29');
      expect(velocity[28].cumulativeAmount).toBe(80.0);
    });
  });
});
