"use client";

import React, { useState } from "react";
import { X, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

interface NewWorkspaceModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
}

export default function NewWorkspaceModal({ isOpen, onClose, userId }: NewWorkspaceModalProps) {
  const [name, setName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  if (!isOpen) return null;

  const generateSlug = (text: string) => {
    return text
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, "") 
      .replace(/[\s_]+/g, "-")  
      .replace(/^-+|-+$/g, ""); 
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      const finalUserId = user?.id || userId;

      if (!finalUserId) throw new Error("Session expired.");

      // 1. Create the unique slug
 // 1. Create the unique slug
const slug = `${name.toLowerCase().trim().replace(/[^\w\s-]/g, "").replace(/[\s_]+/g, "-")}-${Math.floor(1000 + Math.random() * 9000)}`;

// 2. Generate the id ourselves so we don't need .select() after insert
//    (RETURNING would require the SELECT policy to pass, which it can't
//    yet — the workspace_members "owner" row doesn't exist until step 2b)
const newWorkspaceId = crypto.randomUUID();

const { error: insertError } = await supabase
  .from("workspaces")
  .insert({
    id: newWorkspaceId,
    name: name.trim(),
    slug: slug,
    created_by: finalUserId,
  });

if (insertError) throw insertError;

// 2b. Now that the workspace exists, register the creator as owner
const { error: memberError } = await supabase
  .from("workspace_members")
  .insert({
    workspace_id: newWorkspaceId,
    user_id: finalUserId,
    role: "owner",
  });

if (memberError) throw memberError;

setName("");
onClose();
router.push(`/dashboard/${newWorkspaceId}/board`);

    } catch (err: any) {
      setError(err.message || "Failed to create workspace.");
    } finally {
      setIsSubmitting(false);
    }
  
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div 
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
        onClick={onClose}
      />
      
      <div className="relative bg-white w-full max-w-md p-6 rounded-2xl shadow-xl border border-slate-100 z-10">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <h3 className="font-bold text-lg text-slate-900">Create New Workspace</h3>
          <button 
            onClick={onClose}
            className="p-1.5 hover:bg-slate-50 rounded-lg text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
              Workspace Name
            </label>
            <input
              type="text"
              required
              disabled={isSubmitting}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Marketing Campaign, Engineering"
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:bg-white focus:border-indigo-400 transition-all disabled:opacity-60"
            />
          </div>

          {error && (
            <p className="text-xs font-semibold text-red-500 bg-red-50 p-2.5 rounded-lg">
              {error}
            </p>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={onClose}
              className="px-4 py-2 text-sm font-semibold text-slate-500 hover:bg-slate-50 rounded-xl transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !name.trim()}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 disabled:cursor-not-allowed text-white px-4 py-2 rounded-xl font-semibold transition-all shadow-md shadow-indigo-100"
            >
              {isSubmitting && <Loader2 size={16} className="animate-spin" />}
              {isSubmitting ? "Creating..." : "Create Workspace"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}