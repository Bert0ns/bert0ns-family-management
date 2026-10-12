import { pairingService } from '@/services/pairingService';
import { supabase, isSupabaseConfigured } from '@/services/supabase';
import { useAppStore } from '@/services/store';
import { syncEngine } from '@/services/syncEngine';
import { realtimeSync } from '@/services/realtimeSync';

const VALID_TEST_UUID = '123e4567-e89b-12d3-a456-426614174000';

jest.mock('@/services/supabase', () => {
  const fromMock = jest.fn();
  const rpcMock = jest.fn();
  const getSessionMock = jest.fn();
  return {
    isSupabaseConfigured: jest.fn(),
    supabase: {
      from: fromMock,
      rpc: rpcMock,
      auth: {
        getSession: getSessionMock,
      },
    },
  };
});

jest.mock('@/services/syncEngine', () => ({
  syncEngine: {
    clearOutbox: jest.fn().mockResolvedValue(undefined),
    setLastSyncTimestamp: jest.fn().mockResolvedValue(undefined),
    fetchDelta: jest.fn().mockResolvedValue({ added: 0, updated: 0, deleted: 0 }),
  },
}));

jest.mock('@/services/realtimeSync', () => ({
  realtimeSync: {
    startRealtimeSync: jest.fn(),
    stopRealtimeSync: jest.fn(),
  },
}));

describe('pairingService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useAppStore.getState().resetToSampleData();
  });

  describe('syncInviteCode', () => {
    it('returns current code without update when supabase is not configured', async () => {
      (isSupabaseConfigured as jest.Mock).mockReturnValue(false);
      const res = await pairingService.syncInviteCode('test-fam-id', 'ABC-123');
      expect(res.code).toBe('ABC-123');
      expect(res.updated).toBe(false);
    });

    it('generates a code if current code is missing locally', async () => {
      (isSupabaseConfigured as jest.Mock).mockReturnValue(false);
      const res = await pairingService.syncInviteCode('test-fam-id', undefined);
      expect(res.code).toBeDefined();
      expect(res.code.length).toBeGreaterThanOrEqual(4);
      expect(useAppStore.getState().family.invite_code).toBe(res.code);
    });

    it('updates local store if remote code differs from local', async () => {
      (isSupabaseConfigured as jest.Mock).mockReturnValue(true);

      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            maybeSingle: jest.fn().mockResolvedValue({
              data: { invite_code: 'REMOTE-99' },
              error: null,
            }),
          }),
        }),
      });

      const res = await pairingService.syncInviteCode(VALID_TEST_UUID, 'LOCAL-11');
      expect(res.code).toBe('REMOTE-99');
      expect(res.updated).toBe(true);
      expect(useAppStore.getState().family.invite_code).toBe('REMOTE-99');
    });
  });

  describe('regenerateInviteCode', () => {
    it('regenerates code locally when supabase is not configured', async () => {
      (isSupabaseConfigured as jest.Mock).mockReturnValue(false);
      const res = await pairingService.regenerateInviteCode('test-fam-id');
      expect(res.success).toBe(true);
      expect(res.code).toBeDefined();
      expect(useAppStore.getState().family.invite_code).toBe(res.code);
    });

    it('updates remote supabase record when configured', async () => {
      (isSupabaseConfigured as jest.Mock).mockReturnValue(true);

      const updateMock = jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({ error: null }),
      });
      (supabase.from as jest.Mock).mockReturnValue({
        update: updateMock,
      });

      const res = await pairingService.regenerateInviteCode(VALID_TEST_UUID);
      expect(res.success).toBe(true);
      expect(res.code).toBeDefined();
      expect(updateMock).toHaveBeenCalled();
    });

    it('returns failure when remote update fails', async () => {
      (isSupabaseConfigured as jest.Mock).mockReturnValue(true);

      (supabase.from as jest.Mock).mockReturnValue({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ error: { message: 'Database error' } }),
        }),
      });

      const res = await pairingService.regenerateInviteCode(VALID_TEST_UUID);
      expect(res.success).toBe(false);
      expect(res.error).toBe('Database error');
    });
  });

  describe('joinFamilyByInviteCode', () => {
    it('handles offline mock join when supabase is not configured', async () => {
      (isSupabaseConfigured as jest.Mock).mockReturnValue(false);

      const res = await pairingService.joinFamilyByInviteCode('MOCK-CODE');
      expect(res.success).toBe(true);
      expect(useAppStore.getState().family.name).toBe('Household (MOCK-CODE)');
    });

    it('returns AUTH_REQUIRED if no session exists', async () => {
      (isSupabaseConfigured as jest.Mock).mockReturnValue(true);
      (supabase.auth.getSession as jest.Mock).mockResolvedValue({
        data: { session: null },
      });

      const res = await pairingService.joinFamilyByInviteCode('ABC-123');
      expect(res.success).toBe(false);
      expect(res.error).toBe('AUTH_REQUIRED');
    });

    it('returns error when join RPC fails', async () => {
      (isSupabaseConfigured as jest.Mock).mockReturnValue(true);
      (supabase.auth.getSession as jest.Mock).mockResolvedValue({
        data: {
          session: {
            user: { id: 'u1', email: 'test@example.com' },
          },
        },
      });

      (supabase.rpc as jest.Mock).mockResolvedValue({
        data: null,
        error: { message: 'Invalid or expired invite code' },
      });

      const res = await pairingService.joinFamilyByInviteCode('INVALID');
      expect(res.success).toBe(false);
      expect(res.error).toBe('Invalid or expired invite code');
    });

    it('successfully joins family, resets store, and triggers delta sync', async () => {
      (isSupabaseConfigured as jest.Mock).mockReturnValue(true);
      const targetFamilyId = '123e4567-e89b-12d3-a456-426614174001';
      const targetMemberId = '123e4567-e89b-12d3-a456-426614174002';

      (supabase.auth.getSession as jest.Mock).mockResolvedValue({
        data: {
          session: {
            user: { id: 'u1', email: 'user@example.com' },
          },
        },
      });

      (supabase.rpc as jest.Mock).mockResolvedValue({
        data: { family_id: targetFamilyId, member_id: targetMemberId },
        error: null,
      });

      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: {
                id: targetFamilyId,
                name: 'New Household',
                currency: '€',
                invite_code: 'JOINED-1',
                created_at: new Date().toISOString(),
              },
              error: null,
            }),
          }),
        }),
      });

      const res = await pairingService.joinFamilyByInviteCode('JOINED-1');

      expect(res.success).toBe(true);
      expect(res.familyId).toBe(targetFamilyId);
      expect(syncEngine.clearOutbox).toHaveBeenCalled();
      expect(syncEngine.setLastSyncTimestamp).toHaveBeenCalledWith('');
      expect(realtimeSync.startRealtimeSync).toHaveBeenCalledWith(targetFamilyId);
      expect(syncEngine.fetchDelta).toHaveBeenCalledWith(targetFamilyId);

      const store = useAppStore.getState();
      expect(store.family.id).toBe(targetFamilyId);
      expect(store.family.name).toBe('New Household');
      expect(store.currentMemberId).toBe(targetMemberId);
    });
  });

  describe('createFamily', () => {
    it('creates family and updates local store', async () => {
      (isSupabaseConfigured as jest.Mock).mockReturnValue(false);

      const res = await pairingService.createFamily('Smith Family');
      expect(res.success).toBe(true);
      expect(res.family?.name).toBe('Smith Family');
      expect(useAppStore.getState().family.name).toBe('Smith Family');
    });
  });
});
