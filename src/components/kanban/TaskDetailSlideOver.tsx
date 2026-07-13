"use client";

import React, { useState, useEffect, useRef } from "react";
import { X, Trash2, User, Calendar, Flag, Save, Loader2, Send } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import type { Task, Member, Profile, TaskComment } from "@/types/kanban";

function formatCommentTime(dateString: string) {
  try {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(new Date(dateString));
  } catch {
    return "";
  }
}

const PRIORITY_OPTIONS = [
  { value: "urgent", label: "🔴 Urgent" },
  { value: "high",   label: "🟠 High"   },
  { value: "medium", label: "🔵 Medium" },
  { value: "low",    label: "⚪ Low"    },
];

const PRIORITY_STYLES: Record<string, string> = {
  urgent: "bg-red-100 text-red-700",
  high:   "bg-orange-100 text-orange-700",
  medium: "bg-blue-100 text-blue-700",
  low:    "bg-slate-100 text-slate-500",
};

export default function TaskDetailSlideOver({
  task,
  workspaceId,
  members,
  onClose,
  onUpdate,
  onDelete,
}: {
  task: Task;
  workspaceId: string;
  members: Member[];
  onClose: () => void;
  onUpdate: (updated: Partial<Task> & { id: string }) => void;
  onDelete: (taskId: string) => void;
}) {
  const [title,       setTitle]       = useState(task.title);
  const [description, setDescription] = useState(task.description ?? "");
  const [priority,    setPriority]    = useState(task.priority);
  const [dueDate,     setDueDate]     = useState(task.due_date ?? "");
  const [assignedTo,  setAssignedTo]  = useState<string>(task.assigned_to ?? "");

  const [isSaving,    setIsSaving]    = useState(false);
  const [isDeleting,  setIsDeleting]  = useState(false);
  const [isDirty,     setIsDirty]     = useState(false);

  const [comments,        setComments]        = useState<TaskComment[]>([]);
  const [commentDraft,    setCommentDraft]    = useState("");
  const [isSendingComment, setIsSendingComment] = useState(false);
  const commentsBottomRef = useRef<HTMLDivElement>(null);

  // Load comments
  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("task_comments")
        .select("id, content, created_at, user_id, profiles(display_name, avatar_url)")
        .eq("task_id", task.id)
        .order("created_at", { ascending: true });
      setComments((data as unknown as TaskComment[]) ?? []);
    };
    load();

    // Realtime comments
    const channel = supabase
      .channel(`task-comments-${task.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "task_comments", filter: `task_id=eq.${task.id}` }, async (payload) => {
        const { data: withProfile } = await supabase
          .from("task_comments")
          .select("id, content, created_at, user_id, profiles(display_name, avatar_url)")
          .eq("id", (payload.new as TaskComment).id)
          .single();
        if (withProfile) setComments((prev) => prev.some((c) => c.id === withProfile.id) ? prev : [...prev, withProfile as unknown as TaskComment]);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [task.id]);

  useEffect(() => {
    commentsBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [comments.length]);

  const markDirty = () => setIsDirty(true);

  const handleSave = async () => {
    setIsSaving(true);
    
    // 1. Data payload specifically structured for your database fields
    const dbPayload = {
      title:       title.trim(),
      description: description.trim() || null,
      priority,
      due_date:    dueDate || null,
      assigned_to: assignedTo || null, // stores the user UUID string in DB
    };

    const { error } = await supabase.from("tasks").update(dbPayload).eq("id", task.id);
    setIsSaving(false);
    
    if (!error) {
      // 2. Find matching profile object to satisfy client-side Task shape cleanly
      const matchedProfile = members.find((m) => m.user_id === assignedTo)?.profiles ?? null;
      
      onUpdate({
        id: task.id,
        title: dbPayload.title,
        description: dbPayload.description,
        priority: dbPayload.priority,
        due_date: dbPayload.due_date,
        assigned_to: dbPayload.assigned_to, // raw user_id, kept separate
        assignee: matchedProfile,           // joined profile, for display
      });
      setIsDirty(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Delete this task? This cannot be undone.")) return;
    setIsDeleting(true);
    await supabase.from("tasks").delete().eq("id", task.id);
    onDelete(task.id);
  };

  const handleSendComment = async (e: React.FormEvent) => {
    e.preventDefault();
    const content = commentDraft.trim();
    if (!content) return;
    setIsSendingComment(true);
    setCommentDraft("");
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from("task_comments").insert({ task_id: task.id, user_id: user?.id, content });
    setIsSendingComment(false);
    if (error) {
      console.error("Failed to post comment:", error);
      setCommentDraft(content); // restore draft so nothing is lost
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-slate-900/30 backdrop-blur-sm z-40" onClick={onClose} />

      {/* Panel */}
      <div className="fixed right-0 top-0 h-full w-full max-w-lg bg-white shadow-2xl z-50 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-3">
            <span className={`text-[11px] font-bold uppercase px-2.5 py-1 rounded-full ${PRIORITY_STYLES[priority]}`}>{priority}</span>
          </div>
          <div className="flex items-center gap-2">
            {isDirty && (
              <button onClick={handleSave} disabled={isSaving}
                className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-all">
                {isSaving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
                Save
              </button>
            )}
            <button onClick={handleDelete} disabled={isDeleting} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
              {isDeleting ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
            </button>
            <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* Task fields */}
          <div className="p-6 space-y-5 border-b border-slate-100">
            {/* Title */}
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Title</label>
              <input value={title} onChange={(e) => { setTitle(e.target.value); markDirty(); }}
                className="w-full text-lg font-bold text-slate-900 bg-transparent border-0 border-b-2 border-transparent focus:border-indigo-400 focus:outline-none transition-colors pb-1" />
            </div>

            {/* Description */}
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Description</label>
              <textarea value={description} onChange={(e) => { setDescription(e.target.value); markDirty(); }} rows={3} placeholder="Add a description..."
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all resize-none" />
            </div>

            {/* Priority + Due date */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1 mb-1.5"><Flag size={10} /> Priority</label>
                <select value={priority} onChange={(e) => { setPriority(e.target.value); markDirty(); }}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20">
                  {PRIORITY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1 mb-1.5"><Calendar size={10} /> Due Date</label>
                <input type="date" value={dueDate} onChange={(e) => { setDueDate(e.target.value); markDirty(); }}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20" />
              </div>
            </div>

            {/* Assignee */}
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1 mb-1.5"><User size={10} /> Assignee</label>
              <select value={assignedTo} onChange={(e) => { setAssignedTo(e.target.value); markDirty(); }}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20">
                <option value="">Unassigned</option>
                {members.map((m) => (
                  <option key={m.user_id} value={m.user_id}>{m.profiles?.display_name ?? m.user_id}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Comments */}
          <div className="p-6 space-y-4">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Comments ({comments.length})
            </h3>

            <div className="space-y-4 max-h-64 overflow-y-auto pr-1">
              {comments.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-4">No comments yet. Start the conversation.</p>
              ) : (
                comments.map((c) => (
                  <div key={c.id} className="flex gap-3">
                    <div className="h-7 w-7 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs font-bold shrink-0">
                      {c.profiles?.display_name?.charAt(0)?.toUpperCase() ?? "?"}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-baseline gap-2 mb-1">
                        <span className="text-xs font-semibold text-slate-800">{c.profiles?.display_name ?? "Unknown"}</span>
                        <span className="text-[10px] text-slate-400">
                          {c.created_at ? formatCommentTime(c.created_at) : ""}
                        </span>
                      </div>
                      <p className="text-sm text-slate-700 bg-slate-50 px-3 py-2 rounded-xl">{c.content}</p>
                    </div>
                  </div>
                ))
              )}
              <div ref={commentsBottomRef} />
            </div>

            <form onSubmit={handleSendComment} className="flex gap-2">
              <input value={commentDraft} onChange={(e) => setCommentDraft(e.target.value)} placeholder="Add a comment..."
                className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all" />
              <button type="submit" disabled={isSendingComment || !commentDraft.trim()}
                className="p-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white rounded-xl transition-all">
                <Send size={16} />
              </button>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}