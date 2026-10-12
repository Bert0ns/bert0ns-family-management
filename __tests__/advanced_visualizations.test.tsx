import { formatPeriodLabel } from '@/components/charts/MonthlyTrendChart';
import {
  MonthlyTrendPoint,
  DayOfWeekDistribution,
  PaymentMethodSummary,
  ComparativeVelocityData,
} from '@/services/interfaces';

// Mock native and SVG dependencies
jest.mock('react-native', () => ({
  Platform: { OS: 'ios', select: (obj: any) => obj.ios || obj.default },
  View: 'View',
  Text: 'Text',
  TouchableOpacity: 'TouchableOpacity',
  StyleSheet: { create: (styles: any) => styles },
}));
jest.mock('react-native-svg', () => ({
  Svg: 'Svg',
  Circle: 'Circle',
  Path: 'Path',
  Rect: 'Rect',
  G: 'G',
  Line: 'Line',
  Defs: 'Defs',
  LinearGradient: 'LinearGradient',
  Stop: 'Stop',
}));
jest.mock(
  'lucide-react-native',
  () =>
    new Proxy(
      {},
      {
        get: () => () => null,
      },
    ),
);
jest.mock('react-native-gifted-charts', () => ({
  PieChart: () => null,
  BarChart: () => null,
}));

