import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  Family,
  FamilyMember,
  Category,
  Expense,
  ImportBatch,
  FilterOptions,
  RawExpenseReport,
  ExpenseSplit,
} from '@/types';
import {
  INITIAL_FAMILY,
  INITIAL_MEMBERS,
  INITIAL_CATEGORIES,
  INITIAL_EXPENSES,
} from '@/data/mockData';
import { calculateEqualSplits } from './splitCalculator';

interface AppState {
  family: Family;
  members: FamilyMember[];
  categories: Category[];
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
  updateFamilySettings: (updates: { name?: string }) => void;
  addMember: (member: Omit<FamilyMember, 'id' | 'family_id'>) => FamilyMember;
  updateMember: (id: string, updates: Partial<FamilyMember>) => void;
  deleteMember: (id: string) => void;

  // Category Actions
  addCategory: (category: Omit<Category, 'id' | 'family_id'>) => Category;
  deleteCategory: (id: string) => void;

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

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      family: INITIAL_FAMILY,
      members: INITIAL_MEMBERS,
      categories: INITIAL_CATEGORIES,
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
            name: updates.name ?? state.family.name,
            currency: '€',
          },
        }));
      },

      addExpense: (expenseData) => {
        const state = get();
        const newExpense: Expense = {
          ...expenseData,
          id: `exp_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
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
          id: `mem_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
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

      deleteMember: (id) => {
        const state = get();
        if (state.members.length <= 1) {
          return;
        }

        const remainingMembers = state.members.filter((m) => m.id !== id);

        // Cascade delete: remove all expenses paid by this member,
        // and remove this member from split breakdowns on remaining expenses
        const updatedExpenses = state.expenses
          .filter((e) => e.paid_by_member_id !== id)
          .map((e) => {
            if (!e.splits || e.splits.length === 0) return e;
            const remainingSplits = e.splits.filter((s) => s.member_id !== id);
            if (remainingSplits.length <= 1) {
              return { ...e, splits: undefined };
            }
            const remainingMemberIds = remainingSplits.map((s) => s.member_id);
            return {
              ...e,
              splits: calculateEqualSplits(e.amount, remainingMemberIds),
            };
          });

        const newCurrentMemberId =
          state.currentMemberId === id ? remainingMembers[0]?.id || '' : state.currentMemberId;

        const updatedBatches = state.importBatches.map((b) =>
          b.imported_by_member_id === id
            ? { ...b, imported_by_member_id: remainingMembers[0]?.id || '' }
            : b,
        );

        set({
          members: remainingMembers,
          expenses: updatedExpenses,
          currentMemberId: newCurrentMemberId,
          importBatches: updatedBatches,
        });
      },

      addCategory: (categoryData) => {
        const state = get();
        const newCategory: Category = {
          ...categoryData,
          id: `cat_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          family_id: state.family.id,
        };
        set((state) => ({ categories: [...state.categories, newCategory] }));
        return newCategory;
      },

      deleteCategory: (id) => {
        set((state) => ({
          categories: state.categories.filter((c) => c.id !== id),
        }));
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

          // Retain and calculate splits if defined in the import payload
          let splits: ExpenseSplit[] | undefined = undefined;
          if (rawExp.split?.is_split) {
            let targetMemberIds: string[] = [];
            if (rawExp.split.members && rawExp.split.members.length > 0) {
              targetMemberIds = rawExp.split.members
                .map(
                  (name) =>
                    state.members.find((m) => m.display_name.toLowerCase() === name.toLowerCase())
                      ?.id,
                )
                .filter((id): id is string => Boolean(id));
            }
            if (targetMemberIds.length === 0) {
              targetMemberIds = state.members.map((m) => m.id);
            }
            splits = calculateEqualSplits(rawExp.amount, targetMemberIds);
          }

          return {
            id: `exp_imp_${Date.now()}_${index}_${Math.random().toString(36).slice(2, 6)}`,
            family_id: state.family.id,
            paid_by_member_id: paidMember?.id || 'mem_1',
            category_id: matchedCat?.id || 'cat_other',
            import_batch_id: batchId,
            transaction_date: rawExp.date,
            merchant_name: rawExp.merchant,
            amount: rawExp.amount,
            notes: rawExp.notes,
            payment_method: rawExp.payment_method || 'Imported File',
            is_recurring: rawExp.is_recurring,
            is_verified: true,
            splits: splits && splits.length > 0 ? splits : undefined,
            created_at: new Date().toISOString(),
          };
        });

        const newBatch: ImportBatch = {
          id: batchId,
          family_id: state.family.id,
          imported_by_member_id: uploaderMember?.id || 'mem_1',
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
          expenses: INITIAL_EXPENSES,
          importBatches: [],
          currentMemberId: 'mem_1',
          selectedPeriod: '2026-08',
          filters: DEFAULT_FILTERS,
        });
      },
    }),
    {
      name: '@bert0ns_family_management_store',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        family: state.family,
        members: state.members,
        categories: state.categories,
        expenses: state.expenses,
        importBatches: state.importBatches,
        currentMemberId: state.currentMemberId,
        selectedPeriod: state.selectedPeriod,
      }),
    },
  ),
);
