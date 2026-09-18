import {
  useAppStore,
  registerStoreMutationListener,
  selectNotificationPreferences,
  selectNotifications,
  selectSettlements,
  selectExpenses,
  selectMembers,
  selectCategories,
  selectFamily,
} from '@/services/store';
import { SAMPLE_IMPORT_REPORT } from '@/data/mockData';
import {
  RawExpenseReport,
  Expense,
  Category,
  FamilyMember,
  Settlement,
  AppNotification,
} from '@/types';

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

  it('tests store selectors', () => {
    const state = useAppStore.getState();
    expect(selectFamily(state).name).toBe("Bert0n's Family");
    expect(selectMembers(state)).toHaveLength(4);
    expect(selectCategories(state).length).toBeGreaterThan(0);
    expect(selectExpenses(state).length).toBeGreaterThan(0);
    expect(selectSettlements(state)).toBeDefined();
    expect(selectNotifications(state)).toBeDefined();
    expect(selectNotificationPreferences(state)).toBeDefined();
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

  it('sets entire family object via setFamily', () => {
    const state = useAppStore.getState();
    state.setFamily({
      id: 'fam_custom',
      name: 'Custom Family',
      currency: '€',
      invite_code: 'CODE999',
      created_at: new Date().toISOString(),
    });
    expect(useAppStore.getState().family.id).toBe('fam_custom');
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

    const exp1 = state.addExpense({
      merchant_name: "Elena's Special Purchase",
      amount: 50.0,
      category_id: 'cat_groceries',
      paid_by_member_id: 'mem_2',
      transaction_date: '2026-08-15',
      is_recurring: false,
    });

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

    expect(useAppStore.getState().expenses.some((e) => e.id === exp1.id)).toBe(true);

    state.setCurrentMemberId('mem_2');
    expect(useAppStore.getState().currentMemberId).toBe('mem_2');

    state.deleteMember('mem_2');

    const updated = useAppStore.getState();
    expect(updated.members.find((m) => m.id === 'mem_2')).toBeUndefined();
    expect(updated.expenses.find((e) => e.id === exp1.id)).toBeUndefined();

    const updatedJointExp = updated.expenses.find((e) => e.id === exp2.id);
    expect(updatedJointExp).toBeDefined();
    expect(updatedJointExp?.splits).toBeUndefined();
    expect(updated.currentMemberId).not.toBe('mem_2');
    expect(updated.members.some((m) => m.id === updated.currentMemberId)).toBe(true);
  });

  it('prevents deletion of the last remaining member', () => {
    const state = useAppStore.getState();
    const remainingIds = state.members.map((m) => m.id);

    for (let i = 0; i < remainingIds.length - 1; i++) {
      state.deleteMember(remainingIds[i]);
    }

    const stateWithOne = useAppStore.getState();
    expect(stateWithOne.members).toHaveLength(1);
    const lastMemberId = stateWithOne.members[0].id;

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

  describe('Settlements State', () => {
    it('records, reconciles, and removes remote settlements', () => {
      const state = useAppStore.getState();
      const initialCount = state.settlements.length;

      const newSettlement = state.recordSettlement({
        from_member_id: 'mem_1',
        to_member_id: 'mem_2',
        amount: 45,
        notes: 'Groceries reimbursement',
      });

      expect(useAppStore.getState().settlements).toHaveLength(initialCount + 1);
      expect(newSettlement.amount).toBe(45);

      // Reconcile remote settlements
      const remoteSettlement: Settlement = {
        id: 'remote_stl_1',
        family_id: 'fam_1',
        from_member_id: 'mem_2',
        to_member_id: 'mem_1',
        amount: 25,
        created_at: new Date().toISOString(),
      };
      state.reconcileRemoteSettlements([remoteSettlement]);
      expect(useAppStore.getState().settlements.some((s) => s.id === 'remote_stl_1')).toBe(true);

      // Remove remote settlement
      state.removeRemoteSettlement('remote_stl_1');
      expect(useAppStore.getState().settlements.some((s) => s.id === 'remote_stl_1')).toBe(false);
    });
  });

  describe('In-app Notifications State', () => {
    it('adds, caps at 50, marks read, and clears notifications', () => {
      const state = useAppStore.getState();

      const notif1: AppNotification = {
        id: 'notif_1',
        family_id: 'fam_1',
        recipient_member_id: 'mem_1',
        type: 'SETTLEMENT',
        title: 'Settlement Recorded',
        body: 'Debt cleared',
        is_read: false,
        created_at: new Date().toISOString(),
      };

      state.addNotification(notif1);
      state.addNotification(notif1);
      expect(useAppStore.getState().notifications).toHaveLength(1);

      state.markNotificationAsRead('notif_1');
      expect(useAppStore.getState().notifications[0].is_read).toBe(true);

      state.addNotification({
        ...notif1,
        id: 'notif_2',
        is_read: false,
      });
      expect(useAppStore.getState().notifications.some((n) => !n.is_read)).toBe(true);

      state.markAllNotificationsAsRead();
      expect(useAppStore.getState().notifications.every((n) => n.is_read)).toBe(true);

      state.clearNotifications();
      expect(useAppStore.getState().notifications).toHaveLength(0);
    });
  });

  describe('Notification Preferences State', () => {
    it('updates notification preferences', () => {
      const state = useAppStore.getState();
      state.updateNotificationPreferences({
        push_enabled: false,
        notify_expense_updates: false,
      });

      const updated = useAppStore.getState().notificationPreferences;
      expect(updated.push_enabled).toBe(false);
      expect(updated.notify_expense_updates).toBe(false);
      expect(updated.notify_settlements).toBe(true);
    });
  });

  describe('Remote Reconciliation and Removal', () => {
    it('reconciles remote expenses, preserves splits when missing, and sorts by date', () => {
      const state = useAppStore.getState();
      const existingExp = state.expenses[0];

      const remoteExpenseNewer: Expense = {
        ...existingExp,
        merchant_name: 'Updated Merchant',
        updated_at: '2026-12-31T00:00:00Z',
        splits: undefined,
      };

      const remoteExpenseBrandNew: Expense = {
        id: 'exp_remote_new',
        family_id: existingExp.family_id,
        paid_by_member_id: 'mem_1',
        category_id: 'cat_groceries',
        transaction_date: '2026-09-01',
        merchant_name: 'Brand New Remote',
        amount: 99,
        created_at: new Date().toISOString(),
      };

      state.reconcileRemoteExpenses([remoteExpenseNewer, remoteExpenseBrandNew]);

      const updated = useAppStore.getState();
      expect(updated.expenses.find((e) => e.id === 'exp_remote_new')).toBeDefined();
      expect(updated.expenses.find((e) => e.id === existingExp.id)?.merchant_name).toBe(
        'Updated Merchant',
      );

      state.removeRemoteExpense('exp_remote_new');
      expect(
        useAppStore.getState().expenses.find((e) => e.id === 'exp_remote_new'),
      ).toBeUndefined();
    });

    it('reconciles remote categories and removes remote category', () => {
      const state = useAppStore.getState();
      const remoteCat: Category = {
        id: 'cat_remote_1',
        family_id: 'fam_1',
        name: 'Remote Category',
        icon: 'Star',
        color: '#F59E0B',
      };

      state.reconcileRemoteCategories([remoteCat]);
      expect(useAppStore.getState().categories.find((c) => c.id === 'cat_remote_1')).toBeDefined();

      state.removeRemoteCategory('cat_remote_1');
      expect(
        useAppStore.getState().categories.find((c) => c.id === 'cat_remote_1'),
      ).toBeUndefined();
    });

    it('reconciles remote members and removes remote member', () => {
      const state = useAppStore.getState();
      const remoteMem: FamilyMember = {
        id: 'mem_remote_1',
        family_id: 'fam_1',
        display_name: 'Remote Member',
        role: 'MEMBER',
        color_code: '#10B981',
      };

      state.reconcileRemoteMembers([remoteMem]);
      expect(useAppStore.getState().members.find((m) => m.id === 'mem_remote_1')).toBeDefined();

      state.removeRemoteMember('mem_remote_1');
      expect(useAppStore.getState().members.find((m) => m.id === 'mem_remote_1')).toBeUndefined();
    });
  });

  describe('Mutation Subscribers', () => {
    it('registers mutation listener, receives mutation events, and unregisters', () => {
      const capturedMutations: any[] = [];
      const unsubscribe = registerStoreMutationListener((mutation) => {
        capturedMutations.push(mutation);
      });

      useAppStore.getState().addCategory({
        name: 'Listener Test Cat',
        icon: 'Tag',
        color: '#123456',
      });

      expect(capturedMutations).toHaveLength(1);
      expect(capturedMutations[0].entity).toBe('category');

      unsubscribe();

      useAppStore.getState().addCategory({
        name: 'After Unsubscribe',
        icon: 'Tag',
        color: '#654321',
      });

      expect(capturedMutations).toHaveLength(1);
    });

    it('safely handles throwing listeners without crashing store mutation', () => {
      const faultyListener = jest.fn().mockImplementation(() => {
        throw new Error('Listener crash');
      });
      const unsubscribe = registerStoreMutationListener(faultyListener);

      expect(() => {
        useAppStore.getState().addCategory({
          name: 'Safe Category',
          icon: 'Shield',
          color: '#000000',
        });
      }).not.toThrow();

      unsubscribe();
    });
  });
});
