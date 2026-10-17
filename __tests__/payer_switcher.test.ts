import { useAppStore } from '@/services/store';
import { en as enDict } from '@/i18n/en';
import { it as itDict } from '@/i18n/it';
import { INITIAL_MEMBERS, INITIAL_FAMILY } from '@/data/mockData';

const resolveActivePayerId = (
  paidByMemberId: string,
  currentMemberId: string,
  members: { id: string }[],
): string => {
  if (paidByMemberId && members.some((m) => m.id === paidByMemberId)) {
    return paidByMemberId;
  }
  if (currentMemberId && members.some((m) => m.id === currentMemberId)) {
    return currentMemberId;
  }
  return members[0]?.id || '';
};

describe('Active Payer Switcher & Add Expense Payer Selection', () => {
  beforeEach(() => {
    useAppStore.setState({
      family: INITIAL_FAMILY,
      members: INITIAL_MEMBERS,
      currentMemberId: INITIAL_MEMBERS[0].id,
      expenses: [],
    });
  });

  it('provides payingAs localization keys in both English and Italian', () => {
    expect(enDict.dashboard.payingAs).toBe('Paying as');
    expect(itDict.dashboard.payingAs).toBe('Chi paga');
  });

  it('persists active payer switching via setCurrentMemberId in the global store', () => {
    const store = useAppStore.getState();
    const members = store.members;
    expect(members.length).toBeGreaterThan(1);

    const initialMemberId = store.currentMemberId;
    const targetMember = members.find((m) => m.id !== initialMemberId);
    expect(targetMember).toBeDefined();

    store.setCurrentMemberId(targetMember!.id);
    expect(useAppStore.getState().currentMemberId).toBe(targetMember!.id);
  });

  it('correctly associates new expense with selected payer when switching payers', () => {
    const store = useAppStore.getState();
    const members = store.members;
    const payer1 = members[0];
    const payer2 = members[1];

    store.setCurrentMemberId(payer2.id);

    const expense = store.addExpense({
      paid_by_member_id: payer2.id,
      category_id: 'cat_groceries',
      amount: 42.5,
      transaction_date: '2026-10-17',
      merchant_name: 'Supermarket',
    });

    expect(expense.paid_by_member_id).toBe(payer2.id);
    expect(useAppStore.getState().currentMemberId).toBe(payer2.id);

    store.setCurrentMemberId(payer1.id);
    expect(useAppStore.getState().currentMemberId).toBe(payer1.id);
  });

  it('resolves active payer safely across empty, stale, and valid member states', () => {
    const members = INITIAL_MEMBERS;
    // Explicit valid selection wins
    expect(resolveActivePayerId(members[1].id, members[0].id, members)).toBe(members[1].id);
    // Falls back to currentMemberId when local selection is empty
    expect(resolveActivePayerId('', members[1].id, members)).toBe(members[1].id);
    // Falls back to first member when currentMemberId is stale/deleted
    expect(resolveActivePayerId('', 'deleted_member_id', members)).toBe(members[0].id);
    // Returns empty string when members array is empty
    expect(resolveActivePayerId('', 'deleted_member_id', [])).toBe('');
  });
});
