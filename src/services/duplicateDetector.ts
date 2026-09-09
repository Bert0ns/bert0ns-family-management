import { Expense, RawExpenseItem } from '@/types';

export interface DuplicateCheckResult {
  isDuplicate: boolean;
  matchedExpenseId?: string;
  matchReason?: string;
}

/**
 * DuplicateDetector follows Single Responsibility Principle (SRP)
 * to detect matching transactions and prevent double-logging.
 * Eliminates substring false-positives and provides an efficient indexed lookup.
 */
export class DuplicateDetector {
  normalizeMerchant(name: string): string {
    return name
      .toLowerCase()
      .trim()
      .replace(/[^\w\s]/g, '')
      .replace(/\s+/g, ' ');
  }

  isMerchantMatch(m1: string, m2: string): boolean {
    const n1 = this.normalizeMerchant(m1);
    const n2 = this.normalizeMerchant(m2);
    if (!n1 || !n2) return false;
    if (n1 === n2) return true;

    // Word boundary / whole token check: require full phrase match
    const words1 = n1.split(' ');
    const words2 = n2.split(' ');
    if (words1.length > 1 && words2.length > 1 && (n1.startsWith(n2) || n2.startsWith(n1))) {
      return true;
    }
    return false;
  }

  checkDuplicate(candidate: RawExpenseItem, existingExpenses: Expense[]): DuplicateCheckResult {
    const candidateDate = candidate.date.trim();
    const candidateCents = Math.round(candidate.amount * 100);

    const match = existingExpenses.find((exp) => {
      const expDate = exp.transaction_date.trim();
      if (expDate !== candidateDate) return false;

      const expCents = Math.round(exp.amount * 100);
      if (expCents !== candidateCents) return false;

      return this.isMerchantMatch(exp.merchant_name, candidate.merchant);
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

  /**
   * Fast indexed check across a batch of candidate items using O(1) Map lookups.
   */
  checkBatchDuplicates(
    candidates: RawExpenseItem[],
    existingExpenses: Expense[],
  ): DuplicateCheckResult[] {
    const index = new Map<string, Expense[]>();
    existingExpenses.forEach((exp) => {
      const key = `${exp.transaction_date.trim()}_${Math.round(exp.amount * 100)}`;
      const list = index.get(key) || [];
      list.push(exp);
      index.set(key, list);
    });

    return candidates.map((cand) => {
      const key = `${cand.date.trim()}_${Math.round(cand.amount * 100)}`;
      const matches = index.get(key) || [];
      const found = matches.find((exp) => this.isMerchantMatch(exp.merchant_name, cand.merchant));
      if (found) {
        return {
          isDuplicate: true,
          matchedExpenseId: found.id,
          matchReason: `Matches existing transaction from ${found.transaction_date} (${found.merchant_name})`,
        };
      }
      return { isDuplicate: false };
    });
  }
}

export const duplicateDetector = new DuplicateDetector();
