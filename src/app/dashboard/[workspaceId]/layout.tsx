
import WorkspaceSidebarClient from "@/components/WorkspaceSidebarClient"; // Use the shared dashboard components directory
import React from 'react';
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";

interface WorkspaceLayoutProps {
  children: React.ReactNode;
  params: Promise<Record<string, string | string[] | undefined>>;
}

export default async function WorkspaceLayout({ children, params }: WorkspaceLayoutProps) {
  const resolvedParams = await params;
  
  const workspaceId = typeof resolvedParams?.workspaceId === 'string' 
    ? resolvedParams.workspaceId 
    : '';

  if (!workspaceId) {
    notFound();
  }

  const supabase = await createClient();

  // Fetch current workspace details - untouched logic
  const { data: workspace } = await supabase
    .from("workspaces")
    .select("name")
    .eq("id", workspaceId)
    .single();

  if (!workspace) {
    notFound();
  }

  return (
    // Replaced gap-4 with md:gap-4 and p-4 with p-0 md:p-4 for edge-to-edge mobile feel
    <div className="flex flex-col md:flex-row h-screen w-full md:gap-4 p-0 md:p-4 overflow-hidden bg-slate-50/45">
      
      {/* 
        Pass workspace info into the client sidebar wrapper.
        The client component will handle both the desktop view and the absolute mobile drawer overlay.
      */}
      <WorkspaceSidebarClient workspaceId={workspaceId} workspaceName={workspace.name} />

      {/* Primary Context Workspace Canvas */}
      <main className="flex-1 overflow-hidden bg-white md:border md:border-slate-200/80 md:rounded-2xl md:shadow-sm h-full flex flex-col relative">
        {children}
      </main>
      
    </div>
  );
}