export const dynamic = 'force-dynamic';

import React from 'react';
import { Clock, CheckCircle2, AlertCircle, BarChart3, PieChart } from "lucide-react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import DashboardHeaderActions from "@/components/DashboardHeaderActions";

interface WorkspaceItem {
  id: string;
  name: string;
  created_at: string;
}

interface TaskWithRelations {
  id: string;
  title: string;
  priority: string | null;
  due_date: string | null;
  workspace_id: string;
  assigned_to: string | null;
  column: { title: string } | null;
  workspaces: { name: string } | null;
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

function formatDueDate(dateString: string | null) {
  if (!dateString) return null;
  const date = new Date(dateString);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffDays = Math.round((date.getTime() - today.getTime()) / 86400000);

  if (diffDays < 0) return { label: `${Math.abs(diffDays)}d overdue`, tone: "text-red-600 bg-red-50" };
  if (diffDays === 0) return { label: "Due today", tone: "text-amber-600 bg-amber-50" };
  if (diffDays === 1) return { label: "Due tomorrow", tone: "text-amber-600 bg-amber-50" };
  return { label: date.toLocaleDateString(undefined, { month: "short", day: "numeric" }), tone: "text-slate-500 bg-slate-100" };
}

const PRIORITY_CONFIG = [
  { key: "urgent", label: "Urgent", ringColor: "stroke-red-500", dotColor: "bg-red-500", text: "text-red-500" },
  { key: "high", label: "High", ringColor: "stroke-orange-500", dotColor: "bg-orange-500", text: "text-orange-500" },
  { key: "medium", label: "Medium", ringColor: "stroke-blue-500", dotColor: "bg-blue-500", text: "text-blue-500" },
  { key: "low", label: "Low", ringColor: "stroke-slate-400", dotColor: "bg-slate-400", text: "text-slate-400" },
] as const;

export default async function DashboardPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }
  const userId = user.id;

  const [profileRes, membershipsRes, tasksRes, workspaceMembersRes] = await Promise.all([
    supabase.from("profiles").select("display_name").eq("id", userId).maybeSingle(),
    supabase.from("workspace_members").select("workspaces(id, name, created_at)").eq("user_id", userId),
    supabase.from("tasks").select("id, title, priority, due_date, workspace_id, assigned_to, column:columns(title), workspaces(name)"),
    supabase.from("workspace_members").select("workspace_id, profiles(display_name, avatar_url)"),
  ]);

  const userName = profileRes.data?.display_name;
  
  const liveWorkspaces = ((membershipsRes.data || [])
    .map((m: any) => m.workspaces)
    .filter(Boolean) as WorkspaceItem[])
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const allTasks = (tasksRes.data || []) as unknown as TaskWithRelations[];

  const totalWorkspacesCount = liveWorkspaces.length;
  const totalTasksCount = allTasks.length;

  const isDoneColumn = (title: string | undefined) => {
    if (!title) return false;
    const t = title.toLowerCase();
    return t === "done" || t === "completed";
  };

  const completedTasksCount = allTasks.filter((t) => isDoneColumn(t.column?.title)).length;
  const pendingTasksCount = totalTasksCount - completedTasksCount;

  const stats = [
    { label: "Active Workspaces", value: totalWorkspacesCount.toString(), icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-50" },
    { label: "Total Tasks", value: totalTasksCount.toString(), icon: Clock, color: "text-indigo-600", bg: "bg-indigo-50" },
    { label: "Pending Tasks", value: pendingTasksCount.toString(), icon: AlertCircle, color: "text-amber-600", bg: "bg-amber-50" },
  ];

  // Workspaces metrics
  const workspaceStats: Record<string, { total: number; completed: number }> = {};
  allTasks.forEach((t) => {
    const wsId = t.workspace_id;
    if (!workspaceStats[wsId]) workspaceStats[wsId] = { total: 0, completed: 0 };
    workspaceStats[wsId].total++;
    if (isDoneColumn(t.column?.title)) workspaceStats[wsId].completed++;
  });

  // Workspace members
  const workspaceMembers: Record<string, { display_name: string | null; avatar_url: string | null }[]> = {};
  (workspaceMembersRes.data || []).forEach((m: any) => {
    const wsId = m.workspace_id as string;
    if (!workspaceMembers[wsId]) workspaceMembers[wsId] = [];
    if (m.profiles) workspaceMembers[wsId].push(m.profiles);
  });

  // Priority metrics calculation
  const priorityCounts: Record<string, number> = { urgent: 0, high: 0, medium: 0, low: 0 };
  allTasks.forEach((t) => {
    const p = t.priority || "medium";
    if (priorityCounts[p] !== undefined) priorityCounts[p]++;
  });

  // Calculate accumulated offsets for the SVG Donut chart
  let accumulatedPercentage = 0;
  const donutSegments = PRIORITY_CONFIG.map((p) => {
    const count = priorityCounts[p.key];
    const percentage = totalTasksCount > 0 ? (count / totalTasksCount) * 100 : 0;
    const strokeDasharray = `${percentage} ${100 - percentage}`;
    const strokeDashoffset = 100 - accumulatedPercentage + 25; // 25 coordinates rotation shift
    accumulatedPercentage += percentage;
    return { ...p, count, percentage, strokeDasharray, strokeDashoffset };
  });

  // Task Status distribution math
  const completedPercentage = totalTasksCount > 0 ? Math.round((completedTasksCount / totalTasksCount) * 100) : 0;
  const pendingPercentage = totalTasksCount > 0 ? 100 - completedPercentage : 0;

  // My Tasks list split
  const myTasks = allTasks
    .filter((t) => t.assigned_to === userId)
    .sort((a, b) => {
      if (!a.due_date && !b.due_date) return 0;
      if (!a.due_date) return 1;
      if (!b.due_date) return -1;
      return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
    })
    .slice(0, 6);

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <DashboardHeaderActions userName={userName} userId={userId} />

      {/* Stats Grid */}
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

      {/* Dual Graphs Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Graph 1: Priority Breakdown Donut Chart */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 flex flex-col">
          <div className="flex items-center gap-2 mb-6">
            <PieChart size={16} className="text-slate-400" />
            <h2 className="font-bold text-slate-800 text-sm">Priority Distribution</h2>
          </div>
          
          {totalTasksCount === 0 ? (
            <div className="flex-1 flex items-center justify-center min-h-[180px]">
              <p className="text-sm text-slate-400">No tasks found to distribute.</p>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row items-center justify-around gap-6 flex-1">
              {/* SVG Donut */}
              <div className="relative w-40 h-40 shrink-0">
                <svg viewBox="0 0 42 42" className="w-full h-full transform -rotate-90">
                  <circle cx="21" cy="21" r="15.915" fill="transparent" stroke="#f1f5f9" strokeWidth="4" />
                  {donutSegments.map((seg) => (
                    seg.count > 0 && (
                      <circle
                        key={seg.key}
                        cx="21"
                        cy="21"
                        r="15.915"
                        fill="transparent"
                        className={`${seg.ringColor} transition-all duration-500`}
                        strokeWidth="4.2"
                        strokeDasharray={seg.strokeDasharray}
                        strokeDashoffset={seg.strokeDashoffset}
                      />
                    )
                  ))}
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-transparent">
                  <span className="text-2xl font-black text-slate-800">{totalTasksCount}</span>
                  <span className="text-[10px] font-bold text-slate-400 tracking-wider uppercase">Total Tasks</span>
                </div>
              </div>

              {/* Legends details */}
              <div className="grid grid-cols-2 sm:grid-cols-1 gap-x-6 gap-y-3 w-full sm:w-auto">
                {donutSegments.map((seg) => (
                  <div key={seg.key} className="flex items-center gap-3">
                    <span className={`h-2.5 w-2.5 rounded-full shrink-0 ${seg.dotColor}`} />
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-slate-700">{seg.label}</span>
                      <span className="text-[11px] font-semibold text-slate-400">
                        {seg.count} {seg.count === 1 ? 'task' : 'tasks'} ({Math.round(seg.percentage)}%)
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Graph 2: Task Execution Progress Chart */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 flex flex-col">
          <div className="flex items-center gap-2 mb-6">
            <BarChart3 size={16} className="text-slate-400" />
            <h2 className="font-bold text-slate-800 text-sm">Task Progress Overview</h2>
          </div>

          {totalTasksCount === 0 ? (
            <div className="flex-1 flex items-center justify-center min-h-[180px]">
              <p className="text-sm text-slate-400">Add tasks to initialize execution tracks.</p>
            </div>
          ) : (
            <div className="flex flex-col justify-center flex-1 space-y-6">
              {/* Stacked Percentage bar */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-bold text-slate-400">
                  <span>WORKFLOW RATIO</span>
                  <span className="text-indigo-600">{completedPercentage}% Completed</span>
                </div>
                <div className="w-full bg-slate-100 h-5 rounded-xl overflow-hidden flex shadow-inner">
                  {completedTasksCount > 0 && (
                    <div 
                      className="bg-gradient-to-r from-emerald-400 to-emerald-500 h-full transition-all flex items-center justify-center text-[10px] font-bold text-white shadow"
                      style={{ width: `${completedPercentage}%` }}
                    >
                      {completedPercentage >= 15 && `${completedPercentage}%`}
                    </div>
                  )}
                  {pendingTasksCount > 0 && (
                    <div 
                      className="bg-gradient-to-r from-indigo-400 to-indigo-500 h-full transition-all flex items-center justify-center text-[10px] font-bold text-white shadow"
                      style={{ width: `${pendingPercentage}%` }}
                    >
                      {pendingPercentage >= 15 && `${pendingPercentage}%`}
                    </div>
                  )}
                </div>
              </div>

              {/* Status Breakdowns blocks */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-emerald-50/60 border border-emerald-100/50 p-4 rounded-xl flex flex-col">
                  <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wide">Completed</span>
                  <span className="text-2xl font-extrabold text-emerald-700 mt-1">{completedTasksCount}</span>
                  <span className="text-xs text-slate-400 font-medium mt-0.5">Tasks archived cleanly</span>
                </div>
                <div className="bg-indigo-50/60 border border-indigo-100/50 p-4 rounded-xl flex flex-col">
                  <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wide">In Progress / Pending</span>
                  <span className="text-2xl font-extrabold text-indigo-700 mt-1">{pendingTasksCount}</span>
                  <span className="text-xs text-slate-400 font-medium mt-0.5">Awaiting resolution</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Workspaces + My Tasks */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between">
            <h2 className="font-bold text-slate-800">Your Active Workspaces</h2>
            <a href="/dashboard/workspaces" className="text-sm font-semibold text-indigo-600 hover:underline">View All</a>
          </div>
          <div className="p-5 grid grid-cols-1 gap-4">
            {liveWorkspaces.length === 0 ? (
              <div className="p-6 text-center text-slate-400 text-sm">No workspaces found. Create one to begin collaborating!</div>
            ) : (
              liveWorkspaces.slice(0, 3).map((workspace) => {
                const stat = workspaceStats[workspace.id];
                const pct = stat && stat.total > 0 ? Math.round((stat.completed / stat.total) * 100) : null;
                const members = workspaceMembers[workspace.id] || [];
                const visibleMembers = members.slice(0, 3);
                const extraCount = members.length - visibleMembers.length;

                return (
                  <a
                    key={workspace.id}
                    href={`/dashboard/${workspace.id}/board`}
                    className="p-5 flex flex-col gap-4 hover:bg-slate-50/80 transition-all cursor-pointer group border border-slate-100 rounded-2xl bg-white hover:shadow-md hover:-translate-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold shadow-indigo-100 shadow-lg">
                          {workspace.name.substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <h4 className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                            {workspace.name}
                          </h4>
                          <p className="text-[11px] text-slate-400 font-medium uppercase tracking-wider">
                            Active Workspace
                          </p>
                        </div>
                      </div>
                      <div className="bg-emerald-50 text-emerald-600 text-[10px] font-bold px-2 py-1 rounded-lg">
                        LIVE
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex justify-between text-[10px] font-bold text-slate-400">
                        <span>COMPLETION</span>
                        <span>{pct === null ? "No tasks yet" : `${pct}%`}</span>
                      </div>
                      <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                        <div className="bg-indigo-500 h-full rounded-full" style={{ width: `${pct ?? 0}%` }} />
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2">
                      <div className="flex -space-x-2">
                        {visibleMembers.length === 0 ? (
                          <span className="text-[11px] text-slate-300">No members</span>
                        ) : (
                          <>
                            {visibleMembers.map((m, i) => (
                              <div
                                key={i}
                                title={m.display_name || "Member"}
                                className="h-6 w-6 rounded-full border-2 border-white bg-slate-200 flex items-center justify-center text-[8px] font-bold text-slate-600 overflow-hidden"
                              >
                                {m.avatar_url ? (
                                  <img src={m.avatar_url} alt="" className="w-full h-full object-cover" />
                                ) : (
                                  (m.display_name || "?").substring(0, 2).toUpperCase()
                                )}
                              </div>
                            ))}
                            {extraCount > 0 && (
                              <div className="h-6 w-6 rounded-full border-2 border-white bg-slate-100 flex items-center justify-center text-[8px] font-bold text-slate-500">
                                +{extraCount}
                              </div>
                            )}
                          </>
                        )}
                      </div>
                      <span className="text-[11px] text-slate-400 flex items-center gap-1">
                        <Clock size={12} /> {formatRelativeTime(workspace.created_at)}
                      </span>
                    </div>
                  </a>
                );
              })
            )}
          </div>
        </div>

        {/* My Tasks Side Column */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col">
          <div className="p-6 border-b border-slate-100">
            <h2 className="font-bold text-slate-800">My Tasks</h2>
            <p className="text-xs text-slate-400 mt-0.5">Assigned to you, soonest due date first.</p>
          </div>
          <div className="divide-y divide-slate-100 flex-1 overflow-y-auto max-h-[420px]">
            {myTasks.length === 0 ? (
              <div className="p-6 text-center text-slate-400 text-sm">Nothing assigned to you yet.</div>
            ) : (
              myTasks.map((task) => {
                const priorityConf = PRIORITY_CONFIG.find((p) => p.key === (task.priority || "medium"));
                const due = formatDueDate(task.due_date);
                return (
                  <a
                    key={task.id}
                    href={`/dashboard/${task.workspace_id}/board`}
                    className="p-4 flex flex-col gap-1.5 hover:bg-slate-50/80 transition-colors group"
                  >
                    <div className="flex items-center gap-2">
                      <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${priorityConf?.dotColor || "bg-slate-400"}`} />
                      <p className="text-sm font-semibold text-slate-800 group-hover:text-indigo-600 transition-colors truncate">
                        {task.title}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 pl-3.5">
                      <span className="text-[11px] text-slate-400 truncate max-w-[140px]">
                        {task.workspaces?.name || "Workspace"}
                      </span>
                      {due && (
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0 ${due.tone}`}>
                          {due.label}
                        </span>
                      )}
                    </div>
                  </a>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}