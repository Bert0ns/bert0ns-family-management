import { DuplicateDetector } from '@/services/duplicateDetector';
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
});
