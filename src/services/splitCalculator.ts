import { ExpenseSplit } from '@/types';

/**
 * Calculates equal splits among active member IDs.
 * Handles edge cases like zero amount, 0 members, and floating-point remainders.
 */
export function calculateEqualSplits(totalAmount: number, memberIds: string[]): ExpenseSplit[] {
  if (totalAmount <= 0 || !memberIds || memberIds.length === 0) {
    return [];
  }

  const count = memberIds.length;
  const rawShare = totalAmount / count;
  const roundedShare = Math.round(rawShare * 100) / 100;
  const percentage = 100 / count;

  return memberIds.map((memberId, index) => {
    // For the last member, adjust cent precision so the sum matches totalAmount exactly
    if (index === count - 1) {
      const sumSoFar = roundedShare * (count - 1);
      const remainder = Math.round((totalAmount - sumSoFar) * 100) / 100;
      return {
        member_id: memberId,
        share_amount: remainder,
        percentage,
      };
    }

    return {
      member_id: memberId,
      share_amount: roundedShare,
      percentage,
    };
  });
}
