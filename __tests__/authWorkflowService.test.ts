import { authWorkflowService } from '@/services/authWorkflowService';
import { authService } from '@/services/authService';
import { migrationService } from '@/services/migrationService';
import { realtimeSync } from '@/services/realtimeSync';
import { syncEngine } from '@/services/syncEngine';
import { supabase, isSupabaseConfigured } from '@/services/supabase';
import { useAppStore } from '@/services/store';

jest.mock('@/services/supabase', () => {
  const fromMock = jest.fn();
  return {
    isSupabaseConfigured: jest.fn().mockReturnValue(true),
    supabase: {
      from: fromMock,
    },
  };
});

jest.mock('@/services/authService', () => ({
  authService: {
    sendOtp: jest.fn(),
    verifyOtp: jest.fn(),
    signOut: jest.fn().mockResolvedValue(undefined),
  },
}));

jest.mock('@/services/migrationService', () => ({
  migrationService: {
    migrateLocalDataToSupabase: jest.fn(),
  },
}));

jest.mock('@/services/realtimeSync', () => ({
  realtimeSync: {
    startRealtimeSync: jest.fn(),
  },
}));

jest.mock('@/services/syncEngine', () => ({
  syncEngine: {
    clearOutbox: jest.fn().mockResolvedValue(undefined),
    setLastSyncTimestamp: jest.fn().mockResolvedValue(undefined),
    fetchDelta: jest.fn().mockResolvedValue({ added: 0, updated: 0, deleted: 0 }),
  },
}));

