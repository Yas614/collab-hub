import React from "react";
import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import WorkspaceSettingsForm from "@/components/settings/WorkspaceSettingsForm";

interface SettingsPageProps {
  params: Promise<{ workspaceId: string }>;
}

export default async function SettingsPage({ params }: SettingsPageProps) {
  const { workspaceId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: workspace } = await supabase
    .from("workspaces")
    .select("id, name")
    .eq("id", workspaceId)
    .single();

  if (!workspace) notFound();

  const { data: membership } = await supabase
    .from("workspace_members")
    .select("role")
    .eq("workspace_id", workspaceId)
    .eq("user_id", user?.id || "")
    .maybeSingle();

  const isOwner = membership?.role === "owner";

  return (
    <div className="p-6 space-y-6 max-w-xl">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Workspace Settings</h1>
        <p className="text-xs text-slate-500">
          {isOwner ? "Manage this workspace's name and lifecycle." : "Only the workspace owner can change these settings."}
        </p>
      </div>

      <WorkspaceSettingsForm
        workspaceId={workspace.id}
        initialName={workspace.name}
        isOwner={isOwner}
      />
    </div>
  );
}
