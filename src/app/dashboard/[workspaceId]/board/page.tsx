import React from "react";
import { createClient } from "@/lib/supabase/server";
import BoardClient from "@/components/kanban/BoardClient";
import AddColumnInline from "@/components/kanban/AddColumnInline";

interface BoardPageProps {
  params: Promise<{
    workspaceId: string;
  }>;
}

export default async function BoardPage({ params }: BoardPageProps) {
  const resolvedParams = await params;
  const workspaceId = resolvedParams.workspaceId;
  const supabase = await createClient();

  // 1. Fetch existing columns - untouched
  let { data: columns } = await supabase
    .from("columns")
    .select("*")
    .eq("workspace_id", workspaceId)
    .order("position", { ascending: true });

  // 2. Seed default columns if missing - untouched
  if (!columns || columns.length === 0) {
    const defaultColumns = [
      { workspace_id: workspaceId, title: "To Do", position: 1 },
      { workspace_id: workspaceId, title: "In Progress", position: 2 },
      { workspace_id: workspaceId, title: "Done", position: 3 },
    ];

    const { data: seededColumns } = await supabase
      .from("columns")
      .insert(defaultColumns)
      .select();

    columns = seededColumns || [];
  }

  // 3. Fetch live tasks. IMPORTANT: alias the joined profile as "assignee"
  // (not "assigned_to") so the raw assigned_to UUID from "*" isn't
  // overwritten by the joined object — both are needed downstream.
  const { data: tasks } = await supabase
    .from("tasks")
    .select("*, assignee:profiles(id, display_name, avatar_url)")
    .eq("workspace_id", workspaceId)
    .order("position", { ascending: true });

  // 4. Fetch workspace members (needed for the assignee dropdowns in
  // AddTaskInline and the task detail panel).
  const { data: members } = await supabase
    .from("workspace_members")
    .select("user_id, profiles(display_name, avatar_url)")
    .eq("workspace_id", workspaceId);

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Board Sub-Header Frame */}
      <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-white shrink-0">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Project Board</h1>
          <p className="text-xs text-slate-400 mt-0.5">Manage tasks, timelines, and tracks. Drag cards between columns.</p>
        </div>
        <div className="shrink-0">
          <AddColumnInline workspaceId={workspaceId} nextPosition={(columns?.length || 0) + 1} />
        </div>
      </div>

      {/* Kanban Board Interaction Viewport Wrapper */}
      <div className="flex-1 w-full overflow-hidden bg-slate-50/20 p-6">
        <BoardClient
          workspaceId={workspaceId}
          columns={columns || []}
          tasks={(tasks as any) || []}
          members={(members as any) || []}
        />
      </div>
    </div>
  );
}