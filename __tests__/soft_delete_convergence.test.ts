import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAppStore, registerStoreMutationListener, StoreMutationEvent } from '@/services/store';
import {
  syncEngine,
  calculateBackoffDelay,
  DEAD_LETTER_QUEUE_STORAGE_KEY,
  OUTBOX_STORAGE_KEY,
  LAST_SYNC_STORAGE_KEY,
} from '@/services/syncEngine';
import { migrationService } from '@/services/migrationService';
import { supabase, isSupabaseConfigured } from '@/services/supabase';
import { Expense, Category, FamilyMember } from '@/types';

jest.mock('@/services/supabase', () => {
  const fromMock = jest.fn();
  return {
    isSupabaseConfigured: jest.fn(),
    supabase: {
      from: fromMock,
    },
  };
});

describe('Distributed Convergence and Soft-Delete Tombstones', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await AsyncStorage.clear();
    useAppStore.getState().resetToSampleData();
  });

  describe('clearAllExpenses and Zombie Resurrection Prevention', () => {
    it('dispatches DELETE mutation notifications for each existing expense when clearAllExpenses is called', () => {
      const dispatchedEvents: StoreMutationEvent[] = [];
      const unregister = registerStoreMutationListener((event) => {
        dispatchedEvents.push(event);
      });

      const initialCount = useAppStore.getState().expenses.length;
      expect(initialCount).toBeGreaterThan(0);

      useAppStore.getState().clearAllExpenses();

      expect(useAppStore.getState().expenses).toHaveLength(0);
      expect(
        dispatchedEvents.filter((e) => e.entity === 'expense' && e.operation === 'DELETE'),
      ).toHaveLength(initialCount);

      unregister();
    });
  });

  describe('Store Tombstone Reconciliation', () => {
    it('purges expense when remote contains deleted_at timestamp newer than or equal to local', () => {
      const store = useAppStore.getState();
      const localExp = store.expenses[0];

      const tombstoneExp: Expense = {
        ...localExp,
        deleted_at: '2026-09-02T00:00:00Z',
        updated_at: '2026-09-02T00:00:00Z',
      };

      store.reconcileRemoteExpenses([tombstoneExp]);

      expect(useAppStore.getState().expenses.find((e) => e.id === localExp.id)).toBeUndefined();
    });

    it('does not purge expense if local update is newer than remote tombstone deleted_at', () => {
      const store = useAppStore.getState();
      const localExp = store.expenses[0];
      useAppStore.setState({
        expenses: [
          {
            ...localExp,
            updated_at: '2026-09-05T00:00:00Z',
          },
          ...store.expenses.slice(1),
        ],
      });

      const olderTombstoneExp: Expense = {
        ...localExp,
        deleted_at: '2026-09-01T00:00:00Z',
        updated_at: '2026-09-01T00:00:00Z',
      };

      useAppStore.getState().reconcileRemoteExpenses([olderTombstoneExp]);

      expect(useAppStore.getState().expenses.find((e) => e.id === localExp.id)).toBeDefined();
    });

    it('purges category when remote contains deleted_at tombstone', () => {
      const store = useAppStore.getState();
      const localCat = store.categories[0];

      const tombstoneCat: Category = {
        ...localCat,
        deleted_at: '2026-09-02T00:00:00Z',
        updated_at: '2026-09-02T00:00:00Z',
      };

      store.reconcileRemoteCategories([tombstoneCat]);

      expect(useAppStore.getState().categories.find((c) => c.id === localCat.id)).toBeUndefined();
    });

    it('purges family member when remote contains deleted_at tombstone', () => {
      const store = useAppStore.getState();
      const localMember = store.members[0];

      const tombstoneMember: FamilyMember = {
        ...localMember,
        deleted_at: '2026-09-02T00:00:00Z',
        updated_at: '2026-09-02T00:00:00Z',
      };

      store.reconcileRemoteMembers([tombstoneMember]);

      expect(useAppStore.getState().members.find((m) => m.id === localMember.id)).toBeUndefined();
    });
  });

  describe('Dead-Letter Queue and Exponential Backoff', () => {
    it('calculates exponential backoff delay with jitter', () => {
      const delay1 = calculateBackoffDelay(1, 1000, 30000);
      expect(delay1).toBeGreaterThanOrEqual(1000);
      expect(delay1).toBeLessThanOrEqual(1250);

      const delay2 = calculateBackoffDelay(2, 1000, 30000);
      expect(delay2).toBeGreaterThanOrEqual(2000);
      expect(delay2).toBeLessThanOrEqual(2500);

      const delay5 = calculateBackoffDelay(5, 1000, 30000);
      expect(delay5).toBeGreaterThanOrEqual(16000);

      const delayMax = calculateBackoffDelay(10, 1000, 30000);
      expect(delayMax).toBeLessThanOrEqual(36000);
    });

    it('clears DLQ, outbox, and last sync timestamp on clearAllSyncData', async () => {
      await AsyncStorage.setItem(OUTBOX_STORAGE_KEY, JSON.stringify([{ id: '1' }]));
      await AsyncStorage.setItem(LAST_SYNC_STORAGE_KEY, '2026-09-01');
      await AsyncStorage.setItem(DEAD_LETTER_QUEUE_STORAGE_KEY, JSON.stringify([{ id: 'dlq_1' }]));

      await syncEngine.clearAllSyncData();

      expect(await syncEngine.getOutbox()).toHaveLength(0);
      expect(await syncEngine.getLastSyncTimestamp()).toBeNull();
      expect(await syncEngine.getDeadLetterQueue()).toHaveLength(0);
    });

    it('manages DLQ items directly via getDeadLetterQueue and clearDeadLetterQueue', async () => {
      await AsyncStorage.setItem(
        DEAD_LETTER_QUEUE_STORAGE_KEY,
        JSON.stringify([
          {
            id: 'dlq_test',
            entity: 'expense',
            operation: 'INSERT',
            entity_id: 'e1',
            payload: {},
            created_at: new Date().toISOString(),
            retry_count: 5,
            last_error: 'Fatal server error',
          },
        ]),
      );

      const dlq = await syncEngine.getDeadLetterQueue();
      expect(dlq).toHaveLength(1);
      expect(dlq[0].last_error).toBe('Fatal server error');

      await syncEngine.clearDeadLetterQueue();
      expect(await syncEngine.getDeadLetterQueue()).toHaveLength(0);
    });
  });

  describe('Migration Rollback Compensation', () => {
    it('attempts to roll back created family if a subsequent step in migration fails', async () => {
      (isSupabaseConfigured as jest.Mock).mockReturnValue(true);

      const deleteEqMock = jest.fn().mockResolvedValue({ error: null });
      const deleteMock = jest.fn().mockReturnValue({ eq: deleteEqMock });
      const familyUpsertMock = jest.fn().mockResolvedValue({ error: null });
      const memberUpsertMock = jest.fn().mockResolvedValue({
        error: { message: 'Failed to insert members into database' },
      });

      (supabase.from as jest.Mock).mockImplementation((table: string) => {
        if (table === 'families') {
          return {
            upsert: familyUpsertMock,
            delete: deleteMock,
          };
        }
        if (table === 'family_members') {
          return { upsert: memberUpsertMock };
        }
        return {};
      });

      const result = await migrationService.migrateLocalDataToSupabase('fam_test', 'user_123');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to insert members');
      expect(deleteMock).toHaveBeenCalled();
      expect(deleteEqMock).toHaveBeenCalled();
    });
  });
});
