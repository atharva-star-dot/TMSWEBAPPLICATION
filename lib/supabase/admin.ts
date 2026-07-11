import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// NEVER import this file from client components. Service-role key must stay server-side only.
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
