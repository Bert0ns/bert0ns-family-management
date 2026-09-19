import { RawExpenseReport, RawExpenseItem } from '@/types';
import { reportValidator } from './validator';
import { importLogger } from './logger';
import { ICsvParser, CsvParseResult } from './interfaces';

export type { ICsvParser, CsvParseResult };

/**
 * Cleanse potential CSV formula injection vectors.
 * Prevents execution of malicious formulas if re-exported to spreadsheets.
 */
function sanitizeText(value: string): string {
  let trimmed = value.trim();
  if (/^[=+\-@\t\r]/.test(trimmed)) {
    trimmed = trimmed.replace(/^[=+\-@\t\r]+/, '');
  }
  return trimmed;
}

/**
 * Tokenize a CSV line or multiline string according to RFC 4180.
 * Handles quoted fields, embedded newlines, and escaped double quotes ("").
 */
export function tokenizeCsv(csvContent: string, delimiter: string): string[][] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = '';
  let inQuotes = false;
  let i = 0;
  const len = csvContent.length;

  while (i < len) {
    const char = csvContent[i];

    if (inQuotes) {
      if (char === '"') {
        if (i + 1 < len && csvContent[i + 1] === '"') {
          // Escaped quote
          currentField += '"';
          i += 2;
          continue;
        } else {
          // End of quoted field
          inQuotes = false;
          i++;
          continue;
        }
      } else {
        currentField += char;
        i++;
        continue;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
        i++;
        continue;
      } else if (char === delimiter) {
        currentRow.push(currentField);
        currentField = '';
        i++;
        continue;
      } else if (char === '\r') {
        if (i + 1 < len && csvContent[i + 1] === '\n') {
          i++;
        }
        currentRow.push(currentField);
        rows.push(currentRow);
        currentRow = [];
        currentField = '';
        i++;
        continue;
      } else if (char === '\n') {
        currentRow.push(currentField);
        rows.push(currentRow);
        currentRow = [];
        currentField = '';
        i++;
        continue;
      } else {
        currentField += char;
        i++;
        continue;
      }
    }
  }

  // Push final trailing field and row
  if (currentField.length > 0 || currentRow.length > 0) {
    currentRow.push(currentField);
    rows.push(currentRow);
  }

  return rows;
}

/**
 * Automatically detects the most likely delimiter (, ; \t) using frequency analysis.
 */
export function detectDelimiter(csvContent: string): string {
  // Strip BOM if present
  const clean = csvContent.replace(/^\uFEFF/, '').trim();
  const sampleLines = clean
    .split(/\r?\n/)
    .slice(0, 10)
    .filter((line) => line.trim().length > 0);

  if (sampleLines.length === 0) return ',';

  const delimiters = [',', ';', '\t'];
  const scores: Record<string, number> = { ',': 0, ';': 0, '\t': 0 };

  for (const delim of delimiters) {
    const counts = sampleLines.map((line) => {
      // Rough non-quoted count
      let count = 0;
      let inQuotes = false;
      for (let i = 0; i < line.length; i++) {
        const c = line[i];
        if (c === '"') inQuotes = !inQuotes;
        else if (c === delim && !inQuotes) count++;
      }
      return count;
    });

    const nonZeroCounts = counts.filter((c) => c > 0);
    if (nonZeroCounts.length > 0) {
      // Delimiter consistency score: average count penalizing variance
      const avg = nonZeroCounts.reduce((a, b) => a + b, 0) / nonZeroCounts.length;
      scores[delim] = avg * nonZeroCounts.length;
    }
  }

  // Pick delimiter with highest score
  let bestDelim = ',';
  let maxScore = -1;
  for (const delim of delimiters) {
    if (scores[delim] > maxScore) {
      maxScore = scores[delim];
      bestDelim = delim;
    }
  }

  return bestDelim;
}

/**
 * Parse a raw string representation of a financial amount into a positive number.
 * Supports:
 * - European notation: "1.250,50", "-15,99", "12,50 €"
 * - US notation: "1,250.50", "-15.99", "$12.50"
 * - Accounting notation: "(15.99)", "15.99-"
 * Debits/outflows are converted to positive numbers for the expense ledger.
 */
