import { create } from 'zustand';
import {
  Family,
  FamilyMember,
  Category,
  Budget,
  Expense,
  ImportBatch,
  FilterOptions,
  RawExpenseReport,
} from '@/types';
import {
  INITIAL_FAMILY,
  INITIAL_MEMBERS,
  INITIAL_CATEGORIES,
  INITIAL_BUDGETS,
  INITIAL_EXPENSES,
} from '@/data/mockData';

interface AppState {
  family: Family;
  members: FamilyMember[];
  categories: Category[];
  budgets: Budget[];
  expenses: Expense[];
  importBatches: ImportBatch[];
  currentMemberId: string;
  selectedPeriod: string; // YYYY-MM
  filters: FilterOptions;

  // Actions
  setCurrentMemberId: (id: string) => void;
  setSelectedPeriod: (period: string) => void;
  setFilters: (filters: Partial<FilterOptions>) => void;
  resetFilters: () => void;

  // Expense CRUD
  addExpense: (expense: Omit<Expense, 'id' | 'created_at' | 'family_id'>) => Expense;
  updateExpense: (id: string, updates: Partial<Expense>) => void;
  deleteExpense: (id: string) => void;
  clearAllExpenses: () => void;

  // Family & Member Actions
  updateFamilySettings: (updates: { name?: string; currency?: string }) => void;
  addMember: (member: Omit<FamilyMember, 'id' | 'family_id'>) => FamilyMember;
  updateMember: (id: string, updates: Partial<FamilyMember>) => void;

  // Category & Budget Actions
  addCategory: (category: Omit<Category, 'id' | 'family_id'>) => Category;
  updateBudget: (categoryId: string | undefined, limit: number) => void;

  // Import JSON Actions
  importExpenseReport: (
    report: RawExpenseReport,
    fileName: string,
  ) => { importedCount: number; totalAmount: number; batchId: string };

  // Data Reset
  resetToSampleData: () => void;
}

const DEFAULT_FILTERS: FilterOptions = {
  searchQuery: '',
};

export const useAppStore = create<AppState>((set, get) => ({
  family: INITIAL_FAMILY,
  members: INITIAL_MEMBERS,
  categories: INITIAL_CATEGORIES,
  budgets: INITIAL_BUDGETS,
  expenses: INITIAL_EXPENSES,
  importBatches: [],
  currentMemberId: 'mem_1',
  selectedPeriod: '2026-08',
  filters: DEFAULT_FILTERS,

  setCurrentMemberId: (id) => set({ currentMemberId: id }),
  setSelectedPeriod: (period) => set({ selectedPeriod: period }),
  setFilters: (filters) => set((state) => ({ filters: { ...state.filters, ...filters } })),
  resetFilters: () => set({ filters: DEFAULT_FILTERS }),

  updateFamilySettings: (updates) => {
    set((state) => ({
      family: {
        ...state.family,
        ...updates,
      },
    }));
  },

  addExpense: (expenseData) => {
    const state = get();
    const newExpense: Expense = {
      ...expenseData,
      id: `exp_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      family_id: state.family.id,
      created_at: new Date().toISOString(),
    };
    set((state) => ({ expenses: [newExpense, ...state.expenses] }));
    return newExpense;
  },

  updateExpense: (id, updates) => {
    set((state) => ({
      expenses: state.expenses.map((e) => (e.id === id ? { ...e, ...updates } : e)),
    }));
  },

  deleteExpense: (id) => {
    set((state) => ({
      expenses: state.expenses.filter((e) => e.id !== id),
    }));
  },

  clearAllExpenses: () => {
    set({ expenses: [], importBatches: [] });
  },

  addMember: (memberData) => {
    const state = get();
    const newMember: FamilyMember = {
      ...memberData,
      id: `mem_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      family_id: state.family.id,
    };
    set((state) => ({ members: [...state.members, newMember] }));
    return newMember;
  },

  updateMember: (id, updates) => {
    set((state) => ({
      members: state.members.map((m) => (m.id === id ? { ...m, ...updates } : m)),
    }));
  },

  addCategory: (categoryData) => {
    const state = get();
    const newCategory: Category = {
      ...categoryData,
      id: `cat_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      family_id: state.family.id,
    };
    set((state) => ({ categories: [...state.categories, newCategory] }));
    return newCategory;
  },

  updateBudget: (categoryId, limit) => {
    const state = get();
    const period = state.selectedPeriod;
    const existingIndex = state.budgets.findIndex(
      (b) => b.category_id === categoryId && b.period === period,
    );

    if (existingIndex >= 0) {
      const updatedBudgets = [...state.budgets];
      updatedBudgets[existingIndex] = {
        ...updatedBudgets[existingIndex],
        monthly_limit: limit,
      };
      set({ budgets: updatedBudgets });
    } else {
      const newBudget: Budget = {
        id: `bud_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        family_id: state.family.id,
        category_id: categoryId,
        monthly_limit: limit,
        period,
      };
      set({ budgets: [...state.budgets, newBudget] });
    }
  },

  importExpenseReport: (report, fileName) => {
    const state = get();
    const batchId = `batch_${Date.now()}`;
    const totalAmount = report.expenses.reduce((sum, e) => sum + e.amount, 0);

    const uploaderMember =
      state.members.find((m) => m.id === state.currentMemberId) || state.members[0];

    const newExpenses: Expense[] = report.expenses.map((rawExp, index) => {
      let paidMember = uploaderMember;
      if (rawExp.paid_by) {
        const found = state.members.find(
          (m) => m.display_name.toLowerCase() === rawExp.paid_by?.toLowerCase(),
        );
        if (found) paidMember = found;
      }

      // Match category name or fallback to "General & Other"
      const matchedCat =
        state.categories.find((c) => c.name.toLowerCase() === rawExp.category.toLowerCase()) ||
        state.categories.find((c) => c.id === 'cat_other') ||
        state.categories[0];

      return {
        id: `exp_imp_${Date.now()}_${index}`,
        family_id: state.family.id,
        paid_by_member_id: paidMember.id,
        category_id: matchedCat.id,
        import_batch_id: batchId,
        transaction_date: rawExp.date,
        merchant_name: rawExp.merchant,
        amount: rawExp.amount,
        notes: rawExp.notes,
        payment_method: rawExp.payment_method || 'Imported File',
        is_recurring: rawExp.is_recurring,
        is_verified: true,
        created_at: new Date().toISOString(),
      };
    });

    const newBatch: ImportBatch = {
      id: batchId,
      family_id: state.family.id,
      imported_by_member_id: uploaderMember.id,
      file_name: fileName,
      total_records: newExpenses.length,
      total_amount: totalAmount,
      created_at: new Date().toISOString(),
      raw_payload: report,
    };

    set((state) => ({
      expenses: [...newExpenses, ...state.expenses],
      importBatches: [newBatch, ...state.importBatches],
    }));

    return { importedCount: newExpenses.length, totalAmount, batchId };
  },

  resetToSampleData: () => {
    set({
      family: INITIAL_FAMILY,
      members: INITIAL_MEMBERS,
      categories: INITIAL_CATEGORIES,
      budgets: INITIAL_BUDGETS,
      expenses: INITIAL_EXPENSES,
      importBatches: [],
      filters: DEFAULT_FILTERS,
    });
  },
}));
