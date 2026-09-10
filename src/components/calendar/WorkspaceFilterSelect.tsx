"use client";

import { useRouter } from "next/navigation";

interface Props {
  workspaces: { id: string; name: string }[];
  activeWorkspaceFilter: string;
  currentView: string;
  anchorISO: string;
}

export default function WorkspaceFilterSelect({
  workspaces,
  activeWorkspaceFilter,
  currentView,
  anchorISO,
}: Props) {
  const router = useRouter();

  return (
    <select
      defaultValue={activeWorkspaceFilter}
      onChange={(e) => {
        router.push(
          `/dashboard/calendar?view=${currentView}&date=${anchorISO}&workspaceId=${e.target.value}`
        );
      }}
      className="w-full sm:w-48 px-3 py-2 text-sm font-semibold bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-slate-700"
    >
      <option value="all">All Workspaces</option>
      {workspaces.map((ws) => (
        <option key={ws.id} value={ws.id}>{ws.name}</option>
      ))}
    </select>
  );
}
