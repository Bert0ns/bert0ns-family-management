import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  Expense,
  Category,
  FamilyMember,
  Family,
  FilterOptions,
  ExpenseSplit,
  ImportBatch,
  RawExpenseReport,
  MutationOperation,
} from '@/types';
import {
  INITIAL_EXPENSES,
  INITIAL_CATEGORIES,
  INITIAL_MEMBERS,
  INITIAL_FAMILY,
} from '@/data/mockData';
import { calculateEqualSplits } from '@/services/splitCalculator';
import { generateUUID } from '@/utils/uuid';
import { CATEGORY_I18N_KEY_MAP } from '@/i18n/categories';
import { storeLogger } from '@/services/logger';

export interface AppState {
  // Domain entities
  family: Family;
  members: FamilyMember[];
  categories: Category[];
  expenses: Expense[];
  importBatches: ImportBatch[];

  // App UI State
  currentMemberId: string;
  selectedPeriod: string; // "YYYY-MM" format
  filters: FilterOptions;

  // Actions - UI & Navigation
  setCurrentMemberId: (id: string) => void;
  setSelectedPeriod: (period: string) => void;
  setFilters: (filters: Partial<FilterOptions>) => void;
  resetFilters: () => void;

  // Actions - Expenses
  addExpense: (expense: Omit<Expense, 'id' | 'created_at' | 'updated_at' | 'family_id'>) => Expense;
  updateExpense: (id: string, updates: Partial<Expense>) => void;
  deleteExpense: (id: string) => void;
  clearAllExpenses: () => void;

  // Actions - Family & Members
  updateFamilySettings: (updates: { name?: string; invite_code?: string }) => void;
  addMember: (
    member: Omit<FamilyMember, 'id' | 'created_at' | 'updated_at' | 'family_id'>,
  ) => FamilyMember;
  updateMember: (id: string, updates: Partial<FamilyMember>) => void;
  deleteMember: (id: string) => void;

  // Actions - Categories
  addCategory: (category: Omit<Category, 'id' | 'family_id'>) => Category;
  deleteCategory: (id: string) => void;

  // Actions - Import
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
  operation: MutationOperation;
  entity_id: string;
  payload: any;
};

type StoreMutationListener = (event: StoreMutationEvent) => void;
const mutationListeners = new Set<StoreMutationListener>();

export const registerStoreMutationListener = (
  listener: StoreMutationListener | null,
): (() => void) => {
  if (!listener) return () => {};
  mutationListeners.add(listener);
  return () => {
    mutationListeners.delete(listener);
  };
};

