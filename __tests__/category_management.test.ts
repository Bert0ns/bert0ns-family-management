import { useAppStore, registerStoreMutationListener, StoreMutationEvent } from '@/services/store';

describe('Category Management (Editing and Deletion)', () => {
  beforeEach(() => {
    useAppStore.getState().resetToSampleData();
  });

  it('updates an existing category and notifies store mutations', () => {
    const mutations: StoreMutationEvent[] = [];
    const unsubscribe = registerStoreMutationListener((event) => {
      mutations.push(event);
    });

    const categoryId = 'cat_groceries';
    useAppStore.getState().updateCategory(categoryId, {
      name: 'Supermarket & Food',
      color: '#10B981',
      icon: 'ShoppingBag',
    });

    const updated = useAppStore.getState().categories.find((c) => c.id === categoryId);
    expect(updated).toBeDefined();
    expect(updated?.name).toBe('Supermarket & Food');
    expect(updated?.color).toBe('#10B981');
    expect(updated?.icon).toBe('ShoppingBag');

    const catMutation = mutations.find(
      (m) => m.entity === 'category' && m.operation === 'UPDATE' && m.entity_id === categoryId,
    );
    expect(catMutation).toBeDefined();
    expect(catMutation?.payload.name).toBe('Supermarket & Food');

    unsubscribe();
  });

  it('deletes a custom category and reassigns orphaned expenses to fallback category', () => {
    const mutations: StoreMutationEvent[] = [];
    const unsubscribe = registerStoreMutationListener((event) => {
      mutations.push(event);
    });

    // Add a custom category
    const customCat = useAppStore.getState().addCategory({
      name: 'Pet Supplies',
      color: '#EC4899',
      icon: 'HeartPulse',
    });

    // Add an expense assigned to this custom category
    const expense = useAppStore.getState().addExpense({
      amount: 35.5,
      merchant_name: 'Pet Store',
      category_id: customCat.id,
      paid_by_member_id: 'mem_1',
      transaction_date: '2026-08-10',
    });

    // Delete custom category with fallback to cat_other
    useAppStore.getState().deleteCategory(customCat.id, 'cat_other');

    // Category should be deleted
    const catExists = useAppStore.getState().categories.some((c) => c.id === customCat.id);
    expect(catExists).toBe(false);

    // Expense should be reassigned to cat_other
    const updatedExp = useAppStore.getState().expenses.find((e) => e.id === expense.id);
    expect(updatedExp?.category_id).toBe('cat_other');

    // Foreign key safety: expense UPDATE mutation must be emitted before category DELETE mutation
    const expUpdateIdx = mutations.findIndex(
      (m) => m.entity === 'expense' && m.operation === 'UPDATE' && m.entity_id === expense.id,
    );
    const catDeleteIdx = mutations.findIndex(
      (m) => m.entity === 'category' && m.operation === 'DELETE' && m.entity_id === customCat.id,
    );

    expect(expUpdateIdx).toBeGreaterThanOrEqual(0);
    expect(catDeleteIdx).toBeGreaterThanOrEqual(0);
    expect(expUpdateIdx).toBeLessThan(catDeleteIdx);

    unsubscribe();
  });

  it('prevents deleting the only remaining category', () => {
    // Reset store with just 1 category
    useAppStore.setState({
      categories: [
        { id: 'cat_sole', family_id: 'fam_1', name: 'General', color: '#10B981', icon: 'Tag' },
      ],
    });

    useAppStore.getState().deleteCategory('cat_sole');
    expect(useAppStore.getState().categories).toHaveLength(1);
    expect(useAppStore.getState().categories[0].id).toBe('cat_sole');
  });
});
