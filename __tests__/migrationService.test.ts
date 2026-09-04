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
});
