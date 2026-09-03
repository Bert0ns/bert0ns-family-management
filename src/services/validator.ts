import { ExpenseReportImportSchema, RawExpenseReport } from '@/types';
import { IReportValidator } from './interfaces';
import { validatorLogger } from '@/services/logger';

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
        validatorLogger.warn('JSON import validation rejected', {
          error: errorMsg,
          issueCount: result.error.issues.length,
        });
        return { success: false, error: errorMsg };
      }
      validatorLogger.debug('JSON import validated successfully', {
        expensesCount: result.data.expenses.length,
        currency: result.data.currency,
      });
      return { success: true, data: result.data };
    } catch (e: any) {
      validatorLogger.error('JSON parsing exception', { error: e?.message });
      return { success: false, error: e?.message || 'Failed to parse JSON' };
    }
  }
}

export const reportValidator = new ReportValidator();
