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

  // Family & Member Actions
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
  selectedMemberId: undefined,
  selectedCategoryId: undefined,
  startDate: undefined,
  endDate: undefined,
  minAmount: undefined,
  maxAmount: undefined,
  sortBy: 'date_desc',
};

export const useAppStore = create<AppState>((set, get) => ({
  family: INITIAL_FAMILY,
  members: INITIAL_MEMBERS,
  categories: INITIAL_CATEGORIES,
  budgets: INITIAL_BUDGETS,
  expenses: INITIAL_EXPENSES,
  importBatches: [],
  currentMemberId: INITIAL_MEMBERS[0].id,
  selectedPeriod: '2026-08',
  filters: DEFAULT_FILTERS,

  setCurrentMemberId: (id) => set({ currentMemberId: id }),
  setSelectedPeriod: (period) => set({ selectedPeriod: period }),
  setFilters: (newFilters) =>
    set((state) => ({
      filters: { ...state.filters, ...newFilters },
    })),
  resetFilters: () => set({ filters: DEFAULT_FILTERS }),

  addExpense: (expenseData) => {
    const state = get();
    const newExpense: Expense = {
      ...expenseData,
      id: `exp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      family_id: state.family.id,
      created_at: new Date().toISOString(),
    };
    set((state) => ({
      expenses: [newExpense, ...state.expenses],
    }));
    return newExpense;
  },

  updateExpense: (id, updates) => {
    set((state) => ({
      expenses: state.expenses.map((exp) => (exp.id === id ? { ...exp, ...updates } : exp)),
    }));
  },

  deleteExpense: (id) => {
    set((state) => ({
      expenses: state.expenses.filter((exp) => exp.id !== id),
    }));
  },

  addMember: (memberData) => {
    const state = get();
    const newMember: FamilyMember = {
      ...memberData,
      id: `mem_${Date.now()}`,
      family_id: state.family.id,
    };
    set((state) => ({
      members: [...state.members, newMember],
    }));
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
      id: `cat_${Date.now()}`,
      family_id: state.family.id,
    };
    set((state) => ({
      categories: [...state.categories, newCategory],
    }));
    return newCategory;
  },

  updateBudget: (categoryId, limit) => {
    set((state) => {
      const existing = state.budgets.find(
        (b) => b.category_id === categoryId && b.period === state.selectedPeriod,
      );
      if (existing) {
        return {
          budgets: state.budgets.map((b) =>
            b.id === existing.id ? { ...b, monthly_limit: limit } : b,
          ),
        };
      } else {
        const newBudget: Budget = {
          id: `b_${Date.now()}`,
          family_id: state.family.id,
          category_id: categoryId,
          monthly_limit: limit,
          period: state.selectedPeriod,
        };
        return {
          budgets: [...state.budgets, newBudget],
        };
      }
    });
  },

  importExpenseReport: (report, fileName) => {
    const state = get();
    const batchId = `batch_${Date.now()}`;

    // Find or fallback to member
    const uploaderMember =
      state.members.find(
        (m) => m.display_name.toLowerCase() === (report.uploaded_by || '').toLowerCase(),
      ) ||
      state.members.find((m) => m.id === state.currentMemberId) ||
      state.members[0];

    let totalAmount = 0;
    const newExpenses: Expense[] = report.expenses.map((rawExp, index) => {
      totalAmount += rawExp.amount;

      // Match category name or fallback to "General & Other"
      const matchedCat =
        state.categories.find((c) => c.name.toLowerCase() === rawExp.category.toLowerCase()) ||
        state.categories.find((c) => c.id === 'cat_other') ||
        state.categories[0];

      return {
        id: `exp_imp_${Date.now()}_${index}`,
        family_id: state.family.id,
        paid_by_member_id: uploaderMember.id,
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
