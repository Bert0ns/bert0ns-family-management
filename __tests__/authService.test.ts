import { authService } from '@/services/authService';
import { supabase, isSupabaseConfigured } from '@/services/supabase';
import { realtimeSync } from '@/services/realtimeSync';
import { pushNotificationService } from '@/services/pushNotificationService';
import { useAppStore, STORE_STORAGE_KEY } from '@/services/store';
import AsyncStorage from '@react-native-async-storage/async-storage';

jest.mock('@/services/supabase', () => ({
  isSupabaseConfigured: jest.fn(),
  supabase: {
    auth: {
      signInWithOtp: jest.fn(),
      verifyOtp: jest.fn(),
      signOut: jest.fn(),
      getSession: jest.fn(),
      getUser: jest.fn(),
      onAuthStateChange: jest.fn(),
    },
  },
}));

jest.mock('@/services/realtimeSync', () => ({
  realtimeSync: {
    stopRealtimeSync: jest.fn(),
  },
}));

jest.mock('@/services/pushNotificationService', () => ({
  pushNotificationService: {
    getActiveDeviceToken: jest.fn().mockReturnValue('mock-token-abc'),
    unregisterPushTokenAsync: jest.fn().mockResolvedValue(undefined),
  },
}));

describe('authService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('isConfigured', () => {
    it('returns true when supabase is configured', () => {
      (isSupabaseConfigured as jest.Mock).mockReturnValue(true);
      expect(authService.isConfigured()).toBe(true);
    });

    it('returns false when supabase is not configured', () => {
      (isSupabaseConfigured as jest.Mock).mockReturnValue(false);
      expect(authService.isConfigured()).toBe(false);
    });
  });

  describe('sendOtp', () => {
    it('returns error when not configured', async () => {
      (isSupabaseConfigured as jest.Mock).mockReturnValue(false);
      const res = await authService.sendOtp('test@example.com');
      expect(res.error).toContain('Supabase is not configured');
      expect(supabase.auth.signInWithOtp).not.toHaveBeenCalled();
    });

    it('sends OTP with valid email when configured', async () => {
      (isSupabaseConfigured as jest.Mock).mockReturnValue(true);
      (supabase.auth.signInWithOtp as jest.Mock).mockResolvedValue({ error: null });

      const res = await authService.sendOtp('test@example.com');
      expect(res.error).toBeNull();
      expect(supabase.auth.signInWithOtp).toHaveBeenCalledWith({
        email: 'test@example.com',
        options: { shouldCreateUser: true },
      });
    });

    it('passes emailRedirectTo option when provided', async () => {
      (isSupabaseConfigured as jest.Mock).mockReturnValue(true);
      (supabase.auth.signInWithOtp as jest.Mock).mockResolvedValue({ error: null });

      const res = await authService.sendOtp('test@example.com', 'https://myapp.com/auth');
      expect(res.error).toBeNull();
      expect(supabase.auth.signInWithOtp).toHaveBeenCalledWith({
        email: 'test@example.com',
        options: { shouldCreateUser: true, emailRedirectTo: 'https://myapp.com/auth' },
      });
    });

    it('handles Supabase signInWithOtp error', async () => {
      (isSupabaseConfigured as jest.Mock).mockReturnValue(true);
      (supabase.auth.signInWithOtp as jest.Mock).mockResolvedValue({
        error: { message: 'Rate limit exceeded' },
      });

      const res = await authService.sendOtp('test@example.com');
      expect(res.error).toBe('Rate limit exceeded');
    });

    it('catches unexpected thrown error during sendOtp', async () => {
      (isSupabaseConfigured as jest.Mock).mockReturnValue(true);
      (supabase.auth.signInWithOtp as jest.Mock).mockRejectedValue(new Error('Network failure'));

      const res = await authService.sendOtp('test@example.com');
      expect(res.error).toBe('Network failure');
    });
  });

  describe('verifyOtp', () => {
    it('returns error when not configured', async () => {
      (isSupabaseConfigured as jest.Mock).mockReturnValue(false);
      const res = await authService.verifyOtp('test@example.com', '123456');
      expect(res.error).toContain('Supabase is not configured');
      expect(res.session).toBeNull();
    });

    it('verifies OTP successfully and returns session', async () => {
      (isSupabaseConfigured as jest.Mock).mockReturnValue(true);
      const mockSession = { user: { id: 'usr-123', email: 'test@example.com' } };
      (supabase.auth.verifyOtp as jest.Mock).mockResolvedValue({
        data: { session: mockSession },
        error: null,
      });

      const res = await authService.verifyOtp('test@example.com', '123456');
      expect(res.error).toBeNull();
      expect(res.session).toEqual(mockSession);
      expect(supabase.auth.verifyOtp).toHaveBeenCalledWith({
        email: 'test@example.com',
        token: '123456',
        type: 'email',
      });
    });

    it('handles verification error from Supabase', async () => {
      (isSupabaseConfigured as jest.Mock).mockReturnValue(true);
      (supabase.auth.verifyOtp as jest.Mock).mockResolvedValue({
        data: { session: null },
        error: { message: 'Token has expired or is invalid' },
      });

      const res = await authService.verifyOtp('test@example.com', '000000');
      expect(res.session).toBeNull();
      expect(res.error).toBe('Token has expired or is invalid');
    });

    it('catches unexpected thrown error during verifyOtp', async () => {
      (isSupabaseConfigured as jest.Mock).mockReturnValue(true);
      (supabase.auth.verifyOtp as jest.Mock).mockRejectedValue(new Error('Server unavailable'));

      const res = await authService.verifyOtp('test@example.com', '123456');
      expect(res.session).toBeNull();
      expect(res.error).toBe('Server unavailable');
    });
  });

  describe('signOut', () => {
    it('returns error null when not configured', async () => {
      (isSupabaseConfigured as jest.Mock).mockReturnValue(false);
      const res = await authService.signOut();
      expect(res.error).toBeNull();
      expect(supabase.auth.signOut).not.toHaveBeenCalled();
    });

    it('signs out smoothly, stops realtime sync, and unregisters push token', async () => {
      (isSupabaseConfigured as jest.Mock).mockReturnValue(true);
      (supabase.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: { id: 'usr-456' } },
      });
      (supabase.auth.signOut as jest.Mock).mockResolvedValue({ error: null });

      const res = await authService.signOut();
      expect(res.error).toBeNull();
      expect(realtimeSync.stopRealtimeSync).toHaveBeenCalledTimes(1);
      expect(pushNotificationService.unregisterPushTokenAsync).toHaveBeenCalledWith(
        'usr-456',
        'mock-token-abc',
      );
      expect(supabase.auth.signOut).toHaveBeenCalledTimes(1);
    });

    it('preserves Zustand state and AsyncStorage by default but purges sync outbox (safe cloud disconnect)', async () => {
      (isSupabaseConfigured as jest.Mock).mockReturnValue(true);
      (supabase.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: { id: 'usr-preserve' } },
      });
      (supabase.auth.signOut as jest.Mock).mockResolvedValue({ error: null });

      // Seed state with sample data
      useAppStore.getState().resetToSampleData();
      const initialExpenseCount = useAppStore.getState().expenses.length;
      const initialMemberCount = useAppStore.getState().members.length;
      const initialFamilyId = useAppStore.getState().family.id;
      expect(initialExpenseCount).toBeGreaterThan(0);
      expect(initialMemberCount).toBeGreaterThan(0);

      // Perform default sign out
      const res = await authService.signOut();
      expect(res.error).toBeNull();

      // State is preserved!
      expect(useAppStore.getState().expenses.length).toBe(initialExpenseCount);
      expect(useAppStore.getState().members.length).toBe(initialMemberCount);
      expect(useAppStore.getState().family.id).toBe(initialFamilyId);

      // Local store is NOT wiped from AsyncStorage
      expect(AsyncStorage.removeItem).not.toHaveBeenCalledWith(STORE_STORAGE_KEY);

      // Sync outbox & metadata ARE purged to avoid replay into new households
      expect(AsyncStorage.multiRemove).toHaveBeenCalledWith(
        expect.arrayContaining(['@bert0ns_sync_outbox', '@bert0ns_last_sync_timestamp']),
      );
    });

    it('preserves Zustand state and AsyncStorage when disconnectCloud is called but purges sync outbox', async () => {
      (isSupabaseConfigured as jest.Mock).mockReturnValue(true);
      (supabase.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: { id: 'usr-preserve-cloud' } },
      });
      (supabase.auth.signOut as jest.Mock).mockResolvedValue({ error: null });

      useAppStore.getState().resetToSampleData();
      const initialExpenseCount = useAppStore.getState().expenses.length;

      const res = await authService.disconnectCloud();
      expect(res.error).toBeNull();

      expect(useAppStore.getState().expenses.length).toBe(initialExpenseCount);
      expect(AsyncStorage.removeItem).not.toHaveBeenCalledWith(STORE_STORAGE_KEY);
      expect(AsyncStorage.multiRemove).toHaveBeenCalledWith(
        expect.arrayContaining(['@bert0ns_sync_outbox', '@bert0ns_last_sync_timestamp']),
      );
    });

    it('tears down Zustand state and purges AsyncStorage when wipeLocalData is true', async () => {
      (isSupabaseConfigured as jest.Mock).mockReturnValue(true);
      (supabase.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: { id: 'usr-wipe' } },
      });
      (supabase.auth.signOut as jest.Mock).mockResolvedValue({ error: null });

      useAppStore.getState().resetToSampleData();
      expect(useAppStore.getState().expenses.length).toBeGreaterThan(0);
      expect(useAppStore.getState().members.length).toBeGreaterThan(0);

      const res = await authService.signOut({ wipeLocalData: true });
      expect(res.error).toBeNull();

      // State is completely reset
      expect(useAppStore.getState().expenses).toEqual([]);
      expect(useAppStore.getState().members).toEqual([]);
      expect(useAppStore.getState().currentMemberId).toBe('');
      expect(useAppStore.getState().family.id).toBe('');

      // AsyncStorage is purged of previous family data and sync queues
      expect(AsyncStorage.removeItem).toHaveBeenCalledWith(STORE_STORAGE_KEY);
      expect(AsyncStorage.multiRemove).toHaveBeenCalledWith(
        expect.arrayContaining(['@bert0ns_sync_outbox', '@bert0ns_last_sync_timestamp']),
      );
    });

    it('tears down Zustand state and purges AsyncStorage when signOutAndWipeDevice is called', async () => {
      (isSupabaseConfigured as jest.Mock).mockReturnValue(true);
      (supabase.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: { id: 'usr-wipe-device' } },
      });
      (supabase.auth.signOut as jest.Mock).mockResolvedValue({ error: null });

      useAppStore.getState().resetToSampleData();
      expect(useAppStore.getState().expenses.length).toBeGreaterThan(0);

      const res = await authService.signOutAndWipeDevice();
      expect(res.error).toBeNull();

      expect(useAppStore.getState().expenses).toEqual([]);
      expect(AsyncStorage.removeItem).toHaveBeenCalledWith(STORE_STORAGE_KEY);
    });

    it('handles Supabase signOut error', async () => {
      (isSupabaseConfigured as jest.Mock).mockReturnValue(true);
      (supabase.auth.signOut as jest.Mock).mockResolvedValue({
        error: { message: 'Failed session invalidation' },
      });

      const res = await authService.signOut();
      expect(res.error).toBe('Failed session invalidation');
    });

    it('catches unexpected thrown error during signOut', async () => {
      (isSupabaseConfigured as jest.Mock).mockReturnValue(true);
      (supabase.auth.signOut as jest.Mock).mockRejectedValue(new Error('Sign out crashed'));

      const res = await authService.signOut();
      expect(res.error).toBe('Sign out crashed');
    });
  });

  describe('getSession', () => {
    it('returns null when Supabase is not configured', async () => {
      (isSupabaseConfigured as jest.Mock).mockReturnValue(false);
      const session = await authService.getSession();
      expect(session).toBeNull();
    });

    it('returns session when configured', async () => {
      (isSupabaseConfigured as jest.Mock).mockReturnValue(true);
      const mockSession = { access_token: 'valid-token' };
      (supabase.auth.getSession as jest.Mock).mockResolvedValue({
        data: { session: mockSession },
      });

      const session = await authService.getSession();
      expect(session).toEqual(mockSession);
    });

    it('returns null when getSession throws', async () => {
      (isSupabaseConfigured as jest.Mock).mockReturnValue(true);
      (supabase.auth.getSession as jest.Mock).mockRejectedValue(new Error('Fetch error'));

      const session = await authService.getSession();
      expect(session).toBeNull();
    });
  });

  describe('getUser', () => {
    it('returns null when Supabase is not configured', async () => {
      (isSupabaseConfigured as jest.Mock).mockReturnValue(false);
      const user = await authService.getUser();
      expect(user).toBeNull();
    });

    it('returns user when configured', async () => {
      (isSupabaseConfigured as jest.Mock).mockReturnValue(true);
      const mockUser = { id: 'user-xyz', email: 'user@example.com' };
      (supabase.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: mockUser },
      });

      const user = await authService.getUser();
      expect(user).toEqual(mockUser);
    });

    it('returns null when getUser throws', async () => {
      (isSupabaseConfigured as jest.Mock).mockReturnValue(true);
      (supabase.auth.getUser as jest.Mock).mockRejectedValue(new Error('Auth fetch failure'));

      const user = await authService.getUser();
      expect(user).toBeNull();
    });
  });

  describe('onAuthStateChange', () => {
    it('returns dummy unsubscribe when not configured', () => {
      (isSupabaseConfigured as jest.Mock).mockReturnValue(false);
      const sub = authService.onAuthStateChange(jest.fn());
      expect(sub).toBeDefined();
      expect(() => sub.unsubscribe()).not.toThrow();
    });

    it('subscribes to auth state changes and invokes callback with session and user', () => {
      (isSupabaseConfigured as jest.Mock).mockReturnValue(true);
      const mockUnsubscribe = jest.fn();
      let listenerCallback: any;
      (supabase.auth.onAuthStateChange as jest.Mock).mockImplementation((cb) => {
        listenerCallback = cb;
        return {
          data: { subscription: { unsubscribe: mockUnsubscribe } },
        };
      });

      const callback = jest.fn();
      const sub = authService.onAuthStateChange(callback);
      expect(supabase.auth.onAuthStateChange).toHaveBeenCalled();

      // Trigger the listener callback with a session
      const fakeSession = { access_token: 'tok', user: { id: 'u1' } };
      listenerCallback('SIGNED_IN', fakeSession);
      expect(callback).toHaveBeenCalledWith(fakeSession, fakeSession.user);

      // Trigger listener callback with null session
      listenerCallback('SIGNED_OUT', null);
      expect(callback).toHaveBeenCalledWith(null, null);

      sub.unsubscribe();
      expect(mockUnsubscribe).toHaveBeenCalled();
    });
  });
});
