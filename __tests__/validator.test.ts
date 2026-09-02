import { ReportValidator } from '@/services/validator';
import { SAMPLE_IMPORT_REPORT } from '@/data/mockData';

describe('ReportValidator (Zod Schema Validation Tests)', () => {
  const validator = new ReportValidator();

  it('validates a valid sample expense report', () => {
    const result = validator.validate(SAMPLE_IMPORT_REPORT);

    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
    expect(result.data?.expenses).toHaveLength(5);
    expect(result.data?.currency).toBe('€');
  });

  it('rejects an empty expense report with no expenses', () => {
    const invalidReport = {
      report_title: 'Empty Report',
      expenses: [],
    };

    const result = validator.validate(invalidReport);
    expect(result.success).toBe(false);
    expect(result.error).toContain('At least one expense is required');
  });

  it('rejects reports with invalid date format (must be YYYY-MM-DD)', () => {
    const invalidReport = {
      expenses: [
        {
          date: '08/23/2026', // invalid format
          merchant: 'Store',
          amount: 45.0,
        },
      ],
    };

    const result = validator.validate(invalidReport);
    expect(result.success).toBe(false);
    expect(result.error).toContain('Date must be in YYYY-MM-DD format');
  });

  it('rejects reports with non-positive or negative amounts', () => {
    const invalidReport = {
      expenses: [
        {
          date: '2026-08-23',
          merchant: 'Store',
          amount: -15.5,
        },
      ],
    };

    const result = validator.validate(invalidReport);
    expect(result.success).toBe(false);
    expect(result.error).toContain('Amount must be greater than 0');
  });

  it('rejects reports with empty merchant name', () => {
    const invalidReport = {
      expenses: [
        {
          date: '2026-08-23',
          merchant: '',
          amount: 50.0,
        },
      ],
    };

    const result = validator.validate(invalidReport);
    expect(result.success).toBe(false);
    expect(result.error).toContain('Merchant name is required');
  });

  it('validates reports with split metadata', () => {
    const splitReport = {
      report_title: 'Shared Expenses',
      expenses: [
        {
          date: '2026-08-20',
          merchant: 'Apartment Insurance',
          amount: 120.0,
          category: 'Housing & Rent',
          split: {
            is_split: true,
            type: 'EQUAL',
            members: ['Berto', 'Elena'],
          },
        },
      ],
    };

    const result = validator.validate(splitReport);
    expect(result.success).toBe(true);
    expect(result.data?.expenses[0].split?.is_split).toBe(true);
    expect(result.data?.expenses[0].split?.members).toEqual(['Berto', 'Elena']);
  });
});
