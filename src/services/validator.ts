import { ExpenseReportImportSchema, RawExpenseReport } from '@/types';
import { IReportValidator } from './interfaces';

/**
 * ReportValidator enforces the Single Responsibility Principle (SRP)
 * for parsing and validating JSON expense payloads against Zod schemas.
 */
export class ReportValidator implements IReportValidator {
  validate(rawJson: unknown): {
    success: boolean;
    data?: RawExpenseReport;
    error?: string;
  } {
    try {
      const result = ExpenseReportImportSchema.safeParse(rawJson);
      if (!result.success) {
        const firstIssue = result.error.issues[0];
        const errorMsg = firstIssue
          ? `${firstIssue.path.join('.')}: ${firstIssue.message}`
          : 'Invalid JSON format';
        return { success: false, error: errorMsg };
      }
      return { success: true, data: result.data };
    } catch (e: any) {
      return { success: false, error: e?.message || 'Failed to parse JSON' };
    }
  }
}

export const reportValidator = new ReportValidator();