export function parseLocaleAmount(amountStr: string): number | null {
  if (!amountStr || typeof amountStr !== 'string') return null;

  let clean = amountStr.trim();
  if (!clean) return null;

  // Handle accounting negative format: (12.34)
  const isAccountingNegative = /^\(.*\)$/.test(clean);
  if (isAccountingNegative) {
    clean = clean.replace(/[()]/g, '');
  }

  // Remove currency symbols, letters, spaces, and non-breaking spaces
  clean = clean.replace(/[€$£¥\s\u00A0A-Za-z]/g, '');

  // Strip sign prefixes / suffixes
  if (clean.endsWith('-')) {
    clean = clean.slice(0, -1);
  } else if (clean.startsWith('-')) {
    clean = clean.slice(1);
  } else if (clean.startsWith('+')) {
    clean = clean.slice(1);
  }

  clean = clean.trim();
  if (!clean) return null;

  const hasComma = clean.includes(',');
  const hasDot = clean.includes('.');

  let normalized = clean;
  if (hasComma && hasDot) {
    const commaIndex = clean.lastIndexOf(',');
    const dotIndex = clean.lastIndexOf('.');
    if (commaIndex > dotIndex) {
      // European: 1.250,50 -> 1250.50
      normalized = clean.replace(/\./g, '').replace(',', '.');
    } else {
      // US: 1,250.50 -> 1250.50
      normalized = clean.replace(/,/g, '');
    }
  } else if (hasComma && !hasDot) {
    // 1250,50 or 15,99 -> comma is decimal separator
    normalized = clean.replace(',', '.');
  } else if (hasDot && !hasComma) {
    // 1250.50 or 15.99 -> dot is decimal separator
    normalized = clean;
  }

  const num = parseFloat(normalized);
  if (isNaN(num) || !isFinite(num)) return null;

  // Return positive absolute magnitude representing the transaction cost
  const finalAmount = Math.abs(num);
  return finalAmount > 0 ? Math.round(finalAmount * 100) / 100 : 0;
}

/**
 * Normalizes varied bank date strings into standard ISO YYYY-MM-DD.
 * Supports:
 * - YYYY-MM-DD, YYYY/MM/DD, YYYY.MM.DD
 * - DD/MM/YYYY, DD-MM-YYYY, DD.MM.YYYY
 * - MM/DD/YYYY, MM-DD-YYYY
 * - ISO timestamps (2026-09-04T10:00:00Z)
 */
export function normalizeDate(dateStr: string): string | null {
  if (!dateStr || typeof dateStr !== 'string') return null;

  const trimmed = dateStr.trim();
  if (!trimmed) return null;

  // ISO timestamp (2026-09-04T...)
  if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
    return trimmed.slice(0, 10);
  }

  // YYYY/MM/DD or YYYY.MM.DD
  const ymdMatch = trimmed.match(/^(\d{4})[./-](\d{1,2})[./-](\d{1,2})/);
  if (ymdMatch) {
    const [, year, month, day] = ymdMatch;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }

  // DD/MM/YYYY or MM/DD/YYYY with delimiters /, -, .
  const dmyMatch = trimmed.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})/);
  if (dmyMatch) {
    const [, p1, p2, year] = dmyMatch;
    const n1 = parseInt(p1, 10);
    const n2 = parseInt(p2, 10);

    let day = n1;
    let month = n2;

    // Disambiguate day and month:
    // If first part > 12, it must be the day (DD/MM/YYYY)
    // If second part > 12, first part is month (MM/DD/YYYY)
    if (n1 > 12 && n2 <= 12) {
      day = n1;
      month = n2;
    } else if (n2 > 12 && n1 <= 12) {
      day = n2;
      month = n1;
    } else {
      // European standard default for ambiguous dates (DD/MM/YYYY)
      day = n1;
      month = n2;
    }

    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }
  }

  return null;
}

interface ColumnIndexes {
  date: number;
  merchant: number;
  amount: number;
  debit?: number;
  credit?: number;
  category?: number;
  payer?: number;
  notes?: number;
}

/**
 * Identifies column semantic meanings from header row.
 */
