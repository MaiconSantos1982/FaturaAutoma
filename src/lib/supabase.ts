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
// Usar getSupabaseAdmin() em API routes, NUNCA no frontend!
let _supabaseAdmin: ReturnType<typeof createClient> | null = null;

export const getSupabaseAdmin = () => {
    // Verificar se estamos no servidor
    if (typeof window !== 'undefined') {
        throw new Error('supabaseAdmin só pode ser usado no servidor!');
    }

    // Lazy initialization
    if (!_supabaseAdmin) {
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

        if (!supabaseServiceKey) {
            throw new Error('SUPABASE_SERVICE_ROLE_KEY não está configurada');
        }

        _supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
            auth: {
                autoRefreshToken: false,
                persistSession: false
            }
        });
    }

    return _supabaseAdmin;
};

export const isSupabaseConfigured = () => {
    return (
        supabaseUrl &&
        supabaseAnonKey &&
        supabaseUrl !== 'your-supabase-project-url' &&
        supabaseAnonKey !== 'your-supabase-anon-key'
    );
};
