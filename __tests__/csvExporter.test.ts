import { CsvExporter } from '@/services/csvExporter';
import { Expense, Category, FamilyMember } from '@/types';

describe('CsvExporter (Unit Tests)', () => {
  const exporter = new CsvExporter();

  const mockCategories: Category[] = [
    { id: 'cat_1', family_id: 'fam_1', name: 'Groceries', icon: 'ShoppingCart', color: '#10B981' },
    { id: 'cat_2', family_id: 'fam_1', name: 'Utilities', icon: 'Zap', color: '#6366F1' },
  ];

  const mockMembers: FamilyMember[] = [
    {
      id: 'mem_1',
      family_id: 'fam_1',
      display_name: 'Berto',
      role: 'ADMIN',
      color_code: '#4F46E5',
    },
  ];

  const mockExpenses: Expense[] = [
    {
      id: 'e1',
      family_id: 'fam_1',
      paid_by_member_id: 'mem_1',
      category_id: 'cat_1',
      transaction_date: '2026-08-05',
      merchant_name: 'Supermarket, Main St.',
      amount: 120.5,
      notes: 'Weekly groceries',
      payment_method: 'Credit Card',
      is_recurring: false,
      created_at: '2026-08-05T00:00:00Z',
    },
  ];

  it('generates well-formatted CSV with headers and escaped commas', () => {
    const csv = exporter.generateCsv(mockExpenses, mockCategories, mockMembers, '€');

    expect(csv).toContain(
      'Transaction ID,Date,Merchant,Amount (€),Category,Paid By,Payment Method,Is Recurring,Notes',
    );
    expect(csv).toContain('"Supermarket, Main St."');
    expect(csv).toContain('"120.50"');
    expect(csv).toContain('"Groceries"');
    expect(csv).toContain('"Berto"');
  });
});
