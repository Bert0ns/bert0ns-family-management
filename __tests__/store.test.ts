import { useAppStore } from '@/services/store';
import { SAMPLE_IMPORT_REPORT } from '@/data/mockData';
import { RawExpenseReport } from '@/types';

describe('useAppStore (Comprehensive State & Mutation Tests)', () => {
  beforeEach(() => {
    useAppStore.getState().resetToSampleData();
  });

  it('initializes with default mock family, members, and categories', () => {
    const state = useAppStore.getState();
    expect(state.family.name).toBe("Bert0n's Family");
    expect(state.members).toHaveLength(4);
    expect(state.categories.length).toBeGreaterThan(0);
    expect(state.expenses.length).toBeGreaterThan(0);
  });

  it('updates current active member ID and selected period', () => {
    const state = useAppStore.getState();
    state.setCurrentMemberId('mem_2');
    state.setSelectedPeriod('2026-09');

    const updated = useAppStore.getState();
    expect(updated.currentMemberId).toBe('mem_2');
    expect(updated.selectedPeriod).toBe('2026-09');
  });

  it('adds and updates an expense correctly', () => {
    const state = useAppStore.getState();
    const newExp = state.addExpense({
      paid_by_member_id: 'mem_1',
      category_id: 'cat_groceries',
      transaction_date: '2026-08-30',
      merchant_name: 'Local Butcher',
      amount: 45.8,
      notes: 'Weekend BBQ meat',
      payment_method: 'Credit Card',
      is_recurring: false,
      is_verified: true,
    });

    state.updateExpense(newExp.id, { amount: 50.0, notes: 'Updated notes' });

    const updatedState = useAppStore.getState();
    const found = updatedState.expenses.find((e) => e.id === newExp.id);
    expect(found?.amount).toBe(50.0);
    expect(found?.notes).toBe('Updated notes');
  });

  it('deletes an expense by ID', () => {
    const state = useAppStore.getState();
    const targetExpense = state.expenses[0];
    const initialCount = state.expenses.length;

    state.deleteExpense(targetExpense.id);

    const updatedState = useAppStore.getState();
    expect(updatedState.expenses).toHaveLength(initialCount - 1);
    expect(updatedState.expenses.find((e) => e.id === targetExpense.id)).toBeUndefined();
  });

  it('adds and updates family members', () => {
    const state = useAppStore.getState();
    const initialCount = state.members.length;

    const newMember = state.addMember({
      display_name: 'Grandma Maria',
      role: 'MEMBER',
      color_code: '#E11D48',
      avatar_url: undefined,
    });

    let updated = useAppStore.getState();
    expect(updated.members).toHaveLength(initialCount + 1);
    expect(updated.members.find((m) => m.id === newMember.id)?.display_name).toBe('Grandma Maria');

    state.updateMember(newMember.id, { display_name: 'Nonna Maria', role: 'ADMIN' });
    updated = useAppStore.getState();
    const found = updated.members.find((m) => m.id === newMember.id);
    expect(found?.display_name).toBe('Nonna Maria');
    expect(found?.role).toBe('ADMIN');
  });

  it('adds a custom category', () => {
    const state = useAppStore.getState();
    const newCat = state.addCategory({
      name: 'Gardening & Plants',
      icon: 'Flower',
      color: '#10B981',
    });

    const updated = useAppStore.getState();
    expect(updated.categories.find((c) => c.id === newCat.id)).toBeDefined();
    expect(updated.categories.find((c) => c.id === newCat.id)?.name).toBe('Gardening & Plants');
  });

  it('imports structured JSON report and matches explicit paid_by names and categories', () => {
    const state = useAppStore.getState();
    const customReport: RawExpenseReport = {
      report_title: 'Custom Import',
      currency: 'EUR',
      expenses: [
        {
          date: '2026-08-20',
          merchant: 'Pharmacy Center',
          amount: 32.5,
          category: 'Health & Pharmacy',
          paid_by: 'Elena',
          is_recurring: false,
        },
        {
          date: '2026-08-21',
          merchant: 'Unknown Specialty Shop',
          amount: 15.0,
          category: 'NonExistentCategory',
          is_recurring: false,
        },
      ],
    };

    const result = state.importExpenseReport(customReport, 'custom.json');
    expect(result.importedCount).toBe(2);
    expect(result.totalAmount).toBe(47.5);

    const updated = useAppStore.getState();
    const importedHealth = updated.expenses.find((e) => e.merchant_name === 'Pharmacy Center');
    expect(importedHealth).toBeDefined();
    // Elena's ID is mem_2
    expect(importedHealth?.paid_by_member_id).toBe('mem_2');
    expect(importedHealth?.category_id).toBe('cat_healthcare');

    const importedUnknown = updated.expenses.find(
      (e) => e.merchant_name === 'Unknown Specialty Shop',
    );
    expect(importedUnknown).toBeDefined();
    expect(importedUnknown?.category_id).toBe('cat_other');
  });

  it('updates family settings (name and currency)', () => {
    const state = useAppStore.getState();
    state.updateFamilySettings({ name: 'The Rossi Family', currency: '$' });

    const updatedState = useAppStore.getState();
    expect(updatedState.family.name).toBe('The Rossi Family');
    expect(updatedState.family.currency).toBe('$');
  });

  it('clears all expenses and batches when clearAllExpenses is called', () => {
    const state = useAppStore.getState();
    expect(state.expenses.length).toBeGreaterThan(0);

    state.clearAllExpenses();

    const updatedState = useAppStore.getState();
    expect(updatedState.expenses).toHaveLength(0);
    expect(updatedState.importBatches).toHaveLength(0);
  });

  it('updates and resets search and filter options', () => {
    const state = useAppStore.getState();
    state.setFilters({ searchQuery: 'Netflix', selectedMemberId: 'mem_1', sortBy: 'amount_desc' });

    let updatedState = useAppStore.getState();
    expect(updatedState.filters.searchQuery).toBe('Netflix');
    expect(updatedState.filters.selectedMemberId).toBe('mem_1');
    expect(updatedState.filters.sortBy).toBe('amount_desc');

    updatedState.resetFilters();
    updatedState = useAppStore.getState();
    expect(updatedState.filters.searchQuery).toBe('');
    expect(updatedState.filters.selectedMemberId).toBeUndefined();
  });
});
