import { useAppStore } from '@/services/store';
import { SAMPLE_IMPORT_REPORT } from '@/data/mockData';

describe('useAppStore (State Management Unit Tests)', () => {
  beforeEach(() => {
    useAppStore.getState().resetToSampleData();
  });

  it('initializes with default mock family and members', () => {
    const state = useAppStore.getState();
    expect(state.family.name).toBe("Bert0n's Family");
    expect(state.members).toHaveLength(4);
    expect(state.expenses.length).toBeGreaterThan(0);
  });

  it('adds a new manual expense correctly', () => {
    const state = useAppStore.getState();
    const initialCount = state.expenses.length;

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

    const updatedState = useAppStore.getState();
    expect(updatedState.expenses).toHaveLength(initialCount + 1);
    expect(updatedState.expenses[0].id).toBe(newExp.id);
    expect(updatedState.expenses[0].merchant_name).toBe('Local Butcher');
    expect(updatedState.expenses[0].amount).toBe(45.8);
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

  it('imports a structured JSON expense report and creates an ImportBatch', () => {
    const state = useAppStore.getState();
    const initialExpCount = state.expenses.length;

    const result = state.importExpenseReport(SAMPLE_IMPORT_REPORT, 'september-expenses.json');

    expect(result.importedCount).toBe(5);
    expect(result.totalAmount).toBeCloseTo(462.1, 1);

    const updatedState = useAppStore.getState();
    expect(updatedState.expenses).toHaveLength(initialExpCount + 5);
    expect(updatedState.importBatches).toHaveLength(1);
    expect(updatedState.importBatches[0].file_name).toBe('september-expenses.json');
  });

  it('updates filters and resets filters correctly', () => {
    const state = useAppStore.getState();
    state.setFilters({ searchQuery: 'Netflix', selectedMemberId: 'mem_1' });

    let updatedState = useAppStore.getState();
    expect(updatedState.filters.searchQuery).toBe('Netflix');
    expect(updatedState.filters.selectedMemberId).toBe('mem_1');

    updatedState.resetFilters();
    updatedState = useAppStore.getState();
    expect(updatedState.filters.searchQuery).toBe('');
    expect(updatedState.filters.selectedMemberId).toBeUndefined();
  });
});
