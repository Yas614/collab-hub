"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell, UserPlus, CheckSquare, CheckCheck } from "lucide-react";
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

function timeAgo(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

const ICONS: Record<string, React.ElementType> = {
  task_assigned: CheckSquare,
  workspace_added: UserPlus,
};

export default function NotificationBell() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    let isMounted = true;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !isMounted) return;

      const { data } = await supabase
        .from("notifications")
        .select("id, type, title, body, link, is_read, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(8);
      if (!isMounted) return;
      setNotifications(data ?? []);
      setUnreadCount((data ?? []).filter((n) => !n.is_read).length);

      // React (Strict Mode in dev, or fast refresh) can mount this effect
      // twice; if a channel with this same topic is still around from a
      // prior mount and already subscribed, calling .on() on it again
      // throws. Clear out any stale channel with the same topic first.
      const topic = `notifications:${user.id}`;
      const stale = supabase.getChannels().find((c) => c.topic === `realtime:${topic}`);
      if (stale) await supabase.removeChannel(stale);
      if (!isMounted) return;

      // Live badge: bump the count the moment a trigger inserts a new
      // notification (task assigned to you, added to a workspace), without
      // needing a page refresh.
      channel = supabase
        .channel(topic)
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
          (payload) => {
            const n = payload.new as Notification;
            setNotifications((prev) => [n, ...prev].slice(0, 8));
            setUnreadCount((prev) => prev + 1);
          }
        )
        .subscribe();
    };
    init();

    return () => {
      isMounted = false;
      if (channel) supabase.removeChannel(channel);
    };
  }, []);

  const markRead = async (ids: string[]) => {
    if (ids.length === 0) return;
    setNotifications((prev) => prev.map((n) => (ids.includes(n.id) ? { ...n, is_read: true } : n)));
    setUnreadCount((prev) => Math.max(0, prev - ids.length));
    await supabase.from("notifications").update({ is_read: true }).in("id", ids);
  };

  const handleClickNotification = async (n: Notification) => {
    if (!n.is_read) await markRead([n.id]);
    setIsOpen(false);
    if (n.link) router.push(n.link);
  };

  const handleMarkAllRead = async () => {
    const unreadIds = notifications.filter((n) => !n.is_read).map((n) => n.id);
    await markRead(unreadIds);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen((v) => !v)}
        className="p-2 text-slate-500 hover:bg-slate-100 rounded-full relative"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 flex items-center justify-center bg-red-500 text-white text-[9px] font-bold rounded-full border-2 border-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 top-12 w-80 bg-white border border-slate-100 rounded-2xl shadow-xl z-50 overflow-hidden">
            <div className="flex justify-between items-center border-b border-slate-50 px-4 py-3">
              <h4 className="font-bold text-sm text-slate-800">Notifications</h4>
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  className="flex items-center gap-1 text-[11px] text-indigo-600 font-semibold hover:underline"
                >
                  <CheckCheck size={12} /> Mark all read
                </button>
              )}
            </div>

            <div className="max-h-80 overflow-y-auto">
              {notifications.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-8">You're all caught up.</p>
              ) : (
                notifications.map((n) => {
                  const Icon = ICONS[n.type] ?? Bell;
                  return (
                    <button
                      key={n.id}
                      onClick={() => handleClickNotification(n)}
                      className={`w-full flex gap-3 items-start p-3 text-left hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-0 ${
                        !n.is_read ? "bg-indigo-50/40" : ""
                      }`}
                    >
                      <div className={`p-1.5 rounded-lg shrink-0 ${!n.is_read ? "bg-indigo-100 text-indigo-600" : "bg-slate-100 text-slate-400"}`}>
                        <Icon size={14} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className={`text-xs leading-snug ${!n.is_read ? "font-bold text-slate-900" : "font-medium text-slate-500"}`}>
                          {n.title}
                        </p>
                        {n.body && <p className="text-[11px] text-slate-400 truncate mt-0.5">{n.body}</p>}
                        <p className="text-[10px] text-slate-300 font-semibold mt-1">{timeAgo(n.created_at)}</p>
                      </div>
                      {!n.is_read && <div className="h-2 w-2 rounded-full bg-indigo-500 shrink-0 mt-1.5" />}
                    </button>
                  );
                })
              )}
            </div>

            <Link
              href="/dashboard/notifications"
              onClick={() => setIsOpen(false)}
              className="block text-center py-2.5 text-xs font-bold text-indigo-600 hover:bg-indigo-50 border-t border-slate-50"
            >
              See all
            </Link>
          </div>
        </>
      )}
    </div>
  );
}