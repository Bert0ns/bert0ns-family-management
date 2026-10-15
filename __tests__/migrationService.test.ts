import { migrationService } from '@/services/migrationService';
import { supabase, isSupabaseConfigured } from '@/services/supabase';
import { useAppStore } from '@/services/store';

jest.mock('@/services/supabase', () => {
  const fromMock = jest.fn();
  return {
    isSupabaseConfigured: jest.fn(),
    supabase: {
      from: fromMock,
    },
  };
});

describe('migrationService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useAppStore.getState().resetToSampleData();
  });

  it('returns failure if Supabase is not configured', async () => {
    (isSupabaseConfigured as jest.Mock).mockReturnValue(false);
    const result = await migrationService.migrateLocalDataToSupabase('fam-test');
    expect(result.success).toBe(false);
    expect(result.error).toContain('not configured');
  });

  it('migrates local data successfully to Supabase', async () => {
    (isSupabaseConfigured as jest.Mock).mockReturnValue(true);

    const upsertMock = jest.fn().mockResolvedValue({ error: null });
    (supabase.from as jest.Mock).mockReturnValue({
      upsert: upsertMock,
    });

    const targetFamilyUUID = 'e2908f58-a5be-4416-921c-a04473b18491';
    const result = await migrationService.migrateLocalDataToSupabase(targetFamilyUUID, 'user-123');

    expect(result.success).toBe(true);
    expect(result.expensesCount).toBeGreaterThan(0);
    expect(result.categoriesCount).toBeGreaterThan(0);
    expect(result.membersCount).toBeGreaterThan(0);

    // Verify store has been updated to the new family UUID
    const updatedStore = useAppStore.getState();
    expect(updatedStore.family.id).toBe(targetFamilyUUID);
  });

  it('handles Supabase operation failure and returns error', async () => {
    (isSupabaseConfigured as jest.Mock).mockReturnValue(true);

    const upsertMock = jest
      .fn()
      .mockResolvedValue({ error: { message: 'RLS policy violated on family_members' } });
    (supabase.from as jest.Mock).mockReturnValue({
      upsert: upsertMock,
    });

    const result = await migrationService.migrateLocalDataToSupabase(
      'e2908f58-a5be-4416-921c-a04473b18491',
    );
    expect(result.success).toBe(false);
    expect(result.error).toContain('RLS policy violated');
  });

  it('catches unexpected thrown exceptions during migration', async () => {
    (isSupabaseConfigured as jest.Mock).mockReturnValue(true);

    (supabase.from as jest.Mock).mockImplementation(() => {
      throw new Error('Network socket disconnected during migration');
    });

    const result = await migrationService.migrateLocalDataToSupabase(
      'e2908f58-a5be-4416-921c-a04473b18491',
    );
    expect(result.success).toBe(false);
    expect(result.error).toContain('Network socket disconnected');
  });

  it('preserves user-configured currency instead of overwriting with default', async () => {
    (isSupabaseConfigured as jest.Mock).mockReturnValue(true);

    const upsertMock = jest.fn().mockResolvedValue({ error: null });
    (supabase.from as jest.Mock).mockReturnValue({
      upsert: upsertMock,
    });

    // Configure a custom currency in local family store
    useAppStore.setState((state) => ({
      family: { ...state.family, currency: 'USD' },
    }));

    const targetFamilyUUID = 'e2908f58-a5be-4416-921c-a04473b18491';
    const result = await migrationService.migrateLocalDataToSupabase(targetFamilyUUID, 'user-123');

    expect(result.success).toBe(true);

    // Check that families table was upserted with 'USD'
    expect(upsertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        id: targetFamilyUUID,
        currency: 'USD',
      }),
    );
  });

  it('preserves and syncs existing importBatches and associates expenses via mapped UUIDs', async () => {
    (isSupabaseConfigured as jest.Mock).mockReturnValue(true);

    const upsertMap: Record<string, jest.Mock> = {
      families: jest.fn().mockResolvedValue({ error: null }),
      family_members: jest.fn().mockResolvedValue({ error: null }),
      categories: jest.fn().mockResolvedValue({ error: null }),
      import_batches: jest.fn().mockResolvedValue({ error: null }),
      expenses: jest.fn().mockResolvedValue({ error: null }),
    };

    (supabase.from as jest.Mock).mockImplementation((table: string) => ({
      upsert: upsertMap[table] || jest.fn().mockResolvedValue({ error: null }),
    }));

    // Setup local store with an import batch and an expense linking to it
    const legacyBatchId = 'batch-local-legacy-1';
    useAppStore.setState({
      importBatches: [
        {
          id: legacyBatchId,
          family_id: 'fam-local',
          imported_by_member_id: 'mem_1',
          file_name: 'test_report.csv',
          total_records: 1,
          total_amount: 50.0,
          created_at: '2026-08-01T10:00:00Z',
        },
      ],
      expenses: [
        {
          id: 'exp-local-1',
          family_id: 'fam-local',
          paid_by_member_id: 'mem_1',
          category_id: 'cat_groceries',
          import_batch_id: legacyBatchId,
          transaction_date: '2026-08-01',
          merchant_name: 'Supermarket',
          amount: 50.0,
          created_at: '2026-08-01T10:05:00Z',
        },
      ],
    });

    const targetFamilyUUID = 'e2908f58-a5be-4416-921c-a04473b18491';
    const result = await migrationService.migrateLocalDataToSupabase(targetFamilyUUID, 'user-123');

    expect(result.success).toBe(true);
    expect(result.batchesCount).toBe(1);

    // Verify import_batches upsert called
    expect(upsertMap.import_batches).toHaveBeenCalledTimes(1);
    const batchUpsertArg = upsertMap.import_batches.mock.calls[0][0];
    expect(batchUpsertArg).toHaveLength(1);
    const migratedBatchId = batchUpsertArg[0].id;
    expect(migratedBatchId).not.toBe(legacyBatchId);
    expect(batchUpsertArg[0].family_id).toBe(targetFamilyUUID);
    expect(batchUpsertArg[0].file_name).toBe('test_report.csv');

    // Verify expenses upsert called and import_batch_id matches migratedBatchId (NOT null!)
    expect(upsertMap.expenses).toHaveBeenCalledTimes(1);
    const expenseUpsertArg = upsertMap.expenses.mock.calls[0][0];
    expect(expenseUpsertArg[0].import_batch_id).toBe(migratedBatchId);
    expect(expenseUpsertArg[0].import_batch_id).not.toBeNull();

    // Verify local store has updated importBatches with migratedBatchId
    const storeBatches = useAppStore.getState().importBatches;
    expect(storeBatches).toHaveLength(1);
    expect(storeBatches[0].id).toBe(migratedBatchId);
    expect(storeBatches[0].family_id).toBe(targetFamilyUUID);
  });
});