const notifyStoreMutation = (event: StoreMutationEvent) => {
  mutationListeners.forEach((listener) => {
    try {
      listener(event);
    } catch (err) {
      storeLogger.error('Error in store mutation listener', { error: err });
    }
  });
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

      setCurrentMemberId: (id) => {
        storeLogger.debug('Active member changed', { id });
        set({ currentMemberId: id });
      },

      setSelectedPeriod: (period) => {
        storeLogger.debug('Active period changed', { period });
        set({ selectedPeriod: period });
      },

      setFilters: (filters) => set((state) => ({ filters: { ...state.filters, ...filters } })),
      resetFilters: () => set({ filters: DEFAULT_FILTERS }),

      updateFamilySettings: (updates) => {
        storeLogger.info('Updating family settings', updates);
        set((state) => {
          const updatedFamily = { ...state.family, ...updates };
          notifyStoreMutation({
            entity: 'family',
            operation: 'UPDATE',
            entity_id: state.family.id,
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
              let nextSplits = updates.splits !== undefined ? updates.splits : e.splits;
              if (
                updates.amount !== undefined &&
                updates.amount !== e.amount &&
                updates.splits === undefined &&
                nextSplits &&
                nextSplits.length > 0
              ) {
                const memberIds = nextSplits.map((s) => s.member_id);
                nextSplits = calculateEqualSplits(updates.amount, memberIds);
              }

              updatedExpense = { ...e, ...updates, splits: nextSplits, updated_at: now };
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

        const cascadedDeletedExpenses = state.expenses.filter((e) => e.paid_by_member_id === id);
        const modifiedJointExpenses: Expense[] = [];

        const updatedExpenses = state.expenses
          .filter((e) => e.paid_by_member_id !== id)
          .map((e) => {
            if (!e.splits || e.splits.length === 0) return e;
            const remainingSplits = e.splits.filter((s) => s.member_id !== id);
            if (remainingSplits.length <= 1) {
              const modified = { ...e, splits: undefined, updated_at: new Date().toISOString() };
              modifiedJointExpenses.push(modified);
              return modified;
            }
            const remainingMemberIds = remainingSplits.map((s) => s.member_id);
            const modified = {
              ...e,
              splits: calculateEqualSplits(e.amount, remainingMemberIds),
              updated_at: new Date().toISOString(),
            };
            modifiedJointExpenses.push(modified);
            return modified;
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
          cascadedDeletedExpensesCount: cascadedDeletedExpenses.length,
        });

        set({
          members: remainingMembers,
          expenses: updatedExpenses,
          currentMemberId: newCurrentMemberId,
          importBatches: updatedBatches,
        });

        cascadedDeletedExpenses.forEach((exp) => {
          notifyStoreMutation({
            entity: 'expense',
            operation: 'DELETE',
            entity_id: exp.id,
            payload: { id: exp.id },
          });
        });

        modifiedJointExpenses.forEach((exp) => {
          notifyStoreMutation({
            entity: 'expense',
            operation: 'UPDATE',
            entity_id: exp.id,
            payload: exp,
          });
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
        if (state.categories.length <= 1) {
          storeLogger.warn('Attempted to delete the only remaining category', { id });
          return;
        }

        const fallbackCat = state.categories.find((c) => c.id !== id);
        if (!fallbackCat) return;

        storeLogger.info('Category deleted', { id, fallbackId: fallbackCat?.id });
        const now = new Date().toISOString();
        const updatedExpenses = state.expenses.map((e) =>
          e.category_id === id ? { ...e, category_id: fallbackCat?.id || '', updated_at: now } : e,
        );

        set((state) => ({
          categories: state.categories.filter((c) => c.id !== id),
          expenses: updatedExpenses,
        }));

        notifyStoreMutation({
          entity: 'category',
          operation: 'DELETE',
          entity_id: id,
          payload: { id },
        });

        updatedExpenses
          .filter((e) => e.category_id === fallbackCat?.id && e.updated_at === now)
          .forEach((exp) => {
            notifyStoreMutation({
              entity: 'expense',
              operation: 'UPDATE',
              entity_id: exp.id,
              payload: exp,
            });
          });
      },

      importExpenseReport: (report, fileName) => {
        const state = get();
        storeLogger.info('Importing expense report', {
          fileName,
          totalExpenses: report.expenses.length,
        });

        const batchId = generateUUID();
        const totalAmount = report.expenses.reduce((sum, e) => sum + e.amount, 0);

        const uploaderMember =
          state.members.find((m) => m.id === state.currentMemberId) || state.members[0];

        const newExpenses: Expense[] = report.expenses.map((rawExp) => {
          let paidMember = uploaderMember;
          if (rawExp.paid_by) {
            const found = state.members.find(
              (m) => m.display_name.toLowerCase() === rawExp.paid_by?.toLowerCase(),
            );
            if (found) paidMember = found;
          }

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

          const now = new Date().toISOString();
          return {
            id: generateUUID(),
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
            created_at: now,
            updated_at: now,
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

        newExpenses.forEach((exp) => {
          notifyStoreMutation({
            entity: 'expense',
            operation: 'INSERT',
            entity_id: exp.id,
            payload: exp,
          });
        });

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
          const map = new Map(state.expenses.map((e) => [e.id, e]));

          remoteList.forEach((remote) => {
            const local = map.get(remote.id);
            if (!local) {
              map.set(remote.id, remote);
            } else {
              const remoteTime = remote.updated_at ? new Date(remote.updated_at).getTime() : 0;
              const localTime = local.updated_at ? new Date(local.updated_at).getTime() : 0;
              if (remoteTime >= localTime) {
                map.set(remote.id, {
                  ...remote,
                  splits: remote.splits !== undefined ? remote.splits : local.splits,
                });
              }
            }
          });

          const sorted = Array.from(map.values()).sort(
            (a, b) =>
              new Date(b.transaction_date).getTime() - new Date(a.transaction_date).getTime(),
          );
          return { expenses: sorted };
        });
      },

      reconcileRemoteCategories: (remoteList) => {
        set((state) => {
          const map = new Map(state.categories.map((c) => [c.id, c]));
          remoteList.forEach((remote) => {
            map.set(remote.id, remote);
          });
          return { categories: Array.from(map.values()) };
        });
      },

      reconcileRemoteMembers: (remoteList) => {
        set((state) => {
          const map = new Map(state.members.map((m) => [m.id, m]));
          remoteList.forEach((remote) => {
            const local = map.get(remote.id);
            if (!local) {
              map.set(remote.id, remote);
            } else {
              const remoteTime = remote.updated_at ? new Date(remote.updated_at).getTime() : 0;
              const localTime = local.updated_at ? new Date(local.updated_at).getTime() : 0;
              if (remoteTime >= localTime) {
                map.set(remote.id, { ...remote, is_current_user: local.is_current_user });
              }
            }
          });
          return { members: Array.from(map.values()) };
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
              useAppStore.setState((s) => ({
                categories: [...s.categories, bankCat],
              }));
            }
          }
        }
      },
      partialize: (state) => ({
        family: state.family,
        members: state.members,
        categories: state.categories,
        expenses: state.expenses,
        importBatches: state.importBatches.map(({ raw_payload, ...rest }) => rest as ImportBatch),
        currentMemberId: state.currentMemberId,
        selectedPeriod: state.selectedPeriod,
      }),
    },
  ),
);

// Atomic Selector Helpers to avoid full-tree re-render storms
export const selectExpenses = (state: AppState) => state.expenses;
export const selectMembers = (state: AppState) => state.members;
export const selectCategories = (state: AppState) => state.categories;
export const selectFamily = (state: AppState) => state.family;
export const selectCurrentMemberId = (state: AppState) => state.currentMemberId;
export const selectSelectedPeriod = (state: AppState) => state.selectedPeriod;
export const selectFilters = (state: AppState) => state.filters;
export const selectImportBatches = (state: AppState) => state.importBatches;
