import { createClient } from '@supabase/supabase-js';

// Client padrão (anon key - para frontend e operações com RLS)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
    },
});

// Admin client (service_role key - APENAS para server-side, bypass RLS)
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

export const isSupabaseConfigured = () => {
    return (
        supabaseUrl &&
        supabaseAnonKey &&
        supabaseUrl !== 'your-supabase-project-url' &&
        supabaseAnonKey !== 'your-supabase-anon-key'
    );
};
