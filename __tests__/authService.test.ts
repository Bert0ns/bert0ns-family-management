import { authService } from '@/services/authService';
import { supabase, isSupabaseConfigured } from '@/services/supabase';

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

describe('authService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns false when Supabase is not configured', () => {
    (isSupabaseConfigured as jest.Mock).mockReturnValue(false);
    expect(authService.isConfigured()).toBe(false);
  });

  it('returns error on sendOtp when Supabase is not configured', async () => {
    (isSupabaseConfigured as jest.Mock).mockReturnValue(false);
    const res = await authService.sendOtp('test@example.com');
    expect(res.error).toContain('not configured');
  });

  it('sends OTP successfully when configured', async () => {
    (isSupabaseConfigured as jest.Mock).mockReturnValue(true);
    (supabase.auth.signInWithOtp as jest.Mock).mockResolvedValue({ error: null });

    const res = await authService.sendOtp('test@example.com');
    expect(res.error).toBeNull();
    expect(supabase.auth.signInWithOtp).toHaveBeenCalledWith({
      email: 'test@example.com',
      options: { shouldCreateUser: true },
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

  it('signs out smoothly', async () => {
    (isSupabaseConfigured as jest.Mock).mockReturnValue(true);
    (supabase.auth.signOut as jest.Mock).mockResolvedValue({ error: null });

    const res = await authService.signOut();
    expect(res.error).toBeNull();
    expect(supabase.auth.signOut).toHaveBeenCalled();
  });

  it('subscribes to auth state changes', () => {
    (isSupabaseConfigured as jest.Mock).mockReturnValue(true);
    const mockUnsubscribe = jest.fn();
    (supabase.auth.onAuthStateChange as jest.Mock).mockReturnValue({
      data: { subscription: { unsubscribe: mockUnsubscribe } },
    });

    const callback = jest.fn();
    const sub = authService.onAuthStateChange(callback);
    expect(supabase.auth.onAuthStateChange).toHaveBeenCalled();
    sub.unsubscribe();
    expect(mockUnsubscribe).toHaveBeenCalled();
  });
});
