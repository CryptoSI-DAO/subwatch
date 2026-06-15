import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// On web: route through Vercel serverless proxy to avoid mixed-content errors
// On native: connect directly to Supabase
function getSupabaseUrl(): string {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    // Use full origin URL — Supabase JS SDK requires absolute URL
    return `${window.location.origin}/api/supabase`;
  }
  return process.env.EXPO_PUBLIC_SUPABASE_URL!;
}

const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

// Platform-aware storage — AsyncStorage has no web impl, so use localStorage on web
const supabaseStorage = Platform.OS === 'web' && typeof window !== 'undefined'
  ? {
      getItem: (key: string) => Promise.resolve(window.localStorage.getItem(key)),
      setItem: (key: string, value: string) => Promise.resolve(window.localStorage.setItem(key, value)),
      removeItem: (key: string) => Promise.resolve(window.localStorage.removeItem(key)),
    }
  : AsyncStorage;

export const supabase = createClient(getSupabaseUrl(), supabaseAnonKey, {
  auth: {
    storage: supabaseStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: Platform.OS === 'web',
  },
});
