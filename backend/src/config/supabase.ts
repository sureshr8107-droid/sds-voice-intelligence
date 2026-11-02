import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { env } from './env';
import { logger } from '../utils/logger';

let supabaseClient: SupabaseClient | null = null;

/**
 * Returns true if both SUPABASE_URL and a secret key are configured
 */
export function isSupabaseConfigured(): boolean {
  return Boolean(env.SUPABASE_URL && (env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_ANON_KEY));
}

/**
 * Get or initialize the server-side Supabase client.
 * Uses SUPABASE_SERVICE_ROLE_KEY for server operations (RLS bypass when needed by worker)
 * or SUPABASE_ANON_KEY if service role is not provided.
 */
export function getSupabaseClient(): SupabaseClient | null {
  if (!isSupabaseConfigured()) {
    return null;
  }

  if (!supabaseClient) {
    const key = env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_ANON_KEY!;
    try {
      supabaseClient = createClient(env.SUPABASE_URL!, key, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      });
      logger.info('Initialized server-side Supabase client');
    } catch (err) {
      logger.error({ err }, 'Failed to initialize Supabase client');
      return null;
    }
  }

  return supabaseClient;
}
