import {
  parseCsvStatement,
  detectDelimiter,
  parseCsvRows,
  normalizeDate,
  sanitizeCsvCellValue,
} from '@/services/csvParser';

describe('CSV Parser Service (Bank Statement Import)', () => {
  describe('Delimiter Autodetection', () => {
    it('detects comma delimiter', () => {
      const csv = 'Date,Merchant,Amount\n2026-08-01,Esselunga,45.20\n2026-08-02,Conad,12.50';
      expect(detectDelimiter(csv)).toBe(',');
    });

    it('detects semicolon delimiter (typical European export)', () => {
      const csv = 'Data;Descrizione;Importo\n01/08/2026;Esselunga;45,20\n02/08/2026;Conad;12,50';
      expect(detectDelimiter(csv)).toBe(';');
    });

    it('detects tab delimiter (TSV export)', () => {
      const csv = 'Date\tMerchant\tAmount\n2026-08-01\tAmazon\t29.99\n2026-08-02\tNetflix\t15.99';
      expect(detectDelimiter(csv)).toBe('\t');
    });

    it('detects pipe delimiter', () => {
      const csv = 'Date|Merchant|Amount\n2026-08-01|Enel|120.00\n2026-08-02|TIM|35.00';
      expect(detectDelimiter(csv)).toBe('|');
    });
  });

  describe('CSV Row RFC 4180 Parsing', () => {
    it('handles quoted fields and escaped quotes', () => {
      const csv = 'Date,Merchant,Amount\n2026-08-01,"Supermarket ""Best"" Market",50.00';
      const rows = parseCsvRows(csv, ',');
      expect(rows).toHaveLength(2);
      expect(rows[1][1]).toBe('Supermarket "Best" Market');
    });

    it('strips UTF-8 BOM properly', () => {
      const csvWithBom = '\uFEFFDate,Merchant,Amount\n2026-08-01,Bar,2.50';
      const rows = parseCsvRows(csvWithBom, ',');
      expect(rows[0][0]).toBe('Date');
    });
  });

  describe('Date Normalization', () => {
    it('normalizes ISO dates YYYY-MM-DD', () => {
      expect(normalizeDate('2026-08-15')).toBe('2026-08-15');
    });

    it('normalizes European DD/MM/YYYY dates', () => {
      expect(normalizeDate('15/08/2026')).toBe('2026-08-15');
      expect(normalizeDate('05/01/2026')).toBe('2026-01-05');
    });

    it('normalizes dot and dash dates DD.MM.YYYY and DD-MM-YYYY', () => {
      expect(normalizeDate('25.12.2025')).toBe('2025-12-25');
      expect(normalizeDate('28-02-2026')).toBe('2026-02-28');
    });

    it('normalizes YYYY/MM/DD dates', () => {
      expect(normalizeDate('2026/05/10')).toBe('2026-05-10');
    });

    it('returns null for unparseable dates', () => {
      expect(normalizeDate('not-a-date')).toBeNull();
      expect(normalizeDate('')).toBeNull();
    });
  });

  describe('Security & Formula Injection Sanitization', () => {
    it('sanitizes dangerous spreadsheet formula prefixes (=, +, @, cmd)', () => {
      expect(sanitizeCsvCellValue('=SUM(A1:A10)')).toBe('SUM(A1:A10)');
      expect(sanitizeCsvCellValue('@cmd|/c calc')).toBe('cmd|/c calc');
      expect(sanitizeCsvCellValue('+cmd|/c calc')).toBe('cmd|/c calc');
    });

    it('preserves valid negative financial numbers', () => {
      expect(sanitizeCsvCellValue('-45.20')).toBe('-45.20');
      expect(sanitizeCsvCellValue('-1250,50')).toBe('-1250,50');
    });

    it('strips control characters to prevent parser corruption', () => {
      expect(sanitizeCsvCellValue('Safe Merchant\x00\x08')).toBe('Safe Merchant');
    });
  });

  describe('Full Bank Statement Parsing', () => {
    it('successfully parses standard English CSV bank statements', () => {
      const csv = `Date,Merchant,Amount,Category,Notes
2026-08-01,Esselunga,54.20,Groceries,Weekly grocery shopping
2026-08-03,Shell Gas,70.00,Transport,Full tank`;

      const result = parseCsvStatement(csv);
      expect(result.success).toBe(true);
      expect(result.importedCount).toBe(2);
      expect(result.report).toBeDefined();
      expect(result.report?.expenses[0]).toMatchObject({
        date: '2026-08-01',
        merchant: 'Esselunga',
        amount: 54.2,
        category: 'Groceries',
        notes: 'Weekly grocery shopping',
      });
      expect(result.report?.expenses[1].amount).toBe(70.0);
    });

    it('successfully parses European Italian bank statements with semicolon and comma decimals', () => {
      const csv = `Data Operazione;Descrizione;Importo;Categoria
01/08/2026;ESSELUNGA MILANO;-125,50;Alimentari
03/08/2026;FARMACIA CENTRALE;-32,80;Salute`;

      const result = parseCsvStatement(csv);
      expect(result.success).toBe(true);
      expect(result.detectedDelimiter).toBe(';');
      expect(result.importedCount).toBe(2);
      expect(result.report?.expenses[0].date).toBe('2026-08-01');
      expect(result.report?.expenses[0].merchant).toBe('ESSELUNGA MILANO');
      expect(result.report?.expenses[0].amount).toBe(125.5);
      expect(result.report?.expenses[1].amount).toBe(32.8);
    });

    it('handles bank statements with separate Debit/Credit columns (ignoring income credits)', () => {
      const csv = `Date,Description,Debit,Credit
2026-08-01,Supermarket,45.00,
2026-08-02,Salary deposit,,2500.00
2026-08-03,Restaurant,60.50,`;

      const result = parseCsvStatement(csv);
      expect(result.success).toBe(true);
      expect(result.importedCount).toBe(2);
      expect(result.report?.expenses[0].merchant).toBe('Supermarket');
      expect(result.report?.expenses[0].amount).toBe(45.0);
      expect(result.report?.expenses[1].merchant).toBe('Restaurant');
      expect(result.report?.expenses[1].amount).toBe(60.5);
    });

    it('reports informative errors when required columns are absent', () => {
      const badCsv = `RandomCol,AnotherCol\nFoo,Bar`;
      const result = parseCsvStatement(badCsv);
      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('handles empty input gracefully', () => {
      const result = parseCsvStatement('');
      expect(result.success).toBe(false);
      expect(result.importedCount).toBe(0);
    });
  });
});
