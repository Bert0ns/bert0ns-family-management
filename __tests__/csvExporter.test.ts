import { CsvExporter } from '@/services/csvExporter';
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
      notes: undefined,
      is_recurring: false,
      created_at: '2026-08-06T00:00:00Z',
    },
    {
      id: 'e3_null',
      family_id: 'fam_1',
      paid_by_member_id: 'mem_1',
      category_id: 'cat_1',
      transaction_date: '2026-08-06',
      merchant_name: 'Corner Shop',
      amount: 12.0,
      notes: null as any,
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
    const csv = exporter.generateCsv([mockExpenses[1]], mockCategories, mockMembers, '€');
    expect(csv).toContain('"Uncategorized"');
    expect(csv).toContain('"Family"');
    expect(csv).toContain('"Standard"');
    expect(csv).toContain('"No"');
    expect(csv).toContain('""'); // undefined notes
  });

  it('neutralizes CSV formula injection characters (CWE-1236)', () => {
    const injectionExpenses: Expense[] = [
      {
        id: 'e3',
        family_id: 'fam_1',
        paid_by_member_id: 'mem_1',
        category_id: 'cat_1',
        transaction_date: '2026-08-07',
        merchant_name: '=cmd|calc!A0',
        amount: 10.0,
        notes: '+123456',
        payment_method: '-test',
        is_recurring: false,
        created_at: '2026-08-07T00:00:00Z',
      },
      {
        id: 'e4',
        family_id: 'fam_1',
        paid_by_member_id: 'mem_1',
        category_id: 'cat_1',
        transaction_date: '2026-08-08',
        merchant_name: '@admin',
        amount: 20.0,
        notes: '\ttabbed',
        payment_method: '\rcarriage',
        is_recurring: false,
        created_at: '2026-08-08T00:00:00Z',
      },
      {
        id: 'e5',
        family_id: 'fam_1',
        paid_by_member_id: 'mem_1',
        category_id: 'cat_1',
        transaction_date: '2026-08-09',
        merchant_name: '|pipecommand',
        amount: 30.0,
        notes: '%SystemRoot%\\notepad.exe',
        payment_method: 'Standard',
        is_recurring: false,
        created_at: '2026-08-09T00:00:00Z',
      },
    ];

    const csv = exporter.generateCsv(injectionExpenses, mockCategories, mockMembers, '€');
    expect(csv).toContain('"\'=cmd|calc!A0"');
    expect(csv).toContain('"\'+123456"');
    expect(csv).toContain('"\'-test"');
    expect(csv).toContain('"\'@admin"');
    expect(csv).toContain('"\'\ttabbed"');
    expect(csv).toContain('"\'\rcarriage"');
    expect(csv).toContain('"\'|pipecommand"');
    expect(csv).toContain('"\'%SystemRoot%\\notepad.exe"');
  });

  it('neutralizes formula injection characters disguised with leading whitespace, tabs, and BOMs', () => {
    const hiddenInjections: Expense[] = [
      {
        id: 'h1',
        family_id: 'fam_1',
        paid_by_member_id: 'mem_1',
        category_id: 'cat_1',
        transaction_date: '2026-08-10',
        merchant_name: '   =cmd|calc!A0',
        amount: 15.0,
        notes: '\t+formula',
        payment_method: '  -dangerous',
        is_recurring: false,
        created_at: '2026-08-10T00:00:00Z',
      },
      {
        id: 'h2',
        family_id: 'fam_1',
        paid_by_member_id: 'mem_1',
        category_id: 'cat_1',
        transaction_date: '2026-08-11',
        merchant_name: '\uFEFF=1+1',
        amount: 25.0,
        notes: '   |malicious_pipe',
        payment_method: '   %TEMP%',
        is_recurring: false,
        created_at: '2026-08-11T00:00:00Z',
      },
      {
        id: 'h3',
        family_id: 'fam_1',
        paid_by_member_id: 'mem_1',
        category_id: 'cat_1',
        transaction_date: '2026-08-12',
        merchant_name: '  @SUM(A1:A5)',
        amount: 35.0,
        notes: '  Regular note with leading spaces',
        payment_method: 'Standard',
        is_recurring: false,
        created_at: '2026-08-12T00:00:00Z',
      },
    ];

    const csv = exporter.generateCsv(hiddenInjections, mockCategories, mockMembers, '€');
    // Leading spaces before =
    expect(csv).toContain('"\'   =cmd|calc!A0"');
    // Leading tab before +
    expect(csv).toContain('"\'\t+formula"');
    // Leading spaces before -
    expect(csv).toContain('"\'  -dangerous"');
    // Leading BOM before =
    expect(csv).toContain('"\'\uFEFF=1+1"');
    // Leading spaces before |
    expect(csv).toContain('"\'   |malicious_pipe"');
    // Leading spaces before %
    expect(csv).toContain('"\'   %TEMP%"');
    // Leading spaces before @
    expect(csv).toContain('"\'  @SUM(A1:A5)"');
    // Harmless text with leading spaces should NOT be prepended with a quote
    expect(csv).toContain('"  Regular note with leading spaces"');
  });

  it('handles empty expense list returning only header row', () => {
    const csv = exporter.generateCsv([], mockCategories, mockMembers, '€');
    const lines = csv.split('\n');
    expect(lines).toHaveLength(1);
    expect(lines[0]).toBe(
      'Transaction ID,Date,Merchant,Amount (€),Category,Paid By,Payment Method,Is Recurring,Notes',
    );
  });
});
