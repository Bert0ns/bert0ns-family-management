import { User, Session } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase, isSupabaseConfigured } from './supabase';
import { realtimeSync } from './realtimeSync';
import { pushNotificationService } from './pushNotificationService';
import { supabaseLogger, authLogger } from './logger';
import { useAppStore, STORE_STORAGE_KEY } from './store';
import { syncEngine } from './syncEngine';

export interface AuthState {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

export interface SignOutOptions {
  wipeLocalData?: boolean;
}

export const authService = {
  isConfigured: () => isSupabaseConfigured(),

  async sendOtp(email: string, redirectTo?: string): Promise<{ error: string | null }> {
    if (!isSupabaseConfigured()) {
      return { error: 'Supabase is not configured. Please set environment variables.' };
    }
    try {
      authLogger.info('Sending Supabase OTP to email', { email });
      const options: { shouldCreateUser: boolean; emailRedirectTo?: string } = {
        shouldCreateUser: true,
      };
      if (redirectTo) {
        options.emailRedirectTo = redirectTo;
      }
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim().toLowerCase(),
        options,
      });
      if (error) {
        supabaseLogger.error('Failed to send Supabase OTP', { error: error.message });
        return { error: error.message };
      }
      return { error: null };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      supabaseLogger.error('Exception during sendOtp', { error: message });
      return { error: message || 'Unknown error sending OTP' };
    }
  },

  async verifyOtp(
    email: string,
    token: string,
  ): Promise<{ session: Session | null; error: string | null }> {
    if (!isSupabaseConfigured()) {
      return { session: null, error: 'Supabase is not configured' };
    }
    try {
      authLogger.info('Verifying Supabase OTP', { email });
      const { data, error } = await supabase.auth.verifyOtp({
        email: email.trim().toLowerCase(),
        token: token.trim(),
        type: 'email',
      });
      if (error) {
        authLogger.error('Failed to verify Supabase OTP', { error: error.message });
        return { session: null, error: error.message };
      }
      authLogger.info('OTP verified successfully', { userId: data.session?.user?.id });
      return { session: data.session, error: null };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      supabaseLogger.error('Exception during verifyOtp', { error: message });
      return { session: null, error: message || 'Unknown error verifying OTP' };
    }
  },

  /**
   * Signs out from Supabase and halts background realtime synchronization.
   * By default, local expenses, categories, and settings in Zustand / AsyncStorage
   * are preserved so the user can continue using the offline ledger safely.
   *
   * Regardless of whether local data is kept or wiped, pending sync outbox mutations
   * and sync metadata are cleared to prevent leaking or replaying mutations into a different household.
   *
   * Local data (Zustand & store storage) is only purged if `options.wipeLocalData` is explicitly true.
   */
  async signOut(options?: SignOutOptions): Promise<{ error: string | null }> {
    const shouldWipe = options?.wipeLocalData === true;
    try {
      authLogger.info('User signing out from session', { wipeLocalData: shouldWipe });
      realtimeSync.stopRealtimeSync();

      try {
        const user = await this.getUser();
        if (user) {
          const activeToken = pushNotificationService.getActiveDeviceToken();
          await pushNotificationService.unregisterPushTokenAsync(user.id, activeToken ?? undefined);
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        authLogger.warn('Failed to unregister push token during sign out', { error: message });
      }

      // Always clear sync outbox and metadata so prior household mutations don't replay
      try {
        await syncEngine.clearAllSyncData();
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        authLogger.warn('Failed to clear sync outbox data during sign out', {
          error: message,
        });
      }

      if (shouldWipe) {
        try {
          useAppStore.getState().resetToDefaults();
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : String(err);
          authLogger.warn('Failed to reset store state during sign out', { error: message });
        }

        try {
          await AsyncStorage.removeItem(STORE_STORAGE_KEY);
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : String(err);
          authLogger.warn('Failed to clear persistent storage during sign out', {
            error: message,
          });
        }
      }

      if (!isSupabaseConfigured()) {
        return { error: null };
      }

      const { error } = await supabase.auth.signOut();
      if (error) {
        supabaseLogger.error('Failed to sign out from Supabase', { error: error.message });
        return { error: error.message };
      }
      return { error: null };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return { error: message || 'Unknown error signing out' };
    }
  },

  /**
   * Disconnects from cloud sync while preserving all local expenses,
   * categories, and family configuration intact.
   */
  async disconnectCloud(): Promise<{ error: string | null }> {
    return this.signOut({ wipeLocalData: false });
  },

  /**
   * Signs out from cloud and permanently wipes all local data from this device.
   */
  async signOutAndWipeDevice(): Promise<{ error: string | null }> {
    return this.signOut({ wipeLocalData: true });
  },

  async getSession(): Promise<Session | null> {
    if (!isSupabaseConfigured()) return null;
    try {
      const { data } = await supabase.auth.getSession();
      return data.session;
    } catch {
      return null;
    }
  },

  async getUser(): Promise<User | null> {
    if (!isSupabaseConfigured()) return null;
    try {
      const { data } = await supabase.auth.getUser();
      return data.user;
    } catch {
      return null;
    }
  },

  onAuthStateChange(callback: (session: Session | null, user: User | null) => void) {
    if (!isSupabaseConfigured()) {
      return { unsubscribe: () => {} };
    }
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      authLogger.info('Auth state transition', { event: _event, userId: session?.user?.id });
      callback(session, session?.user ?? null);
    });
    return { unsubscribe: () => data.subscription.unsubscribe() };
  },
};
