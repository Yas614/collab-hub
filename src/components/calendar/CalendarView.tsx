"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { addDays, differenceInCalendarDays, format, parseISO, startOfDay } from "date-fns";
import { Search, Plus, X, CheckCircle2, CalendarX2, SlidersHorizontal } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import TaskPreviewPopover from "@/components/calendar/TaskPreviewPopover";

export interface CalTask {
  id: string;
  title: string;
  description: string | null;
  priority: string | null;
  start_date: string | null;
  due_date: string;
  workspace_id: string;
  workspaceName: string | null;
  statusTitle: string | null;
  assigned_to: string | null;
  assignee: { display_name: string; avatar_url: string | null } | null;
}

interface Member {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
}

interface WorkspaceOption {
  id: string;
  name: string;
  firstColumnId: string | null;
}

const PRIORITY_STYLES: Record<string, { bg: string; text: string; border: string; dot: string }> = {
  urgent: { bg: "bg-red-50", text: "text-red-700", border: "border-red-200", dot: "bg-red-500" },
  high: { bg: "bg-orange-50", text: "text-orange-700", border: "border-orange-200", dot: "bg-orange-500" },
  medium: { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200", dot: "bg-blue-500" },
  low: { bg: "bg-slate-50", text: "text-slate-700", border: "border-slate-200", dot: "bg-slate-400" },
};

function isDoneColumn(title: string | undefined | null) {
  if (!title) return false;
  const t = title.toLowerCase();
  return t === "done" || t === "completed";
}

export default function CalendarView({
  initialTasks,
  timelineStartISO,
  timelineEndISO,
  columnsCount,
  currentView,
  todayISO,
  members,
  workspaces,
  rangeKey,
}: {
  initialTasks: CalTask[];
  timelineStartISO: string;
  timelineEndISO: string;
  columnsCount: number;
  currentView: "week" | "month" | "list";
  todayISO: string;
  members: Member[];
  workspaces: WorkspaceOption[];
  rangeKey: string;
}) {
  const router = useRouter();
  const timelineStart = useMemo(() => parseISO(timelineStartISO), [timelineStartISO]);
  const today = useMemo(() => parseISO(todayISO), [todayISO]);

  const [tasks, setTasks] = useState<CalTask[]>(initialTasks);
  useEffect(() => setTasks(initialTasks), [rangeKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // --- Filters ---
  const [search, setSearch] = useState("");
  const [priorityFilter, setPriorityFilter] = useState<Set<string>>(new Set());
  const [assigneeFilter, setAssigneeFilter] = useState<string>("all");
  const [hideCompleted, setHideCompleted] = useState(false);
  const [overdueOnly, setOverdueOnly] = useState(false);
  const [showQuickAdd, setShowQuickAdd] = useState(false);

  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      const done = isDoneColumn(t.statusTitle);
      if (hideCompleted && done) return false;
      if (overdueOnly && !(startOfDay(parseISO(t.due_date)) < today && !done)) return false;
      if (priorityFilter.size > 0 && !priorityFilter.has(t.priority || "medium")) return false;
      if (assigneeFilter === "unassigned") {
        if (t.assigned_to) return false;
      } else if (assigneeFilter !== "all") {
        if (t.assigned_to !== assigneeFilter) return false;
      }
      if (search.trim() && !t.title.toLowerCase().includes(search.trim().toLowerCase())) return false;
      return true;
    });
  }, [tasks, search, priorityFilter, assigneeFilter, hideCompleted, overdueOnly, today]);

  const togglePriority = (key: string) => {
    setPriorityFilter((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  // --- Drag to reschedule (month/week views only) ---
  const gridRef = useRef<HTMLDivElement>(null);
  const [drag, setDrag] = useState<{ id: string; mode: "move" | "left" | "right"; deltaDays: number; startX: number } | null>(null);

  const beginDrag = (e: React.MouseEvent | React.TouchEvent, id: string, mode: "move" | "left" | "right") => {
    // Only preventDefault for mouse — doing it on touchstart would suppress
    // the tap-to-open-popover click on every tap, not just real drags.
    // touchmove already preventDefaults once real movement is detected.
    if (!("touches" in e)) e.preventDefault();
    e.stopPropagation();
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    setDrag({ id, mode, deltaDays: 0, startX: clientX });
  };

  useEffect(() => {
    if (!drag) return;
    const dayWidth = (gridRef.current?.getBoundingClientRect().width || 1200) / columnsCount;

    const onMove = (clientX: number) => {
      const dx = clientX - drag.startX;
      setDrag((prev) => (prev ? { ...prev, deltaDays: Math.round(dx / dayWidth) } : prev));
    };
    const onMouseMove = (e: MouseEvent) => onMove(e.clientX);
    const onTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      onMove(e.touches[0].clientX);
    };

    const onUp = async () => {
      setDrag((current) => {
        if (!current || current.deltaDays === 0) return null;
        const task = tasks.find((t) => t.id === current.id);
        if (!task) return null;

        const due = parseISO(task.due_date);
        const start = task.start_date ? parseISO(task.start_date) : due;
        let newStart = start;
        let newDue = due;

        if (current.mode === "move") {
          newStart = addDays(start, current.deltaDays);
          newDue = addDays(due, current.deltaDays);
        } else if (current.mode === "left") {
          newStart = addDays(start, current.deltaDays);
          if (newStart > due) newStart = due;
        } else if (current.mode === "right") {
          newDue = addDays(due, current.deltaDays);
          if (newDue < start) newDue = start;
        }

        const newStartISO = format(newStart, "yyyy-MM-dd");
        const newDueISO = format(newDue, "yyyy-MM-dd");

        setTasks((prevTasks) =>
          prevTasks.map((t) => (t.id === current.id ? { ...t, start_date: newStartISO, due_date: newDueISO } : t))
        );

        supabase
          .from("tasks")
          .update({ start_date: newStartISO, due_date: newDueISO })
          .eq("id", current.id)
          .then(({ error }) => {
            if (error) {
              // revert on failure
              setTasks((prevTasks) =>
                prevTasks.map((t) => (t.id === current.id ? { ...t, start_date: task.start_date, due_date: task.due_date } : t))
              );
              router.refresh();
            }
          });

        return null;
      });
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onUp, { once: true });
    window.addEventListener("touchmove", onTouchMove, { passive: false });
    window.addEventListener("touchend", onUp, { once: true });
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onUp);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drag?.id, drag?.mode, drag?.startX]);

  // --- Swimlane packing (month/week) ---
  const packed = useMemo(() => {
    const withDates = filteredTasks.map((t) => {
      const due = parseISO(t.due_date);
      const start = t.start_date ? parseISO(t.start_date) : due;
      return { ...t, start, due };
    });
    withDates.sort((a, b) => a.start.getTime() - b.start.getTime());
    const lanes: (typeof withDates)[] = [];
    withDates.forEach((task) => {
      const lane = lanes.find((l) => l[l.length - 1].due.getTime() < task.start.getTime());
      if (lane) lane.push(task);
      else lanes.push([task]);
    });
    return lanes;
  }, [filteredTasks]);

  const todayPosition = differenceInCalendarDays(today, timelineStart);
  const showTodayLine = todayPosition >= 0 && todayPosition < columnsCount;

  // --- Quick add ---
  const [newTitle, setNewTitle] = useState("");
  const [newWorkspace, setNewWorkspace] = useState(workspaces[0]?.id ?? "");
  const [newPriority, setNewPriority] = useState("medium");
  const [newDue, setNewDue] = useState(todayISO);
  const [newAssignee, setNewAssignee] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const [workspaceOptions, setWorkspaceOptions] = useState<WorkspaceOption[]>(workspaces);
  useEffect(() => setWorkspaceOptions(workspaces), [workspaces]);

  const handleCreate = async () => {
    if (!newTitle.trim()) {
      setCreateError("Pick a title first.");
      return;
    }
    let ws = workspaceOptions.find((w) => w.id === newWorkspace);
    if (!ws) {
      setCreateError("Pick a workspace.");
      return;
    }
    setCreating(true);
    setCreateError(null);

    // This workspace has never had its board opened, so it has no columns
    // yet (the board seeds "To Do / In Progress / Done" lazily on first
    // visit). Seed the same defaults here instead of blocking task creation.
    let columnId = ws.firstColumnId;
    if (!columnId) {
      const { data: seededColumns, error: seedError } = await supabase
        .from("columns")
        .insert([
          { workspace_id: ws.id, title: "To Do", position: 1 },
          { workspace_id: ws.id, title: "In Progress", position: 2 },
          { workspace_id: ws.id, title: "Done", position: 3 },
        ])
        .select();
      if (seedError || !seededColumns?.length) {
        setCreating(false);
        setCreateError(seedError?.message || "Couldn't set up this workspace's board yet.");
        return;
      }
      const todoColumn = seededColumns.find((c) => c.position === 1) ?? seededColumns[0];
      columnId = todoColumn.id;
      setWorkspaceOptions((prev) => prev.map((w) => (w.id === ws!.id ? { ...w, firstColumnId: columnId } : w)));
    }

    const { data, error } = await supabase
      .from("tasks")
      .insert({
        workspace_id: newWorkspace,
        column_id: columnId,
        title: newTitle.trim(),
        priority: newPriority,
        due_date: newDue,
        assigned_to: newAssignee || null,
        position: 1,
      })
      .select("id, title, description, priority, start_date, due_date, workspace_id, assigned_to, assignee:profiles(display_name, avatar_url)")
      .single();
    setCreating(false);
    if (error) {
      setCreateError(error.message);
      return;
    }
    if (data) {
      setTasks((prev) => [
        ...prev,
        { ...(data as any), workspaceName: ws!.name, statusTitle: "To Do" },
      ]);
    }
    setShowQuickAdd(false);
    setNewTitle("");
  };

  const activeFilterCount = priorityFilter.size + (assigneeFilter !== "all" ? 1 : 0) + (hideCompleted ? 1 : 0) + (overdueOnly ? 1 : 0);
  const [filtersOpen, setFiltersOpen] = useState(false);

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Filter toolbar */}
      <div className="border-b border-slate-100 bg-slate-50/50">
        <div className="px-3 sm:px-6 py-3 flex items-center gap-2">
          <div className="relative flex-1 sm:flex-none min-w-0">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search tasks..."
              className="pl-8 pr-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 bg-white outline-none focus:ring-2 focus:ring-indigo-200 w-full sm:w-44"
            />
          </div>

          <button
            onClick={() => setFiltersOpen((v) => !v)}
            className={`sm:hidden relative flex items-center gap-1.5 text-[10px] font-black uppercase px-2.5 py-2 rounded-lg border shrink-0 ${
              filtersOpen ? "bg-indigo-50 text-indigo-600 border-indigo-200" : "bg-white text-slate-400 border-slate-200"
            }`}
          >
            <SlidersHorizontal size={13} /> Filters
            {activeFilterCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 h-4 w-4 flex items-center justify-center rounded-full bg-indigo-600 text-white text-[9px] font-bold">
                {activeFilterCount}
              </span>
            )}
          </button>

          <div className="hidden sm:flex flex-wrap items-center gap-2">
            {Object.keys(PRIORITY_STYLES).map((key) => (
              <button
                key={key}
                onClick={() => togglePriority(key)}
                className={`text-[10px] font-black uppercase px-2.5 py-1.5 rounded-lg border transition-all ${
                  priorityFilter.has(key)
                    ? `${PRIORITY_STYLES[key].bg} ${PRIORITY_STYLES[key].text} ${PRIORITY_STYLES[key].border}`
                    : "bg-white text-slate-400 border-slate-200 hover:text-slate-600"
                }`}
              >
                {key}
              </button>
            ))}

            <select
              value={assigneeFilter}
              onChange={(e) => setAssigneeFilter(e.target.value)}
              className="text-xs font-semibold rounded-lg border border-slate-200 bg-white px-2 py-1.5 outline-none"
            >
              <option value="all">Everyone</option>
              <option value="unassigned">Unassigned</option>
              {members.map((m) => (
                <option key={m.user_id} value={m.user_id}>
                  {m.display_name}
                </option>
              ))}
            </select>

            <button
              onClick={() => setHideCompleted((v) => !v)}
              className={`text-[10px] font-black uppercase px-2.5 py-1.5 rounded-lg border transition-all ${
                hideCompleted ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-white text-slate-400 border-slate-200"
              }`}
            >
              Hide done
            </button>

            <button
              onClick={() => setOverdueOnly((v) => !v)}
              className={`text-[10px] font-black uppercase px-2.5 py-1.5 rounded-lg border transition-all ${
                overdueOnly ? "bg-red-50 text-red-700 border-red-200" : "bg-white text-slate-400 border-slate-200"
              }`}
            >
              Overdue only
            </button>
          </div>

          <button
            onClick={() => setShowQuickAdd(true)}
            className="ml-auto flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 shrink-0"
          >
            <Plus size={14} /> <span className="hidden xs:inline">New task</span>
          </button>
        </div>

        {/* Mobile-only collapsible filter row (same controls, shown on tap) */}
        {filtersOpen && (
          <div className="sm:hidden px-3 pb-3 flex flex-wrap items-center gap-2">
            {Object.keys(PRIORITY_STYLES).map((key) => (
              <button
                key={key}
                onClick={() => togglePriority(key)}
                className={`text-[10px] font-black uppercase px-2.5 py-1.5 rounded-lg border transition-all ${
                  priorityFilter.has(key)
                    ? `${PRIORITY_STYLES[key].bg} ${PRIORITY_STYLES[key].text} ${PRIORITY_STYLES[key].border}`
                    : "bg-white text-slate-400 border-slate-200"
                }`}
              >
                {key}
              </button>
            ))}

            <select
              value={assigneeFilter}
              onChange={(e) => setAssigneeFilter(e.target.value)}
              className="text-xs font-semibold rounded-lg border border-slate-200 bg-white px-2 py-1.5 outline-none flex-1 min-w-[110px]"
            >
              <option value="all">Everyone</option>
              <option value="unassigned">Unassigned</option>
              {members.map((m) => (
                <option key={m.user_id} value={m.user_id}>
                  {m.display_name}
                </option>
              ))}
            </select>

            <button
              onClick={() => setHideCompleted((v) => !v)}
              className={`text-[10px] font-black uppercase px-2.5 py-1.5 rounded-lg border transition-all ${
                hideCompleted ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-white text-slate-400 border-slate-200"
              }`}
            >
              Hide done
            </button>

            <button
              onClick={() => setOverdueOnly((v) => !v)}
              className={`text-[10px] font-black uppercase px-2.5 py-1.5 rounded-lg border transition-all ${
                overdueOnly ? "bg-red-50 text-red-700 border-red-200" : "bg-white text-slate-400 border-slate-200"
              }`}
            >
              Overdue only
            </button>
          </div>
        )}
      </div>

      {/* Body */}
      {filteredTasks.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center gap-3 p-10">
          <CalendarX2 size={40} className="text-slate-300" />
          <p className="text-sm font-bold text-slate-500">
            {tasks.length === 0 ? "No tasks with due dates in this range yet." : "No tasks match your filters."}
          </p>
          <button
            onClick={() => setShowQuickAdd(true)}
            className="text-xs font-bold px-4 py-2 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700"
          >
            + Add a task
          </button>
        </div>
      ) : currentView === "list" ? (
        <div className="flex-1 overflow-y-auto p-6 space-y-2">
          {[...filteredTasks]
            .sort((a, b) => parseISO(a.due_date).getTime() - parseISO(b.due_date).getTime())
            .map((task) => {
              const done = isDoneColumn(task.statusTitle);
              const overdue = !done && startOfDay(parseISO(task.due_date)) < today;
              const style = PRIORITY_STYLES[task.priority || "medium"];
              return (
                <TaskPreviewPopover
                  key={task.id}
                  task={{
                    id: task.id,
                    title: task.title,
                    description: task.description,
                    priority: task.priority,
                    due_date: task.due_date,
                    start_date: task.start_date,
                    workspace_id: task.workspace_id,
                    workspaceName: task.workspaceName,
                    statusTitle: task.statusTitle,
                    assignee: task.assignee,
                  }}
                  className={`block rounded-2xl border p-4 hover:shadow-md transition-all ${
                    done ? "bg-slate-50 border-slate-100 opacity-60" : "bg-white border-slate-100"
                  }`}
                >
                  <div className="flex items-center justify-between gap-3 flex-wrap pointer-events-none">
                    <div className="flex items-center gap-3 min-w-0">
                      {done ? (
                        <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
                      ) : (
                        <div className={`h-2.5 w-2.5 rounded-full shrink-0 ${style.dot}`} />
                      )}
                      <div className="min-w-0">
                        <p className={`text-sm font-bold truncate ${done ? "line-through text-slate-400" : "text-slate-800"}`}>
                          {task.title}
                        </p>
                        <p className="text-[11px] text-slate-400 font-semibold truncate">
                          {task.workspaceName} {task.statusTitle ? `• ${task.statusTitle}` : ""}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 sm:gap-3 shrink-0 ml-7 sm:ml-0">
                      <span className={`text-xs font-bold whitespace-nowrap ${overdue ? "text-red-600" : "text-slate-500"}`}>
                        {overdue ? "Overdue • " : ""}
                        {format(parseISO(task.due_date), "MMM d")}
                      </span>
                      {task.assignee && (
                        <span className="text-[10px] font-bold px-2 py-1 bg-slate-100 rounded-lg text-slate-500 whitespace-nowrap">
                          {task.assignee.display_name}
                        </span>
                      )}
                    </div>
                  </div>
                </TaskPreviewPopover>
              );
            })}
        </div>
      ) : (
        <div className="flex-1 overflow-auto relative scrollbar-thin">
          <div
            className="flex flex-col min-h-full"
            style={{ minWidth: currentView === "week" ? "640px" : "1200px" }}
            ref={gridRef}
          >
            <div
              className="grid bg-slate-50/50 border-b border-slate-100 py-4 text-[9px] font-black text-slate-400 text-center uppercase tracking-[0.2em] sticky top-0 z-20"
              style={{ gridTemplateColumns: `repeat(${columnsCount}, minmax(0, 1fr))` }}
            >
              {Array.from({ length: columnsCount }).map((_, idx) => {
                const d = addDays(timelineStart, idx);
                const isToday = format(d, "yyyy-MM-dd") === todayISO;
                return (
                  <div key={idx} className={`border-r border-slate-100/50 last:border-0 ${isToday ? "text-indigo-600 font-black scale-110" : ""}`}>
                    {d.getDate()} {currentView === "week" && format(d, "EEE")}
                  </div>
                );
              })}
            </div>

            <div className="flex-1 py-6 relative bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:20px_20px] [background-position:center]">
              {showTodayLine && (
                <div
                  className="absolute top-0 bottom-0 z-10 w-px bg-red-500/40 pointer-events-none"
                  style={{ left: `calc(${(todayPosition / columnsCount) * 100}% + (100% / ${columnsCount} / 2))` }}
                >
                  <div className="absolute top-0 -left-1 w-2 h-2 rounded-full bg-red-500" />
                </div>
              )}

              {packed.map((lane, laneIdx) => (
                <div key={laneIdx} className="relative h-16 w-full grid mb-2" style={{ gridTemplateColumns: `repeat(${columnsCount}, minmax(0, 1fr))` }}>
                  {lane.map((task) => {
                    const done = isDoneColumn(task.statusTitle);
                    const style = PRIORITY_STYLES[task.priority || "medium"];
                    const overdue = !done && startOfDay(task.due) < today;
                    const isDragging = drag?.id === task.id;
                    const dragDelta = isDragging ? drag.deltaDays : 0;

                    let startDelta = Math.max(0, differenceInCalendarDays(task.start, timelineStart));
                    let duration = Math.max(1, differenceInCalendarDays(task.due, task.start) + 1);

                    if (isDragging && drag.mode === "move") {
                      startDelta = Math.max(0, startDelta + dragDelta);
                    } else if (isDragging && drag.mode === "left") {
                      const newStart = Math.max(0, startDelta + dragDelta);
                      duration = Math.max(1, duration - (newStart - startDelta));
                      startDelta = newStart;
                    } else if (isDragging && drag.mode === "right") {
                      duration = Math.max(1, duration + dragDelta);
                    }

                    return (
                      <div
                        key={task.id}
                        style={{ gridColumn: `${startDelta + 1} / span ${Math.min(duration, columnsCount - startDelta)}` }}
                        className={`absolute inset-x-1 top-2 bottom-2 rounded-2xl border shadow-sm transition-shadow hover:shadow-lg group z-20 ${
                          done ? "bg-white border-emerald-100 grayscale-[0.8] opacity-60" : overdue ? "bg-red-50 border-red-300 text-red-700" : `${style.bg} ${style.border} ${style.text}`
                        } ${isDragging ? "shadow-xl cursor-grabbing" : "cursor-grab"}`}
                      >
                        {/* resize handles (wider + semi-visible on touch, since hover doesn't exist there) */}
                        <div
                          onMouseDown={(e) => beginDrag(e, task.id, "left")}
                          onTouchStart={(e) => beginDrag(e, task.id, "left")}
                          style={{ touchAction: "none" }}
                          className="absolute left-0 top-0 bottom-0 w-3 sm:w-2 cursor-ew-resize z-30 opacity-40 sm:opacity-0 sm:group-hover:opacity-100 bg-black/10 rounded-l-2xl"
                        />
                        <div
                          onMouseDown={(e) => beginDrag(e, task.id, "right")}
                          onTouchStart={(e) => beginDrag(e, task.id, "right")}
                          style={{ touchAction: "none" }}
                          className="absolute right-0 top-0 bottom-0 w-3 sm:w-2 cursor-ew-resize z-30 opacity-40 sm:opacity-0 sm:group-hover:opacity-100 bg-black/10 rounded-r-2xl"
                        />

                        <TaskPreviewPopover
                          variant="anchored"
                          task={{
                            id: task.id,
                            title: task.title,
                            description: task.description,
                            priority: task.priority,
                            due_date: task.due_date,
                            start_date: task.start_date,
                            workspace_id: task.workspace_id,
                            workspaceName: task.workspaceName,
                            statusTitle: task.statusTitle,
                            assignee: task.assignee,
                          }}
                          className="h-full w-full"
                        >
                          <div
                            onMouseDown={(e) => beginDrag(e, task.id, "move")}
                            onTouchStart={(e) => beginDrag(e, task.id, "move")}
                            style={{ touchAction: "none" }}
                            className="px-3 h-full flex items-center justify-between"
                          >
                            <div className="flex items-center gap-2 overflow-hidden pointer-events-none">
                              {done ? <CheckCircle2 size={14} className="text-emerald-500 shrink-0" /> : <div className={`h-2 w-2 rounded-full shrink-0 ${style.dot}`} />}
                              <span className={`text-[11px] font-bold truncate ${done ? "line-through text-slate-400" : ""}`}>{task.title}</span>
                            </div>
                            {task.assignee && (
                              <div className="flex items-center shrink-0 pointer-events-none">
                                {task.assignee.avatar_url ? (
                                  <img src={task.assignee.avatar_url} className="h-5 w-5 rounded-full border-2 border-white shadow-sm" alt="" />
                                ) : (
                                  <div className="h-5 w-5 rounded-full bg-white border border-slate-200 text-[8px] flex items-center justify-center font-bold text-slate-500">
                                    {task.assignee.display_name.substring(0, 2).toUpperCase()}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </TaskPreviewPopover>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Quick add modal */}
      {showQuickAdd && (
        <>
          <div className="fixed inset-0 bg-slate-900/30 backdrop-blur-sm z-40" onClick={() => setShowQuickAdd(false)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="w-full max-w-sm bg-white rounded-3xl shadow-2xl border border-slate-100 p-6 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-black text-slate-800">New task</h3>
                <button onClick={() => setShowQuickAdd(false)} className="p-1 text-slate-400 hover:text-slate-600">
                  <X size={18} />
                </button>
              </div>

              <input
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Task title"
                className="w-full text-sm px-3 py-2 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-indigo-200"
                autoFocus
              />

              <select
                value={newWorkspace}
                onChange={(e) => setNewWorkspace(e.target.value)}
                className="w-full text-sm px-3 py-2 rounded-xl border border-slate-200 outline-none"
              >
                {workspaceOptions.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name}
                  </option>
                ))}
              </select>

              <div className="flex gap-2">
                <select
                  value={newPriority}
                  onChange={(e) => setNewPriority(e.target.value)}
                  className="flex-1 text-sm px-3 py-2 rounded-xl border border-slate-200 outline-none"
                >
                  {Object.keys(PRIORITY_STYLES).map((k) => (
                    <option key={k} value={k}>
                      {k[0].toUpperCase() + k.slice(1)}
                    </option>
                  ))}
                </select>
                <input
                  type="date"
                  value={newDue}
                  onChange={(e) => setNewDue(e.target.value)}
                  className="flex-1 text-sm px-3 py-2 rounded-xl border border-slate-200 outline-none"
                />
              </div>

              <select
                value={newAssignee}
                onChange={(e) => setNewAssignee(e.target.value)}
                className="w-full text-sm px-3 py-2 rounded-xl border border-slate-200 outline-none"
              >
                <option value="">Unassigned</option>
                {members.map((m) => (
                  <option key={m.user_id} value={m.user_id}>
                    {m.display_name}
                  </option>
                ))}
              </select>

              {createError && <p className="text-xs text-red-600 font-semibold">{createError}</p>}

              <button
                onClick={handleCreate}
                disabled={creating}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-bold rounded-xl"
              >
                {creating ? "Creating..." : "Create task"}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}