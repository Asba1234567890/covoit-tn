import { createClient } from "@supabase/supabase-js";

// Server-only client using the service role key, which bypasses Storage RLS.
// Never import this from a "use client" component — the service role key
// must never reach the browser. All uploads go through our own session-cookie
// auth (server/auth/session.ts) first; this client only performs the storage
// write once that check has passed.
let cached: ReturnType<typeof createClient> | null = null;

// Thrown instead of a plain Error so route handlers can catch this specific
// case and return a clean JSON response — letting it propagate as an
// unhandled exception produces Next.js's default HTML error page, which
// breaks any client code that assumes every response body is JSON.
export class StorageNotConfiguredError extends Error {}

export function getSupabaseAdmin() {
  if (cached) return cached;

  const url = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    throw new StorageNotConfiguredError(
      "Supabase Storage is not configured — SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required"
    );
  }

  cached = createClient(url, serviceRoleKey, {
    auth: { persistSession: false },
  });
  return cached;
}
