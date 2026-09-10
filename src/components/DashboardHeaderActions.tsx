"use client";

import React, { useState, useEffect } from "react";
import { Plus } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import NewWorkspaceModal from "./NewWorkspaceModal";


interface Props {
  userName: string | undefined;
  userId: string;
}

export default function DashboardHeaderActions({ userName, userId: initialUserId }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeUserId, setActiveUserId] = useState<string>(initialUserId);

  // Double-check the live authenticated session user on mount/interaction
  useEffect(() => {
    const syncUser = async () => {
      if (!activeUserId) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) setActiveUserId(user.id);
      }
    };
    syncUser();
  }, [activeUserId]);

  return (
    <>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            {userName ? `Welcome back, ${userName}! ` : "Welcome back! "}
          </h1>
          <p className="text-slate-500 text-sm">Here's what's happening across your workspaces today.</p>
        </div>
        <button 
          onClick={() => setIsOpen(true)}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl font-semibold transition-all shadow-lg shadow-indigo-200 w-fit"
        >
          <Plus size={18} />
          New Workspace
        </button>
      </div>

      <NewWorkspaceModal 
        isOpen={isOpen} 
        onClose={() => setIsOpen(false)} 
        userId={activeUserId} 
      />
    </>
  );
}