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
    } catch (err: any) {
      supabaseLogger.error('Exception during sendOtp', { error: err?.message });
      return { error: err?.message || 'Unknown error sending OTP' };
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
    } catch (err: any) {
      supabaseLogger.error('Exception during verifyOtp', { error: err?.message });
      return { session: null, error: err?.message || 'Unknown error verifying OTP' };
    }
  },

  /**
   * Signs out from Supabase and halts background realtime synchronization.
   * By default, local expenses, categories, and settings in Zustand / AsyncStorage
   * are preserved so the user can continue using the offline ledger safely.
   *
   * Local data is only purged if `options.wipeLocalData` is explicitly set to true.
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
      } catch (err: any) {
        authLogger.warn('Failed to unregister push token during sign out', { error: err?.message });
      }

      if (shouldWipe) {
        try {
          useAppStore.getState().resetToDefaults();
        } catch (err: any) {
          authLogger.warn('Failed to reset store state during sign out', { error: err?.message });
        }

        try {
          await syncEngine.clearAllSyncData();
          await AsyncStorage.removeItem(STORE_STORAGE_KEY);
        } catch (err: any) {
          authLogger.warn('Failed to clear persistent storage during sign out', {
            error: err?.message,
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
    } catch (err: any) {
      return { error: err?.message || 'Unknown error signing out' };
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
