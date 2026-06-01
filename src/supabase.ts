import { createClient } from '@supabase/supabase-js';
import localSupabaseConfig from './supabase-applet-config.json';

// Helper to safely mask secrets in the log
const maskSecretString = (val: string | undefined): string => {
  if (!val) return 'não definido';
  return val.length > 8 ? `${val.substring(0, 4)}...${val.substring(val.length - 4)}` : '***';
};

console.log("[SUPABASE INITIALIZATION] Detectando configurações para produção e ambientes de nuvem...");

// Load and prioritize configuration: Environment Variables from Vercel take precedence over local JSON configuration.
const metaEnv = (import.meta as any).env || {};

const supabaseUrl = (metaEnv.VITE_SUPABASE_URL || metaEnv.NEXT_PUBLIC_SUPABASE_URL || localSupabaseConfig?.supabaseUrl || 'https://vvlhvkxjanpjxjeefzar.supabase.co').trim();
const supabaseAnonKey = (metaEnv.VITE_SUPABASE_ANON_KEY || metaEnv.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || localSupabaseConfig?.supabaseAnonKey || '').trim();

console.log("[SUPABASE CONFIG DETECTED]:");
console.log("- Supabase URL:", supabaseUrl);
console.log("- Anon Key:", maskSecretString(supabaseAnonKey));

export let isSupabaseEnabled = false;
export let supabase: any = null;
export let isSupabaseOffline = false;

export function setSupabaseOffline(state: boolean) {
  isSupabaseOffline = state;
  try {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('supabase-offline-change', { detail: state }));
    }
  } catch (e) {
    // Ignore
  }
}

if (supabaseUrl && supabaseAnonKey && supabaseAnonKey.trim() !== '') {
  try {
    supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    });
    isSupabaseEnabled = true;
    console.log("[SUPABASE SUCCESS] Supabase client initialized successfully!");
  } catch (err) {
    console.warn("Failed to initialize Supabase client:", err);
    isSupabaseEnabled = false;
  }
} else {
  console.log("Supabase key missing. Running in local storage mode. Please add VITE_SUPABASE_ANON_KEY to your env/secrets configuration.");
}
