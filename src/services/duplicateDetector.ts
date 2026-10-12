import { transactionLogger } from './logger';
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
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
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
    if (
      words1.length > 1 &&
      words2.length > 1 &&
      ((n1 + ' ').startsWith(n2 + ' ') || (n2 + ' ').startsWith(n1 + ' '))
    ) {
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
      transactionLogger.warn('Potential duplicate transaction detected', {
        candidateMerchant: candidate.merchant,
        candidateAmount: candidate.amount,
        candidateDate: candidate.date,
        matchedExpenseId: match.id,
      });
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
   * Compares against existing transactions AND previous candidates in the same batch.
   */
  checkBatchDuplicates(
    candidates: RawExpenseItem[],
    existingExpenses: Expense[],
  ): DuplicateCheckResult[] {
    const existingIndex = new Map<string, Expense[]>();
    existingExpenses.forEach((exp) => {
      const key = `${exp.transaction_date.trim()}_${Math.round(exp.amount * 100)}`;
      const list = existingIndex.get(key) || [];
      list.push(exp);
      existingIndex.set(key, list);
    });

    const seenBatchCandidates = new Map<string, { candidate: RawExpenseItem; index: number }[]>();

    const results = candidates.map((cand, idx) => {
      const key = `${cand.date.trim()}_${Math.round(cand.amount * 100)}`;

      // 1. Check against existing expenses
      const matches = existingIndex.get(key) || [];
      const found = matches.find((exp) => this.isMerchantMatch(exp.merchant_name, cand.merchant));
      if (found) {
        return {
          isDuplicate: true,
          matchedExpenseId: found.id,
          matchReason: `Matches existing transaction from ${found.transaction_date} (${found.merchant_name})`,
        };
      }

      // 2. Check against intra-batch duplicates
      const batchMatches = seenBatchCandidates.get(key) || [];
      const foundInBatch = batchMatches.find((prev) =>
        this.isMerchantMatch(prev.candidate.merchant, cand.merchant),
      );
      if (foundInBatch) {
        return {
          isDuplicate: true,
          matchedExpenseId: `batch_item_${foundInBatch.index}`,
          matchReason: `Matches item #${foundInBatch.index + 1} in this import batch (${foundInBatch.candidate.merchant})`,
        };
      }

      // Record candidate into seen batch index
      batchMatches.push({ candidate: cand, index: idx });
      seenBatchCandidates.set(key, batchMatches);

      return { isDuplicate: false };
    });
    const dupCount = results.filter((r) => r.isDuplicate).length;
    if (dupCount > 0) {
      transactionLogger.warn('Batch duplicate transactions detected', {
        candidatesCount: candidates.length,
        duplicatesFound: dupCount,
      });
    }
    return results;
  }
}

export const duplicateDetector = new DuplicateDetector();
