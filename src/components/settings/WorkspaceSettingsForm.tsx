"use client";

import React, { useState } from "react";
import { Loader2, AlertTriangle } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

interface Props {
  workspaceId: string;
  initialName: string;
  isOwner: boolean;
}

export default function WorkspaceSettingsForm({ workspaceId, initialName, isOwner }: Props) {
  const [name, setName] = useState(initialName);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: "error" | "success" } | null>(null);
  const router = useRouter();

  const handleRename = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !isOwner) return;
    setIsSaving(true);
    setMessage(null);

    const { error } = await supabase
      .from("workspaces")
      .update({ name: name.trim() })
      .eq("id", workspaceId);

    setIsSaving(false);
    if (error) {
      setMessage({ text: error.message, type: "error" });
    } else {
      setMessage({ text: "Workspace name updated.", type: "success" });
      router.refresh();
    }
  };

  const handleDelete = async () => {
    if (!isOwner) return;
    const confirmed = confirm(
      "This permanently deletes the workspace, its columns, tasks, messages, and membership list. This cannot be undone. Continue?"
    );
    if (!confirmed) return;

    setIsDeleting(true);
    const { error } = await supabase.from("workspaces").delete().eq("id", workspaceId);
    setIsDeleting(false);

    if (error) {
      setMessage({ text: error.message, type: "error" });
      return;
    }
    router.push("/dashboard");
  };

  return (
    <div className="space-y-6">
      <form
        onSubmit={handleRename}
        className="bg-white border border-slate-100 rounded-2xl p-5 space-y-3"
      >
        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">
          Workspace name
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            required
            disabled={!isOwner || isSaving}
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:bg-white focus:border-indigo-400 transition-all disabled:opacity-60"
          />
          {isOwner && (
            <button
              type="submit"
              disabled={isSaving || !name.trim() || name === initialName}
              className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-all shrink-0"
            >
              {isSaving && <Loader2 size={14} className="animate-spin" />}
              Save
            </button>
          )}
        </div>
        {message && (
          <p
            className={`text-xs font-medium p-2 rounded-lg ${
              message.type === "error" ? "bg-red-50 text-red-600" : "bg-emerald-50 text-emerald-700"
            }`}
          >
            {message.text}
          </p>
        )}
      </form>

      {isOwner && (
        <div className="bg-red-50/50 border border-red-100 rounded-2xl p-5 space-y-3">
          <div className="flex items-center gap-2 text-red-600">
            <AlertTriangle size={16} />
            <h3 className="text-sm font-bold">Danger Zone</h3>
          </div>
          <p className="text-xs text-slate-500">
            Deleting this workspace removes all its boards, tasks, chat history, and members permanently.
          </p>
          <button
            onClick={handleDelete}
            disabled={isDeleting}
            className="flex items-center gap-2 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-all"
          >
            {isDeleting && <Loader2 size={14} className="animate-spin" />}
            Delete Workspace
          </button>
        </div>
      )}
    </div>
  );
}
