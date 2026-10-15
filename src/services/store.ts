import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  Expense,
  Category,
  FamilyMember,
  Family,
  FilterOptions,
  ImportBatch,
  RawExpenseReport,
  MutationOperation,
  NotificationPreferences,
  AppNotification,
} from '@/types';
import {
  INITIAL_EXPENSES,
  INITIAL_CATEGORIES,
  INITIAL_MEMBERS,
  INITIAL_FAMILY,
} from '@/data/mockData';
import { generateUUID } from '@/utils/uuid';
import { roundToTwoDecimals, sumBy } from '@/utils/numberParser';
import { CATEGORY_I18N_KEY_MAP } from '@/i18n/categories';
import { storeLogger, transactionLogger } from '@/services/logger';

export const STORE_STORAGE_KEY = '@bert0ns_family_management_store';

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  push_enabled: true,
  notify_batch_import: true, // A3
  notify_expense_updates: true, // A4
  notify_member_joined: true, // E1
  notify_role_changed: true, // E2
};

export interface AppState {
  // Domain entities
  family: Family;
  members: FamilyMember[];
  categories: Category[];
  expenses: Expense[];
  importBatches: ImportBatch[];
  notifications: AppNotification[];
  notificationPreferences: NotificationPreferences;

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
  updateCategory: (id: string, updates: Partial<Category>) => void;
  deleteCategory: (id: string, fallbackCategoryId?: string) => void;

  // Actions - Notifications
  updateNotificationPreferences: (preferences: Partial<NotificationPreferences>) => void;
  addNotification: (notification: AppNotification) => void;
  markNotificationAsRead: (id: string) => void;
  markAllNotificationsAsRead: () => void;
  clearNotifications: () => void;

  // Actions - Import
  importExpenseReport: (
    report: RawExpenseReport,
    fileName: string,
  ) => { importedCount: number; totalAmount: number; batchId: string };

