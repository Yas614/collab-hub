"use client";

import React, { useState } from "react";
import { X } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export default function RemoveMemberButton({ memberId }: { memberId: string }) {
  const [isRemoving, setIsRemoving] = useState(false);
  const router = useRouter();

  const handleRemove = async () => {
    if (!confirm("Remove this member from the workspace?")) return;
    setIsRemoving(true);
    const { error } = await supabase.from("workspace_members").delete().eq("id", memberId);
    setIsRemoving(false);
    if (error) {
      alert(error.message);
      return;
    }
    router.refresh();
  };

  return (
    <button
      onClick={handleRemove}
      disabled={isRemoving}
      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
      title="Remove member"
    >
      <X size={14} />
    </button>
  );
}
