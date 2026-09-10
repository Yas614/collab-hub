import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

function friendlyDbError(error: { code?: string; message: string }): { message: string; status: number } {
  switch (error.code) {
    case "23505":
      return { message: "That person is already a member.", status: 409 };
    case "23503":
      // FK violation on workspace_members.user_id -> profiles.id: the auth
      // account exists but has no matching profile row (suspended, deleted,
      // or never finished onboarding).
      return {
        message: "This account can't be added right now — it may be suspended or hasn't finished setting up yet.",
        status: 409,
      };
    default:
      return { message: "Something went wrong while adding this member. Please try again.", status: 500 };
  }
}

async function ensureProfileExists(admin: ReturnType<typeof createAdminClient>, userId: string, email: string) {
  const { data: existing } = await admin.from("profiles").select("id").eq("id", userId).maybeSingle();
  if (existing) return;
  await admin.from("profiles").upsert({ id: userId, email, display_name: email.split("@")[0] });
}

export async function POST(req: NextRequest) {
  const { email, workspaceId } = await req.json();

  if (!email?.trim() || !workspaceId) {
    return NextResponse.json({ error: "Email and workspaceId are required." }, { status: 400 });
  }
  const cleanEmail = email.trim().toLowerCase();

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  // Authorization: only an existing member of this workspace can invite to it.
  const { data: membership } = await supabase
    .from("workspace_members")
    .select("user_id")
    .eq("workspace_id", workspaceId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!membership) {
    return NextResponse.json({ error: "You're not a member of this workspace." }, { status: 403 });
  }

  const admin = createAdminClient();

  // Fast path: they already have an account -> just add them directly.
  const { data: existingProfile } = await admin
    .from("profiles")
    .select("id")
    .eq("email", cleanEmail)
    .maybeSingle();

  if (existingProfile) {
    const { error: insertError } = await supabase.from("workspace_members").insert({
      workspace_id: workspaceId,
      user_id: existingProfile.id,
      role: "member",
    });
    if (insertError) {
      const friendly = friendlyDbError(insertError);
      return NextResponse.json({ error: friendly.message }, { status: friendly.status });
    }
    return NextResponse.json({ status: "added_existing" });
  }

  // No account yet -> send a real Supabase invite email. The workspaceId is
  // stashed in user_metadata; a DB trigger (see workspace-invite-trigger.sql)
  // reads it and adds them to workspace_members as soon as their auth.users
  // row is created (i.e. immediately, not just after they confirm).
  const origin = req.headers.get("origin") || process.env.NEXT_PUBLIC_SITE_URL || "";
  const { error: inviteError } = await admin.auth.admin.inviteUserByEmail(cleanEmail, {
    data: { pending_workspace_id: workspaceId },
    redirectTo: `${origin}/dashboard`,
  });

  if (inviteError) {
    // The profiles-table lookup above can miss real accounts (a profile row
    // that never got an email backfilled, case differences, a suspended
    // account with no profile at all, etc). Supabase auth itself is the
    // source of truth, so if IT says this email is already registered,
    // look the user up directly and add them instead of dead-ending on an
    // error the person can't do anything about.
    const alreadyRegistered = /already.*(registered|exists)/i.test(inviteError.message);
    if (alreadyRegistered) {
      const { data: userList, error: listError } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
      const match = !listError && userList?.users.find((u) => u.email?.toLowerCase() === cleanEmail);

      if (match) {
        // Guarantee the FK target exists before inserting the membership —
        // this is what was causing workspace_members_user_id_fkey to fail
        // for suspended / never-fully-onboarded accounts.
        await ensureProfileExists(admin, match.id, cleanEmail);

        const { error: insertError } = await supabase.from("workspace_members").insert({
          workspace_id: workspaceId,
          user_id: match.id,
          role: "member",
        });
        if (insertError) {
          const friendly = friendlyDbError(insertError);
          return NextResponse.json({ error: friendly.message }, { status: friendly.status });
        }
        return NextResponse.json({ status: "added_existing" });
      }
    }
    return NextResponse.json({ error: "Couldn't send the invite. Please try again in a moment." }, { status: 500 });
  }

  return NextResponse.json({ status: "invited" });
}

