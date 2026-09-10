import React from "react";
import { createClient } from "@/lib/supabase/server";
import ChatRoom from "@/components/chat/ChatRoom";

interface ChatPageProps {
  params: Promise<{ workspaceId: string }>;
}

export default async function ChatPage({ params }: ChatPageProps) {
  const { workspaceId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Database tracking query remains completely untouched
  const { data: messages } = await supabase
    .from("messages")
    .select("id, content, created_at, user_id, file_url, attachment_type, profiles(display_name, avatar_url)")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: true })
    .limit(100);

  return (
    <div className="h-full flex flex-col overflow-hidden">
      
      {/* Unified Chat Sub-Header Viewport */}
      <div className="flex items-center justify-between p-4 md:p-6 border-b border-slate-100 bg-white shrink-0">
        <div>
          <h1 className="text-lg md:text-xl font-bold text-slate-900 tracking-tight">Chat Room</h1>
          <p className="text-[11px] md:text-xs text-slate-400 mt-0.5">Real-time collaboration workspace sync stream.</p>
        </div>
      </div>

      {/* Primary chat layout core viewport */}
      <div className="flex-1 min-h-0 w-full overflow-hidden relative bg-slate-50/10">
        <ChatRoom
          workspaceId={workspaceId}
          currentUserId={user?.id || ""}
          // Explicitly casting as any[] satisfies TypeScript regarding the nested profiles join layout
          initialMessages={(messages as any[]) || []}
        />
      </div>

    </div>
  );
}