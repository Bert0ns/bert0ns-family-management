import { RawExpenseReport, RawExpenseItem } from '@/types';
import { parseLocalizedNumber, roundToTwoDecimals } from '@/utils/numberParser';

export interface CsvParseOptions {
  delimiter?: string;
  fallbackCategory?: string;
  defaultPaymentMethod?: string;
  defaultPaidBy?: string;
}

export interface CsvParseResult {
  success: boolean;
  report?: RawExpenseReport;
  errors: string[];
  totalRows: number;
  importedCount: number;
  detectedDelimiter: string;
}

/**
 * Sanitizes CSV text cells to neutralize Formula Injection (CSV Injection / CWE-1236)
 * when fields are later viewed or re-exported to Excel/Calc.
 */
export function sanitizeCsvCellValue(val: string): string {
  let cleaned = val.trim();
  if (!cleaned) return '';

  // Neutralize formula triggers: =, +, -, @, \t, \r
  // Specifically if the cell begins with formula tokens followed by command characters
  if (/^[=+\-@\t\r]/.test(cleaned)) {
    // If it's a negative number like -45.50 or -12, allow it (will be parsed as number anyway)
    if (/^-\d/.test(cleaned)) {
      return cleaned;
    }
    // Prepend single quote or strip formula prefix to prevent DDE/command execution
    cleaned = cleaned.replace(/^[=+\-@\t\r]+/, '');
  }

  // Remove control characters except newline and tab
  cleaned = cleaned.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
  return cleaned.trim();
}

/**
 * Auto-detects the most likely delimiter from CSV sample text
 * Checks comma, semicolon, tab, and pipe.
 */
export function detectDelimiter(text: string): string {
  const sample = text.slice(0, 5000);
  const candidates = [',', ';', '\t', '|'];
  const lines = sample.split(/\r?\n/).filter((l) => l.trim().length > 0);

  if (lines.length === 0) return ',';

  let bestDelimiter = ',';
  let bestScore = -1;

  for (const delim of candidates) {
    const counts = lines.slice(0, 10).map((line) => {
      let count = 0;
      let inQuote = false;
      for (let i = 0; i < line.length; i++) {
        if (line[i] === '"') {
          inQuote = !inQuote;
        } else if (line[i] === delim && !inQuote) {
          count++;
        }
      }
      return count;
    });

    const nonZero = counts.filter((c) => c > 0);
    if (nonZero.length === 0) continue;

    // Consistency score: favor delimiters with the same positive count per line
    const firstCount = nonZero[0];
    const isConsistent = nonZero.every((c) => c === firstCount);
    const score = nonZero.length * 10 + (isConsistent ? 50 : 0) + firstCount;

    if (score > bestScore) {
      bestScore = score;
      bestDelimiter = delim;
    }
  }

  return bestDelimiter;
}

/**
 * Robust RFC 4180 compliant CSV parser
 * Correctly parses multi-line quoted fields, escaped quotes, and empty values.
 */
export function parseCsvRows(text: string, delimiter: string): string[][] {
  // Strip BOM
  const cleaned = text.replace(/^\uFEFF/, '');
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = '';
  let inQuotes = false;
  let i = 0;

  while (i < cleaned.length) {
    const char = cleaned[i];
    const nextChar = cleaned[i + 1];

    if (inQuotes) {
      if (char === '"' && nextChar === '"') {
        currentField += '"';
        i += 2;
      } else if (char === '"') {
        inQuotes = false;
        i++;
      } else {
        currentField += char;
        i++;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
        i++;
      } else if (char === delimiter) {
        currentRow.push(currentField);
        currentField = '';
        i++;
      } else if (char === '\r' && nextChar === '\n') {
        currentRow.push(currentField);
        rows.push(currentRow);
        currentRow = [];
        currentField = '';
        i += 2;
      } else if (char === '\n' || char === '\r') {
        currentRow.push(currentField);
        rows.push(currentRow);
        currentRow = [];
        currentField = '';
        i++;
      } else {
        currentField += char;
        i++;
      }
    }
  }

  if (currentField.length > 0 || currentRow.length > 0) {
    currentRow.push(currentField);
    rows.push(currentRow);
  }

  // Filter out trailing blank rows
  return rows.filter((r) => r.some((cell) => cell.trim().length > 0));
}

/**
 * Normalizes varied bank statement date formats to ISO YYYY-MM-DD
 * Supports:
 * - YYYY-MM-DD, YYYY/MM/DD, YYYY.MM.DD
 * - DD/MM/YYYY, DD.MM.YYYY, DD-MM-YYYY
 * - MM/DD/YYYY (when day > 12 or unambiguous)
 */
