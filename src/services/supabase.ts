import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { supabaseLogger } from '@/services/logger';

// Replace with your Supabase Project URL and Anon Key from your Supabase Dashboard
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://your-project.supabase.co';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'your-anon-key';

export const isSupabaseConfigured = () => {
  const configured =
    process.env.EXPO_PUBLIC_SUPABASE_URL !== undefined &&
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY !== undefined &&
    !process.env.EXPO_PUBLIC_SUPABASE_URL.includes('your-project');
  supabaseLogger.debug('Supabase configuration checked', { configured });
  return configured;
};

/**
 * Native secure token storage adapter using expo-secure-store.
 * Encrypts auth session and refresh tokens on iOS Keychain and Android KeyStore.
 */
export const ExpoSecureStoreAdapter = {
  getItem: async (key: string): Promise<string | null> => {
    try {
      return await SecureStore.getItemAsync(key);
    } catch (err: any) {
      supabaseLogger.error('SecureStore getItem failed', { key, error: err?.message });
      return null;
    }
  },
  setItem: async (key: string, value: string): Promise<void> => {
    try {
      await SecureStore.setItemAsync(key, value);
    } catch (err: any) {
      supabaseLogger.error('SecureStore setItem failed', { key, error: err?.message });
    }
  },
  removeItem: async (key: string): Promise<void> => {
    try {
      await SecureStore.deleteItemAsync(key);
    } catch (err: any) {
      supabaseLogger.error('SecureStore removeItem failed', { key, error: err?.message });
    }
  },
};

export const authStorage = Platform.OS === 'web' ? AsyncStorage : ExpoSecureStoreAdapter;

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: authStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: Platform.OS === 'web',
  },
});
