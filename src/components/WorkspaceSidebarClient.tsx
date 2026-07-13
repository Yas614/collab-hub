"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Kanban, MessageSquare, Users, Settings, ArrowLeft, Menu, X } from "lucide-react";

interface SidebarProps {
  workspaceId: string;
  workspaceName: string;
}

export default function WorkspaceSidebarClient({ workspaceId, workspaceName }: SidebarProps) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  const navItems = [
    { name: "Kanban Board", icon: Kanban, href: `/dashboard/${workspaceId}/board` },
    { name: "Chat Room", icon: MessageSquare, href: `/dashboard/${workspaceId}/chat` },
    { name: "Team", icon: Users, href: `/dashboard/${workspaceId}/team` },
    { name: "Settings", icon: Settings, href: `/dashboard/${workspaceId}/settings` },
  ];

  const SidebarContent = () => (
    <div className="space-y-6 flex flex-col h-full justify-between">
      <div className="space-y-6">
        {/* Back to main overview */}
        <Link 
          href="/dashboard" 
          className="flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-slate-600 transition-colors group"
          onClick={() => setIsOpen(false)}
        >
          <ArrowLeft size={14} className="group-hover:-translate-x-0.5 transition-transform" />
          Back to Dashboard
        </Link>

        <div>
          <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">Workspace Context</span>
          <h2 className="text-base font-bold text-slate-900 mt-0.5 truncate">{workspaceName}</h2>
        </div>

        {/* Dynamic Navigation list */}
        <nav className="space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link 
                key={item.href}
                href={item.href}
                onClick={() => setIsOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-150 ${
                  isActive 
                    ? "text-indigo-600 bg-indigo-50/70 shadow-sm" 
                    : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
                }`}
              >
                <item.icon size={18} className={isActive ? "text-indigo-600" : "text-slate-400"} />
                {item.name}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );

  return (
    <>
      {/* 1. Mobile Top Header Bar Row */}
      <header className="md:hidden w-full h-14 bg-white border-b border-slate-200 flex items-center justify-between px-4 shrink-0 z-20">
        <div className="flex items-center gap-3 overflow-hidden">
          <button 
            onClick={() => setIsOpen(true)}
            className="p-2 -ml-2 hover:bg-slate-50 rounded-xl text-slate-600 transition-colors"
          >
            <Menu size={20} />
          </button>
          <span className="text-sm font-bold text-slate-900 truncate">{workspaceName}</span>
        </div>
      </header>

      {/* 2. Mobile Backdrop Overlay & Slide-out Drawer */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div 
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity" 
            onClick={() => setIsOpen(false)} 
          />
          <aside className="relative flex w-64 max-w-xs flex-col bg-white p-4 shadow-2xl h-full animate-in slide-in-from-left duration-200">
            <button 
              onClick={() => setIsOpen(false)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-50"
            >
              <X size={18} />
            </button>
            <div className="mt-4 h-full">
              <SidebarContent />
            </div>
          </aside>
        </div>
      )}

      {/* 3. Static Desktop Sidebar Frame */}
      <aside className="hidden md:flex w-64 bg-white border border-slate-200/80 rounded-2xl p-4 flex-col justify-between shadow-sm shrink-0 h-full">
        <SidebarContent />
      </aside>
    </>
  );
}