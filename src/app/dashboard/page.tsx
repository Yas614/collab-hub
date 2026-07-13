// Drop this wrapper right at the top or inside your dashboard page file to handle the button safely
export const dynamic = 'force-dynamic';

import React from 'react';
import { ArrowUpRight, Clock, CheckCircle2, AlertCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import DashboardHeaderActions from "@/components/DashboardHeaderActions"; // We'll make this small client file next

interface WorkspaceItem {
  id: string;
  name: string;
  created_at: string;
}

function formatRelativeTime(dateString: string) {
  if (!dateString) return '';
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  if (diffInSeconds < 60) return 'Just now';
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours}h ago`;
  return date.toLocaleDateString();
}

export default async function DashboardPage() {
  const supabase = await createClient();

  // 1. Get the current authenticated user session safely
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  const userId = user?.id || "";

  // 2. Query data via workspace_members so invited workspaces show up here
  //    too, not just ones this user personally created.
  const [profileRes, membershipsRes, tasksRes] = await Promise.all([
    supabase.from("profiles").select("display_name").eq("id", userId).maybeSingle(),
    supabase
      .from("workspace_members")
      .select("workspaces(id, name, created_at)")
      .eq("user_id", userId),
    supabase.from("tasks").select("id, column:columns(title)")
  ]);

  const userName = profileRes.data?.display_name;
  const liveWorkspaces = ((membershipsRes.data || [])
    .map((m: any) => m.workspaces)
    .filter(Boolean) as WorkspaceItem[])
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  
  // ... rest of your calculations and return UI remain exactly the same
  const totalWorkspacesCount = liveWorkspaces.length;
  const totalTasksCount = tasksRes.data?.length || 0;
  
  const completedTasksCount = tasksRes.data?.filter(task => {
    const colTitle = (task.column as any)?.title?.toLowerCase() || "";
    return colTitle === "done" || colTitle === "completed";
  }).length || 0;

  const pendingTasksCount = totalTasksCount - completedTasksCount;

  const stats = [
    { label: "Active Workspaces", value: totalWorkspacesCount.toString(), icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-50" },
    { label: "Total Tasks", value: totalTasksCount.toString(), icon: Clock, color: "text-indigo-600", bg: "bg-indigo-50" },
    { label: "Pending Tasks", value: pendingTasksCount.toString(), icon: AlertCircle, color: "text-amber-600", bg: "bg-amber-50" },
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Dynamic Header Component managing the state of the Modal */}
      <DashboardHeaderActions userName={userName} userId={userId} />

      {/* Dynamic Schema Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
            <div className={`${stat.bg} ${stat.color} p-3 rounded-xl`}>
              <stat.icon size={24} />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{stat.label}</p>
              <h3 className="text-2xl font-bold text-slate-900 mt-0.5">{stat.value}</h3>
            </div>
          </div>
        ))}
      </div>

      {/* Workspace Display Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between">
            <h2 className="font-bold text-slate-800">Your Active Workspaces</h2>
            <a href="/dashboard/workspaces" className="text-sm font-semibold text-indigo-600 hover:underline">View All</a>
          </div>
          <div className="divide-y divide-slate-100">
            {liveWorkspaces.length === 0 ? (
              <div className="p-6 text-center text-slate-400 text-sm">No workspaces found. Create one to begin collaborating!</div>
            ) : (
              liveWorkspaces.slice(0, 3).map((workspace) => (
  <a 
    key={workspace.id} 
    href={`/dashboard/${workspace.id}/board`}
    className="p-6 flex items-center justify-between hover:bg-slate-50/70 transition-colors cursor-pointer group border-b border-slate-100 last:border-none"
  >
    <div className="flex items-center gap-4">
      <div className="h-12 w-12 rounded-xl bg-slate-100 flex items-center justify-center font-bold text-slate-400 group-hover:bg-indigo-100 group-hover:text-indigo-600 transition-colors">
        {workspace.name ? workspace.name.substring(0, 2).toUpperCase() : "WS"}
      </div>
      <div>
        <h4 className="font-semibold text-slate-900">{workspace.name || "Unnamed Workspace"}</h4>
        <p className="text-sm text-slate-500">
          {workspace.created_at ? `Created ${formatRelativeTime(workspace.created_at)}` : "Creation time unavailable"}
        </p>
      </div>
    </div>
    <ArrowUpRight className="text-slate-300 group-hover:text-indigo-500 transition-colors" size={20} />
  </a>
)))}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100">
            <h2 className="font-bold text-slate-800">Workspace Status</h2>
          </div>
          <div className="p-6 space-y-4 text-sm text-slate-600">
            <p>You currently manage <span className="font-bold text-slate-900">{totalWorkspacesCount} distinct zones</span>.</p>
            <p>Your team has compiled <span className="font-bold text-indigo-600">{totalTasksCount} tasks</span> across your active Kanban columns.</p>
            <div className="mt-4 pt-4 border-t border-slate-100">
              <span className="text-xs uppercase font-bold text-slate-400 tracking-wider">Quick Note</span>
              <p className="text-xs text-slate-400 mt-1">Real-time messaging logs can be previewed directly inside your chosen workspace view.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}