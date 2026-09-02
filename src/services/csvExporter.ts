import { Expense, Category, FamilyMember } from '@/types';

/**
 * CsvExporter follows Single Responsibility Principle (SRP)
 * to format transaction logs into clean CSV format.
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

    const rows = expenses.map((exp) => {
      const category = categories.find((c) => c.id === exp.category_id)?.name || 'Uncategorized';
      const member = members.find((m) => m.id === exp.paid_by_member_id)?.display_name || 'Family';

      const escapeCell = (val: string | number | boolean | undefined) => {
        if (val === undefined || val === null) return '""';
        const str = String(val).replace(/"/g, '""');
        return `"${str}"`;
      };

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

  downloadCsv(csvContent: string, fileName: string): void {
    if (typeof document !== 'undefined') {
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }
}

export const csvExporter = new CsvExporter();
