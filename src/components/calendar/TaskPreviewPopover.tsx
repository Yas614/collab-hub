"use client";

import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { X, Calendar, User, Flag, ArrowUpRight } from "lucide-react";

interface TaskPreview {
  id: string;
  title: string;
  description: string | null;
  priority: string | null;
  due_date: string | null;
  start_date: string | null;
  workspace_id: string;
  workspaceName: string | null;
  statusTitle: string | null;
  assignee: { display_name: string; avatar_url: string | null } | null;
}

const PRIORITY_STYLES: Record<string, string> = {
  urgent: "bg-red-50 text-red-700 border-red-200",
  high: "bg-orange-50 text-orange-700 border-orange-200",
  medium: "bg-blue-50 text-blue-700 border-blue-200",
  low: "bg-slate-50 text-slate-600 border-slate-200",
};

function formatDate(d: string | null) {
  if (!d) return null;
  try {
    return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(
      new Date(d)
    );
  } catch {
    return null;
  }
}

export default function TaskPreviewPopover({
  task,
  className,
  style,
  variant = "modal",
  children,
}: {
  task: TaskPreview;
  className?: string;
  style?: React.CSSProperties;
  variant?: "modal" | "anchored";
  children: React.ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLDivElement>(null);
  const [anchorRect, setAnchorRect] = useState<{ top: number; left: number; width: number; openUp: boolean } | null>(null);

  const [isMounted, setIsMounted] = useState(false);

  const openAnchored = () => {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const cardWidth = 320;
    const viewportW = window.innerWidth;
    const viewportH = window.innerHeight;
    const openUp = rect.bottom + 280 > viewportH; // flip above if not enough room below
    let left = rect.left;
    if (left + cardWidth > viewportW - 12) left = viewportW - cardWidth - 12;
    if (left < 12) left = 12;
    setAnchorRect({ top: openUp ? rect.top : rect.bottom, left, width: cardWidth, openUp });
    setIsOpen(true);
  };

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!isOpen || variant !== "anchored") return;
    const onOutside = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest("[data-task-preview-card]") && !(e.target as HTMLElement).closest("[data-task-preview-trigger]")) {
        setIsOpen(false);
      }
    };
    const onScroll = () => setIsOpen(false);
    document.addEventListener("mousedown", onOutside);
    window.addEventListener("scroll", onScroll, true);
    return () => {
      document.removeEventListener("mousedown", onOutside);
      window.removeEventListener("scroll", onScroll, true);
    };
  }, [isOpen, variant]);

  const cardBody = (
    <>
      <div className="flex items-start justify-between p-5 border-b border-slate-100">
        <div className="space-y-1.5 pr-4">
          {task.priority && (
            <span
              className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full border ${
                PRIORITY_STYLES[task.priority] ?? PRIORITY_STYLES.low
              }`}
            >
              <Flag size={10} /> {task.priority}
            </span>
          )}
          <h3 className="text-base font-bold text-slate-900 leading-snug">{task.title}</h3>
          {task.workspaceName && (
            <p className="text-xs text-slate-400 font-semibold">{task.workspaceName}</p>
          )}
        </div>
        <button
          onClick={() => setIsOpen(false)}
          className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg shrink-0"
        >
          <X size={18} />
        </button>
      </div>

      <div className="p-5 space-y-4">
        {task.description && (
          <p className="text-sm text-slate-600 leading-relaxed">{task.description}</p>
        )}

        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5 text-slate-500">
            <User size={14} />
            <span>{task.assignee?.display_name ?? "Unassigned"}</span>
          </div>
          {task.statusTitle && (
            <span className="px-2 py-1 bg-slate-100 rounded-lg font-semibold text-slate-500">
              {task.statusTitle}
            </span>
          )}
        </div>

        {(task.start_date || task.due_date) && (
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <Calendar size={14} />
            <span>
              {task.start_date ? `${formatDate(task.start_date)} → ` : ""}
              {formatDate(task.due_date)}
            </span>
          </div>
        )}

        <Link
          href={`/dashboard/${task.workspace_id}/board`}
          className="flex items-center justify-center gap-1.5 w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl transition-all"
        >
          Open in board <ArrowUpRight size={15} />
        </Link>
      </div>
    </>
  );

  const popoverContent = (
    <>
      {isOpen && variant === "modal" && (
        <>
          <div className="fixed inset-0 bg-slate-900/30 backdrop-blur-sm z-40" onClick={() => setIsOpen(false)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="w-full max-w-sm bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden">
              {cardBody}
            </div>
          </div>
        </>
      )}

      {isOpen && variant === "anchored" && anchorRect && (
        <div
          data-task-preview-card
          className="fixed z-50 bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden"
          style={{
            top: anchorRect.openUp ? undefined : anchorRect.top + 6,
            bottom: anchorRect.openUp ? window.innerHeight - anchorRect.top + 6 : undefined,
            left: anchorRect.left,
            width: anchorRect.width,
          }}
        >
          {cardBody}
        </div>
      )}
    </>
  );

  return (
    <>
      <div ref={triggerRef} data-task-preview-trigger className={`relative ${className ?? ""}`} style={style}>
        <button
          type="button"
          onClick={() => (variant === "anchored" ? openAnchored() : setIsOpen(true))}
          className="absolute inset-0 w-full h-full text-left"
        >
          {children}
        </button>
      </div>

      {isMounted && createPortal(popoverContent, document.body)}
    </>
  );
}
