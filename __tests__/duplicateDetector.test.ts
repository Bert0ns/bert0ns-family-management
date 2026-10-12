import { DuplicateDetector, duplicateDetector } from '@/services/duplicateDetector';
import { Expense, RawExpenseItem } from '@/types';

describe('DuplicateDetector (Unit Tests)', () => {
  const detector = new DuplicateDetector();

  const existingExpenses: Expense[] = [
    {
      id: 'e1',
      family_id: 'fam_1',
      paid_by_member_id: 'mem_1',
      category_id: 'cat_1',
      transaction_date: '2026-08-15',
      merchant_name: 'Trader Joe’s Market',
      amount: 84.5,
      created_at: '2026-08-15T00:00:00Z',
    },
    {
      id: 'e2',
      family_id: 'fam_1',
      paid_by_member_id: 'mem_2',
      category_id: 'cat_2',
      transaction_date: '2026-08-20',
      merchant_name: 'Shell Gas Station',
      amount: 45.0,
      created_at: '2026-08-20T00:00:00Z',
    },
  ];

  it('detects an exact duplicate transaction', () => {
    const candidate: RawExpenseItem = {
      date: '2026-08-15',
      merchant: 'Trader Joe’s Market',
      amount: 84.5,
      category: 'Groceries',
      is_recurring: false,
    };

    const result = detector.checkDuplicate(candidate, existingExpenses);
    expect(result.isDuplicate).toBe(true);
    expect(result.matchedExpenseId).toBe('e1');
  });

  it('detects a duplicate with minor casing or whitespace differences', () => {
    const candidate: RawExpenseItem = {
      date: '2026-08-20',
      merchant: '  shell gas station  ',
      amount: 45.0,
      category: 'Transportation',
      is_recurring: false,
    };

    const result = detector.checkDuplicate(candidate, existingExpenses);
    expect(result.isDuplicate).toBe(true);
    expect(result.matchedExpenseId).toBe('e2');
  });

  it('detects fuzzy match when one merchant prefix contains the other', () => {
    const candidate: RawExpenseItem = {
      date: '2026-08-15',
      merchant: 'Trader Joe’s',
      amount: 84.5,
      category: 'Groceries',
      is_recurring: false,
    };

    const result = detector.checkDuplicate(candidate, existingExpenses);
    expect(result.isDuplicate).toBe(true);
    expect(result.matchedExpenseId).toBe('e1');
  });

  it('returns false when multi-word merchants do not share prefix', () => {
    const candidate: RawExpenseItem = {
      date: '2026-08-15',
      merchant: 'Whole Foods Market',
      amount: 84.5,
      category: 'Groceries',
      is_recurring: false,
    };

    const result = detector.checkDuplicate(candidate, existingExpenses);
    expect(result.isDuplicate).toBe(false);
  });

  it('returns false when date does not match', () => {
    const candidate: RawExpenseItem = {
      date: '2026-08-16', // different date
      merchant: 'Trader Joe’s Market',
      amount: 84.5,
      category: 'Groceries',
      is_recurring: false,
    };

    const result = detector.checkDuplicate(candidate, existingExpenses);
    expect(result.isDuplicate).toBe(false);
  });

  it('returns false when amount differs', () => {
    const candidate: RawExpenseItem = {
      date: '2026-08-15',
      merchant: 'Trader Joe’s Market',
      amount: 90.0, // different amount
      category: 'Groceries',
      is_recurring: false,
    };

    const result = detector.checkDuplicate(candidate, existingExpenses);
    expect(result.isDuplicate).toBe(false);
  });

  it('checks batch duplicates efficiently across multiple items', () => {
    const batchCandidates: RawExpenseItem[] = [
      {
        date: '2026-08-15',
        merchant: 'Trader Joe’s Market',
        amount: 84.5,
        category: 'Groceries',
        is_recurring: false,
      },
      {
        date: '2026-08-22',
        merchant: 'Bookstore',
        amount: 15.0,
        category: 'Education',
        is_recurring: false,
      },
    ];

    const results = detector.checkBatchDuplicates(batchCandidates, existingExpenses);
    expect(results).toHaveLength(2);
    expect(results[0].isDuplicate).toBe(true);
    expect(results[0].matchedExpenseId).toBe('e1');
    expect(results[1].isDuplicate).toBe(false);

    // Empty batch check
    const emptyResults = detector.checkBatchDuplicates([], existingExpenses);
    expect(emptyResults).toHaveLength(0);
  });

  it('handles empty merchant strings and export singleton correctly', () => {
    expect(detector.normalizeMerchant('')).toBe('');
    expect(detector.isMerchantMatch('', 'test')).toBe(false);
    expect(detector.isMerchantMatch('test', '')).toBe(false);
    expect(duplicateDetector).toBeInstanceOf(DuplicateDetector);
  });

  it('normalizes European accented letters without losing characters', () => {
    expect(detector.normalizeMerchant('Cafè')).toBe('cafe');
    expect(detector.normalizeMerchant('Crédit Agricole')).toBe('credit agricole');
    expect(detector.normalizeMerchant('Lidl Müller')).toBe('lidl muller');
    expect(detector.normalizeMerchant('München Hbf')).toBe('munchen hbf');

    expect(detector.isMerchantMatch('Cafè', 'Cafe')).toBe(true);
    expect(detector.isMerchantMatch('Crédit Agricole', 'Credit Agricole')).toBe(true);
    expect(detector.isMerchantMatch('Lidl Müller', 'Lidl Muller')).toBe(true);
  });

  it('does not falsely flag distinct merchants sharing a single word prefix', () => {
    expect(detector.isMerchantMatch('Target', 'Target Optical')).toBe(false);
    expect(detector.isMerchantMatch('Target Optical', 'Target')).toBe(false);
    expect(detector.isMerchantMatch('Shell', 'Shell Gas Station')).toBe(false);
    expect(detector.isMerchantMatch('Target Optics', 'Target Optic Store')).toBe(false);
  });

  it('detects duplicates within the same import batch (intra-batch collisions)', () => {
    const batchWithInternalDuplicates: RawExpenseItem[] = [
      {
        date: '2026-09-01',
        merchant: 'Carrefour Express',
        amount: 25.5,
        category: 'Groceries',
        is_recurring: false,
      },
      {
        date: '2026-09-01',
        merchant: 'Carrefour Express',
        amount: 25.5,
        category: 'Groceries',
        is_recurring: false,
      },
      {
        date: '2026-09-01',
        merchant: 'Carrefour Express',
        amount: 25.5,
        category: 'Groceries',
        is_recurring: false,
      },
    ];

    const results = detector.checkBatchDuplicates(batchWithInternalDuplicates, []);
    expect(results).toHaveLength(3);
    // First occurrence is not a duplicate
    expect(results[0].isDuplicate).toBe(false);

    // Second occurrence is flagged as duplicate of item 1
    expect(results[1].isDuplicate).toBe(true);
    expect(results[1].matchedExpenseId).toBe('batch_item_0');
    expect(results[1].matchReason).toContain('Matches item #1 in this import batch');

    // Third occurrence is also flagged as duplicate of item 1
    expect(results[2].isDuplicate).toBe(true);
    expect(results[2].matchedExpenseId).toBe('batch_item_0');
    expect(results[2].matchReason).toContain('Matches item #1 in this import batch');
  });
});
