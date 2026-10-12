import { computeCategoryPieSlices } from '@/components/charts/CategoryPieChart';
import { parseSafePeriod } from '@/components/charts/HeatmapCalendar';
import { CategorySummary } from '@/services/analytics';

// Mock native and SVG dependencies
jest.mock('react-native-svg', () => ({
  Svg: 'Svg',
  Circle: 'Circle',
  Path: 'Path',
  Rect: 'Rect',
  G: 'G',
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

describe('CategoryPieChart Slicing Invariants & Heatmap Parsing', () => {
  const createMockCategorySummary = (
    id: string,
    name: string,
    total: number,
    percentage: number,
  ): CategorySummary => ({
    category: {
      id,
      family_id: 'fam_1',
      name,
      icon: 'Tag',
      color: '#10B981',
      is_default: false,
      created_at: '2026-01-01',
    },
    total,
    percentage,
    transactionCount: 2,
  });

  describe('CategoryPieChart Slicing Invariants', () => {
    it('returns empty slices when data is empty or totalSpend is zero', () => {
      expect(computeCategoryPieSlices([], 0)).toEqual([]);
      expect(computeCategoryPieSlices([createMockCategorySummary('1', 'Cat1', 0, 0)], 0)).toEqual(
        [],
      );
    });

    it('keeps all categories individual when count is <= 5', () => {
      const data: CategorySummary[] = [
        createMockCategorySummary('1', 'Groceries', 50, 50),
        createMockCategorySummary('2', 'Utilities', 30, 30),
        createMockCategorySummary('3', 'Dining', 20, 20),
      ];
      const slices = computeCategoryPieSlices(data, 100);

      expect(slices).toHaveLength(3);
      expect(slices.some((s) => s.isOther)).toBe(false);
      expect(slices[0].category.id).toBe('1');
      expect(slices[0].value).toBe(50);
      expect(slices[1].category.id).toBe('2');
      expect(slices[1].value).toBe(30);
      expect(slices[2].category.id).toBe('3');
      expect(slices[2].value).toBe(20);

      const sumValues = slices.reduce((sum, s) => sum + s.value, 0);
      expect(sumValues).toBe(100);
    });

    it('aggregates slices beyond top 5 into a single "Other" slice ensuring 100% sum invariant', () => {
      // 8 categories total
      const data: CategorySummary[] = [
        createMockCategorySummary('1', 'Groceries', 40, 40),
        createMockCategorySummary('2', 'Housing', 25, 25),
        createMockCategorySummary('3', 'Transport', 15, 15),
        createMockCategorySummary('4', 'Health', 10, 10),
        createMockCategorySummary('5', 'Entertainment', 5, 5),
        createMockCategorySummary('6', 'Subscriptions', 3, 3),
        createMockCategorySummary('7', 'Shopping', 1.5, 1.5),
        createMockCategorySummary('8', 'Miscellaneous', 0.5, 0.5),
      ];

      const totalSpend = data.reduce((sum, item) => sum + item.total, 0);
      expect(totalSpend).toBe(100);

      const slices = computeCategoryPieSlices(data, totalSpend, {
        otherLabel: 'Other',
        otherColor: '#94A3B8',
      });

      // Top 5 + 1 "Other" = 6 slices
      expect(slices).toHaveLength(6);

      // Verify top 5
      for (let i = 0; i < 5; i++) {
        expect(slices[i].category.id).toBe(data[i].category.id);
        expect(slices[i].value).toBe(data[i].total);
        expect(slices[i].isOther).toBe(false);
      }

      // Verify "Other" slice
      const otherSlice = slices[5];
      expect(otherSlice.isOther).toBe(true);
      expect(otherSlice.category.name).toBe('Other');
      expect(otherSlice.category.id).toBe('other');
      expect(otherSlice.value).toBe(5); // 3 + 1.5 + 0.5
      expect(otherSlice.percentage).toBeCloseTo(5);
      expect(otherSlice.color).toBe('#94A3B8');

      // Verify invariant: slice values sum to total spend (360 degrees full donut)
      const sumValues = slices.reduce((sum, s) => sum + s.value, 0);
      expect(sumValues).toBe(totalSpend);
    });

    it('handles interaction callback on selection', () => {
      const data: CategorySummary[] = [
        createMockCategorySummary('1', 'Groceries', 50, 50),
        createMockCategorySummary('2', 'Utilities', 50, 50),
      ];
      let selectedCatId: string | null = null;
      let selectedIdx: number | null = null;

      const slices = computeCategoryPieSlices(data, 100, {
        selectedIndex: 0,
        onSelectCategory: (id) => {
          selectedCatId = id;
        },
        onSelectIndex: (idx) => {
          selectedIdx = idx;
        },
      });

      expect(slices[0].focused).toBe(true);
      expect(slices[1].focused).toBe(false);

      // Clicking on selected index toggles to null
      slices[0].onPress?.();
      expect(selectedIdx).toBeNull();
      expect(selectedCatId).toBe('1');
    });
  });

  describe('Safe Heatmap Period Parsing', () => {
    it('safely parses valid YYYY-MM period strings', () => {
      const parsed = parseSafePeriod('2026-08');
      expect(parsed.year).toBe(2026);
      expect(parsed.month).toBe(8);
      expect(parsed.daysInMonth).toBe(31);
      expect(parsed.adjustedFirstDay).toBeGreaterThanOrEqual(0);
      expect(parsed.adjustedFirstDay).toBeLessThanOrEqual(6);
    });

    it('gracefully handles invalid period strings without throwing RangeError', () => {
      const invalidPeriods = [
        '',
        '   ',
        'invalid',
        '2026-13',
        '2026-00',
        'undefined',
        null as any,
        undefined,
      ];

      invalidPeriods.forEach((invalid) => {
        expect(() => {
          const result = parseSafePeriod(invalid);
          expect(result.daysInMonth).toBeGreaterThanOrEqual(1);
          expect(result.daysInMonth).toBeLessThanOrEqual(31);
          expect(result.adjustedFirstDay).toBeGreaterThanOrEqual(0);
          expect(result.adjustedFirstDay).toBeLessThanOrEqual(6);
          // Ensure Array.from length never throws RangeError
          expect(Array.from({ length: result.adjustedFirstDay })).toBeDefined();
          expect(Array.from({ length: result.daysInMonth })).toBeDefined();
        }).not.toThrow();
      });
    });
  });
});
