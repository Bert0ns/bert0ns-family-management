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
import { storeLogger } from '@/services/logger';
import { generateUUID } from '@/utils/uuid';
import { CATEGORY_I18N_KEY_MAP } from '@/i18n/categories';

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

  // Remote Sync Actions
  setFamily: (family: Family) => void;
  reconcileRemoteExpenses: (expenses: Expense[]) => void;
  reconcileRemoteCategories: (categories: Category[]) => void;
  reconcileRemoteMembers: (members: FamilyMember[]) => void;
  removeRemoteExpense: (id: string) => void;
  removeRemoteCategory: (id: string) => void;
  removeRemoteMember: (id: string) => void;
}

export type StoreMutationEvent = {
  entity: 'expense' | 'category' | 'member' | 'family';
  operation: 'INSERT' | 'UPDATE' | 'DELETE';
  entity_id: string;
  payload: any;
};

type StoreMutationListener = (event: StoreMutationEvent) => void;
let mutationListener: StoreMutationListener | null = null;

export const registerStoreMutationListener = (listener: StoreMutationListener | null) => {
  mutationListener = listener;
};

const notifyStoreMutation = (event: StoreMutationEvent) => {
  if (mutationListener) {
    try {
      mutationListener(event);
    } catch (err) {
      storeLogger.error('Error in store mutation listener', { error: err });
    }
  }
};

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
        storeLogger.info('Updating family settings', updates);
        set((state) => {
          const updatedFamily = { ...state.family, ...updates };
          notifyStoreMutation({
            entity: 'family',
            operation: 'UPDATE',
            entity_id: updatedFamily.id,
            payload: updatedFamily,
          });
          return { family: updatedFamily };
        });
      },

      addExpense: (expenseData) => {
        const state = get();
        const now = new Date().toISOString();
        const newExpense: Expense = {
          ...expenseData,
          id: generateUUID(),
          family_id: state.family.id,
          created_at: now,
          updated_at: now,
        };
        storeLogger.info('Expense added', {
          id: newExpense.id,
          merchant: newExpense.merchant_name,
          amount: newExpense.amount,
        });
        set((state) => ({ expenses: [newExpense, ...state.expenses] }));
        notifyStoreMutation({
          entity: 'expense',
          operation: 'INSERT',
          entity_id: newExpense.id,
          payload: newExpense,
        });
        return newExpense;
      },

      updateExpense: (id, updates) => {
        const now = new Date().toISOString();
        let updatedExpense: Expense | undefined;
        storeLogger.info('Expense updated', { id, updates });
        set((state) => ({
          expenses: state.expenses.map((e) => {
            if (e.id === id) {
              updatedExpense = { ...e, ...updates, updated_at: now };
              return updatedExpense;
            }
            return e;
          }),
        }));
        if (updatedExpense) {
          notifyStoreMutation({
            entity: 'expense',
            operation: 'UPDATE',
            entity_id: id,
            payload: updatedExpense,
          });
        }
      },

      deleteExpense: (id) => {
        storeLogger.info('Expense deleted', { id });
        set((state) => ({
          expenses: state.expenses.filter((e) => e.id !== id),
        }));
        notifyStoreMutation({
          entity: 'expense',
          operation: 'DELETE',
          entity_id: id,
          payload: { id },
        });
      },

      clearAllExpenses: () => {
        storeLogger.warn('All expenses cleared from store');
        set({ expenses: [], importBatches: [] });
      },

      addMember: (memberData) => {
        const state = get();
        const now = new Date().toISOString();
        const newMember: FamilyMember = {
          ...memberData,
          id: generateUUID(),
          family_id: state.family.id,
          created_at: now,
          updated_at: now,
        };
        storeLogger.info('Member added', {
          id: newMember.id,
          name: newMember.display_name,
          role: newMember.role,
        });
        set((state) => ({ members: [...state.members, newMember] }));
        notifyStoreMutation({
          entity: 'member',
          operation: 'INSERT',
          entity_id: newMember.id,
          payload: newMember,
        });
        return newMember;
      },

      updateMember: (id, updates) => {
        const now = new Date().toISOString();
        let updatedMember: FamilyMember | undefined;
        storeLogger.info('Member updated', { id, updates });
        set((state) => ({
          members: state.members.map((m) => {
            if (m.id === id) {
              updatedMember = { ...m, ...updates, updated_at: now };
              return updatedMember;
            }
            return m;
          }),
        }));
        if (updatedMember) {
          notifyStoreMutation({
            entity: 'member',
            operation: 'UPDATE',
            entity_id: id,
            payload: updatedMember,
          });
        }
      },

      deleteMember: (id) => {
        const state = get();
        if (state.members.length <= 1) {
          storeLogger.warn('Attempted to delete the only remaining member', { id });
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
            ? { ...b, imported_by_member_id: remainingMembers[0]?.id || 'mem_1' }
            : b,
        );

        storeLogger.info('Member deleted with cascade', {
          id,
          remainingMembersCount: remainingMembers.length,
        });
        set({
          members: remainingMembers,
          expenses: updatedExpenses,
          currentMemberId: newCurrentMemberId,
          importBatches: updatedBatches,
        });

        notifyStoreMutation({
          entity: 'member',
          operation: 'DELETE',
          entity_id: id,
          payload: { id },
        });
      },

      addCategory: (catData) => {
        const state = get();
        const newCategory: Category = {
          ...catData,
          id: generateUUID(),
          family_id: state.family.id,
        };
        storeLogger.info('Category added', { id: newCategory.id, name: newCategory.name });
        set((state) => ({ categories: [...state.categories, newCategory] }));
        notifyStoreMutation({
          entity: 'category',
          operation: 'INSERT',
          entity_id: newCategory.id,
          payload: newCategory,
        });
        return newCategory;
      },

      deleteCategory: (id) => {
        const state = get();
        const fallbackCat = state.categories.find((c) => c.id !== id) || state.categories[0];
        storeLogger.info('Category deleted', { id, fallbackId: fallbackCat?.id });
        set((state) => ({
          categories: state.categories.filter((c) => c.id !== id),
          expenses: state.expenses.map((e) =>
            e.category_id === id ? { ...e, category_id: fallbackCat?.id || '' } : e,
          ),
        }));
        notifyStoreMutation({
          entity: 'category',
          operation: 'DELETE',
          entity_id: id,
          payload: { id },
        });
      },

      importExpenseReport: (report, fileName) => {
        const state = get();
        storeLogger.info('Importing expense report', {
          fileName,
          totalExpenses: report.expenses.length,
        });

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

          // Match category name or id or normalized key, fallback to "General & Other"
          const rawCat = rawExp.category ? rawExp.category.toLowerCase().trim() : '';
          const mappedKey = CATEGORY_I18N_KEY_MAP[rawCat];
          const matchedCat =
            state.categories.find((c) => c.name.toLowerCase().trim() === rawCat) ||
            state.categories.find((c) => c.id.toLowerCase() === rawCat) ||
            (mappedKey
              ? state.categories.find(
                  (c) =>
                    CATEGORY_I18N_KEY_MAP[c.id.toLowerCase()] === mappedKey ||
                    CATEGORY_I18N_KEY_MAP[c.name.toLowerCase().trim()] === mappedKey,
                )
              : undefined) ||
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
        storeLogger.info('Store reset to sample data');
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

      setFamily: (family) => {
        set({ family });
      },

      reconcileRemoteExpenses: (remoteList) => {
        set((state) => {
          const current = [...state.expenses];
          remoteList.forEach((remote) => {
            const idx = current.findIndex((e) => e.id === remote.id);
            if (idx === -1) {
              current.unshift(remote);
            } else {
              const local = current[idx];
              const remoteTime = remote.updated_at ? new Date(remote.updated_at).getTime() : 0;
              const localTime = local.updated_at ? new Date(local.updated_at).getTime() : 0;
              if (remoteTime >= localTime) {
                current[idx] = remote;
              }
            }
          });
          return { expenses: current };
        });
      },

      reconcileRemoteCategories: (remoteList) => {
        set((state) => {
          const current = [...state.categories];
          remoteList.forEach((remote) => {
            const idx = current.findIndex((c) => c.id === remote.id);
            if (idx === -1) {
              current.push(remote);
            } else {
              current[idx] = remote;
            }
          });
          return { categories: current };
        });
      },

      reconcileRemoteMembers: (remoteList) => {
        set((state) => {
          const current = [...state.members];
          remoteList.forEach((remote) => {
            const idx = current.findIndex((m) => m.id === remote.id);
            if (idx === -1) {
              current.push(remote);
            } else {
              const local = current[idx];
              const remoteTime = remote.updated_at ? new Date(remote.updated_at).getTime() : 0;
              const localTime = local.updated_at ? new Date(local.updated_at).getTime() : 0;
              if (remoteTime >= localTime) {
                current[idx] = { ...remote, is_current_user: local.is_current_user };
              }
            }
          });
          return { members: current };
        });
      },

      removeRemoteExpense: (id) => {
        set((state) => ({
          expenses: state.expenses.filter((e) => e.id !== id),
        }));
      },

      removeRemoteCategory: (id) => {
        set((state) => ({
          categories: state.categories.filter((c) => c.id !== id),
        }));
      },

      removeRemoteMember: (id) => {
        set((state) => ({
          members: state.members.filter((m) => m.id !== id),
        }));
      },
    }),
    {
      name: '@bert0ns_family_management_store',
      storage: createJSONStorage(() => AsyncStorage),
      onRehydrateStorage: () => (state) => {
        if (state && Array.isArray(state.categories)) {
          const hasBankRelated = state.categories.some(
            (c) => c.id === 'cat_bank_related' || c.name.toLowerCase() === 'bank related',
          );
          if (!hasBankRelated) {
            const bankCat = INITIAL_CATEGORIES.find((c) => c.id === 'cat_bank_related');
            if (bankCat) {
              state.categories = [...state.categories, bankCat];
            }
          }
        }
      },
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
