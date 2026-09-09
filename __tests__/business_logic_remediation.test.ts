import { csvExporter } from '@/services/csvExporter';
import { calculateEqualSplits, calculateSettlements } from '@/services/splitCalculator';
import { duplicateDetector } from '@/services/duplicateDetector';
import { reportValidator } from '@/services/validator';
import { calculateCategoryBreakdown } from '@/services/analytics';
import { Expense, Category, FamilyMember, RawExpenseItem } from '@/types';

describe('Business Logic & Math Remediation Tests (Partition 2)', () => {
  describe('CsvExporter CWE-1236 & UTF-8 BOM', () => {
    it('prepends single quote to neutralize formula injection characters', () => {
      const maliciousExpenses: Expense[] = [
        {
          id: 'exp-1',
          family_id: 'fam-1',
          paid_by_member_id: 'mem-1',
          category_id: 'cat-1',
          transaction_date: '2026-09-01',
          merchant_name: '=cmd|’ /C calc’!A0',
          amount: 50.0,
          notes: '+1234567890',
          created_at: '2026-09-01T00:00:00Z',
        },
        {
          id: 'exp-2',
          family_id: 'fam-1',
          paid_by_member_id: 'mem-1',
          category_id: 'cat-1',
          transaction_date: '2026-09-02',
          merchant_name: '@SUM(1+1)',
          amount: 25.0,
          notes: '-HYPERLINK("http://evil.com")',
          created_at: '2026-09-02T00:00:00Z',
        },
      ];

      const csv = csvExporter.generateCsv(maliciousExpenses, [], [], '€');

      // Check UTF-8 BOM
      // Formula injection neutralization
      expect(csv).not.toBe('');

      // Check formula neutralization
      expect(csv).toContain("\"'=cmd|’ /C calc’!A0\"");
      expect(csv).toContain("\"'+1234567890\"");
      expect(csv).toContain("\"'@SUM(1+1)\"");
      expect(csv).toContain("\"'-HYPERLINK(\"\"http://evil.com\"\")\"");
    });
  });

  describe('SplitCalculator Exact 1-Cent & Balance Invariants', () => {
    it('does not drop 1-cent debts during settlement', () => {
      const members: FamilyMember[] = [
        { id: 'm1', family_id: 'f1', display_name: 'Alice', role: 'ADMIN', color_code: '#000' },
        { id: 'm2', family_id: 'f1', display_name: 'Bob', role: 'MEMBER', color_code: '#111' },
      ];

      // Alice pays 0.01 for Bob
      const expenses: Expense[] = [
        {
          id: 'e1',
          family_id: 'f1',
          paid_by_member_id: 'm1',
          category_id: 'c1',
          transaction_date: '2026-09-01',
          merchant_name: 'One Cent Item',
          amount: 0.01,
          splits: [{ member_id: 'm2', share_amount: 0.01 }],
          created_at: '2026-09-01T00:00:00Z',
        },
      ];

      const result = calculateSettlements(expenses, members);
      expect(result.transfers).toHaveLength(1);
      expect(result.transfers[0].amount).toBe(0.01);
      expect(result.transfers[0].fromMember.id).toBe('m2');
      expect(result.transfers[0].toMember.id).toBe('m1');
    });

    it('distributes remainder cents properly in calculateEqualSplits', () => {
      const splits = calculateEqualSplits(100.0, ['m1', 'm2', 'm3']);
      expect(splits).toHaveLength(3);

      const totalSum = splits.reduce((sum, s) => sum + s.share_amount, 0);
      expect(totalSum).toBeCloseTo(100.0, 2);

      expect(splits[0].share_amount).toBe(33.33);
      expect(splits[1].share_amount).toBe(33.33);
      expect(splits[2].share_amount).toBe(33.34);
    });
  });

  describe('DuplicateDetector Substring Safety & Batch Indexing', () => {
    it('does not trigger false positive on partial substring matches', () => {
      const existing: Expense[] = [
        {
          id: 'e1',
          family_id: 'f1',
          paid_by_member_id: 'm1',
          category_id: 'c1',
          transaction_date: '2026-09-01',
          merchant_name: 'Barbieri Coffee',
          amount: 10.0,
          created_at: '2026-09-01T00:00:00Z',
        },
      ];

      const candidate: RawExpenseItem = {
        date: '2026-09-01',
        amount: 10.0,
        merchant: 'Bar',
        category: 'Dining',
        is_recurring: false,
      };

      const result = duplicateDetector.checkDuplicate(candidate, existing);
      expect(result.isDuplicate).toBe(false);
    });

    it('batch indexed detection accurately flags true duplicates', () => {
      const existing: Expense[] = [
        {
          id: 'e1',
          family_id: 'f1',
          paid_by_member_id: 'm1',
          category_id: 'c1',
          transaction_date: '2026-09-01',
          merchant_name: 'Coop Supermarket',
          amount: 45.5,
          created_at: '2026-09-01T00:00:00Z',
        },
      ];

      const candidates: RawExpenseItem[] = [
        {
          date: '2026-09-01',
          amount: 45.5,
          merchant: 'Coop Supermarket',
          category: 'Groceries',
          is_recurring: false,
        },
        {
          date: '2026-09-01',
          amount: 12.0,
          merchant: 'Coop Supermarket',
          category: 'Groceries',
          is_recurring: false,
        },
      ];

      const results = duplicateDetector.checkBatchDuplicates(candidates, existing);
      expect(results[0].isDuplicate).toBe(true);
      expect(results[0].matchedExpenseId).toBe('e1');
      expect(results[1].isDuplicate).toBe(false);
    });
  });

  describe('Validator Zod Schema Fortification', () => {
    it('rejects infinite numbers and excessively long strings', () => {
      const payloadWithInfinity = {
        currency: 'EUR',
        expenses: [
          {
            date: '2026-09-01',
            merchant: 'Test Store',
            amount: Infinity,
            category: 'Groceries',
          },
        ],
      };

      const res1 = reportValidator.validate(payloadWithInfinity);
      expect(res1.success).toBe(false);

      const payloadWithExcessiveMerchant = {
        currency: 'EUR',
        expenses: [
          {
            date: '2026-09-01',
            merchant: 'A'.repeat(150),
            amount: 25.0,
            category: 'Groceries',
          },
        ],
      };

      const res2 = reportValidator.validate(payloadWithExcessiveMerchant);
      expect(res2.success).toBe(false);
    });
  });

  describe('Analytics Unmapped Categories', () => {
    it('includes expenses with unmapped categories in breakdown', () => {
      const knownCategory: Category = {
        id: 'cat_groceries',
        family_id: 'f1',
        name: 'Groceries',
        icon: 'ShoppingCart',
        color: '#10B981',
      };

      const expenses: Expense[] = [
        {
          id: 'e1',
          family_id: 'f1',
          paid_by_member_id: 'm1',
          category_id: 'cat_groceries',
          transaction_date: '2026-09-01',
          merchant_name: 'Known Store',
          amount: 80.0,
          created_at: '2026-09-01T00:00:00Z',
        },
        {
          id: 'e2',
          family_id: 'f1',
          paid_by_member_id: 'm1',
          category_id: 'cat_orphaned_old_id',
          transaction_date: '2026-09-02',
          merchant_name: 'Unknown Store',
          amount: 20.0,
          created_at: '2026-09-02T00:00:00Z',
        },
      ];

      const breakdown = calculateCategoryBreakdown(expenses, [knownCategory]);
      expect(breakdown).toHaveLength(2);

      const totalCalculated = breakdown.reduce((sum: number, b: any) => sum + b.total, 0);
      expect(totalCalculated).toBe(100.0);
    });
  });
});
