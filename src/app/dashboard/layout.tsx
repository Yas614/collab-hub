"use client";
import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Kanban, Settings, Bell, LogOut, Menu, X, AlertCircle,
} from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import WorkspaceSearch from "@/components/shared/WorkspaceSearch";
const sidebarItems = [
  { name: "Overview",          icon: LayoutDashboard, href: "/dashboard" },
  { name: "Workspaces",        icon: Kanban,           href: "/dashboard/workspaces" },
  { name: "Account Settings",  icon: Settings,         href: "/dashboard/settings" },
];
interface UserProfile {
  display_name: string;
  avatar_url: string;
  email: string;
}
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [isSidebarOpen, setIsSidebarOpen]     = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const pathname = usePathname();
  const [profile, setProfile]         = useState<UserProfile | null>(null);
  const [pendingCount, setPendingCount] = useState(0);
  const isInsideWorkspace =
    /^\/dashboard\/[^/]+/.test(pathname) &&
    !pathname.endsWith("/dashboard") &&
    !pathname.startsWith("/dashboard/workspaces") &&
    !pathname.startsWith("/dashboard/settings");
  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: profileData } = await supabase
        .from("profiles")
        .select("display_name, avatar_url, email")
        .eq("id", user.id)
        .single();
      setProfile(profileData ?? {
        display_name: user.email?.split("@")[0] ?? "User",
        avatar_url: "",
        email: user.email ?? "",
      });
      // Only count tasks assigned to THIS user that aren't in a "Done" column
      const { data: memberRows } = await supabase
        .from("workspace_members")
        .select("workspace_id")
        .eq("user_id", user.id);
      const workspaceIds = (memberRows ?? []).map((r) => r.workspace_id);
      if (workspaceIds.length === 0) return;
      const { data: taskData } = await supabase
        .from("tasks")
        .select("id, column:columns(title)")
        .eq("assigned_to", user.id)
        .in("workspace_id", workspaceIds);
      const pending = (taskData ?? []).filter((t) => {
        const title = (t.column as any)?.title?.toLowerCase() ?? "";
        return title !== "done" && title !== "completed";
      }).length;
      setPendingCount(pending);
    };
    init();
  }, []);
  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/login";
  };
  const getInitials = () => {
    if (profile?.display_name) return profile.display_name.substring(0, 2).toUpperCase();
    if (profile?.email)        return profile.email.substring(0, 2).toUpperCase();
    return "??";
  };
  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans text-slate-900">
      {/* Mobile drawer */}
      {!isInsideWorkspace && isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setIsMobileMenuOpen(false)} />
          <aside className="relative flex w-64 flex-col bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-6 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="bg-indigo-600 p-2 rounded-lg text-white"><Kanban size={20} /></div>
                <span className="font-bold text-slate-800 text-lg">CollabHub</span>
              </div>
              <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 hover:bg-slate-100 rounded-lg text-slate-500"><X size={20} /></button>
            </div>
            <nav className="flex-1 space-y-1 mt-6">
              {sidebarItems.map((item) => (
                <Link key={item.name} href={item.href} onClick={() => setIsMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${pathname === item.href ? "bg-indigo-50 text-indigo-600 font-semibold" : "text-slate-500 hover:bg-slate-50"}`}>
                  <item.icon size={20} /><span>{item.name}</span>
                </Link>
              ))}
            </nav>
            <div className="pt-4 border-t border-slate-100">
              <button onClick={handleLogout} className="flex items-center gap-3 px-4 py-3 w-full rounded-xl text-slate-500 hover:bg-red-50 hover:text-red-600 transition-all font-medium">
                <LogOut size={20} /><span>Logout</span>
              </button>
            </div>
          </aside>
        </div>
      )}
      {/* Desktop sidebar */}
      {!isInsideWorkspace && (
        <aside className={`${isSidebarOpen ? "w-64" : "w-20"} hidden md:flex flex-col bg-white border-r border-slate-200 transition-all duration-300`}>
          <div className="p-6 flex items-center gap-3">
            <div className="bg-indigo-600 p-2 rounded-lg text-white shrink-0"><Kanban size={20} /></div>
            {isSidebarOpen && <span className="font-bold text-slate-800 tracking-tight text-lg">CollabHub</span>}
          </div>
          <nav className="flex-1 px-4 space-y-1 mt-4">
            {sidebarItems.map((item) => (
              <Link key={item.name} href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all group ${pathname === item.href ? "bg-indigo-50 text-indigo-600 font-semibold" : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"}`}>
                <item.icon size={20} className={pathname === item.href ? "text-indigo-600" : "text-slate-400 group-hover:text-slate-900 transition-colors"} />
                {isSidebarOpen && <span className="font-medium">{item.name}</span>}
              </Link>
            ))}
          </nav>
          <div className="p-4 border-t border-slate-100">
            <button onClick={handleLogout} className="flex items-center gap-3 px-3 py-2.5 w-full rounded-xl text-slate-500 hover:bg-red-50 hover:text-red-600 transition-all group font-medium">
              <LogOut size={20} className="text-slate-400 group-hover:text-red-500 transition-colors" />
              {isSidebarOpen && <span>Logout</span>}
            </button>
          </div>
        </aside>
      )}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {!isInsideWorkspace && (
          <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 md:px-8 z-10 shrink-0">
            <div className="flex items-center gap-4">
              <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 hidden md:block"><Menu size={20} /></button>
              <button onClick={() => setIsMobileMenuOpen(true)} className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 block md:hidden"><Menu size={20} /></button>
              <WorkspaceSearch />
            </div>
            <div className="flex items-center gap-4 relative">
              <button onClick={() => setIsNotificationOpen(!isNotificationOpen)} className="p-2 text-slate-500 hover:bg-slate-100 rounded-full relative">
                <Bell size={20} />
                {pendingCount > 0 && <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white" />}
              </button>
              {isNotificationOpen && (
                <div className="absolute right-12 top-12 w-80 bg-white border border-slate-100 rounded-2xl shadow-xl z-50 p-4 space-y-3">
                  <div className="flex justify-between items-center border-b border-slate-50 pb-2">
                    <h4 className="font-bold text-sm text-slate-800">My Assigned Tasks</h4>
                    <button onClick={() => setIsNotificationOpen(false)} className="text-xs text-indigo-600 font-semibold hover:underline">Close</button>
                  </div>
                  <div className="space-y-3 max-h-60 overflow-y-auto">
                    {pendingCount > 0 ? (
                      <div className="flex gap-3 items-start p-2 hover:bg-slate-50 rounded-xl">
                        <AlertCircle className="text-amber-500 shrink-0 mt-0.5" size={16} />
                        <p className="text-xs text-slate-600">You have <span className="font-bold text-slate-900">{pendingCount} open task{pendingCount !== 1 ? "s" : ""}</span> assigned to you.</p>
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400 text-center py-4">All caught up! No open assigned tasks.</p>
                    )}
                  </div>
                </div>
              )}
              <div className="h-8 w-8 rounded-full bg-indigo-600 flex items-center justify-center text-white font-bold text-xs overflow-hidden border border-slate-100">
                {profile?.avatar_url
                  ? <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                  : getInitials()}
              </div>
            </div>
          </header>
        )}
        <main className={`flex-1 overflow-hidden ${isInsideWorkspace ? "p-0" : "p-6 md:p-8 overflow-y-auto"}`}>
          {children}
        </main>
      </div>
    </div>
  );
}