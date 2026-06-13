import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// On web: route through Vercel serverless proxy to avoid mixed-content errors
// On native: connect directly to Supabase
const supabaseUrl = Platform.OS === 'web'
  ? '/api/supabase'
  : process.env.EXPO_PUBLIC_SUPABASE_URL!;

const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
});
