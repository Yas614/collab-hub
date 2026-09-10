"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";

function toISODate(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function DateNav({
  currentView,
  activeWorkspaceFilter,
  anchorISO,
  prevISO,
  nextISO,
  todayISO,
}: {
  currentView: string;
  activeWorkspaceFilter: string;
  anchorISO: string;
  prevISO: string;
  nextISO: string;
  todayISO: string;
}) {
  const router = useRouter();

  const linkFor = (params: Partial<{ view: string; date: string; workspaceId: string }>) => {
    const merged = { view: currentView, date: anchorISO, workspaceId: activeWorkspaceFilter, ...params };
    return `/dashboard/calendar?view=${merged.view}&date=${merged.date}&workspaceId=${merged.workspaceId}`;
  };

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200/50">
        {["week", "month", "list"].map((view) => (
          <Link
            key={view}
            href={linkFor({ view })}
            className={`text-[11px] font-black uppercase px-4 py-1.5 rounded-lg transition-all ${
              currentView === view ? "bg-white text-indigo-600 shadow-sm" : "text-slate-400 hover:text-slate-600"
            }`}
          >
            {view}
          </Link>
        ))}
      </div>

      <Link
        href={linkFor({ date: todayISO })}
        className="text-[11px] font-black uppercase px-4 py-2 rounded-xl bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-all"
      >
        Today
      </Link>

      <label className="relative flex items-center gap-2 px-3 py-2 bg-slate-100 rounded-xl cursor-pointer hover:bg-slate-200/70 transition-all">
        <CalendarDays size={15} className="text-slate-500" />
        <input
          type="date"
          defaultValue={anchorISO}
          onChange={(e) => {
            if (e.target.value) router.push(linkFor({ date: e.target.value }));
          }}
          className="bg-transparent text-[11px] font-bold text-slate-600 outline-none w-[92px]"
        />
      </label>

      <div className="flex items-center bg-slate-100 p-1 rounded-xl">
        <Link href={linkFor({ date: prevISO })} className="p-2 hover:bg-white rounded-lg text-slate-500">
          <ChevronLeft size={18} />
        </Link>
        <Link href={linkFor({ date: nextISO })} className="p-2 hover:bg-white rounded-lg text-slate-500">
          <ChevronRight size={18} />
        </Link>
      </div>
    </div>
  );
}

export { toISODate };
