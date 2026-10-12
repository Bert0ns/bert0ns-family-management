import { useAppStore, registerStoreMutationListener, StoreMutationEvent } from '@/services/store';

describe('Expense Editing Functionality', () => {
  beforeEach(() => {
    useAppStore.getState().resetToSampleData();
  });

  it('updates an existing expense and triggers mutation notification', () => {
    const mutations: StoreMutationEvent[] = [];
    const unsubscribe = registerStoreMutationListener((event) => {
      mutations.push(event);
    });

    const expenseId = 'exp_1';
    const original = useAppStore.getState().expenses.find((e) => e.id === expenseId);
    expect(original).toBeDefined();

    useAppStore.getState().updateExpense(expenseId, {
      amount: 88.99,
      merchant_name: 'Conad Superstore Updated',
      notes: 'Weekly family restock with discount applied',
      payment_method: 'Debit Card',
    });

    const updated = useAppStore.getState().expenses.find((e) => e.id === expenseId);
    expect(updated).toBeDefined();
    expect(updated?.amount).toBe(88.99);
    expect(updated?.merchant_name).toBe('Conad Superstore Updated');
    expect(updated?.notes).toBe('Weekly family restock with discount applied');
    expect(updated?.payment_method).toBe('Debit Card');
    expect(typeof updated?.updated_at).toBe('string');
    expect(new Date(updated?.updated_at || '').getTime()).toBeGreaterThan(0);

    const mutation = mutations.find(
      (m) => m.entity === 'expense' && m.operation === 'UPDATE' && m.entity_id === expenseId,
    );
    expect(mutation).toBeDefined();
    expect(mutation?.payload.amount).toBe(88.99);

    unsubscribe();
  });

  it('normalizes expense amount to two decimals on update', () => {
    const expenseId = 'exp_1';
    useAppStore.getState().updateExpense(expenseId, {
      amount: 45.12999,
    });

    const updated = useAppStore.getState().expenses.find((e) => e.id === expenseId);
    expect(updated?.amount).toBe(45.13);
  });
});
