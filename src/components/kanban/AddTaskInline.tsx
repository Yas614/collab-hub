"use client";

import React, { useState } from "react";
import { Plus, X, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import type { Member, Task } from "@/types/kanban";

export default function AddTaskInline({
  workspaceId,
  columnId,
  nextPosition,
  members = [],
  onTaskCreated,
}: {
  workspaceId: string;
  columnId: string;
  nextPosition: number;
  members?: Member[];
  onTaskCreated?: (task: Task) => void;
}) {
  const [isEditing, setIsEditing]     = useState(false);
  const [title, setTitle]             = useState("");
  const [priority, setPriority]       = useState("medium");
  const [dueDate, setDueDate]         = useState("");
  const [assignedTo, setAssignedTo]   = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError]             = useState("");

  const reset = () => { setTitle(""); setPriority("medium"); setDueDate(""); setAssignedTo(""); setIsEditing(false); setError(""); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setIsSubmitting(true);
    setError("");
    const { data: inserted, error: insertError } = await supabase
      .from("tasks")
      .insert({
        workspace_id: workspaceId,
        column_id: columnId,
        title: title.trim(),
        priority,
        due_date: dueDate || null,
        assigned_to: assignedTo || null,
        position: nextPosition,
      })
      .select("*, assignee:profiles(id, display_name, avatar_url)")
      .single();
    setIsSubmitting(false);
    if (insertError) {
      setError(insertError.message);
    } else {
      if (inserted) onTaskCreated?.(inserted as unknown as Task);
      reset();
    }
  };

  if (!isEditing) {
    return (
      <button onClick={() => setIsEditing(true)}
        className="mt-4 w-full flex items-center justify-center gap-1.5 py-2 border border-dashed border-slate-200 hover:border-slate-300 hover:bg-white text-xs font-semibold text-slate-500 hover:text-slate-700 rounded-xl transition-all">
        <Plus size={14} /> Add Task
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mt-4 bg-white border border-slate-100 p-3 rounded-xl shadow-sm space-y-2">
      <input autoFocus required disabled={isSubmitting} value={title} onChange={(e) => setTitle(e.target.value)}
        placeholder="Task title..."
        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:bg-white focus:border-indigo-400 transition-all" />

      <div className="grid grid-cols-2 gap-2">
        <select value={priority} onChange={(e) => setPriority(e.target.value)} disabled={isSubmitting}
          className="px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20">
          <option value="urgent">🔴 Urgent</option>
          <option value="high">🟠 High</option>
          <option value="medium">🔵 Medium</option>
          <option value="low">⚪ Low</option>
        </select>
        <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} disabled={isSubmitting}
          className="px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20" />
      </div>

      {members.length > 0 && (
        <select value={assignedTo} onChange={(e) => setAssignedTo(e.target.value)} disabled={isSubmitting}
          className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20">
          <option value="">Unassigned</option>
          {members.map((m) => (
            <option key={m.user_id} value={m.user_id}>{m.profiles?.display_name ?? m.user_id}</option>
          ))}
        </select>
      )}

      {error && <p className="text-[10px] font-medium text-red-600 bg-red-50 px-2 py-1.5 rounded-lg">{error}</p>}

      <div className="flex items-center gap-2">
        <button type="submit" disabled={isSubmitting || !title.trim()}
          className="flex items-center gap-1 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white text-xs font-semibold px-2.5 py-1.5 rounded-lg transition-all">
          {isSubmitting && <Loader2 size={12} className="animate-spin" />} Add
        </button>
        <button type="button" onClick={reset} className="p-1.5 hover:bg-slate-100 text-slate-400 hover:text-slate-600 rounded-lg">
          <X size={14} />
        </button>
      </div>
    </form>
  );
}