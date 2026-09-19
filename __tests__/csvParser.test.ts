import {
  csvParser,
  detectDelimiter,
  tokenizeCsv,
  parseLocaleAmount,
  normalizeDate,
} from '@/services/csvParser';

describe('CsvParser Service', () => {
  describe('Delimiter Detection & RFC 4180 Tokenizer', () => {
    it('detects comma, semicolon, and tab delimiters accurately', () => {
      const commaCsv = 'Date,Merchant,Amount\n2026-09-01,Store,10.50';
      const semiCsv = 'Data;Descrizione;Importo\n01/09/2026;Negozio;10,50';
      const tabCsv = 'Date\tMerchant\tAmount\n2026-09-01\tStore\t10.50';

      expect(detectDelimiter(commaCsv)).toBe(',');
      expect(detectDelimiter(semiCsv)).toBe(';');
      expect(detectDelimiter(tabCsv)).toBe('\t');
    });

    it('handles quoted fields with embedded delimiters, newlines, and escaped quotes', () => {
      const csv =
        'Date,Description,Amount\n' +
        '2026-09-01,"Supermarket, Downtown",25.50\n' +
        '2026-09-02,"Item with ""escaped"" quotes",12.00\n' +
        '2026-09-03,"Multiline\nDescription",40.00';

      const rows = tokenizeCsv(csv, ',');
      expect(rows).toHaveLength(4);
      expect(rows[1][1]).toBe('Supermarket, Downtown');
      expect(rows[2][1]).toBe('Item with "escaped" quotes');
      expect(rows[3][1]).toBe('Multiline\nDescription');
    });
  });

  describe('Locale Amount Parsing', () => {
    it('correctly parses European number formats with decimal comma', () => {
      expect(parseLocaleAmount('1.250,50')).toBe(1250.5);
      expect(parseLocaleAmount('-84,20')).toBe(84.2);
      expect(parseLocaleAmount('15,99 €')).toBe(15.99);
      expect(parseLocaleAmount('€ 45,00')).toBe(45);
    });

    it('correctly parses US number formats with decimal dot', () => {
      expect(parseLocaleAmount('1,250.50')).toBe(1250.5);
      expect(parseLocaleAmount('-84.20')).toBe(84.2);
      expect(parseLocaleAmount('$15.99')).toBe(15.99);
      expect(parseLocaleAmount('45.00 USD')).toBe(45);
    });

    it('handles accounting parenthesis and trailing minus', () => {
      expect(parseLocaleAmount('(45.50)')).toBe(45.5);
      expect(parseLocaleAmount('32.10-')).toBe(32.1);
      expect(parseLocaleAmount('(1.200,00 €)')).toBe(1200);
    });

    it('returns null or 0 for invalid and zero amounts', () => {
      expect(parseLocaleAmount('')).toBeNull();
      expect(parseLocaleAmount('abc')).toBeNull();
      expect(parseLocaleAmount('0,00')).toBe(0);
      expect(parseLocaleAmount('0.00')).toBe(0);
    });
  });

  describe('Date Normalization', () => {
    it('normalizes ISO formats', () => {
      expect(normalizeDate('2026-09-04')).toBe('2026-09-04');
      expect(normalizeDate('2026-09-04T14:30:00Z')).toBe('2026-09-04');
      expect(normalizeDate('2026/09/04')).toBe('2026-09-04');
    });

    it('normalizes DD/MM/YYYY and DD.MM.YYYY formats', () => {
      expect(normalizeDate('04/09/2026')).toBe('2026-09-04');
      expect(normalizeDate('28/02/2026')).toBe('2026-02-28');
      expect(normalizeDate('15.08.2026')).toBe('2026-08-15');
      expect(normalizeDate('05-11-2026')).toBe('2026-11-05');
    });

    it('disambiguates day and month when one is greater than 12', () => {
      // 09/25/2026 -> 25 is day, 09 is month
      expect(normalizeDate('09/25/2026')).toBe('2026-09-25');
      // 25/09/2026 -> 25 is day, 09 is month
      expect(normalizeDate('25/09/2026')).toBe('2026-09-25');
    });

    it('returns null for unparseable dates', () => {
      expect(normalizeDate('not-a-date')).toBeNull();
      expect(normalizeDate('')).toBeNull();
    });
  });

  describe('Bank Export Formats End-to-End Parsing', () => {
    it('parses Revolut CSV exports', () => {
      const revolutCsv = `Type,Product,Started Date,Completed Date,Description,Amount,Fee,Currency,State,Balance
CARD_PAYMENT,Current,2026-09-01 12:00:00,2026-09-01 12:05:00,Carrefour Express,-35.50,0.00,EUR,COMPLETED,1250.00
TRANSFER,Current,2026-09-02 08:30:00,2026-09-02 08:31:00,Pharmacy Esselunga,-18.20,0.00,EUR,COMPLETED,1231.80
TOPUP,Current,2026-09-03 10:00:00,2026-09-03 10:01:00,Salary Deposit,2500.00,0.00,EUR,COMPLETED,3731.80`;

      const result = csvParser.parse(revolutCsv);
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.expenses).toHaveLength(3);

      const exp1 = result.data!.expenses[0];
      expect(exp1.date).toBe('2026-09-01');
      expect(exp1.merchant).toBe('Carrefour Express');
      expect(exp1.amount).toBe(35.5);

      const exp2 = result.data!.expenses[1];
      expect(exp2.date).toBe('2026-09-02');
      expect(exp2.merchant).toBe('Pharmacy Esselunga');
      expect(exp2.amount).toBe(18.2);
    });

    it('parses Intesa Sanpaolo Italian CSV exports', () => {
      const intesaCsv = `Data;Operazione;Dettagli;Conto o carta;Contabilizzazione;Categoria;Importo;Valuta
04/09/2026;PAGAMENTO POS;ESSELUNGA MILANO;Carta;Contabilizzato;Spesa Alimentare;-84,20;EUR
02/09/2026;BONIFICO SEPA;ENEL ENERGIA;Conto;Contabilizzato;Utenze;-112,50;EUR
01/09/2026;PAGAMENTO POS;FARMACIA CENTRALE;Carta;Contabilizzato;Salute;-15,90;EUR`;

      const result = csvParser.parse(intesaCsv);
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.expenses).toHaveLength(3);

      expect(result.data!.expenses[0].date).toBe('2026-09-04');
      expect(result.data!.expenses[0].merchant).toBe('ESSELUNGA MILANO');
      expect(result.data!.expenses[0].amount).toBe(84.2);
      expect(result.data!.expenses[0].category).toBe('Spesa Alimentare');

      expect(result.data!.expenses[1].date).toBe('2026-09-02');
      expect(result.data!.expenses[1].merchant).toBe('ENEL ENERGIA');
      expect(result.data!.expenses[1].amount).toBe(112.5);
    });

    it('parses UniCredit bank statement with dot dates and semicolon delimiter', () => {
      const unicreditCsv = `Data operazione;Data valuta;Descrizione;Importo;Valuta
15.08.2026;15.08.2026;RISTORANTE PIZZERIA DA LUIGI;-45,00;EUR
10.08.2026;10.08.2026;DISTRIBUTORE ENI;-60,00;EUR`;

      const result = csvParser.parse(unicreditCsv);
      expect(result.success).toBe(true);
      expect(result.data?.expenses).toHaveLength(2);

      expect(result.data!.expenses[0].date).toBe('2026-08-15');
      expect(result.data!.expenses[0].merchant).toBe('RISTORANTE PIZZERIA DA LUIGI');
      expect(result.data!.expenses[0].amount).toBe(45);

      expect(result.data!.expenses[1].date).toBe('2026-08-10');
      expect(result.data!.expenses[1].merchant).toBe('DISTRIBUTORE ENI');
      expect(result.data!.expenses[1].amount).toBe(60);
    });

    it('parses statements with separate Debit and Credit columns', () => {
      const debitCreditCsv = `Date,Description,Debit,Credit
2026-09-01,Groceries,54.20,
2026-09-02,Salary,,2500.00
2026-09-03,Gas Station,40.00,`;

      const result = csvParser.parse(debitCreditCsv);
      expect(result.success).toBe(true);
      // Only debits (expenses) should be extracted, salary credit has empty debit and is skipped
      expect(result.data?.expenses).toHaveLength(2);
      expect(result.data!.expenses[0].merchant).toBe('Groceries');
      expect(result.data!.expenses[0].amount).toBe(54.2);
      expect(result.data!.expenses[1].merchant).toBe('Gas Station');
      expect(result.data!.expenses[1].amount).toBe(40);
    });

    it('strips UTF-8 BOM prefix and sanitizes formula injection vectors', () => {
      const bomWithFormulaCsv = `\uFEFFDate,Merchant,Amount\n2026-09-01,=1+2,15.00\n2026-09-02,+@MALICIOUS,20.00`;

      const result = csvParser.parse(bomWithFormulaCsv);
      expect(result.success).toBe(true);
      expect(result.data?.expenses).toHaveLength(2);
      expect(result.data!.expenses[0].merchant).toBe('1+2');
      expect(result.data!.expenses[1].merchant).toBe('MALICIOUS');
    });

    it('gracefully handles empty, missing columns, or corrupted rows', () => {
      expect(csvParser.parse('').success).toBe(false);
      expect(csvParser.parse('just one line header').success).toBe(false);

      const unidentifiableCsv = `ColA,ColB,ColC\n1,2,3`;
      const res = csvParser.parse(unidentifiableCsv);
      expect(res.success).toBe(false);
      expect(res.error).toContain('Could not recognize bank statement headers');

      const corruptedDatesCsv = `Date,Merchant,Amount\ninvalid-date,Store,10.00`;
      const res2 = csvParser.parse(corruptedDatesCsv);
      expect(res2.success).toBe(false);
      expect(res2.error).toContain('No valid expense transactions could be extracted');
    });
  });
});
