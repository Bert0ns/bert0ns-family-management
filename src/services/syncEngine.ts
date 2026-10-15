import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase, isSupabaseConfigured } from './supabase';
import { supabaseLogger, syncLogger, transactionLogger } from './logger';
import { useAppStore, registerStoreMutationListener } from './store';
import { OutboxMutation, SyncStatus, Expense, Category, FamilyMember, ImportBatch } from '@/types';
import { generateUUID } from '@/utils/uuid';

export const OUTBOX_STORAGE_KEY = '@bert0ns_sync_outbox';
export const LAST_SYNC_STORAGE_KEY = '@bert0ns_last_sync_timestamp';
export const DEAD_LETTER_QUEUE_STORAGE_KEY = '@bert0ns_sync_dead_letter_queue';

class AsyncMutex {
  private mutex = Promise.resolve();

  async runExclusive<T>(fn: () => Promise<T>): Promise<T> {
    let release: () => void;
    const next = new Promise<void>((resolve) => {
      release = resolve;
    });
    const current = this.mutex;
    this.mutex = next;

    try {
      await current;
      return await fn();
    } finally {
      release!();
    }
  }
}

const outboxMutex = new AsyncMutex();

export function calculateBackoffDelay(
  retryCount: number,
  baseDelayMs: number = 1000,
  maxDelayMs: number = 30000,
): number {
  const exponential = Math.min(maxDelayMs, baseDelayMs * Math.pow(2, Math.max(0, retryCount - 1)));
  const jitter = Math.random() * exponential * 0.2; // 20% jitter
  return Math.round(exponential + jitter);
}

let currentSyncStatus: SyncStatus = 'offline';
let activeFlushPromise: Promise<{ processed: number; errors: number }> | null = null;
const statusListeners = new Set<(status: SyncStatus) => void>();

