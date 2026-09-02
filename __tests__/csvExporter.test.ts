import { CsvExporter, csvExporter } from '@/services/csvExporter';
import { Expense, Category, FamilyMember } from '@/types';

describe('CsvExporter (Unit Tests & Edge Cases)', () => {
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
      merchant_name: 'Supermarket, "Best Deals" Main St.',
      amount: 120.5,
      notes: 'Weekly groceries & drinks',
      payment_method: 'Credit Card',
      is_recurring: true,
      created_at: '2026-08-05T00:00:00Z',
    },
    {
      id: 'e2',
      family_id: 'fam_1',
      paid_by_member_id: 'unknown_mem',
      category_id: 'unknown_cat',
      transaction_date: '2026-08-06',
      merchant_name: 'Corner Bakery',
      amount: 5.0,
      is_recurring: false,
      created_at: '2026-08-06T00:00:00Z',
    },
  ];

  it('generates well-formatted CSV with headers, escaped double quotes and commas', () => {
    const csv = exporter.generateCsv(mockExpenses, mockCategories, mockMembers, '€');

    expect(csv).toContain(
      'Transaction ID,Date,Merchant,Amount (€),Category,Paid By,Payment Method,Is Recurring,Notes',
    );
    expect(csv).toContain('"Supermarket, ""Best Deals"" Main St."');
    expect(csv).toContain('"120.50"');
    expect(csv).toContain('"Groceries"');
    expect(csv).toContain('"Berto"');
    expect(csv).toContain('"Yes"');
  });

  it('falls back to "Uncategorized", "Family", and "Standard" when IDs or methods are missing', () => {
    const csv = exporter.generateCsv([mockExpenses[1]], mockCategories, mockMembers, '$');
    expect(csv).toContain('"Uncategorized"');
    expect(csv).toContain('"Family"');
    expect(csv).toContain('"Standard"');
    expect(csv).toContain('"No"');
    expect(csv).toContain('""'); // empty notes
  });

  it('handles empty expense list returning only header row', () => {
    const csv = exporter.generateCsv([], mockCategories, mockMembers, 'CHF');
    const lines = csv.split('\n');
    expect(lines).toHaveLength(1);
    expect(lines[0]).toBe(
      'Transaction ID,Date,Merchant,Amount (CHF),Category,Paid By,Payment Method,Is Recurring,Notes',
    );
  });

  it('executes downloadCsv without throwing in simulated DOM environment', () => {
    const originalDocument = (globalThis as any).document;
    const clickMock = jest.fn();
    const appendMock = jest.fn();
    const removeMock = jest.fn();

    (globalThis as any).document = {
      createElement: jest.fn(() => ({
        href: '',
        setAttribute: jest.fn(),
        click: clickMock,
      })),
      body: {
        appendChild: appendMock,
        removeChild: removeMock,
      },
    };

    (globalThis as any).URL = {
      createObjectURL: jest.fn(() => 'blob://test'),
    };

    expect(() => {
      csvExporter.downloadCsv('sample,csv,data', 'export.csv');
    }).not.toThrow();

    expect(clickMock).toHaveBeenCalled();
    (globalThis as any).document = originalDocument;
  });
});
