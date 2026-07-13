"use client";

import React, { useEffect, useRef, useState } from "react";
import { Search, Kanban, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

interface WorkspaceResult {
  id: string;
  name: string;
}

export default function WorkspaceSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<WorkspaceResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const router = useRouter();

  // Close the dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Debounced search as the user types
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }
    setIsLoading(true);
    const timeout = setTimeout(async () => {
      const { data } = await supabase
        .from("workspaces")
        .select("id, name")
        .ilike("name", `%${query.trim()}%`)
        .limit(6);
      setResults(data || []);
      setIsLoading(false);
    }, 250);

    return () => clearTimeout(timeout);
  }, [query]);

  const handleSelect = (workspaceId: string) => {
    setIsOpen(false);
    setQuery("");
    router.push(`/dashboard/${workspaceId}/board`);
  };

  return (
    <div className="relative hidden sm:block" ref={containerRef}>
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
      <input
        type="text"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setIsOpen(true);
        }}
        onFocus={() => setIsOpen(true)}
        placeholder="Search workspaces..."
        className="pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 w-64 focus:bg-white focus:border-indigo-400 transition-all"
      />

      {isOpen && query.trim() && (
        <div className="absolute left-0 top-11 w-72 bg-white border border-slate-100 rounded-xl shadow-xl z-50 overflow-hidden">
          {isLoading ? (
            <div className="p-4 flex items-center justify-center text-slate-400">
              <Loader2 size={16} className="animate-spin" />
            </div>
          ) : results.length === 0 ? (
            <p className="p-4 text-xs text-slate-400 text-center">No workspaces found.</p>
          ) : (
            results.map((ws) => (
              <button
                key={ws.id}
                onClick={() => handleSelect(ws.id)}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-slate-50 transition-colors"
              >
                <div className="h-7 w-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                  <Kanban size={14} />
                </div>
                <span className="text-sm font-medium text-slate-700 truncate">{ws.name}</span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
