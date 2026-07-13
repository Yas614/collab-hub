"use client";

import React, { useState } from "react";
import { Loader2, User, Lock } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

interface Props {
  initialDisplayName: string;
  initialAvatarUrl: string;
  email: string;
}

export default function AccountSettingsForm({ initialDisplayName, initialAvatarUrl, email }: Props) {
  const [displayName, setDisplayName] = useState(initialDisplayName);
  const [avatarUrl, setAvatarUrl] = useState(initialAvatarUrl);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const [profileMessage, setProfileMessage] = useState<{ text: string; type: "error" | "success" } | null>(null);
  const [passwordMessage, setPasswordMessage] = useState<{ text: string; type: "error" | "success" } | null>(null);
  const router = useRouter();

  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingProfile(true);
    setProfileMessage(null);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setIsSavingProfile(false);
      setProfileMessage({ text: "Session expired, please log in again.", type: "error" });
      return;
    }

    const { error } = await supabase
      .from("profiles")
      .update({ display_name: displayName.trim(), avatar_url: avatarUrl.trim() || null })
      .eq("id", user.id);

    setIsSavingProfile(false);
    if (error) {
      setProfileMessage({ text: error.message, type: "error" });
    } else {
      setProfileMessage({ text: "Profile updated.", type: "success" });
      router.refresh();
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordMessage(null);

    if (newPassword !== confirmPassword) {
      setPasswordMessage({ text: "Passwords do not match.", type: "error" });
      return;
    }
    if (newPassword.length < 6) {
      setPasswordMessage({ text: "Password must be at least 6 characters.", type: "error" });
      return;
    }

    setIsSavingPassword(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setIsSavingPassword(false);

    if (error) {
      setPasswordMessage({ text: error.message, type: "error" });
    } else {
      setNewPassword("");
      setConfirmPassword("");
      setPasswordMessage({ text: "Password updated.", type: "success" });
    }
  };

  return (
    <div className="space-y-6">
      {/* Profile card */}
      <form onSubmit={handleProfileSave} className="bg-white border border-slate-100 rounded-2xl p-5 space-y-4">
        <div className="flex items-center gap-2 text-slate-700">
          <User size={16} />
          <h3 className="text-sm font-bold">Profile</h3>
        </div>

        <div>
          <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Email</label>
          <input
            type="email"
            value={email}
            disabled
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-400 cursor-not-allowed"
          />
        </div>

        <div>
          <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Display name</label>
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            disabled={isSavingProfile}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:bg-white focus:border-indigo-400 transition-all disabled:opacity-60"
          />
        </div>

        <div>
          <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Avatar URL</label>
          <input
            type="url"
            value={avatarUrl}
            onChange={(e) => setAvatarUrl(e.target.value)}
            disabled={isSavingProfile}
            placeholder="https://…"
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:bg-white focus:border-indigo-400 transition-all disabled:opacity-60"
          />
        </div>

        {profileMessage && (
          <p
            className={`text-xs font-medium p-2 rounded-lg ${
              profileMessage.type === "error" ? "bg-red-50 text-red-600" : "bg-emerald-50 text-emerald-700"
            }`}
          >
            {profileMessage.text}
          </p>
        )}

        <button
          type="submit"
          disabled={isSavingProfile}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-all"
        >
          {isSavingProfile && <Loader2 size={14} className="animate-spin" />}
          Save Profile
        </button>
      </form>

      {/* Password card */}
      <form onSubmit={handlePasswordChange} className="bg-white border border-slate-100 rounded-2xl p-5 space-y-4">
        <div className="flex items-center gap-2 text-slate-700">
          <Lock size={16} />
          <h3 className="text-sm font-bold">Change Password</h3>
        </div>

        <div>
          <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1.5">New password</label>
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            disabled={isSavingPassword}
            placeholder="••••••••••••"
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:bg-white focus:border-indigo-400 transition-all disabled:opacity-60"
          />
        </div>

        <div>
          <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Confirm new password</label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            disabled={isSavingPassword}
            placeholder="••••••••••••"
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:bg-white focus:border-indigo-400 transition-all disabled:opacity-60"
          />
        </div>

        {passwordMessage && (
          <p
            className={`text-xs font-medium p-2 rounded-lg ${
              passwordMessage.type === "error" ? "bg-red-50 text-red-600" : "bg-emerald-50 text-emerald-700"
            }`}
          >
            {passwordMessage.text}
          </p>
        )}

        <button
          type="submit"
          disabled={isSavingPassword || !newPassword || !confirmPassword}
          className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-all"
        >
          {isSavingPassword && <Loader2 size={14} className="animate-spin" />}
          Update Password
        </button>
      </form>
    </div>
  );
}
