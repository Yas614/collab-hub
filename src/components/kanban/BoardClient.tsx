"use client";

import React, { useState, useEffect, useCallback } from "react";
import { MoreHorizontal, User, Calendar } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import AddTaskInline from "./AddTaskInline";
import TaskDetailSlideOver from "./TaskDetailSlideOver";
import type { Task, Column, Member } from "@/types/kanban";

const PRIORITY_STYLES: Record<string, string> = {
  urgent: "bg-red-100 text-red-700",
  high:   "bg-orange-100 text-orange-700",
  medium: "bg-blue-100 text-blue-700",
  low:    "bg-slate-100 text-slate-500",
};

export default function BoardClient({
  workspaceId,
  columns: initialColumns,
  tasks: initialTasks,
  members = [],
}: {
  workspaceId: string;
  columns: Column[];
  tasks: Task[];
  members?: Member[];
}) {
  const [localTasks,   setLocalTasks]   = useState<Task[]>(initialTasks);
  const [localColumns, setLocalColumns] = useState<Column[]>(initialColumns);
  const [draggingTaskId,   setDraggingTaskId]   = useState<string | null>(null);
  const [dragOverColumnId, setDragOverColumnId] = useState<string | null>(null);
  const [openMenuColumnId, setOpenMenuColumnId] = useState<string | null>(null);
  const [selectedTaskId,   setSelectedTaskId]   = useState<string | null>(null);

  // Sync if server props change
  useEffect(() => { setLocalTasks(initialTasks); },   [initialTasks]);
  useEffect(() => { setLocalColumns(initialColumns); }, [initialColumns]);

  // Realtime updates
  useEffect(() => {
    const channel = supabase
      .channel(`board-${workspaceId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "tasks", filter: `workspace_id=eq.${workspaceId}` }, (payload) => {
        if (payload.eventType === "INSERT") {
          const t = payload.new as Task;
          setLocalTasks((prev) => prev.some((x) => x.id === t.id) ? prev : [...prev, t]);
        } else if (payload.eventType === "UPDATE") {
          const t = payload.new as Task;
          setLocalTasks((prev) => prev.map((x) => x.id === t.id ? { ...x, ...t } : x));
        } else if (payload.eventType === "DELETE") {
          setLocalTasks((prev) => prev.filter((x) => x.id !== (payload.old as Task).id));
        }
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "columns", filter: `workspace_id=eq.${workspaceId}` }, (payload) => {
        if (payload.eventType === "INSERT") {
          const c = payload.new as Column;
          setLocalColumns((prev) => prev.some((x) => x.id === c.id) ? prev : [...prev, c].sort((a, b) => a.position - b.position));
        } else if (payload.eventType === "DELETE") {
          setLocalColumns((prev) => prev.filter((x) => x.id !== (payload.old as Column).id));
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [workspaceId]);

  const handleDeleteColumn = async (columnId: string) => {
    setOpenMenuColumnId(null);
    const count = localTasks.filter((t) => t.column_id === columnId).length;
    if (!confirm(count > 0 ? `This column has ${count} task(s). Delete anyway?` : "Delete this column?")) return;
    setLocalColumns((prev) => prev.filter((c) => c.id !== columnId));
    setLocalTasks((prev) => prev.filter((t) => t.column_id !== columnId));
    await supabase.from("columns").delete().eq("id", columnId);
  };

  const handleDrop = async (e: React.DragEvent, targetColumnId: string) => {
    e.preventDefault();
    setDragOverColumnId(null);
    const taskId = draggingTaskId;
    setDraggingTaskId(null);
    if (!taskId) return;

    const task = localTasks.find((t) => t.id === taskId);
    if (!task || task.column_id === targetColumnId) return;

    const newPosition = localTasks.filter((t) => t.column_id === targetColumnId).length + 1;
    setLocalTasks((prev) =>
      prev.map((t) => t.id === taskId ? { ...t, column_id: targetColumnId, position: newPosition } : t)
    );
    await supabase.from("tasks").update({ column_id: targetColumnId, position: newPosition }).eq("id", taskId);
  };

  const handleTaskUpdate = useCallback((updated: Partial<Task> & { id: string }) => {
    setLocalTasks((prev) => prev.map((t) => t.id === updated.id ? { ...t, ...updated } : t));
  }, []);

  const handleTaskDelete = useCallback((taskId: string) => {
    setLocalTasks((prev) => prev.filter((t) => t.id !== taskId));
    setSelectedTaskId(null);
  }, []);

  const selectedTask = localTasks.find((t) => t.id === selectedTaskId) ?? null;

  return (
    <>
      <div className="flex gap-4 overflow-x-auto pb-4 flex-1 items-start min-h-0 select-none">
        {localColumns.map((column) => {
          const columnTasks = localTasks
            .filter((t) => t.column_id === column.id)
            .sort((a, b) => a.position - b.position);
          const isDragOver = dragOverColumnId === column.id;

          return (
            <div
              key={column.id}
              onDragOver={(e) => { e.preventDefault(); setDragOverColumnId(column.id); }}
              onDragLeave={() => setDragOverColumnId(null)}
              onDrop={(e) => handleDrop(e, column.id)}
              className={`w-80 border rounded-2xl p-4 flex flex-col max-h-full shrink-0 transition-colors relative ${isDragOver ? "bg-indigo-50/60 border-indigo-200" : "bg-slate-50 border-slate-100"}`}
            >
              {/* Column header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-sm text-slate-800">{column.title}</h3>
                  <span className="text-xs font-bold text-slate-400 bg-slate-200/60 px-2 py-0.5 rounded-full">{columnTasks.length}</span>
                </div>
                <button onClick={() => setOpenMenuColumnId(openMenuColumnId === column.id ? null : column.id)} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg">
                  <MoreHorizontal size={16} />
                </button>
                {openMenuColumnId === column.id && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setOpenMenuColumnId(null)} />
                    <div className="absolute right-4 mt-8 bg-white border border-slate-100 rounded-xl shadow-lg z-20 py-1 w-40">
                      <button onClick={() => handleDeleteColumn(column.id)} className="w-full text-left px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50">Delete column</button>
                    </div>
                  </>
                )}
              </div>

              {/* Task cards */}
              <div className="space-y-3 overflow-y-auto flex-1 pr-1 min-h-[20px]">
                {columnTasks.length === 0 ? (
                  <div className="border border-dashed border-slate-200 rounded-xl p-6 text-center text-xs text-slate-400 bg-white/50">No tasks yet</div>
                ) : (
                  columnTasks.map((task) => (
                    <div
                      key={task.id}
                      draggable
                      onDragStart={() => setDraggingTaskId(task.id)}
                      onDragEnd={() => setDraggingTaskId(null)}
                      onClick={() => setSelectedTaskId(task.id)}
                      className={`bg-white border border-slate-100 p-4 rounded-xl shadow-sm hover:shadow-md transition-all cursor-pointer space-y-3 ${draggingTaskId === task.id ? "opacity-40 scale-[0.98]" : ""}`}
                    >
                      {/* Priority badge */}
                      {task.priority && (
                        <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full ${PRIORITY_STYLES[task.priority]}`}>
                          {task.priority}
                        </span>
                      )}
                      <h4 className="font-semibold text-sm text-slate-800 line-clamp-2 leading-snug">{task.title}</h4>
                      {task.description && (
                        <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">{task.description}</p>
                      )}
                      <div className="flex items-center justify-between pt-2 border-t border-slate-50 text-[11px] text-slate-400">
                        <div className="flex items-center gap-1">
                          <User size={12} />
                          <span className="truncate max-w-[100px]">
                            {task.assignee?.display_name ?? "Unassigned"}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          {task.due_date && (
                            <span className="flex items-center gap-1">
                              <Calendar size={11} />
                              {(() => {
                                try {
                                  return new Intl.DateTimeFormat("en-US", {
                                    month: "short",
                                    day: "numeric"
                                  }).format(new Date(task.due_date));
                                } catch (e) {
                                  return "";
                                }
                              })()}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <AddTaskInline
                workspaceId={workspaceId}
                columnId={column.id}
                nextPosition={columnTasks.length + 1}
                members={members}
                onTaskCreated={(task) => {
                  setLocalTasks((prev) => prev.some((t) => t.id === task.id) ? prev : [...prev, task]);
                }}
              />
            </div>
          );
        })}
      </div>

      {/* Task detail slide-over */}
      {selectedTask && (
        <TaskDetailSlideOver
          task={selectedTask}
          workspaceId={workspaceId}
          members={members} 
          onClose={() => setSelectedTaskId(null)}
          onUpdate={handleTaskUpdate}
          onDelete={handleTaskDelete}
        />
      )}
    </>
  );
}