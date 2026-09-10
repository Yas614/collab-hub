"use client";
import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Kanban, Settings, LogOut, Menu, X,
  Calendar,
} from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import WorkspaceSearch from "@/components/shared/WorkspaceSearch";
import NotificationBell from "@/components/shared/NotificationBell";
const sidebarItems = [
  { name: "Overview",          icon: LayoutDashboard, href: "/dashboard" },
  { name: "Workspaces",        icon: Kanban,           href: "/dashboard/workspaces" },
  { name: "Account Settings",  icon: Settings,         href: "/dashboard/settings" },
  { name: "Calendar",          icon: Calendar,         href: "/dashboard/calendar" },
];
interface UserProfile {
  display_name: string;
  avatar_url: string;
  email: string;
}
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [isSidebarOpen, setIsSidebarOpen]     = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const pathname = usePathname();
  const [profile, setProfile]         = useState<UserProfile | null>(null);
  const isInsideWorkspace =
    /^\/dashboard\/[^/]+/.test(pathname) &&
    !pathname.endsWith("/dashboard") &&
    !pathname.startsWith("/dashboard/workspaces") &&
    !pathname.startsWith("/dashboard/settings")&&
    !pathname.startsWith("/dashboard/calendar");
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
              <NotificationBell />
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