import {
  calculateHistoricalMonthlyTrends,
  calculateComparativeSpendingVelocity,
  calculateDayOfWeekDistribution,
  calculatePaymentMethodDistribution,
  getPreviousPeriod,
  getHistoricalPeriods,
} from '@/services/analytics';
import { Expense } from '@/types';

describe('Advanced Analytics Calculations (Unit Tests & Invariants)', () => {
  const mockExpenses: Expense[] = [
    // 2026-08 Expenses
    {
      id: 'e1',
      family_id: 'fam_1',
      paid_by_member_id: 'mem_1',
      category_id: 'cat_1',
      transaction_date: '2026-08-03', // Monday
      merchant_name: 'Supermarket',
      amount: 100.0,
      payment_method: 'CREDIT_CARD',
      created_at: '2026-08-03T00:00:00Z',
    },
    {
      id: 'e2',
      family_id: 'fam_1',
      paid_by_member_id: 'mem_2',
      category_id: 'cat_2',
      transaction_date: '2026-08-08', // Saturday
      merchant_name: 'Weekend Club',
      amount: 150.0,
      payment_method: 'DEBIT_CARD',
      created_at: '2026-08-08T00:00:00Z',
    },
    {
      id: 'e3',
      family_id: 'fam_1',
      paid_by_member_id: 'mem_1',
      category_id: 'cat_1',
      transaction_date: '2026-08-15', // Saturday
      merchant_name: 'Electronics',
      amount: 250.0,
      payment_method: 'CREDIT_CARD',
      created_at: '2026-08-15T00:00:00Z',
    },
    {
      id: 'e4',
      family_id: 'fam_1',
      paid_by_member_id: 'mem_2',
      category_id: 'cat_3',
      transaction_date: '2026-08-20', // Thursday
      merchant_name: 'Coffee Shop',
      amount: 20.0,
      payment_method: 'CASH',
      created_at: '2026-08-20T00:00:00Z',
    },

    // 2026-07 Expenses (Previous month)
    {
      id: 'e5',
      family_id: 'fam_1',
      paid_by_member_id: 'mem_1',
      category_id: 'cat_1',
      transaction_date: '2026-07-05',
      merchant_name: 'Grocery Store',
      amount: 200.0,
      payment_method: 'DEBIT_CARD',
      created_at: '2026-07-05T00:00:00Z',
    },
    {
      id: 'e6',
      family_id: 'fam_1',
      paid_by_member_id: 'mem_2',
      category_id: 'cat_2',
      transaction_date: '2026-07-15',
      merchant_name: 'Gas Station',
      amount: 100.0,
      payment_method: 'CREDIT_CARD',
      created_at: '2026-07-15T00:00:00Z',
    },

    // 2026-06 Expenses (Two months prior)
    {
      id: 'e7',
      family_id: 'fam_1',
      paid_by_member_id: 'mem_1',
      category_id: 'cat_1',
      transaction_date: '2026-06-10',
      merchant_name: 'Farm Market',
      amount: 400.0,
      payment_method: 'BANK_TRANSFER',
      created_at: '2026-06-10T00:00:00Z',
    },
  ];

  describe('Period Helper Functions', () => {
    it('accurately resolves previous period across year boundaries', () => {
      expect(getPreviousPeriod('2026-08')).toBe('2026-07');
      expect(getPreviousPeriod('2026-01')).toBe('2025-12');
      expect(getPreviousPeriod('2020-03')).toBe('2020-02');
    });

    it('generates chronological historical periods window', () => {
      const periods = getHistoricalPeriods('2026-08', 6);
      expect(periods).toEqual(['2026-03', '2026-04', '2026-05', '2026-06', '2026-07', '2026-08']);
    });

    it('handles year boundary rollover in historical periods window', () => {
      const periods = getHistoricalPeriods('2026-02', 4);
      expect(periods).toEqual(['2025-11', '2025-12', '2026-01', '2026-02']);
    });
  });

  describe('Historical Monthly Trends (Cash Flow & Rolling Average)', () => {
    it('computes 6-month historical trends with MoM growth and 3-month rolling average', () => {
      const trends = calculateHistoricalMonthlyTrends(mockExpenses, '2026-08', 6);

      expect(trends).toHaveLength(6);
      // Chronological order
      expect(trends[0].period).toBe('2026-03');
      expect(trends[5].period).toBe('2026-08');

      // 2026-06: 400 total
      const jun = trends.find((t) => t.period === '2026-06')!;
      expect(jun.totalSpend).toBe(400.0);
      expect(jun.transactionCount).toBe(1);

      // 2026-07: 300 total (200 + 100), MoM from 400 to 300 is -25%
      const jul = trends.find((t) => t.period === '2026-07')!;
      expect(jul.totalSpend).toBe(300.0);
      expect(jul.transactionCount).toBe(2);
      expect(jul.momGrowthPercentage).toBe(-25.0);

      // 2026-08: 520 total (100 + 150 + 250 + 20), MoM from 300 to 520 is +73.33%
      const aug = trends.find((t) => t.period === '2026-08')!;
      expect(aug.totalSpend).toBe(520.0);
      expect(aug.transactionCount).toBe(4);
      expect(aug.momGrowthPercentage).toBeCloseTo(73.33, 1);

      // 3-month rolling average for August: (400 + 300 + 520) / 3 = 406.67
      expect(aug.rollingAverage).toBeCloseTo(406.67, 1);
    });

    it('handles months with zero expenses without gaps or NaN', () => {
      const emptyHistory = calculateHistoricalMonthlyTrends([], '2026-08', 3);
      expect(emptyHistory).toHaveLength(3);
      emptyHistory.forEach((item) => {
        expect(item.totalSpend).toBe(0);
        expect(item.transactionCount).toBe(0);
        expect(item.rollingAverage).toBe(0);
      });
      expect(emptyHistory[0].momGrowthPercentage).toBeNull();
      expect(emptyHistory[1].momGrowthPercentage).toBe(0);
    });
  });

  describe('Comparative Spending Velocity (Current vs Previous Month Pacing)', () => {
    it('compares current month trajectory with previous month on the same calendar day', () => {
      const refDate = new Date('2026-08-15T12:00:00Z');
      const comp = calculateComparativeSpendingVelocity(mockExpenses, '2026-08', refDate);

      expect(comp.currentPeriod).toBe('2026-08');
      expect(comp.previousPeriod).toBe('2026-07');
      expect(comp.currentPoints).toHaveLength(31);
      expect(comp.previousPoints).toHaveLength(31);

      // On day 15:
      // In Aug: e1 (100 on day 3) + e2 (150 on day 8) + e3 (250 on day 15) = 500
      expect(comp.currentToDate).toBe(500.0);
      // In Jul: e5 (200 on day 5) + e6 (100 on day 15) = 300
      expect(comp.previousToDate).toBe(300.0);

      // Pacing %: (500 - 300) / 300 * 100 = +66.67%
      expect(comp.pacingPercentage).toBeCloseTo(66.67, 1);
    });

    it('handles empty previous month gracefully', () => {
      const comp = calculateComparativeSpendingVelocity(mockExpenses, '2026-06');
      expect(comp.previousTotal).toBe(0);
      expect(comp.currentTotal).toBe(400.0);
    });
  });

  describe('Day of Week Distribution & Weekday vs Weekend Analysis', () => {
    it('aggregates expenses across ISO days Monday (1) through Sunday (7)', () => {
      const dist = calculateDayOfWeekDistribution(mockExpenses, '2026-08');

      expect(dist.days).toHaveLength(7);
      expect(dist.totalAmount).toBe(520.0);

      // Mon (1): 100 (e1)
      const mon = dist.days.find((d) => d.dayOfWeek === 1)!;
      expect(mon.totalAmount).toBe(100.0);
      expect(mon.isWeekend).toBe(false);

      // Thu (4): 20 (e4)
      const thu = dist.days.find((d) => d.dayOfWeek === 4)!;
      expect(thu.totalAmount).toBe(20.0);
      expect(thu.isWeekend).toBe(false);

      // Sat (6): 150 (e2) + 250 (e3) = 400
      const sat = dist.days.find((d) => d.dayOfWeek === 6)!;
      expect(sat.totalAmount).toBe(400.0);
      expect(sat.isWeekend).toBe(true);
      expect(sat.transactionCount).toBe(2);
      expect(sat.averageTransaction).toBe(200.0);

      // Weekday total: 100 + 20 = 120 (23.08%)
      expect(dist.weekdayTotal).toBe(120.0);
      expect(dist.weekdayPercentage).toBeCloseTo(23.08, 1);

      // Weekend total: 400 (76.92%)
      expect(dist.weekendTotal).toBe(400.0);
      expect(dist.weekendPercentage).toBeCloseTo(76.92, 1);

      // Peak Day is Saturday
      expect(dist.peakDay?.dayKey).toBe('sat');
      expect(dist.peakDay?.totalAmount).toBe(400.0);
    });

    it('handles empty expenses without throwing', () => {
      const dist = calculateDayOfWeekDistribution([], '2026-08');
      expect(dist.days).toHaveLength(7);
      expect(dist.totalAmount).toBe(0);
      expect(dist.weekdayTotal).toBe(0);
      expect(dist.weekendTotal).toBe(0);
      expect(dist.peakDay).toBeNull();
    });
  });

  describe('Payment Method Distribution', () => {
    it('aggregates expenses by payment method with percentage and average transaction', () => {
      const methods = calculatePaymentMethodDistribution(mockExpenses, '2026-08');

      expect(methods.length).toBeGreaterThan(0);

      // Credit card: e1 (100) + e3 (250) = 350 (2 txs, avg 175)
      const cc = methods.find((m) => m.method === 'CREDIT_CARD')!;
      expect(cc.totalAmount).toBe(350.0);
      expect(cc.transactionCount).toBe(2);
      expect(cc.averageTransaction).toBe(175.0);
      expect(cc.percentage).toBeCloseTo((350 / 520) * 100, 1);

      // Debit card: e2 (150)
      const dc = methods.find((m) => m.method === 'DEBIT_CARD')!;
      expect(dc.totalAmount).toBe(150.0);

      // Cash: e4 (20)
      const cash = methods.find((m) => m.method === 'CASH')!;
      expect(cash.totalAmount).toBe(20.0);

      // Verify sorted descending
      expect(methods[0].totalAmount).toBeGreaterThanOrEqual(methods[1].totalAmount);
    });

    it('falls back to OTHER for expenses without payment_method', () => {
      const unspecExpense: Expense[] = [
        {
          id: 'u1',
          family_id: 'fam_1',
          paid_by_member_id: 'mem_1',
          category_id: 'cat_1',
          transaction_date: '2026-08-01',
          merchant_name: 'Cash Store',
          amount: 50.0,
          created_at: '2026-08-01T00:00:00Z',
        },
      ];

      const methods = calculatePaymentMethodDistribution(unspecExpense, '2026-08');
      expect(methods).toHaveLength(1);
      expect(methods[0].method).toBe('OTHER');
      expect(methods[0].totalAmount).toBe(50.0);
      expect(methods[0].percentage).toBe(100);
    });
  });
});
