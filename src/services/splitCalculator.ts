import { Expense, ExpenseSplit, FamilyMember } from '@/types';

/**
 * Calculates equal splits among active member IDs in integer cents.
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
 * Uses exact integer cents throughout to prevent precision drift and 1-cent residual drops.
 * Minimizes transaction count using greedy debt balancing.
 */
export function calculateSettlements(
  expenses: Expense[],
  members: FamilyMember[],
): SettlementSummary {
  if (!members || members.length === 0) {
    return { balances: [], transfers: [], isBalanced: true };
  }

  const allMemberIds = members.map((m) => m.id);
  const paidCentsMap = new Map<string, number>();
  const shareCentsMap = new Map<string, number>();

  members.forEach((m) => {
    paidCentsMap.set(m.id, 0);
    shareCentsMap.set(m.id, 0);
  });

  expenses.forEach((exp) => {
    // Credit payer
    const curPaid = paidCentsMap.get(exp.paid_by_member_id) || 0;
    paidCentsMap.set(exp.paid_by_member_id, curPaid + Math.round(exp.amount * 100));

    // Debit beneficiaries
    if (exp.splits && exp.splits.length > 0) {
      exp.splits.forEach((s) => {
        const curShare = shareCentsMap.get(s.member_id) || 0;
        shareCentsMap.set(s.member_id, curShare + Math.round(s.share_amount * 100));
      });
    } else {
      // Default: equal split across all family members
      const equalSplits = calculateEqualSplits(exp.amount, allMemberIds);
      equalSplits.forEach((s) => {
        const curShare = shareCentsMap.get(s.member_id) || 0;
        shareCentsMap.set(s.member_id, curShare + Math.round(s.share_amount * 100));
      });
    }
  });

  const balances: MemberBalance[] = members.map((m) => {
    const paidCents = paidCentsMap.get(m.id) || 0;
    const shareCents = shareCentsMap.get(m.id) || 0;
    const netCents = paidCents - shareCents;
    return {
      member: m,
      paid: paidCents / 100,
      share: shareCents / 100,
      net: netCents / 100,
    };
  });

  // Debt simplification in exact integer cents
  type BalanceCentsEntry = { member: FamilyMember; cents: number };
  const debtors: BalanceCentsEntry[] = [];
  const creditors: BalanceCentsEntry[] = [];

  balances.forEach((b) => {
    const netCents = Math.round(b.net * 100);
    if (netCents < 0) {
      debtors.push({ member: b.member, cents: -netCents });
    } else if (netCents > 0) {
      creditors.push({ member: b.member, cents: netCents });
    }
  });

  debtors.sort((a, b) => b.cents - a.cents);
  creditors.sort((a, b) => b.cents - a.cents);

  const transfers: SettlementTransfer[] = [];
  let dIdx = 0;
  let cIdx = 0;

  while (dIdx < debtors.length && cIdx < creditors.length) {
    const debtor = debtors[dIdx];
    const creditor = creditors[cIdx];

    const settledCents = Math.min(debtor.cents, creditor.cents);

    if (settledCents > 0) {
      transfers.push({
        fromMember: debtor.member,
        toMember: creditor.member,
        amount: settledCents / 100,
      });
    }

    debtor.cents -= settledCents;
    creditor.cents -= settledCents;

    if (debtor.cents === 0) {
      dIdx++;
    }
    if (creditor.cents === 0) {
      cIdx++;
    }
  }

  // Strictly balanced if no active debtors or creditors exist
  const isBalanced = debtors.length === 0 && creditors.length === 0;

  return {
    balances,
    transfers,
    isBalanced,
  };
}
