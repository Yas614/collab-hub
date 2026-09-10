export const dynamic = 'force-dynamic';

import React from 'react';
import WorkspaceFilterSelect from "@/components/calendar/WorkspaceFilterSelect";
import DateNav from "@/components/calendar/DateNav"; 
import CalendarView, { type CalTask } from "@/components/calendar/CalendarView";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Layers, CheckCircle2 } from "lucide-react";

interface TaskItem {
  id: string;
  title: string;
  description: string | null;
  priority: string | null;
  start_date: string | null;
  due_date: string | null;
  workspace_id: string;
  assigned_to: string | null;
  workspaces: { name: string } | null;
  column: { title: string } | null;
  assignee: { display_name: string; avatar_url: string | null } | null;
}

const PRIORITY_KEYS = ["urgent", "high", "medium", "low"];

function formatISODate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function isDoneColumn(title: string | undefined | null) {
  if (!title) return false;
  const t = title.toLowerCase();
  return t === "done" || t === "completed";
}

export default async function TimelinePage({ searchParams }: { searchParams: Promise<any> }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const resolvedParams = await searchParams;
  const now = new Date();
  const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayISO = formatISODate(todayMidnight);

  const anchorParam: string | undefined = resolvedParams.date;
  const anchorDate = anchorParam ? new Date(anchorParam + "T00:00:00") : todayMidnight;
  const currentMonth = anchorDate.getMonth();
  const currentYear = anchorDate.getFullYear();
  const activeWorkspaceFilter = resolvedParams.workspaceId || "all";
  const currentView = (resolvedParams.view || "month") as "week" | "month" | "list";

  let timelineStartDate: Date;
  let timelineEndDate: Date;

  if (currentView === "week") {
    const day = anchorDate.getDay();
    timelineStartDate = new Date(anchorDate.getFullYear(), anchorDate.getMonth(), anchorDate.getDate() - day);
    timelineEndDate = new Date(timelineStartDate.getFullYear(), timelineStartDate.getMonth(), timelineStartDate.getDate() + 7);
  } else {
    timelineStartDate = new Date(currentYear, currentMonth, 1);
    timelineEndDate = new Date(currentYear, currentMonth + 1, 1);
  }

  const membershipsRes = await supabase
    .from("workspace_members")
    .select("workspaces(id, name)")
    .eq("user_id", user.id);

  const workspaces = (membershipsRes.data || []).map((m: any) => m.workspaces).filter(Boolean);
  const workspaceIds = workspaces.map((w: any) => w.id);
  const hasWorkspaces = workspaceIds.length > 0;

  const [tasksRes, membersRes, columnsRes] = await Promise.all([
    supabase
      .from("tasks")
      .select(`
        id, title, description, priority, start_date, due_date, workspace_id, assigned_to,
        workspaces(name), 
        column:columns(title),
        assignee:profiles(display_name, avatar_url)
      `)
      .in("workspace_id", hasWorkspaces ? workspaceIds : ["00000000-0000-0000-0000-000000000000"])
      .not('due_date', 'is', null),
    hasWorkspaces
      ? supabase.from("workspace_members").select("user_id, profiles(display_name, avatar_url)").in("workspace_id", workspaceIds)
      : Promise.resolve({ data: [] as any[] }),
    hasWorkspaces
      ? supabase.from("columns").select("id, workspace_id, title, position").in("workspace_id", workspaceIds).order("position", { ascending: true })
      : Promise.resolve({ data: [] as any[] }),
  ]);

  let rawTasks = (tasksRes.data || []) as unknown as TaskItem[];
  if (activeWorkspaceFilter !== "all") {
    rawTasks = rawTasks.filter((t) => t.workspace_id === activeWorkspaceFilter);
  }

  const memberMap = new Map<string, { user_id: string; display_name: string | null; avatar_url: string | null }>();
  (membersRes.data || []).forEach((m: any) => {
    if (!memberMap.has(m.user_id)) {
      memberMap.set(m.user_id, { user_id: m.user_id, display_name: m.profiles?.display_name ?? "Member", avatar_url: m.profiles?.avatar_url ?? null });
    }
  });
  const allMembers = Array.from(memberMap.values());

  const firstColumnByWorkspace = new Map<string, string>();
  (columnsRes.data || []).forEach((c: any) => {
    if (!firstColumnByWorkspace.has(c.workspace_id)) firstColumnByWorkspace.set(c.workspace_id, c.id);
  });
  const workspaceOptions = workspaces.map((w: any) => ({
    id: w.id,
    name: w.name,
    firstColumnId: firstColumnByWorkspace.get(w.id) ?? null,
  }));

  const tasksInRange = rawTasks
    .map((t) => {
      const endParts = t.due_date!.split('T')[0].split('-');
      const parsedEnd = new Date(parseInt(endParts[0]), parseInt(endParts[1]) - 1, parseInt(endParts[2]), 23, 59);
      let parsedStart = new Date(parsedEnd);
      if (t.start_date) {
        const sParts = t.start_date.split('T')[0].split('-');
        parsedStart = new Date(parseInt(sParts[0]), parseInt(sParts[1]) - 1, parseInt(sParts[2]));
      }
      return { ...t, parsedStart, parsedEnd };
    })
    .filter((t) => t.parsedEnd >= timelineStartDate && t.parsedStart < timelineEndDate);

  const columnsCount = Math.ceil((timelineEndDate.getTime() - timelineStartDate.getTime()) / 86400000);

  const calTasks: CalTask[] = tasksInRange.map((t) => ({
    id: t.id,
    title: t.title,
    description: t.description,
    priority: t.priority,
    start_date: t.start_date,
    due_date: t.due_date!,
    workspace_id: t.workspace_id,
    workspaceName: t.workspaces?.name ?? null,
    statusTitle: t.column?.title ?? null,
    assigned_to: t.assigned_to,
    assignee: t.assignee,
  }));

  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const prevAnchor = currentView === "week" ? new Date(anchorDate.getTime() - 7 * 86400000) : new Date(currentYear, currentMonth - 1, 1);
  const nextAnchor = currentView === "week" ? new Date(anchorDate.getTime() + 7 * 86400000) : new Date(currentYear, currentMonth + 1, 1);
  const anchorISO = formatISODate(anchorDate);

  const openTasksCount = calTasks.filter(t => !isDoneColumn(t.statusTitle)).length;
  const completedTasksCount = calTasks.filter(t => isDoneColumn(t.statusTitle)).length;
  const completionPercentage = (completedTasksCount / (calTasks.length || 1)) * 100;

  const inThreeDays = new Date(todayMidnight.getTime() + 3 * 86400000);
  const overdueTasks = calTasks
    .filter((t) => !isDoneColumn(t.statusTitle) && new Date(t.due_date + "T00:00:00") < todayMidnight)
    .sort((a, b) => a.due_date.localeCompare(b.due_date));
  const dueSoonCount = calTasks.filter((t) => {
    if (isDoneColumn(t.statusTitle)) return false;
    const due = new Date(t.due_date + "T00:00:00");
    return due >= todayMidnight && due <= inThreeDays;
  }).length;

  return (
    <div className="w-full max-w-[1600px] mx-auto flex flex-col lg:flex-row gap-4 p-2 md:p-4 h-screen lg:h-[calc(100vh-80px)] overflow-y-auto lg:overflow-hidden">

      {/* --- MOBILE STATS STRIP (replaces the hidden-on-mobile sidebar) --- */}
      <div className="lg:hidden flex gap-2 overflow-x-auto pb-1 -mx-2 px-2 snap-x snap-mandatory scrollbar-none shrink-0">
        <div className="snap-start shrink-0 bg-indigo-600 text-white rounded-2xl px-4 py-2.5 min-w-[110px] shadow-md shadow-indigo-100">
          <p className="text-[9px] font-bold text-indigo-200 uppercase tracking-wider">Open</p>
          <p className="text-lg font-black leading-tight">{openTasksCount}</p>
        </div>
        <div className={`snap-start shrink-0 rounded-2xl px-4 py-2.5 min-w-[110px] ${overdueTasks.length > 0 ? "bg-red-50 border border-red-200" : "bg-white border border-slate-100"}`}>
          <p className={`text-[9px] font-bold uppercase tracking-wider ${overdueTasks.length > 0 ? "text-red-500" : "text-slate-400"}`}>Overdue</p>
          <p className={`text-lg font-black leading-tight ${overdueTasks.length > 0 ? "text-red-600" : "text-slate-800"}`}>{overdueTasks.length}</p>
        </div>
        <div className="snap-start shrink-0 bg-white border border-slate-100 rounded-2xl px-4 py-2.5 min-w-[110px]">
          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Due in 3d</p>
          <p className="text-lg font-black leading-tight text-slate-800">{dueSoonCount}</p>
        </div>
        {PRIORITY_KEYS.map((key) => {
          const count = calTasks.filter((t) => t.priority === key).length;
          if (count === 0) return null;
          return (
            <div key={key} className="snap-start shrink-0 bg-white border border-slate-100 rounded-2xl px-4 py-2.5 min-w-[90px]">
              <p className="flex items-center gap-1.5 text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                <span className={`h-1.5 w-1.5 rounded-full ${
                  key === "urgent" ? "bg-red-500" : key === "high" ? "bg-orange-500" : key === "medium" ? "bg-blue-500" : "bg-slate-400"
                }`} />
                {key}
              </p>
              <p className="text-lg font-black leading-tight text-slate-800">{count}</p>
            </div>
          );
        })}
      </div>

      {/* --- SIDEBAR: DESKTOP ONLY --- */}
      <div className="hidden lg:flex w-64 shrink-0 flex-col gap-4 overflow-y-auto pr-1 scrollbar-none">
        {/* Compact Active Focus */}
        <div className="bg-indigo-600 rounded-2xl p-4 text-white shadow-lg shadow-indigo-100">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] font-bold text-indigo-200 uppercase tracking-wider">Active Focus</p>
            <span className="text-xs bg-white/15 px-2 py-0.5 rounded-md font-bold">{openTasksCount} Open</span>
          </div>
          <div className="w-full bg-white/20 h-1 rounded-full overflow-hidden mb-3">
            <div 
              className="bg-white h-full transition-all" 
              style={{ width: `${completionPercentage}%` }} 
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className={`rounded-lg px-2.5 py-1.5 ${overdueTasks.length > 0 ? "bg-red-500/30" : "bg-white/10"}`}>
              <p className={`text-[9px] font-bold uppercase tracking-wider ${overdueTasks.length > 0 ? "text-red-100" : "text-indigo-200"}`}>Overdue</p>
              <p className="text-sm font-black text-white">{overdueTasks.length}</p>
            </div>
            <div className="rounded-lg px-2.5 py-1.5 bg-white/10">
              <p className="text-[9px] font-bold text-indigo-200 uppercase tracking-wider">Due in 3d</p>
              <p className="text-sm font-black text-white">{dueSoonCount}</p>
            </div>
          </div>
        </div>

        {/* Compressed Priority Breakdown */}
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
          <h2 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Priority Breakdown</h2>
          <div className="space-y-1">
            {PRIORITY_KEYS.map((key) => {
              const count = calTasks.filter(t => t.priority === key).length;
              if (count === 0) return null; // Hide empty priorities to save space
              return (
                <div key={key} className="flex items-center justify-between py-1 px-2 rounded-lg bg-slate-50 text-[11px] font-semibold text-slate-600">
                  <div className="flex items-center gap-2">
                    <div className={`h-2 w-2 rounded-full ${
                      key === "urgent" ? "bg-red-500" : key === "high" ? "bg-orange-500" : key === "medium" ? "bg-blue-500" : "bg-slate-400"
                    }`} />
                    <span className="capitalize">{key}</span>
                  </div>
                  <span className="text-slate-400 font-bold">{count}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Overdue tasks — actionable instead of a decorative legend */}
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
          <h2 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Overdue</h2>
          {overdueTasks.length === 0 ? (
            <div className="flex items-center gap-2 text-[11px] text-emerald-600 font-bold py-1">
              <CheckCircle2 size={14} /> You're all caught up
            </div>
          ) : (
            <div className="space-y-1.5">
              {overdueTasks.slice(0, 4).map((t) => (
                <a
                  key={t.id}
                  href={`/dashboard/${t.workspace_id}/board`}
                  className="flex items-center justify-between gap-2 py-1.5 px-2 rounded-lg bg-red-50/70 hover:bg-red-50 border border-red-100 transition-colors"
                >
                  <span className="text-[11px] font-semibold text-red-700 truncate">{t.title}</span>
                  <span className="text-[9px] font-bold text-red-400 shrink-0">
                    {new Date(t.due_date + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </span>
                </a>
              ))}
              {overdueTasks.length > 4 && (
                <p className="text-[10px] text-slate-400 font-semibold px-2 pt-0.5">+{overdueTasks.length - 4} more</p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* --- MAIN TIMELINE / CALENDAR PANEL --- */}
      <div className="flex-1 min-w-0 flex flex-col bg-white rounded-2xl lg:rounded-[2rem] border border-slate-100 shadow-xl overflow-hidden min-h-[500px] lg:min-h-0">
        
        {/* Highly Responsive Dynamic Header */}
        <div className="p-4 md:p-5 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white/90 backdrop-blur-md z-30">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-600 p-2.5 rounded-xl text-white shadow-sm shrink-0">
              <Layers size={18} />
            </div>
            <div>
              <h1 className="text-base md:text-lg font-black text-slate-900 tracking-tight leading-none">Schedule</h1>
              <p className="text-[10px] text-slate-400 font-bold mt-0.5 uppercase tracking-wider">{monthNames[currentMonth]} {currentYear}</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-start sm:justify-end">
            <DateNav
              currentView={currentView}
              activeWorkspaceFilter={activeWorkspaceFilter}
              anchorISO={anchorISO}
              prevISO={formatISODate(prevAnchor)}
              nextISO={formatISODate(nextAnchor)}
              todayISO={todayISO}
            />
            <WorkspaceFilterSelect
              workspaces={workspaces}
              activeWorkspaceFilter={activeWorkspaceFilter}
              currentView={currentView}
              anchorISO={anchorISO}
            />
          </div>
        </div>

        {/* Calendar core grid layout wrapper */}
        <div className="flex-1 min-h-0 w-full overflow-hidden flex flex-col">
          <CalendarView
            key={`${anchorISO}-${currentView}-${activeWorkspaceFilter}`}
            initialTasks={calTasks}
            timelineStartISO={formatISODate(timelineStartDate)}
            timelineEndISO={formatISODate(timelineEndDate)}
            columnsCount={columnsCount}
            currentView={currentView}
            todayISO={todayISO}
            members={allMembers}
            workspaces={workspaceOptions}
            rangeKey={`${anchorISO}-${currentView}-${activeWorkspaceFilter}`}
          />
        </div>
      </div>

    </div>
  );
}