  // Data Reset
  resetToSampleData: () => void;
  resetToDefaults: () => void;

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
  entity: 'expense' | 'category' | 'member' | 'family' | 'notification_preference';
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
  storeLogger.debug('Store mutation dispatched', {
    entity: event.entity,
    operation: event.operation,
    entity_id: event.entity_id,
  });
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

/**
 * Evaluates whether a remote update should prevail over local state using guarded
 * revision checking and normalized timestamp comparisons.
 *
 * Remote changes with identical or higher timestamps prevail over stale local state.
 * Guarded revision check: if both items define a version/revision, remote changes
 * with identical or higher version prevail regardless of client clock skew.
 */
export function shouldRemoteEntityPrevail(
  remote: { updated_at?: string | null; created_at?: string | null; version?: number },
  local?: { updated_at?: string | null; created_at?: string | null; version?: number },
): boolean {
  if (!local) return true;

  // 1. Guarded revision check: if both entities have versions, compare them
  if (remote.version !== undefined && local.version !== undefined) {
    return remote.version >= local.version;
  }

  // 2. Normalized timestamp comparisons
  const remoteTime = remote.updated_at
    ? new Date(remote.updated_at).getTime()
    : remote.created_at
      ? new Date(remote.created_at).getTime()
      : 0;

  const localTime = local.updated_at
    ? new Date(local.updated_at).getTime()
    : local.created_at
      ? new Date(local.created_at).getTime()
      : 0;

  if (!localTime || isNaN(localTime)) return true;
  if (!remoteTime || isNaN(remoteTime)) return false;

  // Remote changes with identical or higher timestamps prevail over stale local state
  return remoteTime >= localTime;
}

export function shouldRemoteTombstonePrevail(
  remote: { deleted_at?: string | null; version?: number },
  local?: { updated_at?: string | null; created_at?: string | null; version?: number },
): boolean {
  if (!local) return true;

  if (remote.version !== undefined && local.version !== undefined) {
    return remote.version >= local.version;
  }

  const deleteTime = remote.deleted_at ? new Date(remote.deleted_at).getTime() : 0;
  const localTime = local.updated_at
    ? new Date(local.updated_at).getTime()
    : local.created_at
      ? new Date(local.created_at).getTime()
      : 0;

  if (!localTime || isNaN(localTime)) return true;
  if (!deleteTime || isNaN(deleteTime)) return false;

  return deleteTime >= localTime;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      family: INITIAL_FAMILY,
      members: INITIAL_MEMBERS,
      categories: INITIAL_CATEGORIES,
      expenses: INITIAL_EXPENSES,
      importBatches: [],
      notifications: [],
      notificationPreferences: DEFAULT_NOTIFICATION_PREFERENCES,
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

      setFilters: (filters) => {
        storeLogger.debug('Filters updated', filters);
        set((state) => ({ filters: { ...state.filters, ...filters } }));
      },
      resetFilters: () => {
        storeLogger.debug('Filters reset to defaults');
        set({ filters: DEFAULT_FILTERS });
      },

      updateFamilySettings: (updates) => {
        storeLogger.info('Updating family settings', updates);
        set((state) => {
          const { id: _callerId, created_at: _callerCreatedAt, ...safeUpdates } = updates as any;
          const updatedFamily = { ...state.family, ...safeUpdates, id: state.family.id };
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
        if (!expenseData.paid_by_member_id || !expenseData.paid_by_member_id.trim()) {
          throw new Error('Expense must have a valid paid_by_member_id');
        }
        if (!expenseData.category_id || !expenseData.category_id.trim()) {
          throw new Error('Expense must have a valid category_id');
        }
        const now = new Date().toISOString();
        const normalizedAmount = roundToTwoDecimals(expenseData.amount);
        const { id: _callerId, family_id: _callerFamId, ...safeExpenseData } = expenseData as any;
        const newExpense: Expense = {
          ...safeExpenseData,
          amount: normalizedAmount,
          id: generateUUID(),
          family_id: state.family.id,
          created_at: now,
          updated_at: now,
          version: 1,
        };
        transactionLogger.info('Expense created', {
          id: newExpense.id,
          merchant: newExpense.merchant_name,
          amount: newExpense.amount,
          currency: state.family.currency,
          paidBy: newExpense.paid_by_member_id,
          category: newExpense.category_id,
          date: newExpense.transaction_date,
        });
        storeLogger.debug('Expense added to state', {
          expenseId: newExpense.id,
          totalExpenses: state.expenses.length + 1,
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
        const state = get();
        const existing = state.expenses.find((e) => e.id === id);
        const now = new Date().toISOString();
        let updatedExpense: Expense | undefined;
        const normalizedAmount =
          updates.amount !== undefined ? roundToTwoDecimals(updates.amount) : existing?.amount;
        transactionLogger.info('Expense updated', {
          id,
          merchant: updates.merchant_name || existing?.merchant_name,
          amount: normalizedAmount,
          changedFields: Object.keys(updates),
        });
        const { id: _callerId, family_id: _callerFamId, ...safeUpdates } = updates as any;
        set((state) => ({
          expenses: state.expenses.map((e) => {
            if (e.id === id) {
              const updated: Expense = {
                ...e,
                ...safeUpdates,
                id: e.id,
                family_id: e.family_id,
                amount: normalizedAmount ?? e.amount,
                updated_at: now,
                version: (e.version || 1) + 1,
              };
              updatedExpense = updated;
              return updated;
            }
            return e;
          }),
        }));
        if (updatedExpense) {
          storeLogger.debug('Expense state saved', { id, updated_at: now });
          notifyStoreMutation({
            entity: 'expense',
            operation: 'UPDATE',
            entity_id: id,
            payload: updatedExpense,
          });
        }
      },

      deleteExpense: (id) => {
        const state = get();
        const exp = state.expenses.find((e) => e.id === id);
        transactionLogger.warn('Expense deleted', {
          id,
          merchant: exp?.merchant_name,
          amount: exp?.amount,
          date: exp?.transaction_date,
        });
        set((state) => ({
          expenses: state.expenses.filter((e) => e.id !== id),
        }));
        storeLogger.debug('Expense removed from state', {
          id,
          remaining: state.expenses.length - 1,
        });
        notifyStoreMutation({
          entity: 'expense',
          operation: 'DELETE',
          entity_id: id,
          payload: { id },
        });
      },

      clearAllExpenses: () => {
        const state = get();
        const expensesToClear = [...state.expenses];
        transactionLogger.warn('All expenses cleared from store', {
          count: expensesToClear.length,
          batchCount: state.importBatches.length,
        });
        set({ expenses: [], importBatches: [] });

        // Propagate deletions to Supabase outbox so cloud is cleared and records don't resurrect
        for (const exp of expensesToClear) {
          notifyStoreMutation({
            entity: 'expense',
            operation: 'DELETE',
            entity_id: exp.id,
            payload: { id: exp.id },
          });
        }
      },

      addMember: (memberData) => {
        const state = get();
        const now = new Date().toISOString();
        const { id: _callerId, family_id: _callerFamId, ...safeMemberData } = memberData as any;
        const newMember: FamilyMember = {
          ...safeMemberData,
          id: generateUUID(),
          family_id: state.family.id,
          created_at: now,
          updated_at: now,
          version: 1,
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
        const state = get();
        if (updates.role && updates.role !== 'ADMIN') {
          const memberToUpdate = state.members.find((m) => m.id === id);
          if (memberToUpdate && memberToUpdate.role === 'ADMIN') {
            const adminCount = state.members.filter((m) => m.role === 'ADMIN').length;
            if (adminCount <= 1) {
              storeLogger.warn('Attempted to demote the sole administrator', { id });
              throw new Error('Cannot demote the sole administrator of the family.');
            }
          }
        }
        const now = new Date().toISOString();
        let updatedMember: FamilyMember | undefined;
        storeLogger.info('Member updated', { id, updates });
        const { id: _callerId, family_id: _callerFamId, ...safeUpdates } = updates as any;
        set((state) => ({
          members: state.members.map((m) => {
            if (m.id === id) {
              const updated: FamilyMember = {
                ...m,
                ...safeUpdates,
                id: m.id,
                family_id: m.family_id,
                updated_at: now,
                version: (m.version || 1) + 1,
              };
              updatedMember = updated;
              return updated;
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
        const memberToDelete = state.members.find((m) => m.id === id);
        if (!memberToDelete) {
          return;
        }

        const adminCount = state.members.filter((m) => m.role === 'ADMIN').length;
        if (memberToDelete.role === 'ADMIN' && adminCount <= 1) {
          storeLogger.warn('Attempted to delete the sole administrator', { id });
          throw new Error('Cannot delete the sole administrator of the family.');
        }

        if (state.members.length <= 1) {
          storeLogger.warn('Attempted to delete the only remaining member', { id });
          return;
        }

        const remainingMembers = state.members.filter((m) => m.id !== id);
        const cascadedDeletedExpenses = state.expenses.filter((e) => e.paid_by_member_id === id);
        const updatedExpenses = state.expenses.filter((e) => e.paid_by_member_id !== id);

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

        notifyStoreMutation({
          entity: 'member',
          operation: 'DELETE',
          entity_id: id,
          payload: { id },
        });
      },

      addCategory: (catData) => {
        const state = get();
        const { id: _callerId, family_id: _callerFamId, ...safeCatData } = catData as any;
        const newCategory: Category = {
          ...safeCatData,
          id: generateUUID(),
          family_id: state.family.id,
          version: 1,
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

      updateCategory: (id, updates) => {
        const state = get();
        const existing = state.categories.find((c) => c.id === id);
        if (!existing) {
          storeLogger.warn('Attempted to update non-existent category', { id });
          return;
        }
        const now = new Date().toISOString();
        const { id: _callerId, family_id: _callerFamId, ...safeUpdates } = updates as any;
        let updatedCategory: Category | undefined;
        set((state) => ({
          categories: state.categories.map((c) => {
            if (c.id === id) {
              const updated: Category = {
                ...c,
                ...safeUpdates,
                id: c.id,
                family_id: c.family_id,
                updated_at: now,
                version: (c.version || 1) + 1,
              };
              updatedCategory = updated;
              return updated;
            }
            return c;
          }),
        }));
        if (updatedCategory) {
          storeLogger.info('Category updated', { id, name: updatedCategory.name });
          notifyStoreMutation({
            entity: 'category',
            operation: 'UPDATE',
            entity_id: id,
            payload: updatedCategory,
          });
        }
      },

      deleteCategory: (id, fallbackCategoryId) => {
        const state = get();
        if (state.categories.length <= 1) {
          storeLogger.warn('Attempted to delete the only remaining category', { id });
          return;
        }

        const fallbackCat = fallbackCategoryId
          ? state.categories.find((c) => c.id === fallbackCategoryId && c.id !== id)
          : state.categories.find((c) => c.id !== id);
        if (!fallbackCat) return;

        storeLogger.info('Category deleted', { id, fallbackId: fallbackCat?.id });
        const now = new Date().toISOString();
        const affectedExpenses = state.expenses.filter((e) => e.category_id === id);
        const updatedExpenses = state.expenses.map((e) =>
          e.category_id === id
            ? {
                ...e,
                category_id: fallbackCat.id,
                updated_at: now,
                version: (e.version || 1) + 1,
              }
            : e,
        );

        set((state) => ({
          categories: state.categories.filter((c) => c.id !== id),
          expenses: updatedExpenses,
        }));

        // Enqueue expense updates BEFORE category DELETE to prevent 23503 foreign key violation
        affectedExpenses.forEach((exp) => {
          const updatedExp = {
            ...exp,
            category_id: fallbackCat.id,
            updated_at: now,
            version: (exp.version || 1) + 1,
            previous_category_id: id,
          };
          notifyStoreMutation({
            entity: 'expense',
            operation: 'UPDATE',
            entity_id: exp.id,
            payload: updatedExp,
          });
        });

        notifyStoreMutation({
          entity: 'category',
          operation: 'DELETE',
          entity_id: id,
          payload: { id },
        });
      },

      updateNotificationPreferences: (prefs) => {
        const state = get();
        const updated = { ...state.notificationPreferences, ...prefs };
        storeLogger.info('Updating notification preferences', updated);
        set({ notificationPreferences: updated });
        notifyStoreMutation({
          entity: 'notification_preference',
          operation: 'UPDATE',
          entity_id: state.currentMemberId,
          payload: { member_id: state.currentMemberId, ...updated },
        });
      },

      addNotification: (notification) => {
        storeLogger.debug('Notification received', {
          id: notification.id,
          type: notification.type,
          title: notification.title,
        });
        set((state) => {
          if (state.notifications.some((n) => n.id === notification.id)) {
            return state;
          }
          return {
            notifications: [notification, ...state.notifications].slice(0, 50),
          };
        });
      },

      markNotificationAsRead: (id) => {
        storeLogger.debug('Notification marked as read', { id });
        set((state) => ({
          notifications: state.notifications.map((n) =>
            n.id === id ? { ...n, is_read: true } : n,
          ),
        }));
      },

      markAllNotificationsAsRead: () => {
        storeLogger.debug('All notifications marked as read');
        set((state) => ({
          notifications: state.notifications.map((n) => ({ ...n, is_read: true })),
        }));
      },

      clearNotifications: () => {
        storeLogger.debug('All notifications cleared');
        set({ notifications: [] });
      },

      importExpenseReport: (report, fileName) => {
        const state = get();
        storeLogger.info('Importing expense report', {
          fileName,
          totalExpenses: report.expenses.length,
        });

        const batchId = generateUUID();
        const totalAmount = sumBy(report.expenses, (e) => e.amount);

        const uploaderMember =
          state.members.find((m) => m.id === state.currentMemberId) || state.members[0];

        // Pre-build index for members and categories to provide O(1) lookups
        const memberByName = new Map<string, FamilyMember>();
        state.members.forEach((m) => {
          memberByName.set(m.display_name.toLowerCase(), m);
        });

        const categoryByName = new Map<string, Category>();
        const categoryById = new Map<string, Category>();
        const categoryByMappedKey = new Map<string, Category>();
        state.categories.forEach((c) => {
          categoryByName.set(c.name.toLowerCase().trim(), c);
          categoryById.set(c.id.toLowerCase(), c);
          const keyFromId = CATEGORY_I18N_KEY_MAP[c.id.toLowerCase()];
          if (keyFromId && !categoryByMappedKey.has(keyFromId)) {
            categoryByMappedKey.set(keyFromId, c);
          }
          const keyFromName = CATEGORY_I18N_KEY_MAP[c.name.toLowerCase().trim()];
          if (keyFromName && !categoryByMappedKey.has(keyFromName)) {
            categoryByMappedKey.set(keyFromName, c);
          }
        });
        const fallbackCat =
          state.categories.find((c) => c.id === 'cat_other') || state.categories[0];

        const newExpenses: Expense[] = report.expenses.map((rawExp) => {
          let paidMember = uploaderMember;
          if (rawExp.paid_by) {
            const found = memberByName.get(rawExp.paid_by.toLowerCase());
            if (found) paidMember = found;
          }

          const rawCat = rawExp.category ? rawExp.category.toLowerCase().trim() : '';
          const mappedKey = CATEGORY_I18N_KEY_MAP[rawCat];
          const matchedCat =
            categoryByName.get(rawCat) ||
            categoryById.get(rawCat) ||
            (mappedKey ? categoryByMappedKey.get(mappedKey) : undefined) ||
            fallbackCat;

          const now = new Date().toISOString();
          return {
            id: generateUUID(),
            family_id: state.family.id,
            paid_by_member_id: paidMember?.id || 'mem_1',
            category_id: matchedCat?.id || 'cat_other',
            import_batch_id: batchId,
            transaction_date: rawExp.date,
            merchant_name: rawExp.merchant,
            amount: roundToTwoDecimals(rawExp.amount),
            notes: rawExp.notes,
            payment_method: rawExp.payment_method || 'Imported File',
            is_recurring: rawExp.is_recurring,
            is_verified: true,
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
          notifications: [],
          notificationPreferences: DEFAULT_NOTIFICATION_PREFERENCES,
          currentMemberId: 'mem_1',
          selectedPeriod: '2026-08',
          filters: DEFAULT_FILTERS,
        });
      },

      resetToDefaults: () => {
        storeLogger.info('Store reset to defaults');
        set({
          family: {
            id: '',
            name: '',
            currency: '€',
            created_at: new Date().toISOString(),
          },
          members: [],
          categories: INITIAL_CATEGORIES,
          expenses: [],
          importBatches: [],
          notifications: [],
          notificationPreferences: DEFAULT_NOTIFICATION_PREFERENCES,
          currentMemberId: '',
          selectedPeriod: new Date().toISOString().slice(0, 7),
          filters: DEFAULT_FILTERS,
        });
      },

      setFamily: (family) => {
        storeLogger.info('Family state set', {
          familyId: family.id,
          name: family.name,
          currency: family.currency,
        });
        set({ family });
      },

      reconcileRemoteExpenses: (remoteList) => {
        storeLogger.info('Reconciling remote expenses', { count: remoteList.length });
        set((state) => {
          const map = new Map(state.expenses.map((e) => [e.id, e]));

          remoteList.forEach((remote) => {
            const local = map.get(remote.id);

            if (remote.deleted_at) {
              if (shouldRemoteTombstonePrevail(remote, local)) {
                map.delete(remote.id);
              }
              return;
            }

            if (shouldRemoteEntityPrevail(remote, local)) {
              map.set(remote.id, remote);
            }
          });

          const sorted = Array.from(map.values()).sort((a, b) =>
            b.transaction_date.localeCompare(a.transaction_date),
          );
          return { expenses: sorted };
        });
      },

      reconcileRemoteCategories: (remoteList) => {
        storeLogger.info('Reconciling remote categories', { count: remoteList.length });
        set((state) => {
          const map = new Map(state.categories.map((c) => [c.id, c]));
          remoteList.forEach((remote) => {
            const local = map.get(remote.id);

            if (remote.deleted_at) {
              if (shouldRemoteTombstonePrevail(remote, local)) {
                map.delete(remote.id);
              }
              return;
            }

            if (shouldRemoteEntityPrevail(remote, local)) {
              map.set(remote.id, remote);
            }
          });
          return { categories: Array.from(map.values()) };
        });
      },

      reconcileRemoteMembers: (remoteList) => {
        storeLogger.info('Reconciling remote members', { count: remoteList.length });
        set((state) => {
          const map = new Map(state.members.map((m) => [m.id, m]));
          remoteList.forEach((remote) => {
            const local = map.get(remote.id);
            const isCurrent =
              remote.id === state.currentMemberId || (local ? local.is_current_user : false);

            if (remote.deleted_at) {
              if (shouldRemoteTombstonePrevail(remote, local)) {
                map.delete(remote.id);
              }
              return;
            }

            if (shouldRemoteEntityPrevail(remote, local)) {
              map.set(remote.id, { ...remote, is_current_user: isCurrent });
            }
          });
          return { members: Array.from(map.values()) };
        });
      },

      removeRemoteExpense: (id) => {
        storeLogger.info('Removing remote expense from local store', { id });
        set((state) => ({
          expenses: state.expenses.filter((e) => e.id !== id),
        }));
      },

      removeRemoteCategory: (id) => {
        storeLogger.info('Removing remote category from local store', { id });
        set((state) => ({
          categories: state.categories.filter((c) => c.id !== id),
        }));
      },

      removeRemoteMember: (id) => {
        storeLogger.info('Removing remote member from local store', { id });
        set((state) => ({
          members: state.members.filter((m) => m.id !== id),
        }));
      },
    }),
    {
      name: STORE_STORAGE_KEY,
      storage: createJSONStorage(() => AsyncStorage),
      onRehydrateStorage: () => (state, error) => {
        if (error) {
          storeLogger.error('Store rehydration failed from storage', { error });
          return;
        }
        storeLogger.info('Store rehydrated from storage', {
          expensesCount: state?.expenses?.length ?? 0,
          membersCount: state?.members?.length ?? 0,
          categoriesCount: state?.categories?.length ?? 0,
          currentMemberId: state?.currentMemberId,
          selectedPeriod: state?.selectedPeriod,
        });
        if (state && Array.isArray(state.categories)) {
          const hasBankRelated = state.categories.some(
            (c) => c.id === 'cat_bank_related' || c.name.toLowerCase() === 'bank related',
          );
          if (!hasBankRelated) {
            const bankCat = INITIAL_CATEGORIES.find((c) => c.id === 'cat_bank_related');
            if (bankCat) {
              storeLogger.info('Migrating store: adding missing bank related category');
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
        notifications: state.notifications,
        notificationPreferences: state.notificationPreferences,
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
export const selectNotificationPreferences = (state: AppState) => state.notificationPreferences;
export const selectNotifications = (state: AppState) => state.notifications;
