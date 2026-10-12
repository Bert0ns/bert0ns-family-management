import { authWorkflowService } from '@/services/authWorkflowService';
import { authService } from '@/services/authService';
import { migrationService } from '@/services/migrationService';
import { realtimeSync } from '@/services/realtimeSync';
import { syncEngine } from '@/services/syncEngine';
import { useAppStore } from '@/services/store';

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
    fetchDelta: jest.fn().mockResolvedValue({ added: 0, updated: 0, deleted: 0 }),
  },
}));

describe('authWorkflowService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useAppStore.getState().resetToSampleData();
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

    it('successfully migrates data and starts realtime sync on valid verification', async () => {
      const mockUser = { id: 'u1', email: 'test@example.com' } as any;
      const mockSession = { user: mockUser } as any;

      (authService.verifyOtp as jest.Mock).mockResolvedValue({
        session: mockSession,
        user: mockUser,
        error: null,
      });

      (migrationService.migrateLocalDataToSupabase as jest.Mock).mockResolvedValue({
        success: true,
        targetFamilyId: 'fam-migrated-target',
      });

      const res = await authWorkflowService.verifyOtpAndMigrate(
        'test@example.com',
        '123456',
        'fam-123',
      );

      expect(res.success).toBe(true);
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
