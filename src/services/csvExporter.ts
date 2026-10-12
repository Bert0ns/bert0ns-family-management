import { Expense, Category, FamilyMember } from '@/types';

function escapeCell(val: string | number | boolean | undefined): string {
  if (val === undefined || val === null) return '""';
  let str = String(val);
  // Neutralize CSV Formula Injection (CWE-1236)
  // Formula execution characters: =, +, -, @, \t, \r, |, %
  // Strip leading whitespace, tabs, and BOMs before testing
  const formulaChars = /^[=+\-@\t\r|%]/;
  const stripped = str.replace(/^[\s\uFEFF]+/, '');
  if (formulaChars.test(str) || formulaChars.test(stripped)) {
    str = `'${str}`;
  }
  str = str.replace(/"/g, '""');
  return `"${str}"`;
}

/**
 * CsvExporter follows Single Responsibility Principle (SRP)
 * to format transaction logs into clean CSV format.
 * Defends against CSV Formula Injection (CWE-1236) and fixes UTF-8 BOM on export.
 */
export class CsvExporter {
  generateCsv(
    expenses: Expense[],
    categories: Category[],
    members: FamilyMember[],
    currency: string,
  ): string {
    const headers = [
      'Transaction ID',
      'Date',
      'Merchant',
      `Amount (${currency})`,
      'Category',
      'Paid By',
      'Payment Method',
      'Is Recurring',
      'Notes',
    ];

    const categoryMap = new Map<string, string>(categories.map((c) => [c.id, c.name]));
    const memberMap = new Map<string, string>(members.map((m) => [m.id, m.display_name]));

    const rows = expenses.map((exp) => {
      const category = categoryMap.get(exp.category_id) || 'Uncategorized';
      const member = memberMap.get(exp.paid_by_member_id) || 'Family';

      return [
        escapeCell(exp.id),
        escapeCell(exp.transaction_date),
        escapeCell(exp.merchant_name),
        escapeCell(exp.amount.toFixed(2)),
        escapeCell(category),
        escapeCell(member),
        escapeCell(exp.payment_method || 'Standard'),
        escapeCell(exp.is_recurring ? 'Yes' : 'No'),
        escapeCell(exp.notes || ''),
      ].join(',');
    });

    return [headers.join(','), ...rows].join('\n');
  }
}

export const csvExporter = new CsvExporter();
