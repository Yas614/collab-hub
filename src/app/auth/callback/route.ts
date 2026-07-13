import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

// Handles the redirect back from Supabase after Google OAuth (and also
// works for magic-link / email-confirmation redirects that carry a `code`).
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }

    console.error("OAuth code exchange failed:", error.message);
  }

  // No code, or exchange failed — send them back to login with an error flag
  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
}
