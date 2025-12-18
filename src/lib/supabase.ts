import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Check if Supabase is configured
export const isSupabaseConfigured = () => {
    return (
        supabaseUrl &&
        supabaseAnonKey &&
        supabaseUrl !== 'your-supabase-project-url' &&
        supabaseAnonKey !== 'your-supabase-anon-key'
    );
};

// Create a dummy client for build time or when not configured
const createSupabaseClient = (): SupabaseClient => {
    if (!supabaseUrl || !supabaseAnonKey) {
        // Return a mock client for build time
        // This prevents build errors when env vars aren't set
        return createClient('https://placeholder.supabase.co', 'placeholder-key', {
            auth: {
                persistSession: false,
                autoRefreshToken: false,
            },
        });
    }

    return createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: true,
        },
    });
};

export const supabase = createSupabaseClient();
