import { Expense, ExpenseSplit, FamilyMember } from '@/types';

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

export interface SettlementTransfer {
  fromMember: FamilyMember;
  toMember: FamilyMember;
  amount: number;
}

export interface MemberBalance {
  member: FamilyMember;
  paid: number;
  share: number;
  net: number; // > 0 receives, < 0 owes
}

export interface SettlementSummary {
  balances: MemberBalance[];
  transfers: SettlementTransfer[];
  isBalanced: boolean;
}

/**
 * Computes household debt settlement ("Chi deve a Chi") for a given list of expenses.
 * Minimizes transaction count using greedy debt balancing.
 */
export function calculateSettlements(
  expenses: Expense[],
  members: FamilyMember[],
): SettlementSummary {
  if (members.length === 0) {
    return { balances: [], transfers: [], isBalanced: true };
  }

  const allMemberIds = members.map((m) => m.id);
  const paidMap = new Map<string, number>();
  const shareMap = new Map<string, number>();

  members.forEach((m) => {
    paidMap.set(m.id, 0);
    shareMap.set(m.id, 0);
  });

  expenses.forEach((exp) => {
    // Credit payer
    const curPaid = paidMap.get(exp.paid_by_member_id) || 0;
    paidMap.set(exp.paid_by_member_id, curPaid + exp.amount);

    // Debit beneficiaries
    if (exp.splits && exp.splits.length > 0) {
      exp.splits.forEach((s) => {
        const curShare = shareMap.get(s.member_id) || 0;
        shareMap.set(s.member_id, curShare + s.share_amount);
      });
    } else {
      // Default: equal split across all family members
      const equalSplits = calculateEqualSplits(exp.amount, allMemberIds);
      equalSplits.forEach((s) => {
        const curShare = shareMap.get(s.member_id) || 0;
        shareMap.set(s.member_id, curShare + s.share_amount);
      });
    }
  });

  const balances: MemberBalance[] = members.map((m) => {
    const paid = paidMap.get(m.id) || 0;
    const share = shareMap.get(m.id) || 0;
    const net = Math.round((paid - share) * 100) / 100;
    return {
      member: m,
      paid: Math.round(paid * 100) / 100,
      share: Math.round(share * 100) / 100,
      net,
    };
  });

  // Debt simplification
  type BalanceEntry = { member: FamilyMember; amount: number };
  const debtors: BalanceEntry[] = [];
  const creditors: BalanceEntry[] = [];

  balances.forEach((b) => {
    if (b.net < -0.01) {
      debtors.push({ member: b.member, amount: -b.net });
    } else if (b.net > 0.01) {
      creditors.push({ member: b.member, amount: b.net });
    }
  });

  debtors.sort((a, b) => b.amount - a.amount);
  creditors.sort((a, b) => b.amount - a.amount);

  const transfers: SettlementTransfer[] = [];
  let dIdx = 0;
  let cIdx = 0;

  while (dIdx < debtors.length && cIdx < creditors.length) {
    const debtor = debtors[dIdx];
    const creditor = creditors[cIdx];

    const settledAmount = Math.min(debtor.amount, creditor.amount);
    const roundedSettled = Math.round(settledAmount * 100) / 100;

    if (roundedSettled > 0) {
      transfers.push({
        fromMember: debtor.member,
        toMember: creditor.member,
        amount: roundedSettled,
      });
    }

    debtor.amount = Math.round((debtor.amount - roundedSettled) * 100) / 100;
    creditor.amount = Math.round((creditor.amount - roundedSettled) * 100) / 100;

    if (debtor.amount <= 0.01) {
      dIdx++;
    }
    if (creditor.amount <= 0.01) {
      cIdx++;
    }
  }

  return {
    balances,
    transfers,
    isBalanced: transfers.length === 0,
  };
}
