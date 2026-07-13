"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { Send, User } from "lucide-react";
import { supabase } from "@/lib/supabase/client";

interface Profile {
  display_name: string | null;
  avatar_url: string | null;
}

interface Message {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  profiles?: Profile | null;
}

interface ChatRoomProps {
  workspaceId: string;
  currentUserId: string;
  initialMessages: Message[];
}

export default function ChatRoom({ workspaceId, currentUserId, initialMessages }: ChatRoomProps) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [draft, setDraft] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [profileMap, setProfileMap] = useState<Record<string, Profile>>({});
  const bottomRef = useRef<HTMLDivElement | null>(null);

  // Build a lookup of user_id -> profile once, so realtime inserts (which
  // don't carry joined profile data) can still render a name/avatar.
  useEffect(() => {
    const loadProfiles = async () => {
      const { data } = await supabase
        .from("workspace_members")
        .select("user_id, profiles(display_name, avatar_url)")
        .eq("workspace_id", workspaceId);

      const map: Record<string, Profile> = {};
      (data || []).forEach((row: any) => {
        if (row.profiles) map[row.user_id] = row.profiles;
      });
      setProfileMap(map);
    };
    loadProfiles();
  }, [workspaceId]);

  // Subscribe to new messages in this workspace.
  useEffect(() => {
    const channel = supabase
      .channel(`messages:${workspaceId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `workspace_id=eq.${workspaceId}`,
        },
        (payload) => {
          const row = payload.new as Message;
          setMessages((prev) => {
            if (prev.some((m) => m.id === row.id)) return prev;
            return [...prev, row];
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [workspaceId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    const content = draft.trim();
    if (!content || !currentUserId) return;

    setIsSending(true);
    setDraft("");

    const { error } = await supabase.from("messages").insert({
      workspace_id: workspaceId,
      user_id: currentUserId,
      content,
    });

    setIsSending(false);
    if (error) {
      console.error("Failed to send message:", error);
      setDraft(content); // restore draft so nothing is lost
    }
    // No local append here — the realtime INSERT subscription above adds it,
    // which keeps this device and every other member's view in sync.
  };

  const enrichedMessages = useMemo(
    () =>
      messages.map((m) => ({
        ...m,
        profiles: m.profiles || profileMap[m.user_id] || null,
      })),
    [messages, profileMap]
  );

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {enrichedMessages.length === 0 && (
          <p className="text-center text-sm text-slate-400 py-10">
            No messages yet. Say hello!
          </p>
        )}

        {enrichedMessages.map((message) => {
          const isMine = message.user_id === currentUserId;
          const name = message.profiles?.display_name || "Someone";
          return (
            <div
              key={message.id}
              className={`flex items-end gap-2 ${isMine ? "flex-row-reverse" : ""}`}
            >
              <div className="h-8 w-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs font-bold shrink-0 overflow-hidden">
                {message.profiles?.avatar_url ? (
                  <img src={message.profiles.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <User size={14} />
                )}
              </div>
              <div className={`max-w-[70%] ${isMine ? "items-end" : "items-start"} flex flex-col`}>
                {!isMine && <span className="text-[11px] text-slate-400 mb-0.5 px-1">{name}</span>}
                <div
                  className={`px-4 py-2.5 rounded-2xl text-sm ${
                    isMine
                      ? "bg-indigo-600 text-white rounded-br-sm"
                      : "bg-slate-100 text-slate-800 rounded-bl-sm"
                  }`}
                >
                  {message.content}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={handleSend} className="border-t border-slate-100 p-4 flex gap-2">
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Type a message…"
          disabled={isSending}
          className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:bg-white focus:border-indigo-400 transition-all"
        />
        <button
          type="submit"
          disabled={isSending || !draft.trim()}
          className="flex items-center justify-center bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white p-2.5 rounded-xl transition-all shrink-0"
        >
          <Send size={16} />
        </button>
      </form>
    </div>
  );
}
