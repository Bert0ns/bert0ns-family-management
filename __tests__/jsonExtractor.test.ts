import { jsonExtractor } from '@/services/jsonExtractor';
import { reportValidator } from '@/services/validator';

describe('jsonExtractor', () => {
  it('parses valid raw JSON strings', () => {
    const raw = '{"currency": "EUR", "expenses": []}';
    const result = jsonExtractor.extract(raw);

    expect(result.success).toBe(true);
    expect(result.data).toEqual({ currency: 'EUR', expenses: [] });
  });

  it('strips markdown code blocks ```json ... ```', () => {
    const raw = `Here is your extracted report:
\`\`\`json
{
  "currency": "EUR",
  "expenses": [
    {
      "date": "2026-09-01",
      "merchant": "Supermarket",
      "amount": 25.5
    }
  ]
}
\`\`\`
Hope this helps!`;

    const result = jsonExtractor.extract(raw);
    expect(result.success).toBe(true);
    expect(result.data).toEqual({
      currency: 'EUR',
      expenses: [
        {
          date: '2026-09-01',
          merchant: 'Supermarket',
          amount: 25.5,
        },
      ],
    });
  });

  it('strips markdown code blocks without json language specifier ``` ... ```', () => {
    const raw = `\`\`\`
{
  "report_title": "Monthly Statement"
}
\`\`\``;

    const result = jsonExtractor.extract(raw);
    expect(result.success).toBe(true);
    expect(result.data).toEqual({ report_title: 'Monthly Statement' });
  });

  it('handles conversational text around bare JSON without code fences', () => {
    const raw = `Sure! Here is the JSON you requested:
{
  "expenses": []
}
Let me know if you need anything else!`;

    const result = jsonExtractor.extract(raw);
    expect(result.success).toBe(true);
    expect(result.data).toEqual({ expenses: [] });
  });

  it('correctly extracts and parses top-level JSON arrays', () => {
    const rawArray = `Here is the transaction list:
[
  {
    "date": "2026-09-01",
    "merchant": "Bakery",
    "amount": 3.50
  },
  {
    "date": "2026-09-02",
    "merchant": "Pharmacy",
    "amount": 18.20
  }
]
Processed successfully.`;

    const result = jsonExtractor.extract(rawArray);
    expect(result.success).toBe(true);
    expect(result.data).toEqual([
      { date: '2026-09-01', merchant: 'Bakery', amount: 3.5 },
      { date: '2026-09-02', merchant: 'Pharmacy', amount: 18.2 },
    ]);
  });

  it('correctly parses top-level JSON arrays in markdown code fences', () => {
    const rawFenceArray = `\`\`\`json
[
  {"merchant": "Corner Shop", "amount": 12.0}
]
\`\`\``;

    const result = jsonExtractor.extract(rawFenceArray);
    expect(result.success).toBe(true);
    expect(result.data).toEqual([{ merchant: 'Corner Shop', amount: 12.0 }]);
  });

  it('forgivingly parses JSON with trailing commas produced by LLMs', () => {
    const jsonWithTrailingCommas = `\`\`\`json
{
  "report_title": "Bank Statement",
  "currency": "EUR",
  "expenses": [
    {
      "date": "2026-09-01",
      "merchant": "Bakery",
      "amount": 4.5,
    },
  ],
}
\`\`\``;

    const result = jsonExtractor.extract(jsonWithTrailingCommas);
    expect(result.success).toBe(true);
    expect(result.data).toEqual({
      report_title: 'Bank Statement',
      currency: 'EUR',
      expenses: [
        {
          date: '2026-09-01',
          merchant: 'Bakery',
          amount: 4.5,
        },
      ],
    });
  });

  it('preserves commas and brackets inside string literals when forgiving trailing commas', () => {
    const jsonWithStringCommas = `
{
  "report_title": "Statement with special text",
  "notes": "Items: bread, milk, } and eggs, ]",
  "items": [
    "first item, } test",
  ],
}
`;
    const result = jsonExtractor.extract(jsonWithStringCommas);
    expect(result.success).toBe(true);
    expect((result.data as any).notes).toBe('Items: bread, milk, } and eggs, ]');
    expect((result.data as any).items).toEqual(['first item, } test']);
  });

  it('rejects payloads exceeding the 2MB size limit', () => {
    const largePayload = 'a'.repeat(2 * 1024 * 1024 + 1);
    const result = jsonExtractor.extract(largePayload);

    expect(result.success).toBe(false);
    expect(result.error).toContain('Payload exceeds maximum allowed size of 2MB');
  });

  it('rejects empty input or strings without JSON objects', () => {
    expect(jsonExtractor.extract('').success).toBe(false);
    expect(jsonExtractor.extract('   ').success).toBe(false);
    expect(jsonExtractor.extract('This is just plain text without braces').success).toBe(false);
  });

  it('returns syntax error for malformed JSON', () => {
    const malformed = '{"currency": "EUR", expenses: [}';
    const result = jsonExtractor.extract(malformed);

    expect(result.success).toBe(false);
    expect(result.error).toContain('JSON syntax error');
  });

  it('works end-to-end with reportValidator for simulated AI PDF response', () => {
    const aiResponse = `Here is the parsed bank statement:
\`\`\`json
{
  "report_title": "Banca Intesa Settembre 2026",
  "currency": "EUR",
  "expenses": [
    {
      "date": "2026-09-04",
      "merchant": "Esselunga",
      "amount": 64.20,
      "category": "Groceries",
      "notes": "POS 04/09 14.20 ESSELUNGA MILANO C.SO GENOVA",
      "payment_method": "Debit Card"
    },
    {
      "date": "2026-09-05",
      "merchant": "Enel Energia",
      "amount": 112.50,
      "category": "Utilities & Bills",
      "notes": "RID ADDEBITO DIRETTO SEPA ENEL ENERGIA",
      "payment_method": "Bank Transfer"
    }
  ]
}
\`\`\`
All expenses are debits and sanitized.`;

    const extractResult = jsonExtractor.extract(aiResponse);
    expect(extractResult.success).toBe(true);

    const validationResult = reportValidator.validate(extractResult.data);
    expect(validationResult.success).toBe(true);
    expect(validationResult.data?.expenses).toHaveLength(2);
    expect(validationResult.data?.expenses[0].merchant).toBe('Esselunga');
    expect(validationResult.data?.expenses[0].amount).toBe(64.2);
  });
});
