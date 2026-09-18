import { authService } from '@/services/authService';
import { supabase, isSupabaseConfigured } from '@/services/supabase';
import { realtimeSync } from '@/services/realtimeSync';

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

describe('authService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('isConfigured', () => {
    it('returns false when Supabase is not configured', () => {
      (isSupabaseConfigured as jest.Mock).mockReturnValue(false);
      expect(authService.isConfigured()).toBe(false);
    });

    it('returns true when Supabase is configured', () => {
      (isSupabaseConfigured as jest.Mock).mockReturnValue(true);
      expect(authService.isConfigured()).toBe(true);
    });
  });

  describe('sendOtp', () => {
    it('returns error on sendOtp when Supabase is not configured', async () => {
      (isSupabaseConfigured as jest.Mock).mockReturnValue(false);
      const res = await authService.sendOtp('test@example.com');
      expect(res.error).toContain('not configured');
    });

    it('sends OTP successfully when configured without redirectTo', async () => {
      (isSupabaseConfigured as jest.Mock).mockReturnValue(true);
      (supabase.auth.signInWithOtp as jest.Mock).mockResolvedValue({ error: null });

      const res = await authService.sendOtp('test@example.com');
      expect(res.error).toBeNull();
      expect(supabase.auth.signInWithOtp).toHaveBeenCalledWith({
        email: 'test@example.com',
        options: { shouldCreateUser: true },
      });
    });

    it('sends OTP with redirectTo parameter when provided', async () => {
      (isSupabaseConfigured as jest.Mock).mockReturnValue(true);
      (supabase.auth.signInWithOtp as jest.Mock).mockResolvedValue({ error: null });

      const res = await authService.sendOtp('test@example.com', 'exp://myapp/auth-callback');
      expect(res.error).toBeNull();
      expect(supabase.auth.signInWithOtp).toHaveBeenCalledWith({
        email: 'test@example.com',
        options: { shouldCreateUser: true, emailRedirectTo: 'exp://myapp/auth-callback' },
      });
    });

    it('handles error when signInWithOtp fails', async () => {
      (isSupabaseConfigured as jest.Mock).mockReturnValue(true);
      (supabase.auth.signInWithOtp as jest.Mock).mockResolvedValue({
        error: { message: 'Rate limit exceeded' },
      });

      const res = await authService.sendOtp('test@example.com');
      expect(res.error).toBe('Rate limit exceeded');
    });

    it('handles unexpected thrown exceptions during sendOtp', async () => {
      (isSupabaseConfigured as jest.Mock).mockReturnValue(true);
      (supabase.auth.signInWithOtp as jest.Mock).mockRejectedValue(new Error('Network error'));

      const res = await authService.sendOtp('test@example.com');
      expect(res.error).toBe('Network error');
    });
  });

  describe('verifyOtp', () => {
    it('returns error when Supabase is not configured', async () => {
      (isSupabaseConfigured as jest.Mock).mockReturnValue(false);
      const res = await authService.verifyOtp('test@example.com', '123456');
      expect(res.session).toBeNull();
      expect(res.error).toContain('not configured');
    });

    it('verifies OTP successfully', async () => {
      (isSupabaseConfigured as jest.Mock).mockReturnValue(true);
      const mockSession = { access_token: 'token123', user: { id: 'u1' } };
      (supabase.auth.verifyOtp as jest.Mock).mockResolvedValue({
        data: { session: mockSession },
        error: null,
      });

      const res = await authService.verifyOtp('test@example.com', '123456');
      expect(res.error).toBeNull();
      expect(res.session).toEqual(mockSession);
    });

    it('returns error when verifyOtp returns an error from Supabase', async () => {
      (isSupabaseConfigured as jest.Mock).mockReturnValue(true);
      (supabase.auth.verifyOtp as jest.Mock).mockResolvedValue({
        data: { session: null },
        error: { message: 'Token expired' },
      });

      const res = await authService.verifyOtp('test@example.com', '000000');
      expect(res.session).toBeNull();
      expect(res.error).toBe('Token expired');
    });

    it('handles unexpected exceptions during verifyOtp', async () => {
      (isSupabaseConfigured as jest.Mock).mockReturnValue(true);
      (supabase.auth.verifyOtp as jest.Mock).mockRejectedValue(new Error('Timeout'));

      const res = await authService.verifyOtp('test@example.com', '000000');
      expect(res.session).toBeNull();
      expect(res.error).toBe('Timeout');
    });
  });

  describe('signOut', () => {
    it('returns error null when not configured', async () => {
      (isSupabaseConfigured as jest.Mock).mockReturnValue(false);
      const res = await authService.signOut();
      expect(res.error).toBeNull();
      expect(supabase.auth.signOut).not.toHaveBeenCalled();
    });

    it('signs out smoothly and stops realtime sync', async () => {
      (isSupabaseConfigured as jest.Mock).mockReturnValue(true);
      (supabase.auth.signOut as jest.Mock).mockResolvedValue({ error: null });

      const res = await authService.signOut();
      expect(res.error).toBeNull();
      expect(realtimeSync.stopRealtimeSync).toHaveBeenCalled();
      expect(supabase.auth.signOut).toHaveBeenCalled();
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
