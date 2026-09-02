import { Expense, RawExpenseItem } from '@/types';

export interface DuplicateCheckResult {
  isDuplicate: boolean;
  matchedExpenseId?: string;
  matchReason?: string;
}

/**
 * DuplicateDetector follows Single Responsibility Principle (SRP)
 * to detect matching transactions and prevent double-logging.
 */
export class DuplicateDetector {
  checkDuplicate(candidate: RawExpenseItem, existingExpenses: Expense[]): DuplicateCheckResult {
    const candidateMerchantClean = candidate.merchant.trim().toLowerCase();
    const candidateDate = candidate.date.trim();
    const candidateAmount = candidate.amount;

    const match = existingExpenses.find((exp) => {
      const expDate = exp.transaction_date.trim();
      const expMerchantClean = exp.merchant_name.trim().toLowerCase();
      const expAmount = exp.amount;

      // Exact match on date, amount, and similar merchant
      const isDateMatch = expDate === candidateDate;
      const isAmountMatch = Math.abs(expAmount - candidateAmount) < 0.001;
      const isMerchantMatch =
        expMerchantClean === candidateMerchantClean ||
        expMerchantClean.includes(candidateMerchantClean) ||
        candidateMerchantClean.includes(expMerchantClean);

      return isDateMatch && isAmountMatch && isMerchantMatch;
    });

    if (match) {
      return {
        isDuplicate: true,
        matchedExpenseId: match.id,
        matchReason: `Matches existing transaction from ${match.transaction_date} (${match.merchant_name})`,
      };
    }

    return { isDuplicate: false };
  }
}

export const duplicateDetector = new DuplicateDetector();
