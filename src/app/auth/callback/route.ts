import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { safeNextPath } from "@/lib/server/http";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const destination = new URL(
    safeNextPath(url.searchParams.get("next")),
    url.origin,
  );
  const code = url.searchParams.get("code");
  if (code) {
    try {
      const supabase = await createClient();
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (!error) return NextResponse.redirect(destination);
    } catch {
      /* Return a public sign-in error without exposing provider details. */
    }
  }
  return NextResponse.redirect(new URL("/?auth_error=1", url.origin));
}
