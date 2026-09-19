import { useAppStore, registerStoreMutationListener, StoreMutationEvent } from '@/services/store';
import { RawExpenseReport } from '@/types';

describe('Store Remediation Tests (Partition 1)', () => {
  beforeEach(() => {
    useAppStore.getState().resetToSampleData();
  });

  it('emits store mutation events for all imported expenses in importExpenseReport', () => {
    const mutations: StoreMutationEvent[] = [];
    const unsubscribe = registerStoreMutationListener((event) => mutations.push(event));

    const report: RawExpenseReport = {
      currency: '€',
      expenses: [
        {
          date: '2026-09-01',
          amount: 50,
          merchant: 'Test Merchant 1',
          category: 'Groceries',
          paid_by: 'Marco',
          is_recurring: false,
        },
        {
          date: '2026-09-02',
          amount: 25,
          merchant: 'Test Merchant 2',
          category: 'Dining Out',
          paid_by: 'Laura',
          is_recurring: false,
        },
      ],
    };

    useAppStore.getState().importExpenseReport(report, 'test.json');

    const insertedExpenses = mutations.filter(
      (m) => m.entity === 'expense' && m.operation === 'INSERT',
    );
    expect(insertedExpenses.length).toBe(2);
    expect(insertedExpenses[0].payload.merchant_name).toBe('Test Merchant 1');

    unsubscribe();
  });

  it('generates valid RFC4122 UUIDs for imported expenses and batches', () => {
    const report: RawExpenseReport = {
      currency: '€',
      expenses: [
        {
          date: '2026-09-01',
          amount: 20,
          merchant: 'UUID Store',
          category: 'Groceries',
          paid_by: 'Marco',
          is_recurring: false,
        },
      ],
    };

    const result = useAppStore.getState().importExpenseReport(report, 'uuid_test.json');
    const imported = useAppStore.getState().expenses.find((e) => e.merchant_name === 'UUID Store');

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    expect(imported?.id).toMatch(uuidRegex);
    expect(result.batchId).toMatch(uuidRegex);
  });

  it('notifies cascaded expense deletions when a member is deleted', () => {
    const deletedEvents: StoreMutationEvent[] = [];
    const unsubscribe = registerStoreMutationListener((e) => deletedEvents.push(e));

    const targetMemberId = 'mem_1';
    useAppStore.getState().deleteMember(targetMemberId);

    const expenseDeletions = deletedEvents.filter(
      (e) => e.entity === 'expense' && e.operation === 'DELETE',
    );
    expect(expenseDeletions.length).toBeGreaterThan(0);

    const memberDeletions = deletedEvents.filter(
      (e) => e.entity === 'member' && e.operation === 'DELETE' && e.entity_id === targetMemberId,
    );
    expect(memberDeletions.length).toBe(1);

    unsubscribe();
  });

  it('prevents deletion when only one category remains in store', () => {
    const onlyCat = useAppStore.getState().categories[0];
    useAppStore.setState({ categories: [onlyCat] });

    useAppStore.getState().deleteCategory(onlyCat.id);

    expect(useAppStore.getState().categories).toHaveLength(1);
    expect(useAppStore.getState().categories[0].id).toBe(onlyCat.id);
  });

  it('supports multiple mutation listeners and clean unregistration', () => {
    let count1 = 0;
    let count2 = 0;

    const unreg1 = registerStoreMutationListener(() => {
      count1++;
    });
    const unreg2 = registerStoreMutationListener(() => {
      count2++;
    });

    useAppStore.getState().addExpense({
      paid_by_member_id: 'mem_1',
      category_id: 'cat_groceries',
      amount: 15,
      transaction_date: '2026-09-01',
      merchant_name: 'Snack Bar',
    });

    expect(count1).toBe(1);
    expect(count2).toBe(1);

    unreg1();

    useAppStore.getState().addExpense({
      paid_by_member_id: 'mem_1',
      category_id: 'cat_groceries',
      amount: 25,
      transaction_date: '2026-09-02',
      merchant_name: 'Coffee Shop',
    });

    expect(count1).toBe(1);
    expect(count2).toBe(2);

    unreg2();
  });

  it('enqueues expense UPDATE mutations BEFORE category DELETE mutation to satisfy foreign key constraints', () => {
    const mutations: StoreMutationEvent[] = [];
    const unsubscribe = registerStoreMutationListener((event) => mutations.push(event));

    const state = useAppStore.getState();
    const targetCat = state.categories[0];

    // Ensure there is an expense pointing to targetCat
    useAppStore.getState().addExpense({
      paid_by_member_id: 'mem_1',
      category_id: targetCat.id,
      amount: 42,
      transaction_date: '2026-09-01',
      merchant_name: 'Cat Target Merchant',
    });

    mutations.length = 0; // Clear previous mutations

    useAppStore.getState().deleteCategory(targetCat.id);

    const expenseUpdates = mutations.filter(
      (m) => m.entity === 'expense' && m.operation === 'UPDATE',
    );
    const categoryDeleteIdx = mutations.findIndex(
      (m) => m.entity === 'category' && m.operation === 'DELETE',
    );

    expect(expenseUpdates.length).toBeGreaterThan(0);
    expect(categoryDeleteIdx).toBeGreaterThan(0);
    // Every expense update must occur BEFORE the category delete
    const allUpdatesBeforeDelete = mutations
      .map((m, idx) => ({ m, idx }))
      .filter(({ m }) => m.entity === 'expense' && m.operation === 'UPDATE')
      .every(({ idx }) => idx < categoryDeleteIdx);

    expect(allUpdatesBeforeDelete).toBe(true);

    unsubscribe();
  });
});