export function normalizeDate(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  // Already ISO YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    const d = new Date(trimmed);
    return isNaN(d.getTime()) ? null : trimmed;
  }

  // YYYY/MM/DD or YYYY.MM.DD
  const ymdMatch = trimmed.match(/^(\d{4})[./](\d{1,2})[./](\d{1,2})$/);
  if (ymdMatch) {
    const y = ymdMatch[1];
    const m = ymdMatch[2].padStart(2, '0');
    const d = ymdMatch[3].padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  // DD/MM/YYYY or DD.MM.YYYY or DD-MM-YYYY
  const dmyMatch = trimmed.match(/^(\d{1,2})[./\-](\d{1,2})[./\-](\d{4})$/);
  if (dmyMatch) {
    const p1 = parseInt(dmyMatch[1], 10);
    const p2 = parseInt(dmyMatch[2], 10);
    const year = dmyMatch[3];

    // European standard is DD/MM/YYYY
    let day = p1;
    let month = p2;

    // If month > 12 and day <= 12, it must be MM/DD/YYYY
    if (p2 > 12 && p1 <= 12) {
      month = p1;
      day = p2;
    }

    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }
  }

  // Attempt standard Date.parse
  const parsed = new Date(trimmed);
  if (!isNaN(parsed.getTime())) {
    const y = parsed.getFullYear();
    const m = String(parsed.getMonth() + 1).padStart(2, '0');
    const d = String(parsed.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  return null;
}

interface ColumnMapping {
  dateIndex: number;
  merchantIndex: number;
  amountIndex: number;
  debitIndex: number;
  creditIndex: number;
  categoryIndex: number;
  notesIndex: number;
  paymentMethodIndex: number;
  paidByIndex: number;
}

/**
 * Fuzzy matches header column names against common bank statement conventions (EN & IT)
 */
function findColumnMapping(header: string[]): ColumnMapping {
  const norm = header.map((h) =>
    h
      .toLowerCase()
      .trim()
      .replace(/['"_\s-]+/g, ' '),
  );

  let dateIndex = -1;
  let merchantIndex = -1;
  let amountIndex = -1;
  let debitIndex = -1;
  let creditIndex = -1;
  let categoryIndex = -1;
  let notesIndex = -1;
  let paymentMethodIndex = -1;
  let paidByIndex = -1;

  norm.forEach((col, idx) => {
    // Date column
    if (
      dateIndex === -1 &&
      (col === 'date' ||
        col === 'data' ||
        col.includes('data op') ||
        col.includes('data cont') ||
        col.includes('trans date') ||
        col.includes('posting date') ||
        col === 'valuta')
    ) {
      dateIndex = idx;
    }

    // Merchant / Payee / Description column
    else if (
      merchantIndex === -1 &&
      (col === 'merchant' ||
        col === 'description' ||
        col === 'descrizione' ||
        col === 'causale' ||
        col === 'payee' ||
        col === 'beneficiario' ||
        col === 'operazione' ||
        col === 'dettagli' ||
        col === 'name' ||
        col === 'nome')
    ) {
      merchantIndex = idx;
    }

    // Separate Debit/Credit columns
    else if (
      debitIndex === -1 &&
      (col === 'debit' ||
        col === 'debiti' ||
        col === 'dare' ||
        col === 'uscite' ||
        col === 'addebiti' ||
        col.includes('uscite'))
    ) {
      debitIndex = idx;
    } else if (
      creditIndex === -1 &&
      (col === 'credit' ||
        col === 'crediti' ||
        col === 'avere' ||
        col === 'entrate' ||
        col === 'accrediti' ||
        col.includes('entrate'))
    ) {
      creditIndex = idx;
    }

    // Amount column (single column)
    else if (
      amountIndex === -1 &&
      (col === 'amount' ||
        col === 'importo' ||
        col === 'totale' ||
        col === 'valore' ||
        col === 'sum' ||
        col === 'price' ||
        col === 'prezzo')
    ) {
      amountIndex = idx;
    }

    // Category
    else if (
      categoryIndex === -1 &&
      (col === 'category' || col === 'categoria' || col === 'tag' || col === 'tags')
    ) {
      categoryIndex = idx;
    }

    // Notes / Memo
    else if (
      notesIndex === -1 &&
      (col === 'notes' ||
        col === 'note' ||
        col === 'memo' ||
        col === 'comment' ||
        col === 'commenti' ||
        col === 'annotazioni')
    ) {
      notesIndex = idx;
    }

    // Payment Method
    else if (
      paymentMethodIndex === -1 &&
      (col === 'payment method' ||
        col === 'metodo' ||
        col === 'tipo' ||
        col === 'tipo pagamento' ||
        col === 'canale')
    ) {
      paymentMethodIndex = idx;
    }

    // Paid By
    else if (
      paidByIndex === -1 &&
      (col === 'paid by' ||
        col === 'pagato da' ||
        col === 'membro' ||
        col === 'member' ||
        col === 'user')
    ) {
      paidByIndex = idx;
    }
  });

  return {
    dateIndex,
    merchantIndex,
    amountIndex,
    debitIndex,
    creditIndex,
    categoryIndex,
    notesIndex,
    paymentMethodIndex,
    paidByIndex,
  };
}

/**
 * Parses raw CSV bank statement content into a normalized RawExpenseReport.
 */
export function parseCsvStatement(csvText: string, options: CsvParseOptions = {}): CsvParseResult {
  const errors: string[] = [];

  if (!csvText || !csvText.trim()) {
    return {
      success: false,
      errors: ['CSV content is empty'],
      totalRows: 0,
      importedCount: 0,
      detectedDelimiter: ',',
    };
  }

  const delimiter = options.delimiter || detectDelimiter(csvText);
  const rows = parseCsvRows(csvText, delimiter);

  if (rows.length < 2) {
    return {
      success: false,
      errors: ['CSV must have a header row and at least one data row'],
      totalRows: rows.length,
      importedCount: 0,
      detectedDelimiter: delimiter,
    };
  }

  const header = rows[0];
  const mapping = findColumnMapping(header);

  // Validate required columns
  if (mapping.dateIndex === -1) {
    errors.push('Could not detect a Date column (e.g., Date, Data, Data Operazione)');
  }
  if (mapping.merchantIndex === -1) {
    errors.push(
      'Could not detect a Description/Merchant column (e.g., Merchant, Description, Causale, Beneficiario)',
    );
  }
  if (mapping.amountIndex === -1 && mapping.debitIndex === -1) {
    errors.push('Could not detect an Amount or Debit column (e.g., Amount, Importo, Uscite, Dare)');
  }

  if (errors.length > 0) {
    return {
      success: false,
      errors,
      totalRows: rows.length - 1,
      importedCount: 0,
      detectedDelimiter: delimiter,
    };
  }

  const expenses: RawExpenseItem[] = [];
  const dataRows = rows.slice(1);

  dataRows.forEach((row, rowIndex) => {
    const lineNum = rowIndex + 2;

    const rawDate = row[mapping.dateIndex] || '';
    const normalizedDate = normalizeDate(rawDate);
    if (!normalizedDate) {
      errors.push(`Row ${lineNum}: Invalid or unparseable date "${rawDate}"`);
      return;
    }

    const rawMerchant = row[mapping.merchantIndex] || '';
    const sanitizedMerchant = sanitizeCsvCellValue(rawMerchant);
    if (!sanitizedMerchant) {
      errors.push(`Row ${lineNum}: Missing merchant or description`);
      return;
    }

    // Determine numeric amount
    let rawAmountStr = '';
    if (mapping.debitIndex !== -1 && row[mapping.debitIndex]?.trim()) {
      rawAmountStr = row[mapping.debitIndex];
    } else if (mapping.amountIndex !== -1) {
      rawAmountStr = row[mapping.amountIndex];
    }

    const parsedNum = parseLocalizedNumber(rawAmountStr);
    if (isNaN(parsedNum) || parsedNum === 0) {
      // If debit is 0 or empty, check if this is an income/credit row and skip quietly
      if (mapping.creditIndex !== -1 && row[mapping.creditIndex]?.trim()) {
        return; // Ignore positive credits / salary deposits in an expense tracker
      }
      errors.push(`Row ${lineNum}: Invalid monetary amount "${rawAmountStr}"`);
      return;
    }

    // In bank statements, expenses are often recorded as negative (-15.50). Convert to positive expense amount.
    const expenseAmount = roundToTwoDecimals(Math.abs(parsedNum));

    const rawCat = mapping.categoryIndex !== -1 ? row[mapping.categoryIndex] : '';
    const sanitizedCategory =
      sanitizeCsvCellValue(rawCat) || options.fallbackCategory || 'Uncategorized';

    const rawNotes = mapping.notesIndex !== -1 ? row[mapping.notesIndex] : '';
    const sanitizedNotes = sanitizeCsvCellValue(rawNotes);

    const rawMethod = mapping.paymentMethodIndex !== -1 ? row[mapping.paymentMethodIndex] : '';
    const paymentMethod =
      sanitizeCsvCellValue(rawMethod) || options.defaultPaymentMethod || 'Bank Transfer';

    const rawPaidBy = mapping.paidByIndex !== -1 ? row[mapping.paidByIndex] : '';
    const paidBy = sanitizeCsvCellValue(rawPaidBy) || options.defaultPaidBy;

    expenses.push({
      date: normalizedDate,
      merchant: sanitizedMerchant.slice(0, 120),
      amount: expenseAmount,
      category: sanitizedCategory.slice(0, 80),
      notes: sanitizedNotes ? sanitizedNotes.slice(0, 500) : undefined,
      payment_method: paymentMethod.slice(0, 50),
      paid_by: paidBy ? paidBy.slice(0, 100) : undefined,
      is_recurring: false,
    });
  });

  if (expenses.length === 0) {
    return {
      success: false,
      errors: errors.length > 0 ? errors : ['No valid expense records could be extracted from CSV'],
      totalRows: dataRows.length,
      importedCount: 0,
      detectedDelimiter: delimiter,
    };
  }

  const report: RawExpenseReport = {
    report_title: 'CSV Bank Statement Import',
    statement_period: {
      start_date: expenses.reduce((min, e) => (e.date < min ? e.date : min), expenses[0].date),
      end_date: expenses.reduce((max, e) => (e.date > max ? e.date : max), expenses[0].date),
    },
    currency: 'EUR',
    expenses,
  };

  return {
    success: true,
    report,
    errors,
    totalRows: dataRows.length,
    importedCount: expenses.length,
    detectedDelimiter: delimiter,
  };
}
