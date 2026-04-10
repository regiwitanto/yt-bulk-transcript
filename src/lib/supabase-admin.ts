import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

/**
 * Server-side only client using the service role key.
 * Bypasses RLS — only use in API routes, never in client components.
 */
export const supabaseAdmin = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);
