import React from "react";
import { createClient } from "@/lib/supabase/server";
import { ArrowUpRight } from "lucide-react";
import NewWorkspaceButton from "@/components/NewWorkspaceButton";

function formatRelativeTime(dateString: string) {
  if (!dateString) return "";
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return "Just now";
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours}h ago`;
  return date.toLocaleDateString();
}

export default async function WorkspacesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: memberships } = await supabase
    .from("workspace_members")
    .select("workspaces(id, name, created_at)")
    .eq("user_id", user?.id || "");

  const workspaces = (memberships || [])
    .map((m: any) => m.workspaces)
    .filter(Boolean)
    .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">All Workspaces</h1>
          <p className="text-slate-500 text-sm">Every workspace you're a part of, in one place.</p>
        </div>
        <NewWorkspaceButton userId={user?.id || ""} />
      </div>

      {workspaces.length === 0 ? (
        <div className="bg-white border border-slate-100 rounded-2xl p-12 text-center text-slate-400 text-sm">
          You're not part of any workspaces yet. Create one to get started.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {workspaces.map((workspace: any) => (
            <a
              key={workspace.id}
              href={`/dashboard/${workspace.id}/board`}
              className="bg-white border border-slate-100 rounded-2xl p-6 flex items-center justify-between hover:shadow-md hover:border-indigo-100 transition-all group"
            >
              <div className="flex items-center gap-4 min-w-0">
                <div className="h-12 w-12 rounded-xl bg-slate-100 flex items-center justify-center font-bold text-slate-400 group-hover:bg-indigo-100 group-hover:text-indigo-600 transition-colors shrink-0">
                  {workspace.name ? workspace.name.substring(0, 2).toUpperCase() : "WS"}
                </div>
                <div className="min-w-0">
                  <h4 className="font-semibold text-slate-900 truncate">{workspace.name || "Unnamed Workspace"}</h4>
                  <p className="text-sm text-slate-500">
                    {workspace.created_at ? `Created ${formatRelativeTime(workspace.created_at)}` : "Creation time unavailable"}
                  </p>
                </div>
              </div>
              <ArrowUpRight className="text-slate-300 group-hover:text-indigo-500 transition-colors shrink-0" size={20} />
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
