import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
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

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: Platform.OS === 'web',
  },
});
