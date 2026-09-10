"use client";

import React, { useEffect, useRef, useState } from "react";
import { Send, User, Paperclip, Mic, X, Loader2, FileIcon, Square } from "lucide-react";
import { supabase } from "@/lib/supabase/client";

interface Message {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  file_url?: string;
  attachment_type?: "image" | "audio" | "file"; // Safe mapping key
  profiles?: { display_name: string | null; avatar_url: string | null } | null;
}

export default function ChatRoom({ workspaceId, currentUserId, initialMessages }: any) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [draft, setDraft] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  
  // Voice Recording State
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const channel = supabase.channel(`room:${workspaceId}`)
      .on("postgres_changes", { 
        event: "INSERT", 
        schema: "public", 
        table: "messages", 
        filter: `workspace_id=eq.${workspaceId}` 
      }, 
      async (payload) => {
        const { data: profile } = await supabase
          .from("profiles")
          .select("display_name, avatar_url")
          .eq("id", payload.new.user_id)
          .single();

        const newMessage = { 
          ...payload.new, 
          // Map database structure safely back to component layout models
          attachment_type: payload.new.attachment_type, 
          profiles: profile 
        } as Message;

        setMessages((prev) => [...prev, newMessage]);
      }).subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [workspaceId]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  // --- FILE UPLOAD HANDLER ---
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const filePath = `${workspaceId}/${Date.now()}.${fileExt}`;
      const detectedType = file.type.startsWith('image/') ? 'image' : 'file';

      const { data, error: uploadError } = await supabase.storage
        .from('workspace-assets')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      if (data) {
        const { data: { publicUrl } } = supabase.storage.from('workspace-assets').getPublicUrl(filePath);
        await sendMessage("", publicUrl, detectedType);
      }
    } catch (err) {
      console.error("File upload transaction aborted:", err);
    } finally {
      setIsUploading(false);
    }
  };

  // --- VOICE RECORDING LOGIC ---
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorder.current = new MediaRecorder(stream);
      const chunks: BlobPart[] = [];
      
      mediaRecorder.current.ondataavailable = (e) => chunks.push(e.data);
      mediaRecorder.current.onstop = () => {
        setAudioBlob(new Blob(chunks, { type: 'audio/ogg; codecs=opus' }));
      };
      
      mediaRecorder.current.start();
      setIsRecording(true);
    } catch (err) {
      console.error("Microphone device permissions denied:", err);
    }
  };

  const stopRecording = () => {
    if (mediaRecorder.current && isRecording) {
      mediaRecorder.current.stop();
      setIsRecording(false);
    }
  };

  const sendVoiceNote = async () => {
    if (!audioBlob) return;
    setIsUploading(true);
    try {
      const filePath = `${workspaceId}/voice-${Date.now()}.ogg`;
      const { data, error: uploadError } = await supabase.storage
        .from('workspace-assets')
        .upload(filePath, audioBlob);
      
      if (uploadError) throw uploadError;

      if (data) {
        const { data: { publicUrl } } = supabase.storage.from('workspace-assets').getPublicUrl(filePath);
        await sendMessage("Voice message", publicUrl, "audio");
      }
      setAudioBlob(null);
    } catch (err) {
      console.error("Voice note delivery transmission crash:", err);
    } finally {
      setIsUploading(false);
    }
  };

  const sendMessage = async (content: string, fileUrl?: string, attachmentType?: "image" | "audio" | "file") => {
    const { error } = await supabase.from("messages").insert({
      workspace_id: workspaceId,
      user_id: currentUserId,
      content,
      file_url: fileUrl || null,
      attachment_type: attachmentType || null // Avoids SQL syntax crashes
    });

    if (error) {
      console.error("Database delivery payload rejection error:", error.message);
    } else {
      setDraft("");
    }
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {messages.map((m) => {
          const isMine = m.user_id === currentUserId;
          return (
            <div key={m.id} className={`flex gap-3 ${isMine ? "flex-row-reverse" : ""}`}>
              <div className="h-8 w-8 rounded-full bg-slate-100 shrink-0 overflow-hidden border border-slate-200 flex">
                {m.profiles?.avatar_url ? (
                  <img src={m.profiles.avatar_url} className="w-full h-full object-cover" alt="avatar" />
                ) : (
                  <User size={14} className="m-auto text-slate-400" />
                )}
              </div>
              
              <div className={`flex flex-col max-w-[75%] ${isMine ? "items-end" : "items-start"}`}>
                <span className="text-[10px] font-bold text-slate-400 mb-1 px-1 uppercase tracking-widest">
                  {m.profiles?.display_name || "Member"}
                </span>

                <div className={`p-3 rounded-2xl text-sm shadow-sm ${
                  isMine ? "bg-indigo-600 text-white rounded-tr-none" : "bg-slate-50 text-slate-800 rounded-tl-none"
                }`}>
                  {m.attachment_type === 'image' && m.file_url && (
                    <img src={m.file_url} alt="Shared attachment" className="rounded-lg mb-2 max-w-full border border-black/5 cursor-zoom-in" />
                  )}
                  
                  {m.attachment_type === 'audio' && m.file_url && (
                    <audio src={m.file_url} controls className="h-8 mb-1 w-48 brightness-95 contrast-125" />
                  )}

                  {m.attachment_type === 'file' && m.file_url && (
                    <a href={m.file_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 p-2 bg-black/5 rounded-lg mb-1 hover:bg-black/10 transition-colors">
                      <FileIcon size={16} />
                      <span className="text-xs font-medium truncate max-w-[150px]">View Attachment</span>
                    </a>
                  )}

                  {m.content && <p className="leading-relaxed">{m.content}</p>}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* --- ACTION FOOTER --- */}
      <div className="p-4 bg-slate-50/50 border-t border-slate-100">
        {audioBlob && (
          <div className="flex items-center justify-between bg-indigo-50 p-3 rounded-xl mb-3 border border-indigo-100">
            <div className="flex items-center gap-2 text-indigo-600 text-xs font-bold">
              <Mic size={14} /> Voice note recorded
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={() => setAudioBlob(null)} className="p-1.5 hover:bg-white rounded-lg text-slate-400">
                <X size={16}/>
              </button>
              <button type="button" onClick={sendVoiceNote} disabled={isUploading} className="bg-indigo-600 text-white px-3 py-1 rounded-lg text-xs font-bold disabled:opacity-50">
                {isUploading ? "Uploading..." : "Send"}
              </button>
            </div>
          </div>
        )}

        <form onSubmit={(e) => { e.preventDefault(); if (draft.trim()) sendMessage(draft); }} className="flex items-center gap-2">
          <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" />
          
          <button type="button" onClick={() => fileInputRef.current?.click()} disabled={isUploading} className="p-2.5 text-slate-400 hover:text-indigo-600 hover:bg-white rounded-xl transition-all">
            {isUploading ? <Loader2 size={20} className="animate-spin" /> : <Paperclip size={20} />}
          </button>

          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Write a message..."
            className="flex-1 bg-white border border-slate-200 rounded-2xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-400 transition-all"
          />

          {draft.trim() ? (
            <button type="submit" className="bg-indigo-600 text-white p-2.5 rounded-xl shadow-lg shadow-indigo-100 hover:scale-105 active:scale-95 transition-all">
              <Send size={20} />
            </button>
          ) : (
            <button 
              type="button" 
              onMouseDown={startRecording} 
              onMouseUp={stopRecording}
              className={`p-2.5 rounded-xl transition-all ${isRecording ? "bg-red-500 text-white animate-pulse" : "bg-slate-100 text-slate-400 hover:text-indigo-600"}`}
            >
              {isRecording ? <Square size={20} /> : <Mic size={20} />}
            </button>
          )}
        </form>
      </div>
    </div>
  );
}