import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Variabel Supabase URL atau Anon Key belum terpasang di .env');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);