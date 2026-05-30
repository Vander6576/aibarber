import { createClient } from '@supabase/supabase-js';

const supabaseUrl = (import.meta as any).env.VITE_SUPABASE_URL || 'https://vvlhvkxjanpjxjeefzar.supabase.co';
const supabaseAnonKey = (import.meta as any).env.VITE_SUPABASE_ANON_KEY || '';

export let isSupabaseEnabled = false;
export let supabase: any = null;

if (supabaseUrl && supabaseAnonKey && supabaseAnonKey.trim() !== '') {
  try {
    supabase = createClient(supabaseUrl, supabaseAnonKey);
    isSupabaseEnabled = true;
    console.log("Supabase client initialized successfully!");
  } catch (err) {
    console.warn("Failed to initialize Supabase client:", err);
    isSupabaseEnabled = false;
  }
} else {
  console.log("Supabase key missing. Running in local storage mode. Please add VITE_SUPABASE_ANON_KEY to your env/secrets configuration.");
}
