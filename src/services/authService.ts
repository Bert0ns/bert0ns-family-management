import { User, Session } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from './supabase';
import { realtimeSync } from './realtimeSync';
import { supabaseLogger } from './logger';

export interface AuthState {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

export const authService = {
  isConfigured: () => isSupabaseConfigured(),

  async sendOtp(email: string): Promise<{ error: string | null }> {
    if (!isSupabaseConfigured()) {
      return { error: 'Supabase is not configured. Please set environment variables.' };
    }
    try {
      supabaseLogger.info('Sending Supabase OTP to email', { email });
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim().toLowerCase(),
        options: {
          shouldCreateUser: true,
        },
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
      supabaseLogger.info('Verifying Supabase OTP', { email });
      const { data, error } = await supabase.auth.verifyOtp({
        email: email.trim().toLowerCase(),
        token: token.trim(),
        type: 'email',
      });
      if (error) {
        supabaseLogger.error('Failed to verify Supabase OTP', { error: error.message });
        return { session: null, error: error.message };
      }
      return { session: data.session, error: null };
    } catch (err: any) {
      supabaseLogger.error('Exception during verifyOtp', { error: err?.message });
      return { session: null, error: err?.message || 'Unknown error verifying OTP' };
    }
  },

  async signOut(): Promise<{ error: string | null }> {
    if (!isSupabaseConfigured()) {
      return { error: null };
    }
    try {
      supabaseLogger.info('Signing out from Supabase');
      realtimeSync.stopRealtimeSync();
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
      callback(session, session?.user ?? null);
    });
    return { unsubscribe: () => data.subscription.unsubscribe() };
  },
};