describe('authWorkflowService', () => {
  const mockMembershipQuery = (
    data: { family_id: string; id: string } | null,
    error: any = null,
  ) => {
    (supabase.from as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          limit: jest.fn().mockReturnValue({
            maybeSingle: jest.fn().mockResolvedValue({ data, error }),
          }),
        }),
      }),
    });
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (isSupabaseConfigured as jest.Mock).mockReturnValue(true);
    mockMembershipQuery(null);
    useAppStore.getState().resetToSampleData();
  });

  describe('checkExistingFamilyMembership', () => {
    it('returns null if Supabase is not configured', async () => {
      (isSupabaseConfigured as jest.Mock).mockReturnValue(false);
      const res = await authWorkflowService.checkExistingFamilyMembership('user-123');
      expect(res).toBeNull();
      expect(supabase.from).not.toHaveBeenCalled();
    });

    it('returns null if userId is empty', async () => {
      const res = await authWorkflowService.checkExistingFamilyMembership('');
      expect(res).toBeNull();
      expect(supabase.from).not.toHaveBeenCalled();
    });

    it('returns null if querying family membership results in database error', async () => {
      mockMembershipQuery(null, { message: 'Database connection error' });
      const res = await authWorkflowService.checkExistingFamilyMembership('user-123');
      expect(res).toBeNull();
    });

    it('returns null if query execution throws an unexpected exception', async () => {
      (supabase.from as jest.Mock).mockImplementation(() => {
        throw new Error('Network error');
      });
      const res = await authWorkflowService.checkExistingFamilyMembership('user-123');
      expect(res).toBeNull();
    });

    it('returns existing membership record when found in Supabase', async () => {
      const existing = { family_id: 'fam-cloud-456', id: 'member-789' };
      mockMembershipQuery(existing);
      const res = await authWorkflowService.checkExistingFamilyMembership('user-123');
      expect(res).toEqual(existing);
    });
  });

  describe('sendOtp', () => {
    it('delegates to authService.sendOtp', async () => {
      (authService.sendOtp as jest.Mock).mockResolvedValue({ error: null });

      const res = await authWorkflowService.sendOtp('test@example.com', 'https://example.com');
      expect(res.error).toBeNull();
      expect(authService.sendOtp).toHaveBeenCalledWith('test@example.com', 'https://example.com');
    });

    it('returns error if authService fails', async () => {
      (authService.sendOtp as jest.Mock).mockResolvedValue({ error: 'Rate limited' });

      const res = await authWorkflowService.sendOtp('test@example.com');
      expect(res.error).toBe('Rate limited');
    });
  });

  describe('verifyOtpAndMigrate', () => {
    it('returns error if OTP verification fails without attempting migration', async () => {
      (authService.verifyOtp as jest.Mock).mockResolvedValue({
        session: null,
        user: null,
        error: 'Invalid OTP code',
      });

      const res = await authWorkflowService.verifyOtpAndMigrate(
        'test@example.com',
        '000000',
        'fam-123',
      );

      expect(res.success).toBe(false);
      expect(res.error).toBe('Invalid OTP code');
      expect(migrationService.migrateLocalDataToSupabase).not.toHaveBeenCalled();
      expect(authService.signOut).not.toHaveBeenCalled();
    });

    it('returns error if session user ID is missing after verification', async () => {
      (authService.verifyOtp as jest.Mock).mockResolvedValue({
        session: { user: {} },
        user: {},
        error: null,
      });

      const res = await authWorkflowService.verifyOtpAndMigrate(
        'test@example.com',
        '123456',
        'fam-123',
      );

      expect(res.success).toBe(false);
      expect(res.error).toBe('User ID missing in verified session');
    });

    it('resolves existing cloud family on multi-device login without creating duplicate family', async () => {
      const mockUser = { id: 'user-cloud-123', email: 'partner@example.com' } as any;
      const mockSession = { user: mockUser } as any;
      const existingMembership = { family_id: 'fam-cloud-existing', id: 'member-existing-id' };

      (authService.verifyOtp as jest.Mock).mockResolvedValue({
        session: mockSession,
        user: mockUser,
        error: null,
      });

      mockMembershipQuery(existingMembership);

      const res = await authWorkflowService.verifyOtpAndMigrate(
        'partner@example.com',
        '123456',
        'fam-local-second-device',
      );

      expect(res.success).toBe(true);
      expect(res.actionTaken).toBe('hydrated_existing');
      expect(res.targetFamilyId).toBe('fam-cloud-existing');
      expect(res.user).toEqual(mockUser);

      // Must NOT migrate local data into a new family
      expect(migrationService.migrateLocalDataToSupabase).not.toHaveBeenCalled();

      // Must clear local outbox mutations and reset sync cursor
      expect(syncEngine.clearOutbox).toHaveBeenCalled();
      expect(syncEngine.setLastSyncTimestamp).toHaveBeenCalledWith('');

      // Must update store family ID and member ID
      expect(useAppStore.getState().family.id).toBe('fam-cloud-existing');
      expect(useAppStore.getState().currentMemberId).toBe('member-existing-id');

      // Must fetch delta and start realtime sync with existing cloud family
      expect(syncEngine.fetchDelta).toHaveBeenCalledWith('fam-cloud-existing');
      expect(realtimeSync.startRealtimeSync).toHaveBeenCalledWith('fam-cloud-existing');
    });

    it('rolls back store state and signs out if existing cloud family delta hydration throws', async () => {
      const initialFamilyId = useAppStore.getState().family.id;
      const mockUser = { id: 'user-cloud-123', email: 'partner@example.com' } as any;
      const mockSession = { user: mockUser } as any;
      const existingMembership = { family_id: 'fam-cloud-existing', id: 'member-existing-id' };

      (authService.verifyOtp as jest.Mock).mockResolvedValue({
        session: mockSession,
        user: mockUser,
        error: null,
      });

      mockMembershipQuery(existingMembership);
      (syncEngine.fetchDelta as jest.Mock).mockRejectedValueOnce(
        new Error('Network failure fetching delta'),
      );

      const res = await authWorkflowService.verifyOtpAndMigrate(
        'partner@example.com',
        '123456',
        'fam-local-second-device',
      );

      expect(res.success).toBe(false);
      expect(res.error).toBe('Network failure fetching delta');
      expect(authService.signOut).toHaveBeenCalled();
      expect(useAppStore.getState().family.id).toBe(initialFamilyId);
    });

    it('skips migration when user signs in with intent to join via invite code', async () => {
      const mockUser = { id: 'user-new-joiner', email: 'invitee@example.com' } as any;
      const mockSession = { user: mockUser } as any;

      (authService.verifyOtp as jest.Mock).mockResolvedValue({
        session: mockSession,
        user: mockUser,
        error: null,
      });

      // No existing family membership
      mockMembershipQuery(null);

      const res = await authWorkflowService.verifyOtpAndMigrate(
        'invitee@example.com',
        '123456',
        'fam-local-unpaired',
        { intent: 'join' },
      );

      expect(res.success).toBe(true);
      expect(res.actionTaken).toBe('ready_to_join');
      expect(res.user).toEqual(mockUser);

      // Must NOT migrate local data
      expect(migrationService.migrateLocalDataToSupabase).not.toHaveBeenCalled();
      // Must NOT start realtime sync before invite code is paired
      expect(realtimeSync.startRealtimeSync).not.toHaveBeenCalled();
      expect(syncEngine.fetchDelta).not.toHaveBeenCalled();
    });

    it('supports string argument for intent option', async () => {
      const mockUser = { id: 'user-new-joiner-2', email: 'invitee2@example.com' } as any;
      const mockSession = { user: mockUser } as any;

      (authService.verifyOtp as jest.Mock).mockResolvedValue({
        session: mockSession,
        user: mockUser,
        error: null,
      });

      mockMembershipQuery(null);

      const res = await authWorkflowService.verifyOtpAndMigrate(
        'invitee2@example.com',
        '123456',
        'fam-local-unpaired',
        'join',
      );

      expect(res.success).toBe(true);
      expect(res.actionTaken).toBe('ready_to_join');
      expect(migrationService.migrateLocalDataToSupabase).not.toHaveBeenCalled();
    });

    it('successfully migrates data and starts realtime sync on valid verification for first-time cloud setup', async () => {
      const mockUser = { id: 'u1', email: 'test@example.com' } as any;
      const mockSession = { user: mockUser } as any;

      (authService.verifyOtp as jest.Mock).mockResolvedValue({
        session: mockSession,
        user: mockUser,
        error: null,
      });

      mockMembershipQuery(null);

      (migrationService.migrateLocalDataToSupabase as jest.Mock).mockResolvedValue({
        success: true,
        targetFamilyId: 'fam-migrated-target',
      });

      const res = await authWorkflowService.verifyOtpAndMigrate(
        'test@example.com',
        '123456',
        'fam-123',
        { intent: 'create' },
      );

      expect(res.success).toBe(true);
      expect(res.actionTaken).toBe('migrated');
      expect(res.user).toEqual(mockUser);
      expect(res.targetFamilyId).toBe('fam-migrated-target');
      expect(migrationService.migrateLocalDataToSupabase).toHaveBeenCalledWith('fam-123', 'u1');
      expect(realtimeSync.startRealtimeSync).toHaveBeenCalledWith('fam-migrated-target');
      expect(syncEngine.fetchDelta).toHaveBeenCalledWith('fam-migrated-target');
      expect(authService.signOut).not.toHaveBeenCalled();
    });

    it('rolls back store state and signs out if migration fails', async () => {
      const initialFamilyName = useAppStore.getState().family.name;
      const mockUser = { id: 'u1', email: 'test@example.com' } as any;
      const mockSession = { user: mockUser } as any;

      (authService.verifyOtp as jest.Mock).mockResolvedValue({
        session: mockSession,
        user: mockUser,
        error: null,
      });

      mockMembershipQuery(null);

      (migrationService.migrateLocalDataToSupabase as jest.Mock).mockResolvedValue({
        success: false,
        error: 'Database network error',
      });

      const res = await authWorkflowService.verifyOtpAndMigrate(
        'test@example.com',
        '123456',
        'fam-123',
      );

      expect(res.success).toBe(false);
      expect(res.error).toContain('Database network error');
      expect(authService.signOut).toHaveBeenCalled();
      expect(useAppStore.getState().family.name).toBe(initialFamilyName);
    });

    it('rolls back store state and signs out if migration throws an exception', async () => {
      const mockUser = { id: 'u1', email: 'test@example.com' } as any;
      const mockSession = { user: mockUser } as any;

      (authService.verifyOtp as jest.Mock).mockResolvedValue({
        session: mockSession,
        user: mockUser,
        error: null,
      });

      mockMembershipQuery(null);

      (migrationService.migrateLocalDataToSupabase as jest.Mock).mockRejectedValue(
        new Error('Fatal migration timeout'),
      );

      const res = await authWorkflowService.verifyOtpAndMigrate(
        'test@example.com',
        '123456',
        'fam-123',
      );

      expect(res.success).toBe(false);
      expect(res.error).toBe('Fatal migration timeout');
      expect(authService.signOut).toHaveBeenCalled();
    });
  });
});
