"use client";

import React, { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { UserPlus, CheckSquare, Bell, CheckCheck } from "lucide-react";
import { supabase } from "@/lib/supabase/client";

interface Notification {
  id: string;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  is_read: boolean;
  created_at: string;
}

const ICONS: Record<string, React.ElementType> = {
  task_assigned: CheckSquare,
  workspace_added: UserPlus,
};

const ICON_COLORS: Record<string, string> = {
  task_assigned: "bg-indigo-100 text-indigo-600",
  workspace_added: "bg-emerald-100 text-emerald-600",
};

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

function dateGroup(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diffDays = Math.round((startOfDay(now).getTime() - startOfDay(date).getTime()) / 86400000);

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return "This week";
  return "Earlier";
}

export default function NotificationsList({ initialNotifications }: { initialNotifications: Notification[] }) {
  const router = useRouter();
  const [notifications, setNotifications] = useState(initialNotifications);
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const markRead = async (ids: string[]) => {
    if (ids.length === 0) return;
    setNotifications((prev) => prev.map((n) => (ids.includes(n.id) ? { ...n, is_read: true } : n)));
    await supabase.from("notifications").update({ is_read: true }).in("id", ids);
  };

  const handleClick = async (n: Notification) => {
    if (!n.is_read) await markRead([n.id]);
    if (n.link) router.push(n.link);
  };

  const visible = filter === "unread" ? notifications.filter((n) => !n.is_read) : notifications;

  const grouped = useMemo(() => {
    const groups = new Map<string, Notification[]>();
    visible.forEach((n) => {
      const key = dateGroup(n.created_at);
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(n);
    });
    return groups;
  }, [visible]);

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div className="flex gap-1 bg-slate-100 p-1 rounded-xl">
          {(["all", "unread"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold capitalize transition-all ${
                filter === f ? "bg-white text-indigo-600 shadow-sm" : "text-slate-400 hover:text-slate-600"
              }`}
            >
              {f} {f === "unread" && unreadCount > 0 ? `(${unreadCount})` : ""}
            </button>
          ))}
        </div>

        {unreadCount > 0 && (
          <button
            onClick={() => markRead(notifications.filter((n) => !n.is_read).map((n) => n.id))}
            className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:underline"
          >
            <CheckCheck size={14} /> Mark all read
          </button>
        )}
      </div>

      {visible.length === 0 ? (
        <div className="flex flex-col items-center justify-center text-center gap-2 py-20">
          <Bell size={32} className="text-slate-300" />
          <p className="text-sm font-bold text-slate-400">
            {filter === "unread" ? "You're all caught up." : "Nothing here yet."}
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {Array.from(grouped.entries()).map(([label, items]) => (
            <div key={label}>
              <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">{label}</h2>
              <div className="space-y-2">
                {items.map((n) => {
                  const Icon = ICONS[n.type] ?? Bell;
                  return (
                    <button
                      key={n.id}
                      onClick={() => handleClick(n)}
                      className={`w-full flex gap-3 items-start p-4 rounded-2xl border text-left transition-all hover:shadow-sm ${
                        !n.is_read ? "bg-indigo-50/50 border-indigo-100 hover:bg-indigo-50" : "bg-white border-slate-100 hover:bg-slate-50"
                      }`}
                    >
                      <div className={`p-2 rounded-xl shrink-0 ${!n.is_read ? ICON_COLORS[n.type] ?? "bg-indigo-100 text-indigo-600" : "bg-slate-100 text-slate-400"}`}>
                        <Icon size={16} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className={`text-sm leading-snug ${!n.is_read ? "font-bold text-slate-900" : "font-semibold text-slate-500"}`}>
                          {n.title}
                        </p>
                        {n.body && <p className="text-xs text-slate-400 mt-0.5 truncate">{n.body}</p>}
                      </div>
                      <span className="text-[11px] text-slate-300 font-semibold shrink-0 mt-0.5">{formatTime(n.created_at)}</span>
                      {!n.is_read && <div className="h-2 w-2 rounded-full bg-indigo-500 shrink-0 mt-1.5" />}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}