import AsyncStorage from '@react-native-async-storage/async-storage';
import { syncEngine } from '@/services/syncEngine';
import { supabase, isSupabaseConfigured } from '@/services/supabase';
import { useAppStore } from '@/services/store';
import { Expense } from '@/types';

jest.mock('@/services/supabase', () => {
  const fromMock = jest.fn();
  return {
    isSupabaseConfigured: jest.fn(),
    supabase: {
      from: fromMock,
    },
  };
});

describe('syncEngine', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await AsyncStorage.clear();
    useAppStore.getState().resetToSampleData();
  });

  it('enqueues mutations into the AsyncStorage outbox', async () => {
    (isSupabaseConfigured as jest.Mock).mockReturnValue(false);

    await syncEngine.enqueueMutation({
      entity: 'expense',
      operation: 'INSERT',
      entity_id: 'test-exp-1',
      payload: { id: 'test-exp-1', amount: 50 },
    });

    const outbox = await syncEngine.getOutbox();
    expect(outbox).toHaveLength(1);
    expect(outbox[0].entity).toBe('expense');
    expect(outbox[0].operation).toBe('INSERT');
    expect(outbox[0].entity_id).toBe('test-exp-1');
  });

  it('clears outbox cleanly', async () => {
    await syncEngine.enqueueMutation({
      entity: 'category',
      operation: 'INSERT',
      entity_id: 'cat-1',
      payload: { id: 'cat-1', name: 'Test' },
    });

    let outbox = await syncEngine.getOutbox();
    expect(outbox).toHaveLength(1);

    await syncEngine.clearOutbox();
    outbox = await syncEngine.getOutbox();
    expect(outbox).toHaveLength(0);
  });

  it('notifies status subscribers when status updates', () => {
    const statuses: string[] = [];
    const unsubscribe = syncEngine.subscribeSyncStatus((status) => {
      statuses.push(status);
    });

    expect(statuses.length).toBeGreaterThan(0);
    unsubscribe();
  });

  it('flushes outbox items successfully when online', async () => {
    (isSupabaseConfigured as jest.Mock).mockReturnValue(true);

    const upsertMock = jest.fn().mockResolvedValue({ error: null });
    (supabase.from as jest.Mock).mockReturnValue({
      upsert: upsertMock,
    });

    await syncEngine.enqueueMutation({
      entity: 'category',
      operation: 'INSERT',
      entity_id: 'cat-new-1',
      payload: { id: 'cat-new-1', name: 'Utilities' },
    });

    const res = await syncEngine.flushOutbox();
    expect(res.processed).toBe(1);
    expect(res.errors).toBe(0);

    const remaining = await syncEngine.getOutbox();
    expect(remaining).toHaveLength(0);
  });

  it('reconciles remote expenses with Last-Write-Wins logic', () => {
    const initialExpenses = useAppStore.getState().expenses;
    const existingId = initialExpenses[0].id;

    // Remote has an update with a newer timestamp
    const updatedRemote: Expense = {
      ...initialExpenses[0],
      amount: 999.99,
      updated_at: '2026-09-04T12:00:00.000Z',
    };

    syncEngine.mergeExpensesLWW([updatedRemote]);

    const afterMerge = useAppStore.getState().expenses;
    const mergedItem = afterMerge.find((e) => e.id === existingId);
    expect(mergedItem?.amount).toBe(999.99);
  });
});