function notifyStatus(status: SyncStatus) {
  if (currentSyncStatus !== status) {
    syncLogger.info('Sync status transition', { from: currentSyncStatus, to: status });
  }
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
    return outboxMutex.runExclusive(async () => {
      try {
        await AsyncStorage.removeItem(OUTBOX_STORAGE_KEY);
      } catch (err) {
        supabaseLogger.error('Failed to clear sync outbox', { error: err });
      }
    });
  },

  async getDeadLetterQueue(): Promise<OutboxMutation[]> {
    try {
      const data = await AsyncStorage.getItem(DEAD_LETTER_QUEUE_STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch (err) {
      supabaseLogger.error('Failed to get dead letter queue', { error: err });
      return [];
    }
  },

  async clearDeadLetterQueue(): Promise<void> {
    return outboxMutex.runExclusive(async () => {
      try {
        await AsyncStorage.removeItem(DEAD_LETTER_QUEUE_STORAGE_KEY);
      } catch (err) {
        supabaseLogger.error('Failed to clear dead letter queue', { error: err });
      }
    });
  },

  async clearAllSyncData(): Promise<void> {
    return outboxMutex.runExclusive(async () => {
      try {
        await AsyncStorage.multiRemove([
          OUTBOX_STORAGE_KEY,
          LAST_SYNC_STORAGE_KEY,
          DEAD_LETTER_QUEUE_STORAGE_KEY,
        ]);
        currentSyncStatus = 'offline';
        syncLogger.info('All sync outbox, DLQ, and timestamp data cleared from storage');
      } catch (err) {
        supabaseLogger.error('Failed to clear all sync data from storage', { error: err });
      }
    });
  },

  async enqueueMutation(
    mutation: Omit<OutboxMutation, 'id' | 'created_at' | 'retry_count'>,
  ): Promise<void> {
    await outboxMutex.runExclusive(async () => {
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
        if (mutation.entity === 'expense') {
          transactionLogger.info('Transaction mutation enqueued for sync', {
            entity: mutation.entity,
            operation: mutation.operation,
            entity_id: mutation.entity_id,
          });
        } else {
          syncLogger.info('State mutation enqueued for sync', {
            entity: mutation.entity,
            operation: mutation.operation,
            entity_id: mutation.entity_id,
          });
        }
      } catch (err) {
        supabaseLogger.error('Failed to enqueue mutation', { error: err });
      }
    });

    // Attempt background flush if online
    if (isSupabaseConfigured()) {
      this.flushOutbox().catch((err) => {
        supabaseLogger.debug('Background flush deferred', { error: err });
      });
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

        const now = Date.now();
        // Filter items ready for attempt (respecting exponential backoff)
        const itemsToAttempt = outbox.filter(
          (item) => !item.next_retry_at || new Date(item.next_retry_at).getTime() <= now,
        );

        if (itemsToAttempt.length === 0) {
          syncLogger.debug('All pending outbox items are currently in backoff delay');
          return { processed: 0, errors: 0 };
        }

        syncLogger.info('Starting outbox flush', {
          outboxCount: outbox.length,
          attemptCount: itemsToAttempt.length,
        });
        notifyStatus('syncing');
        let processed = 0;
        let errors = 0;
        const succeededIds = new Set<string>();
        const failedMap = new Map<string, OutboxMutation>();
        const deadLetterItems: OutboxMutation[] = [];

        for (const item of itemsToAttempt) {
          try {
            const success = await this.executeMutation(item);
            if (success) {
              processed++;
              succeededIds.add(item.id);
            } else {
              errors++;
              const newRetryCount = (item.retry_count || 0) + 1;
              const backoffMs = calculateBackoffDelay(newRetryCount);
              const updatedItem: OutboxMutation = {
                ...item,
                retry_count: newRetryCount,
                next_retry_at: new Date(Date.now() + backoffMs).toISOString(),
                last_error: 'Mutation returned false',
              };
              if (newRetryCount >= 5) {
                deadLetterItems.push(updatedItem);
              } else {
                failedMap.set(item.id, updatedItem);
              }
            }
          } catch (execErr: any) {
            errors++;
            const newRetryCount = (item.retry_count || 0) + 1;
            const backoffMs = calculateBackoffDelay(newRetryCount);
            const errorMsg = execErr?.message || String(execErr);
            const updatedItem: OutboxMutation = {
              ...item,
              retry_count: newRetryCount,
              next_retry_at: new Date(Date.now() + backoffMs).toISOString(),
              last_error: errorMsg,
            };
            if (newRetryCount >= 5) {
              deadLetterItems.push(updatedItem);
            } else {
              failedMap.set(item.id, updatedItem);
            }
          }
        }

        // Apply changes to AsyncStorage safely using mutex
        await outboxMutex.runExclusive(async () => {
          // If any items reached max retries, move to Dead Letter Queue
          if (deadLetterItems.length > 0) {
            const dlq = await this.getDeadLetterQueue();
            const updatedDlq = [...dlq, ...deadLetterItems];
            await AsyncStorage.setItem(DEAD_LETTER_QUEUE_STORAGE_KEY, JSON.stringify(updatedDlq));
            syncLogger.warn('Mutations moved to dead letter queue', {
              count: deadLetterItems.length,
            });
          }

          // Re-read current outbox to safely preserve any mutations enqueued concurrently
          const freshOutbox = await this.getOutbox();
          const deadLetterIds = new Set(deadLetterItems.map((m) => m.id));
          const updatedOutbox = freshOutbox
            .filter((m) => !succeededIds.has(m.id) && !deadLetterIds.has(m.id))
            .map((m) => failedMap.get(m.id) || m);

          await AsyncStorage.setItem(OUTBOX_STORAGE_KEY, JSON.stringify(updatedOutbox));
          syncLogger.info('Outbox flush completed', {
            processed,
            errors,
            dlqCount: deadLetterItems.length,
            remaining: updatedOutbox.length,
          });
        });

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
          const { error: expError } = await supabase.from('expenses').upsert({
            ...payload,
            updated_at: new Date().toISOString(),
          });
          if (expError) throw expError;
        } else if (operation === 'DELETE') {
          const now = new Date().toISOString();
          const { error } = await supabase
            .from('expenses')
            .update({ deleted_at: now, updated_at: now })
            .eq('id', entity_id);
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
          const now = new Date().toISOString();
          const { error } = await supabase
            .from('categories')
            .update({ deleted_at: now, updated_at: now })
            .eq('id', entity_id);
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
          const now = new Date().toISOString();
          const { error } = await supabase
            .from('family_members')
            .update({ deleted_at: now, updated_at: now })
            .eq('id', entity_id);
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
              ...(payload.invite_code ? { invite_code: payload.invite_code } : {}),
              updated_at: new Date().toISOString(),
            })
            .eq('id', entity_id);
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
            notify_member_joined: payload.notify_member_joined,
            notify_role_changed: payload.notify_role_changed,
            updated_at: new Date().toISOString(),
          });
          if (error) throw error;
        }
        return true;
      }

      case 'import_batch': {
        if (operation === 'INSERT' || operation === 'UPDATE') {
          const { error } = await supabase.from('import_batches').upsert({
            id: payload.id,
            family_id: payload.family_id,
            imported_by_member_id: payload.imported_by_member_id,
            file_name: payload.file_name,
            total_records: payload.total_records,
            total_amount: payload.total_amount,
            raw_payload: payload.raw_payload ?? null,
            created_at: payload.created_at || new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });
          if (error) throw error;
        } else if (operation === 'DELETE') {
          const { error } = await supabase.from('import_batches').delete().eq('id', entity_id);
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
      syncLogger.info('Fetching cloud delta', { familyId, sinceTimestamp: lastSync });

      // 0. Fetch family metadata (name, currency, invite_code)
      try {
        const { data: remoteFamily, error: famErr } = await supabase
          .from('families')
          .select('id, name, currency, invite_code, updated_at')
          .eq('id', familyId)
          .maybeSingle();

        if (!famErr && remoteFamily) {
          const currentFamily = useAppStore.getState().family;
          useAppStore.setState({
            family: {
              ...currentFamily,
              name: remoteFamily.name,
              currency: remoteFamily.currency || currentFamily.currency,
              invite_code: remoteFamily.invite_code || currentFamily.invite_code,
              updated_at: remoteFamily.updated_at,
            },
          });
        }
      } catch (famErr) {
        supabaseLogger.warn('Optional family delta fetch skipped', { error: famErr });
      }

      // 1. Fetch updated expenses (including soft-deleted tombstones)
      let expQuery = supabase.from('expenses').select('*').eq('family_id', familyId);
      if (lastSync) {
        expQuery = expQuery.or(`updated_at.gt.${lastSync},deleted_at.gt.${lastSync}`);
      }
      const { data: remoteExpenses, error: expErr } = await expQuery;
      if (expErr) throw expErr;

      // 2. Fetch updated categories (including soft-deleted tombstones)
      let catQuery = supabase.from('categories').select('*').eq('family_id', familyId);
      if (lastSync) {
        catQuery = catQuery.or(`updated_at.gt.${lastSync},deleted_at.gt.${lastSync}`);
      }
      const { data: remoteCategories, error: catErr } = await catQuery;
      if (catErr) throw catErr;

      // 3. Fetch updated members (including soft-deleted tombstones)
      let memQuery = supabase.from('family_members').select('*').eq('family_id', familyId);
      if (lastSync) {
        memQuery = memQuery.or(`updated_at.gt.${lastSync},deleted_at.gt.${lastSync}`);
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
          deleted_at: re.deleted_at || null,
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
          deleted_at: rc.deleted_at || null,
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
          deleted_at: rm.deleted_at || null,
        }));
        this.mergeMembersLWW(mappedMembers);
        count += mappedMembers.length;
      }

      // 4. Fetch updated import batches
      let batchQuery = supabase.from('import_batches').select('*').eq('family_id', familyId);
      if (lastSync) {
        batchQuery = batchQuery.or(`updated_at.gt.${lastSync},created_at.gt.${lastSync}`);
      }
      const { data: remoteBatches, error: batchErr } = await batchQuery;
      if (batchErr) throw batchErr;

      if (remoteBatches && remoteBatches.length > 0) {
        const mappedBatches: ImportBatch[] = remoteBatches.map((rb: any) => ({
          id: rb.id,
          family_id: rb.family_id,
          imported_by_member_id: rb.imported_by_member_id,
          file_name: rb.file_name,
          total_records: Number(rb.total_records),
          total_amount: Number(rb.total_amount),
          raw_payload: rb.raw_payload ?? null,
          created_at: rb.created_at,
          updated_at: rb.updated_at,
        }));
        this.mergeImportBatchesLWW(mappedBatches);
        count += mappedBatches.length;
      }

      // 5. Fetch notification preferences for current member
      try {
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
              notify_member_joined: prefData.notify_member_joined,
              notify_role_changed: prefData.notify_role_changed,
            });
          }
        }
      } catch (prefErr) {
        supabaseLogger.warn('Optional notification preferences delta fetch skipped', {
          error: prefErr,
        });
      }

      const syncTimestamp = new Date().toISOString();
      await this.setLastSyncTimestamp(syncTimestamp);
      syncLogger.info('Cloud delta sync completed', { familyId, updatedEntitiesCount: count });
      notifyStatus('synced');
      return { updatedCount: count };
    } catch (err) {
      supabaseLogger.error('Failed to fetch delta from Supabase', { error: err });
      notifyStatus('error');
      return { updatedCount: 0 };
    }
  },

  mergeExpensesLWW(remoteList: Expense[]) {
    useAppStore.getState().reconcileRemoteExpenses(remoteList);
  },

  mergeCategoriesLWW(remoteList: Category[]) {
    useAppStore.getState().reconcileRemoteCategories(remoteList);
  },

  mergeMembersLWW(remoteList: FamilyMember[]) {
    useAppStore.getState().reconcileRemoteMembers(remoteList);
  },

  mergeImportBatchesLWW(remoteList: ImportBatch[]) {
    useAppStore.getState().reconcileRemoteImportBatches(remoteList);
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