function identifyColumns(headerRow: string[]): ColumnIndexes | null {
  const normHeaders = headerRow.map((h) =>
    h
      .toLowerCase()
      .trim()
      .replace(/[\s_-]+/g, ' '),
  );

  let dateIdx = -1;
  let merchantIdx = -1;
  let amountIdx = -1;
  let debitIdx = -1;
  let creditIdx = -1;
  let categoryIdx = -1;
  let payerIdx = -1;
  let notesIdx = -1;

  normHeaders.forEach((h, idx) => {
    // Date synonyms with priority
    let dateScore = 0;
    if (h === 'transaction date' || h === 'data operazione' || h === 'data transazione')
      dateScore = 5;
    else if (h === 'date' || h === 'data' || h === 'started date') dateScore = 4;
    else if (h === 'data contabile' || h === 'booking date' || h === 'completed date')
      dateScore = 3;
    else if (h === 'data valuta' || h === 'valuta') dateScore = 2;
    else if (h.includes('date') || h.includes('data')) dateScore = 1;

    if (dateScore > 0) {
      if (dateIdx === -1 || dateScore > (normHeaders[dateIdx] ? 2 : 0)) {
        dateIdx = idx;
      }
    }

    // Debit / Outflow
    if (
      debitIdx === -1 &&
      (h === 'debit' ||
        h === 'debiti' ||
        h === 'addebito' ||
        h === 'addebiti' ||
        h === 'uscita' ||
        h === 'uscite' ||
        h === 'paid out' ||
        h === 'outflow' ||
        h === 'withdrawal' ||
        h === 'withdrawals')
    ) {
      debitIdx = idx;
      return;
    }

    // Credit / Inflow
    if (
      creditIdx === -1 &&
      (h === 'credit' ||
        h === 'crediti' ||
        h === 'accredito' ||
        h === 'accrediti' ||
        h === 'entrata' ||
        h === 'entrate' ||
        h === 'paid in' ||
        h === 'inflow' ||
        h === 'deposit' ||
        h === 'deposits')
    ) {
      creditIdx = idx;
      return;
    }

    // Amount synonyms
    if (
      amountIdx === -1 &&
      (h === 'amount' ||
        h === 'importo' ||
        h === 'importo eur' ||
        h === 'importo transazione' ||
        h === 'total' ||
        h === 'totale' ||
        h === 'valore' ||
        h === 'spesa' ||
        h.includes('amount') ||
        h.includes('importo'))
    ) {
      amountIdx = idx;
      return;
    }

    // Category synonyms
    if (
      categoryIdx === -1 &&
      (h === 'category' || h === 'categoria' || h === 'classe' || h.includes('categor'))
    ) {
      categoryIdx = idx;
      return;
    }

    // Payer synonyms
    if (
      payerIdx === -1 &&
      (h === 'paid by' ||
        h === 'payer' ||
        h === 'membro' ||
        h === 'pagato da' ||
        h === 'user' ||
        h.includes('paid by'))
    ) {
      payerIdx = idx;
      return;
    }

    // Explicit notes synonyms
    if (notesIdx === -1 && (h === 'notes' || h === 'note' || h === 'memo' || h === 'commenti')) {
      notesIdx = idx;
      return;
    }
  });

  // Second pass: resolve merchant and notes with priority weights
  let bestMerchantScore = 0;
  normHeaders.forEach((h, idx) => {
    if (
      idx === dateIdx ||
      idx === amountIdx ||
      idx === debitIdx ||
      idx === creditIdx ||
      idx === categoryIdx ||
      idx === payerIdx
    ) {
      return;
    }

    let mScore = 0;
    if (h === 'dettagli' || h === 'beneficiario' || h === 'payee' || h === 'merchant') mScore = 5;
    else if (h === 'descrizione' || h === 'description' || h === 'causale') mScore = 4;
    else if (h.includes('merchant') || h.includes('payee') || h.includes('beneficiar')) mScore = 4;
    else if (h.includes('descri') || h.includes('causale') || h.includes('dettagl')) mScore = 3;
    else if (h === 'operazione' || h === 'testo operazione' || h === 'nome' || h === 'transazione')
      mScore = 2;

    if (mScore > bestMerchantScore) {
      if (merchantIdx !== -1 && notesIdx === -1) {
        notesIdx = merchantIdx;
      }
      bestMerchantScore = mScore;
      merchantIdx = idx;
    } else if (mScore > 0 && notesIdx === -1 && idx !== merchantIdx) {
      notesIdx = idx;
    }
  });

  // Valid header must have Date and either Amount or Debit
  if (dateIdx !== -1 && (amountIdx !== -1 || debitIdx !== -1)) {
    return {
      date: dateIdx,
      merchant: merchantIdx !== -1 ? merchantIdx : amountIdx, // fallback if no merchant column
      amount: amountIdx,
      debit: debitIdx,
      credit: creditIdx,
      category: categoryIdx,
      payer: payerIdx,
      notes: notesIdx,
    };
  }

  return null;
}

/**
 * Pure, local-first CSV bank statement parser.
 * Converts raw bank exports into a validated RawExpenseReport.
 */
