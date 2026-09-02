import {
  AnalyticsCalculator,
  calculateMonthlyMetrics,
  calculateCategoryBreakdown,
  calculateMemberContributions,
  calculateSpendingVelocity,
} from '@/services/analytics';
import { Expense, Category, FamilyMember, Budget } from '@/types';

describe('AnalyticsCalculator (SOLID Unit Tests)', () => {
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
  ];

  const mockBudgets: Budget[] = [
    { id: 'b_total', family_id: 'fam_1', monthly_limit: 1000, period: '2026-08' },
    {
      id: 'b_groceries',
      family_id: 'fam_1',
      category_id: 'cat_1',
      monthly_limit: 500,
      period: '2026-08',
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
    it('calculates accurate total spend and remaining budget', () => {
      const metrics = calculator.calculateMonthlyMetrics(
        mockExpenses,
        mockBudgets,
        mockCategories,
        mockMembers,
        '2026-08',
      );

      expect(metrics.totalSpend).toBe(300.0);
      expect(metrics.totalBudget).toBe(1000.0);
      expect(metrics.remainingBudget).toBe(700.0);
      expect(metrics.budgetProgressPercent).toBe(30.0);
      expect(metrics.isOverBudget).toBe(false);
      expect(metrics.transactionCount).toBe(3);
    });

    it('flags budget overrun when expenses exceed budget limit', () => {
      const lowBudgets: Budget[] = [
        { id: 'b_low', family_id: 'fam_1', monthly_limit: 200, period: '2026-08' },
      ];

      const metrics = calculator.calculateMonthlyMetrics(
        mockExpenses,
        lowBudgets,
        mockCategories,
        mockMembers,
        '2026-08',
      );

      expect(metrics.isOverBudget).toBe(true);
      expect(metrics.remainingBudget).toBe(-100.0);
      expect(metrics.budgetProgressPercent).toBe(150.0);
    });
  });

  describe('Category Breakdown', () => {
    it('computes correct category percentages and totals sorted descending', () => {
      const breakdown = calculator.calculateCategoryBreakdown(mockExpenses, mockCategories);

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
  });

  describe('Member Contributions', () => {
    it('computes member spend share and rankings', () => {
      const contributions = calculator.calculateMemberContributions(mockExpenses, mockMembers);

      expect(contributions).toHaveLength(2);
      expect(contributions[0].member.display_name).toBe('Berto');
      expect(contributions[0].total).toBe(250.0);
      expect(contributions[0].percentage).toBeCloseTo(83.33, 1);

      expect(contributions[1].member.display_name).toBe('Elena');
      expect(contributions[1].total).toBe(50.0);
      expect(contributions[1].percentage).toBeCloseTo(16.67, 1);
    });
  });

  describe('Spending Velocity', () => {
    it('generates continuous cumulative spend data points across all days in the month', () => {
      const velocity = calculator.calculateSpendingVelocity(mockExpenses, 1000, '2026-08');

      expect(velocity).toHaveLength(31); // 31 days in August
      expect(velocity[0].cumulativeAmount).toBe(0); // Day 1
      expect(velocity[4].cumulativeAmount).toBe(150.0); // Day 5
      expect(velocity[9].cumulativeAmount).toBe(200.0); // Day 10
      expect(velocity[14].cumulativeAmount).toBe(300.0); // Day 15
      expect(velocity[30].cumulativeAmount).toBe(300.0); // Day 31
    });
  });
});
