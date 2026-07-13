"use client";

import React, { useState } from "react";
import { Plus } from "lucide-react";
import NewWorkspaceModal from "./NewWorkspaceModal";

export default function NewWorkspaceButton({ userId }: { userId: string }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl font-semibold transition-all shadow-lg shadow-indigo-200 w-fit shrink-0"
      >
        <Plus size={18} />
        New Workspace
      </button>
      <NewWorkspaceModal isOpen={isOpen} onClose={() => setIsOpen(false)} userId={userId} />
    </>
  );
}