export class CsvParser implements ICsvParser {
  parse(csvContent: string, defaultCurrency: 'EUR' | '€' = 'EUR'): CsvParseResult {
    if (!csvContent || typeof csvContent !== 'string') {
      return { success: false, error: 'Empty or invalid CSV content provided' };
    }

    const cleanContent = csvContent.replace(/^\uFEFF/, '').trim();
    if (!cleanContent) {
      return { success: false, error: 'CSV file is empty' };
    }

    try {
      const delimiter = detectDelimiter(cleanContent);
      importLogger.debug('CSV Delimiter detected', { delimiter });

      const allRows = tokenizeCsv(cleanContent, delimiter);
      if (allRows.length < 2) {
        return {
          success: false,
          error: 'CSV must contain at least a header row and one transaction row',
        };
      }

      // Find header row within the first 10 rows
      let headerIdx = -1;
      let colMap: ColumnIndexes | null = null;

      for (let i = 0; i < Math.min(allRows.length, 10); i++) {
        const potentialHeader = allRows[i];
        const match = identifyColumns(potentialHeader);
        if (match) {
          headerIdx = i;
          colMap = match;
          break;
        }
      }

      if (headerIdx === -1 || !colMap) {
        return {
          success: false,
          error:
            'Could not recognize bank statement headers. CSV must include Date and Amount (or Debit/Credit) columns.',
        };
      }

      importLogger.info('CSV Headers mapped successfully', {
        headerRow: headerIdx + 1,
        columnMapping: colMap,
      });

      const candidateExpenses: RawExpenseItem[] = [];
      let skippedCount = 0;

      for (let i = headerIdx + 1; i < allRows.length; i++) {
        const row = allRows[i];
        if (!row || row.length === 0 || row.every((c) => !c.trim())) {
          skippedCount++;
          continue;
        }

        const rawDate = row[colMap.date] || '';
        const isoDate = normalizeDate(rawDate);
        if (!isoDate) {
          skippedCount++;
          continue;
        }

        // Determine amount:
        // Priority 1: Separate Debit / Credit columns
        let parsedAmount: number | null = null;
        if (colMap.debit !== undefined && colMap.debit !== -1 && row[colMap.debit]?.trim()) {
          parsedAmount = parseLocaleAmount(row[colMap.debit]);
        } else if (colMap.amount !== -1 && row[colMap.amount]?.trim()) {
          parsedAmount = parseLocaleAmount(row[colMap.amount]);
        }

        // If no amount found or amount is 0, skip
        if (parsedAmount === null || parsedAmount <= 0) {
          skippedCount++;
          continue;
        }

        // Extract merchant/description
        let merchantName = 'Bank Transaction';
        if (colMap.merchant !== -1 && row[colMap.merchant]?.trim()) {
          merchantName = sanitizeText(row[colMap.merchant]);
        }
        if (!merchantName) {
          merchantName = 'Bank Transaction';
        }

        // Extract optional category
        let categoryName = 'Uncategorized';
        if (
          colMap.category !== undefined &&
          colMap.category !== -1 &&
          row[colMap.category]?.trim()
        ) {
          const cat = sanitizeText(row[colMap.category]);
          if (cat) categoryName = cat;
        }

        // Extract optional payer
        let paidBy: string | undefined = undefined;
        if (colMap.payer !== undefined && colMap.payer !== -1 && row[colMap.payer]?.trim()) {
          const payer = sanitizeText(row[colMap.payer]);
          if (payer) paidBy = payer;
        }

        // Extract optional notes
        let notes: string | undefined = undefined;
        if (colMap.notes !== undefined && colMap.notes !== -1 && row[colMap.notes]?.trim()) {
          const cleanNotes = sanitizeText(row[colMap.notes]);
          if (cleanNotes) notes = cleanNotes;
        }

        candidateExpenses.push({
          date: isoDate,
          merchant: merchantName.slice(0, 120),
          amount: parsedAmount,
          category: categoryName.slice(0, 80),
          paid_by: paidBy ? paidBy.slice(0, 100) : undefined,
          notes: notes ? notes.slice(0, 500) : undefined,
          payment_method: 'Bank Statement CSV',
          is_recurring: false,
        });
      }

      if (candidateExpenses.length === 0) {
        return {
          success: false,
          error:
            'No valid expense transactions could be extracted from this CSV. Check dates and amounts.',
        };
      }

      const rawReport: RawExpenseReport = {
        report_title: 'Bank Statement Import',
        currency: defaultCurrency,
        expenses: candidateExpenses,
      };

      const validation = reportValidator.validate(rawReport);
      if (!validation.success || !validation.data) {
        return {
          success: false,
          error: `CSV validation error: ${validation.error || 'Failed schema validation'}`,
        };
      }

      return {
        success: true,
        data: validation.data,
        totalParsedRows: candidateExpenses.length,
        skippedRows: skippedCount,
      };
    } catch (err: any) {
      importLogger.error('Unexpected error parsing CSV', { error: err });
      return { success: false, error: `Failed to parse CSV: ${err.message || 'Unknown error'}` };
    }
  }
}

export const csvParser = new CsvParser();