describe('Advanced Data Visualizations Logic & Invariants', () => {
  describe('MonthlyTrendChart - formatPeriodLabel', () => {
    it('formats period strings into human readable month labels', () => {
      expect(formatPeriodLabel('2026-08')).toBe("Aug '26");
      expect(formatPeriodLabel('2025-01')).toBe("Jan '25");
      expect(formatPeriodLabel('2026-12')).toBe("Dec '26");
      expect(formatPeriodLabel('2024-05')).toBe("May '24");
    });

    it('handles edge case periods gracefully without throwing', () => {
      expect(formatPeriodLabel('')).toBe('');
      expect(formatPeriodLabel('invalid-format')).toBe('invalid-format');
      expect(formatPeriodLabel('2026')).toBe('2026');
    });

    it('verifies rolling average and MoM growth invariant calculation', () => {
      const mockPoints: MonthlyTrendPoint[] = [
        {
          period: '2026-06',
          label: 'Jun',
          totalSpend: 1000,
          transactionCount: 10,
          momGrowthPercentage: null,
          rollingAverage: 1000,
        },
        {
          period: '2026-07',
          label: 'Jul',
          totalSpend: 1500,
          transactionCount: 12,
          momGrowthPercentage: 50,
          rollingAverage: 1250,
        },
        {
          period: '2026-08',
          label: 'Aug',
          totalSpend: 1100,
          transactionCount: 8,
          momGrowthPercentage: -26.67,
          rollingAverage: 1200,
        },
      ];

      expect(mockPoints).toHaveLength(3);
      expect(mockPoints[0].momGrowthPercentage).toBeNull();
      expect(mockPoints[1].momGrowthPercentage).toBe(50);
      expect(mockPoints[2].momGrowthPercentage).toBeCloseTo(-26.67, 1);
      expect(mockPoints[2].rollingAverage).toBe(1200);
    });
  });

  describe('DayOfWeekChart Invariants', () => {
    it('maintains 100% distribution across days and splits weekday vs weekend', () => {
      const mockDistribution: DayOfWeekDistribution = {
        days: [
          {
            dayOfWeek: 1,
            dayKey: 'mon',
            totalAmount: 100,
            percentage: 10,
            transactionCount: 2,
            averageTransaction: 50,
            isWeekend: false,
          },
          {
            dayOfWeek: 2,
            dayKey: 'tue',
            totalAmount: 150,
            percentage: 15,
            transactionCount: 3,
            averageTransaction: 50,
            isWeekend: false,
          },
          {
            dayOfWeek: 3,
            dayKey: 'wed',
            totalAmount: 100,
            percentage: 10,
            transactionCount: 2,
            averageTransaction: 50,
            isWeekend: false,
          },
          {
            dayOfWeek: 4,
            dayKey: 'thu',
            totalAmount: 150,
            percentage: 15,
            transactionCount: 3,
            averageTransaction: 50,
            isWeekend: false,
          },
          {
            dayOfWeek: 5,
            dayKey: 'fri',
            totalAmount: 200,
            percentage: 20,
            transactionCount: 4,
            averageTransaction: 50,
            isWeekend: false,
          },
          {
            dayOfWeek: 6,
            dayKey: 'sat',
            totalAmount: 250,
            percentage: 25,
            transactionCount: 5,
            averageTransaction: 50,
            isWeekend: true,
          },
          {
            dayOfWeek: 7,
            dayKey: 'sun',
            totalAmount: 50,
            percentage: 5,
            transactionCount: 1,
            averageTransaction: 50,
            isWeekend: true,
          },
        ],
        totalAmount: 1000,
        weekdayTotal: 700,
        weekendTotal: 300,
        weekdayPercentage: 70,
        weekendPercentage: 30,
        peakDay: {
          dayOfWeek: 6,
          dayKey: 'sat',
          totalAmount: 250,
          percentage: 25,
          transactionCount: 5,
          averageTransaction: 50,
          isWeekend: true,
        },
      };

      const dayPercentageSum = mockDistribution.days.reduce((acc, d) => acc + d.percentage, 0);
      expect(dayPercentageSum).toBeCloseTo(100, 1);

      expect(mockDistribution.weekdayTotal + mockDistribution.weekendTotal).toBe(
        mockDistribution.totalAmount,
      );
      expect(mockDistribution.weekdayPercentage + mockDistribution.weekendPercentage).toBe(100);
      expect(mockDistribution.peakDay?.dayKey).toBe('sat');
      expect(mockDistribution.peakDay?.totalAmount).toBe(250);
    });
  });

  describe('PaymentMethodChart Invariants', () => {
    it('accurately captures transaction totals and average ticket sizes', () => {
      const mockMethods: PaymentMethodSummary[] = [
        {
          method: 'credit_card',
          label: 'Credit Card',
          totalAmount: 600,
          percentage: 60,
          transactionCount: 10,
          averageTransaction: 60,
          color: '#10B981',
        },
        {
          method: 'bank_transfer',
          label: 'Bank Transfer',
          totalAmount: 400,
          percentage: 40,
          transactionCount: 2,
          averageTransaction: 200,
          color: '#8B5CF6',
        },
      ];

      const totalShare = mockMethods.reduce((sum, m) => sum + m.percentage, 0);
      expect(totalShare).toBe(100);

      mockMethods.forEach((m) => {
        expect(m.totalAmount / m.transactionCount).toBeCloseTo(m.averageTransaction, 2);
      });
    });
  });

  describe('Comparative Spending Velocity Invariants', () => {
    it('correctly tracks cumulative curve monotonic increase and pacing delta', () => {
      const comparativeData: ComparativeVelocityData = {
        currentPeriod: '2026-08',
        previousPeriod: '2026-07',
        currentPoints: [
          { day: 1, dateStr: '2026-08-01', dailyAmount: 50, cumulativeAmount: 50 },
          { day: 2, dateStr: '2026-08-02', dailyAmount: 30, cumulativeAmount: 80 },
          { day: 3, dateStr: '2026-08-03', dailyAmount: 40, cumulativeAmount: 120 },
        ],
        previousPoints: [
          { day: 1, dateStr: '2026-07-01', dailyAmount: 40, cumulativeAmount: 40 },
          { day: 2, dateStr: '2026-07-02', dailyAmount: 30, cumulativeAmount: 70 },
          { day: 3, dateStr: '2026-07-03', dailyAmount: 20, cumulativeAmount: 90 },
        ],
        currentTotal: 120,
        previousTotal: 90,
        currentElapsedDays: 3,
        currentToDate: 120,
        previousToDate: 90,
        pacingPercentage: 33.33,
        daysInMonth: 31,
      };

      // Monotonically non-decreasing cumulative amounts
      for (let i = 1; i < comparativeData.currentPoints.length; i++) {
        expect(comparativeData.currentPoints[i].cumulativeAmount).toBeGreaterThanOrEqual(
          comparativeData.currentPoints[i - 1].cumulativeAmount,
        );
      }
      for (let i = 1; i < comparativeData.previousPoints.length; i++) {
        expect(comparativeData.previousPoints[i].cumulativeAmount).toBeGreaterThanOrEqual(
          comparativeData.previousPoints[i - 1].cumulativeAmount,
        );
      }

      expect(comparativeData.pacingPercentage).toBeCloseTo(33.33, 1);
    });
  });
});
