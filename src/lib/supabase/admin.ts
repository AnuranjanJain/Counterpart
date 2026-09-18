import "server-only";
import { createClient } from "@supabase/supabase-js";
import { ApiError } from "@/lib/server/http";

/** Use only after getUser verifies identity; every query must explicitly scope the owner. */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key)
    throw new ApiError(
      503,
      "Secure server storage is not configured. Set SUPABASE_SERVICE_ROLE_KEY on the server.",
    );
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
