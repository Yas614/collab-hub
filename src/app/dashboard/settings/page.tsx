import React from "react";
import { createClient } from "@/lib/supabase/server";
import AccountSettingsForm from "@/components/settings/AccountSettingsForm";

export default async function AccountSettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, avatar_url, email")
    .eq("id", user?.id || "")
    .single();

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Account Settings</h1>
        <p className="text-slate-500 text-sm">Manage your profile and password.</p>
      </div>

      <AccountSettingsForm
        initialDisplayName={profile?.display_name || ""}
        initialAvatarUrl={profile?.avatar_url || ""}
        email={profile?.email || user?.email || ""}
      />
    </div>
  );
}
