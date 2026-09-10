"use client";

import React, { useState } from "react";
import { UserPlus, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

export default function InviteMemberForm({ workspaceId }: { workspaceId: string }) {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: "error" | "success" } | null>(null);
  const router = useRouter();

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setIsSubmitting(true);
    setMessage(null);

    try {
      const res = await fetch("/api/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), workspaceId }),
      });
      const result = await res.json();

      if (!res.ok) {
        setMessage({ text: result.error || "Failed to invite.", type: "error" });
        return;
      }

      setEmail("");
      setMessage({
        text: result.status === "invited" ? "Invite email sent!" : "Member added!",
        type: "success",
      });
      router.refresh();
    } catch (err: any) {
      setMessage({ text: err.message || "Failed to add member.", type: "error" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleInvite} className="bg-white border border-slate-100 rounded-2xl p-4 space-y-3">
      <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">
        Invite by email
      </label>
      <div className="flex gap-2">
        <input
          type="email"
          required
          disabled={isSubmitting}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="teammate@company.com"
          className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:bg-white focus:border-indigo-400 transition-all"
        />
        <button
          type="submit"
          disabled={isSubmitting || !email.trim()}
          className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-all shrink-0"
        >
          {isSubmitting ? <Loader2 size={14} className="animate-spin" /> : <UserPlus size={14} />}
          Invite
        </button>
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
  );
}
