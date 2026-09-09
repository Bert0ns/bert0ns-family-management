import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase, isSupabaseConfigured } from './supabase';
import { supabaseLogger } from './logger';
import { useAppStore, registerStoreMutationListener } from './store';
import { OutboxMutation, SyncStatus, Expense, Category, FamilyMember } from '@/types';
import { generateUUID } from '@/utils/uuid';

const OUTBOX_STORAGE_KEY = '@bert0ns_sync_outbox';
const LAST_SYNC_STORAGE_KEY = '@bert0ns_last_sync_timestamp';

let currentSyncStatus: SyncStatus = 'offline';
let activeFlushPromise: Promise<{ processed: number; errors: number }> | null = null;
const statusListeners = new Set<(status: SyncStatus) => void>();

function notifyStatus(status: SyncStatus) {
  currentSyncStatus = status;
  statusListeners.forEach((listener) => {
    try {
      listener(status);
    } catch (err) {
      supabaseLogger.error('Error in sync status listener', { error: err });
    }
  });
}

export const syncEngine = {
  getSyncStatus(): SyncStatus {
    return currentSyncStatus;
  },

  subscribeSyncStatus(listener: (status: SyncStatus) => void): () => void {
    statusListeners.add(listener);
    listener(currentSyncStatus);
    return () => {
      statusListeners.delete(listener);
    };
  },

  async getLastSyncTimestamp(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(LAST_SYNC_STORAGE_KEY);
    } catch {
      return null;
    }
  },

  async setLastSyncTimestamp(timestamp: string): Promise<void> {
    try {
      await AsyncStorage.setItem(LAST_SYNC_STORAGE_KEY, timestamp);
    } catch (err) {
      supabaseLogger.error('Failed to set last sync timestamp', { error: err });
    }
  },

  async getOutbox(): Promise<OutboxMutation[]> {
    try {
      const data = await AsyncStorage.getItem(OUTBOX_STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch (err) {
      supabaseLogger.error('Failed to get sync outbox', { error: err });
      return [];
    }
  },

  async clearOutbox(): Promise<void> {
    try {
      await AsyncStorage.removeItem(OUTBOX_STORAGE_KEY);
    } catch (err) {
      supabaseLogger.error('Failed to clear sync outbox', { error: err });
    }
  },

  async enqueueMutation(
    mutation: Omit<OutboxMutation, 'id' | 'created_at' | 'retry_count'>,
  ): Promise<void> {
    try {
      const current = await this.getOutbox();
      const newMutation: OutboxMutation = {
        ...mutation,
        id: generateUUID(),
        created_at: new Date().toISOString(),
        retry_count: 0,
      };

      const updated = [...current, newMutation];
      await AsyncStorage.setItem(OUTBOX_STORAGE_KEY, JSON.stringify(updated));
      supabaseLogger.info('Mutation enqueued to outbox', {
        entity: mutation.entity,
        operation: mutation.operation,
        entity_id: mutation.entity_id,
      });

      // Attempt background flush if online
      if (isSupabaseConfigured()) {
        this.flushOutbox().catch((err) => {
          supabaseLogger.debug('Background flush deferred', { error: err });
        });
      }
    } catch (err) {
      supabaseLogger.error('Failed to enqueue mutation', { error: err });
    }
  },

  async flushOutbox(): Promise<{ processed: number; errors: number }> {
    if (!isSupabaseConfigured()) {
      notifyStatus('offline');
      return { processed: 0, errors: 0 };
    }

    if (activeFlushPromise) {
      return activeFlushPromise;
    }

    activeFlushPromise = (async () => {
      try {
        const outbox = await this.getOutbox();
        if (outbox.length === 0) {
          notifyStatus('synced');
          return { processed: 0, errors: 0 };
        }

        notifyStatus('syncing');
        let processed = 0;
        let errors = 0;
        const succeededIds = new Set<string>();
        const failedMap = new Map<string, OutboxMutation>();

        for (const item of outbox) {
          try {
            const success = await this.executeMutation(item);
            if (success) {
              processed++;
              succeededIds.add(item.id);
            } else {
              errors++;
              const updatedItem = {
                ...item,
                retry_count: (item.retry_count || 0) + 1,
              };
              failedMap.set(item.id, updatedItem);
            }
          } catch {
            errors++;
            const updatedItem = {
              ...item,
              retry_count: (item.retry_count || 0) + 1,
            };
            failedMap.set(item.id, updatedItem);
          }
        }

        // Re-read current outbox to safely preserve any mutations enqueued concurrently
        const freshOutbox = await this.getOutbox();
        const updatedOutbox = freshOutbox
          .filter((m) => !succeededIds.has(m.id))
          .map((m) => failedMap.get(m.id) || m)
          .filter((m) => (m.retry_count || 0) < 5);

        await AsyncStorage.setItem(OUTBOX_STORAGE_KEY, JSON.stringify(updatedOutbox));
        notifyStatus(errors > 0 ? 'error' : 'synced');
        return { processed, errors };
      } finally {
        activeFlushPromise = null;
      }
    })();

    return activeFlushPromise;
  },

  async executeMutation(item: OutboxMutation): Promise<boolean> {
    const { entity, operation, entity_id, payload } = item;

    switch (entity) {
      case 'expense': {
        if (operation === 'INSERT' || operation === 'UPDATE') {
          const { splits, ...expenseData } = payload;
          const { error: expError } = await supabase.from('expenses').upsert({
            ...expenseData,
            updated_at: new Date().toISOString(),
          });
          if (expError) throw expError;

          if (splits && Array.isArray(splits)) {
            // Delete previous splits and re-insert
            await supabase.from('expense_splits').delete().eq('expense_id', entity_id);
            if (splits.length > 0) {
              const splitsPayload = splits.map((s: any) => ({
                id: s.id || generateUUID(),
                expense_id: entity_id,
                member_id: s.member_id,
                share_amount: s.share_amount,
                percentage: s.percentage ?? null,
              }));
              const { error: splitError } = await supabase
                .from('expense_splits')
                .insert(splitsPayload);
              if (splitError) throw splitError;
            }
          }
        } else if (operation === 'DELETE') {
          const { error } = await supabase.from('expenses').delete().eq('id', entity_id);
          if (error) throw error;
        }
        return true;
      }

      case 'category': {
        if (operation === 'INSERT' || operation === 'UPDATE') {
          const { error } = await supabase.from('categories').upsert({
            ...payload,
            updated_at: new Date().toISOString(),
          });
          if (error) throw error;
        } else if (operation === 'DELETE') {
          const { error } = await supabase.from('categories').delete().eq('id', entity_id);
          if (error) throw error;
        }
        return true;
      }

      case 'member': {
        if (operation === 'INSERT' || operation === 'UPDATE') {
          const { is_current_user, ...memberData } = payload;
          const { error } = await supabase.from('family_members').upsert({
            ...memberData,
            updated_at: new Date().toISOString(),
          });
          if (error) throw error;
        } else if (operation === 'DELETE') {
          const { error } = await supabase.from('family_members').delete().eq('id', entity_id);
          if (error) throw error;
        }
        return true;
      }

      case 'family': {
        if (operation === 'UPDATE') {
          const { error } = await supabase
            .from('families')
            .update({
              name: payload.name,
              updated_at: new Date().toISOString(),
            })
            .eq('id', entity_id);
          if (error) throw error;
        }
        return true;
      }

      case 'settlement': {
        if (operation === 'INSERT') {
          const { error } = await supabase.from('settlements').insert({
            id: payload.id,
            family_id: payload.family_id,
            from_member_id: payload.from_member_id,
            to_member_id: payload.to_member_id,
            amount: payload.amount,
            notes: payload.notes || null,
            created_at: payload.created_at,
          });
          if (error) throw error;
        }
        return true;
      }

      case 'notification_preference': {
        if (operation === 'INSERT' || operation === 'UPDATE') {
          const { error } = await supabase.from('notification_preferences').upsert({
            member_id: payload.member_id,
            push_enabled: payload.push_enabled,
            notify_batch_import: payload.notify_batch_import,
            notify_expense_updates: payload.notify_expense_updates,
            notify_settlements: payload.notify_settlements,
            notify_member_joined: payload.notify_member_joined,
            notify_role_changed: payload.notify_role_changed,
            updated_at: new Date().toISOString(),
          });
          if (error) throw error;
        }
        return true;
      }

      default:
        return true;
    }
  },

  async fetchDelta(familyId: string, sinceTimestamp?: string): Promise<{ updatedCount: number }> {
    if (!isSupabaseConfigured() || !familyId) {
      return { updatedCount: 0 };
    }

    try {
      notifyStatus('syncing');
      const lastSync = sinceTimestamp || (await this.getLastSyncTimestamp());

      // 1. Fetch updated expenses
      let expQuery = supabase
        .from('expenses')
        .select('*, expense_splits(*)')
        .eq('family_id', familyId);
      if (lastSync) {
        expQuery = expQuery.gt('updated_at', lastSync);
      }
      const { data: remoteExpenses, error: expErr } = await expQuery;
      if (expErr) throw expErr;

      // 2. Fetch updated categories
      let catQuery = supabase.from('categories').select('*').eq('family_id', familyId);
      if (lastSync) {
        catQuery = catQuery.gt('updated_at', lastSync);
      }
      const { data: remoteCategories, error: catErr } = await catQuery;
      if (catErr) throw catErr;

      // 3. Fetch updated members
      let memQuery = supabase.from('family_members').select('*').eq('family_id', familyId);
      if (lastSync) {
        memQuery = memQuery.gt('updated_at', lastSync);
      }
      const { data: remoteMembers, error: memErr } = await memQuery;
      if (memErr) throw memErr;

      let count = 0;

      if (remoteExpenses && remoteExpenses.length > 0) {
        const mappedExpenses: Expense[] = remoteExpenses.map((re: any) => ({
          id: re.id,
          family_id: re.family_id,
          paid_by_member_id: re.paid_by_member_id,
          category_id: re.category_id,
          import_batch_id: re.import_batch_id,
          transaction_date: re.transaction_date,
          merchant_name: re.merchant_name,
          amount: Number(re.amount),
          notes: re.notes,
          payment_method: re.payment_method,
          is_recurring: re.is_recurring,
          is_verified: re.is_verified,
          created_at: re.created_at,
          updated_at: re.updated_at,
          splits: re.expense_splits?.map((s: any) => ({
            member_id: s.member_id,
            share_amount: Number(s.share_amount),
            percentage: s.percentage ? Number(s.percentage) : undefined,
          })),
        }));

        this.mergeExpensesLWW(mappedExpenses);
        count += mappedExpenses.length;
      }

      if (remoteCategories && remoteCategories.length > 0) {
        const mappedCategories: Category[] = remoteCategories.map((rc: any) => ({
          id: rc.id,
          family_id: rc.family_id,
          name: rc.name,
          icon: rc.icon,
          color: rc.color,
          is_default: rc.is_default,
          created_at: rc.created_at,
          updated_at: rc.updated_at,
        }));
        this.mergeCategoriesLWW(mappedCategories);
        count += mappedCategories.length;
      }

      if (remoteMembers && remoteMembers.length > 0) {
        const mappedMembers: FamilyMember[] = remoteMembers.map((rm: any) => ({
          id: rm.id,
          family_id: rm.family_id,
          user_id: rm.user_id,
          display_name: rm.display_name,
          role: rm.role,
          avatar_url: rm.avatar_url,
          color_code: rm.color_code,
          created_at: rm.created_at,
          updated_at: rm.updated_at,
        }));
        this.mergeMembersLWW(mappedMembers);
        count += mappedMembers.length;
      }

      // 4. Fetch updated settlements
      let stlQuery = supabase.from('settlements').select('*').eq('family_id', familyId);
      if (lastSync) {
        stlQuery = stlQuery.gt('created_at', lastSync);
      }
      const { data: remoteSettlements, error: stlErr } = await stlQuery;
      if (!stlErr && remoteSettlements && remoteSettlements.length > 0) {
        const mappedSettlements = remoteSettlements.map((s: any) => ({
          id: s.id,
          family_id: s.family_id,
          from_member_id: s.from_member_id,
          to_member_id: s.to_member_id,
          amount: Number(s.amount),
          notes: s.notes,
          created_at: s.created_at,
        }));
        useAppStore.getState().reconcileRemoteSettlements(mappedSettlements);
        count += mappedSettlements.length;
      }

      // 5. Fetch notification preferences for current member
      const currentMemberId = useAppStore.getState().currentMemberId;
      if (currentMemberId) {
        const { data: prefData } = await supabase
          .from('notification_preferences')
          .select('*')
          .eq('member_id', currentMemberId)
          .maybeSingle();

        if (prefData) {
          useAppStore.getState().updateNotificationPreferences({
            push_enabled: prefData.push_enabled,
            notify_batch_import: prefData.notify_batch_import,
            notify_expense_updates: prefData.notify_expense_updates,
            notify_settlements: prefData.notify_settlements,
            notify_member_joined: prefData.notify_member_joined,
            notify_role_changed: prefData.notify_role_changed,
          });
        }
      }

      const syncTimestamp = new Date().toISOString();
      await this.setLastSyncTimestamp(syncTimestamp);
      notifyStatus('synced');
      return { updatedCount: count };
    } catch (err) {
      supabaseLogger.error('Failed to fetch delta from Supabase', { error: err });
      notifyStatus('error');
      return { updatedCount: 0 };
    }
  },

  mergeExpensesLWW(remoteList: Expense[]) {
    const store = useAppStore.getState();
    const current = [...store.expenses];

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

    useAppStore.setState({ expenses: current });
  },

  mergeCategoriesLWW(remoteList: Category[]) {
    const store = useAppStore.getState();
    const current = [...store.categories];

    remoteList.forEach((remote) => {
      const idx = current.findIndex((c) => c.id === remote.id);
      if (idx === -1) {
        current.push(remote);
      } else {
        const local = current[idx];
        const remoteTime = remote.updated_at ? new Date(remote.updated_at).getTime() : 0;
        const localTime = local.updated_at ? new Date(local.updated_at).getTime() : 0;
        if (remoteTime >= localTime) {
          current[idx] = remote;
        }
      }
    });

    useAppStore.setState({ categories: current });
  },

  mergeMembersLWW(remoteList: FamilyMember[]) {
    const store = useAppStore.getState();
    const current = [...store.members];

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

    useAppStore.setState({ members: current });
  },
};

// Auto-register mutation listener to queue mutations to outbox
registerStoreMutationListener((event) => {
  syncEngine
    .enqueueMutation({
      entity: event.entity,
      operation: event.operation,
      entity_id: event.entity_id,
      payload: event.payload,
    })
    .catch((err) => {
      supabaseLogger.error('Failed to auto-enqueue mutation', { error: err });
    });
});
