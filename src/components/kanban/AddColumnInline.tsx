"use client";

import React, { useState } from "react";
import { Plus, X, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export default function AddColumnInline({
  workspaceId,
  nextPosition,
}: {
  workspaceId: string;
  nextPosition: number;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setIsSubmitting(true);
    try {
      const { error } = await supabase.from("columns").insert({
        workspace_id: workspaceId,
        title: title.trim(),
        position: nextPosition,
      });

      if (error) throw error;

      setTitle("");
      setIsEditing(false);
      router.refresh();
    } catch (err) {
      console.error("Error creating column:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isEditing) {
    return (
      <button
        onClick={() => setIsEditing(true)}
        className="flex items-center gap-1.5 bg-slate-900 text-white text-xs font-semibold px-3 py-2 rounded-xl hover:bg-slate-800 transition-all shadow-sm shrink-0"
      >
        <Plus size={14} />
        Add Column
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2 shrink-0">
      <input
        type="text"
        autoFocus
        required
        disabled={isSubmitting}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Column name..."
        className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs w-40 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all"
      />
      <button
        type="submit"
        disabled={isSubmitting || !title.trim()}
        className="flex items-center gap-1 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white text-xs font-semibold px-3 py-2 rounded-xl transition-all"
      >
        {isSubmitting && <Loader2 size={12} className="animate-spin" />}
        Add
      </button>
      <button
        type="button"
        disabled={isSubmitting}
        onClick={() => setIsEditing(false)}
        className="p-2 hover:bg-slate-100 text-slate-400 hover:text-slate-600 rounded-xl transition-colors"
      >
        <X size={14} />
      </button>
    </form>
  );
}
