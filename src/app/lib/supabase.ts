import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('⚠️ Credenciais do Supabase ausentes no arquivo .env');
}

// Bypass Navigator.locks API to prevent NavigatorLockAcquireTimeoutError (10s hang)
// This is a known issue with @supabase/auth-js >= 2.62.0
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const noOpLock = async <R>(_name: string, _acquireTimeout: number, fn: () => Promise<R>): Promise<R> => {
    return await fn();
};

export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '', {
    auth: {
        storageKey: 'sb-jwgestao-auth-token',
        storage: globalThis.localStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
        flowType: 'pkce',
        lock: noOpLock,
    },
});

