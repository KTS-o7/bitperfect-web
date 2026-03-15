// apps/web/lib/supabase/client.ts
import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('Supabase environment variables not configured');
    return createBrowserClient(
      'https://placeholder.supabase.co',
      'placeholder'
    );
  }

  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}
