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

  it('updates family settings (name only, currency remains EUR)', () => {
    const state = useAppStore.getState();
    state.updateFamilySettings({ name: 'The Rossi Family' });

    const updatedState = useAppStore.getState();
    expect(updatedState.family.name).toBe('The Rossi Family');
    expect(updatedState.family.currency).toBe('€');
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

  it('retains and calculates split details when importing a report with splits', () => {
    const state = useAppStore.getState();
    const result = state.importExpenseReport(SAMPLE_IMPORT_REPORT, 'sample.json');
    expect(result.importedCount).toBe(SAMPLE_IMPORT_REPORT.expenses.length);

    const updatedState = useAppStore.getState();
    const pizzaExpense = updatedState.expenses.find((e) => e.merchant_name === 'Pizzeria Da Mario');
    expect(pizzaExpense).toBeDefined();
    expect(pizzaExpense?.splits).toBeDefined();
    expect(pizzaExpense?.splits).toHaveLength(2);
    // 64.0 split equally between Berto and Elena is 32.0 each
    expect(pizzaExpense?.splits?.[0].share_amount).toBe(32);
    expect(pizzaExpense?.splits?.[1].share_amount).toBe(32);
  });

  it('updates member permissions, roles, and profile', () => {
    const state = useAppStore.getState();
    const targetMember = state.members[1]; // mem_2 Elena

    state.updateMember(targetMember.id, {
      role: 'VIEWER',
      display_name: 'Elena (Viewer)',
      color_code: '#10B981',
    });

    const updated = useAppStore.getState();
    const modifiedMember = updated.members.find((m) => m.id === targetMember.id);
    expect(modifiedMember?.role).toBe('VIEWER');
    expect(modifiedMember?.display_name).toBe('Elena (Viewer)');
    expect(modifiedMember?.color_code).toBe('#10B981');
  });

  it('deletes member and all related data (cascade delete of expenses and split cleanup)', () => {
    const state = useAppStore.getState();

    // Add an expense paid by mem_2
    const exp1 = state.addExpense({
      merchant_name: "Elena's Special Purchase",
      amount: 50.0,
      category_id: 'cat_groceries',
      paid_by_member_id: 'mem_2',
      transaction_date: '2026-08-15',
      is_recurring: false,
    });

    // Add an expense paid by mem_1 that has a split with mem_2
    const exp2 = state.addExpense({
      merchant_name: 'Joint Dinner',
      amount: 100.0,
      category_id: 'cat_groceries',
      paid_by_member_id: 'mem_1',
      transaction_date: '2026-08-16',
      is_recurring: false,
      splits: [
        { member_id: 'mem_1', share_amount: 50.0, percentage: 50 },
        { member_id: 'mem_2', share_amount: 50.0, percentage: 50 },
      ],
    });

    // Verify initial presence
    expect(useAppStore.getState().expenses.some((e) => e.id === exp1.id)).toBe(true);

    // Set active member to mem_2
    state.setCurrentMemberId('mem_2');
    expect(useAppStore.getState().currentMemberId).toBe('mem_2');

    // Delete mem_2
    state.deleteMember('mem_2');

    const updated = useAppStore.getState();

    // 1. Member is removed
    expect(updated.members.find((m) => m.id === 'mem_2')).toBeUndefined();

    // 2. Expenses paid by mem_2 are cascade deleted
    expect(updated.expenses.find((e) => e.id === exp1.id)).toBeUndefined();

    // 3. Splits involving mem_2 are cleaned up (only 1 member remaining -> splits cleared)
    const updatedJointExp = updated.expenses.find((e) => e.id === exp2.id);
    expect(updatedJointExp).toBeDefined();
    expect(updatedJointExp?.splits).toBeUndefined();

    // 4. Current member ID safely fell back to remaining member
    expect(updated.currentMemberId).not.toBe('mem_2');
    expect(updated.members.some((m) => m.id === updated.currentMemberId)).toBe(true);
  });

  it('prevents deletion of the last remaining member', () => {
    const state = useAppStore.getState();
    const remainingIds = state.members.map((m) => m.id);

    // Delete down to 1 member
    for (let i = 0; i < remainingIds.length - 1; i++) {
      state.deleteMember(remainingIds[i]);
    }

    const stateWithOne = useAppStore.getState();
    expect(stateWithOne.members).toHaveLength(1);
    const lastMemberId = stateWithOne.members[0].id;

    // Attempt deleting the only remaining member
    stateWithOne.deleteMember(lastMemberId);

    const finalState = useAppStore.getState();
    expect(finalState.members).toHaveLength(1);
    expect(finalState.members[0].id).toBe(lastMemberId);
  });

  it('deletes categories correctly', () => {
    const state = useAppStore.getState();
    const initialCategoryCount = state.categories.length;

    state.deleteCategory('cat_other');
    const updated = useAppStore.getState();
    expect(updated.categories).toHaveLength(initialCategoryCount - 1);
    expect(updated.categories.find((c) => c.id === 'cat_other')).toBeUndefined();
  });
});
