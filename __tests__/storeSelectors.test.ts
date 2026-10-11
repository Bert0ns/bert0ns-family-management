import {
  useAppStore,
  selectExpenses,
  selectMembers,
  selectCategories,
  selectFamily,
  selectCurrentMemberId,
  selectSelectedPeriod,
  selectFilters,
  selectImportBatches,
  selectNotificationPreferences,
  selectNotifications,
} from '@/services/store';

describe('Store Selectors and Atomic Slicing [P5-07, P2-10, P4-09]', () => {
  beforeEach(() => {
    useAppStore.getState().resetToSampleData();
  });

  it('correctly selects individual atomic slices without full store reference', () => {
    const state = useAppStore.getState();

    expect(selectExpenses(state)).toBe(state.expenses);
    expect(selectMembers(state)).toBe(state.members);
    expect(selectCategories(state)).toBe(state.categories);
    expect(selectFamily(state)).toBe(state.family);
    expect(selectCurrentMemberId(state)).toBe(state.currentMemberId);
    expect(selectSelectedPeriod(state)).toBe(state.selectedPeriod);
    expect(selectFilters(state)).toBe(state.filters);
    expect(selectImportBatches(state)).toBe(state.importBatches);
    expect(selectNotificationPreferences(state)).toBe(state.notificationPreferences);
    expect(selectNotifications(state)).toBe(state.notifications);
  });

  it('updating an expense modifies expenses slice while preserving members reference', () => {
    const initialMembers = selectMembers(useAppStore.getState());
    const initialExpenses = selectExpenses(useAppStore.getState());

    expect(initialExpenses.length).toBeGreaterThan(0);
    const targetId = initialExpenses[0].id;

    useAppStore.getState().updateExpense(targetId, { merchant_name: 'Supermarket Updated' });

    const updatedState = useAppStore.getState();
    const updatedMembers = selectMembers(updatedState);
    const updatedExpenses = selectExpenses(updatedState);

    // Atomic slice isolation: members reference did NOT change
    expect(updatedMembers).toBe(initialMembers);
    // Expenses reference did change
    expect(updatedExpenses).not.toBe(initialExpenses);
    expect(updatedExpenses.find((e) => e.id === targetId)?.merchant_name).toBe(
      'Supermarket Updated',
    );
  });

  it('reconciles remote expenses using ISO string sorting without NaN or order disruption', () => {
    const remoteExpenses = [
      {
        id: 'remote-1',
        family_id: 'fam_1',
        paid_by_member_id: 'mem_1',
        category_id: 'cat_groceries',
        transaction_date: '2026-03-01',
        merchant_name: 'First',
        amount: 25.0,
        is_recurring: false,
        created_at: '2026-03-01T10:00:00Z',
        updated_at: '2026-03-01T10:00:00Z',
      },
      {
        id: 'remote-2',
        family_id: 'fam_1',
        paid_by_member_id: 'mem_1',
        category_id: 'cat_groceries',
        transaction_date: '2026-03-15',
        merchant_name: 'Second',
        amount: 50.0,
        is_recurring: false,
        created_at: '2026-03-15T10:00:00Z',
        updated_at: '2026-03-15T10:00:00Z',
      },
      {
        id: 'remote-3',
        family_id: 'fam_1',
        paid_by_member_id: 'mem_1',
        category_id: 'cat_groceries',
        transaction_date: '2026-03-10',
        merchant_name: 'Third',
        amount: 15.0,
        is_recurring: false,
        created_at: '2026-03-10T10:00:00Z',
        updated_at: '2026-03-10T10:00:00Z',
      },
    ];

    useAppStore.getState().reconcileRemoteExpenses(remoteExpenses);

    const sortedExpenses = selectExpenses(useAppStore.getState());
    const remoteSubset = sortedExpenses.filter((e) => e.id.startsWith('remote-'));

    // Should be descending: 2026-03-15, 2026-03-10, 2026-03-01
    expect(remoteSubset[0].id).toBe('remote-2');
    expect(remoteSubset[1].id).toBe('remote-3');
    expect(remoteSubset[2].id).toBe('remote-1');
  });

  it('pre-indexes categories and members in importExpenseReport', () => {
    const sampleReport = {
      version: '1.0',
      currency: '€' as const,
      expenses: [
        {
          date: '2026-03-10',
          merchant: 'Fresh Market',
          amount: 42.5,
          category: 'groceries',
          paid_by: 'Marco',
          is_recurring: false,
        },
        {
          date: '2026-03-11',
          merchant: 'Electric Utility',
          amount: 80.0,
          category: 'utilities',
          paid_by: 'Unknown Member',
          is_recurring: false,
        },
      ],
    };

    const res = useAppStore.getState().importExpenseReport(sampleReport, 'test-report.json');
    expect(res.importedCount).toBe(2);
    expect(res.totalAmount).toBe(122.5);

    const expenses = selectExpenses(useAppStore.getState());
    const importedGrocery = expenses.find((e) => e.merchant_name === 'Fresh Market');
    expect(importedGrocery).toBeDefined();
    expect(importedGrocery?.category_id).toBe('cat_groceries');
  });
});
