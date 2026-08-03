import React, { useEffect, useState } from "react";
import { api } from "@/lib/apiClient";
import { useAuth } from "@/context/AuthContext";
import AppShell from "@/components/AppShell";
import { toast } from "sonner";
import { CheckCircle, Clock, User, CalendarBlank, Tag, MagnifyingGlass, Funnel } from "@phosphor-icons/react";
import { Link } from "react-router-dom";

export default function TaskList() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState(null);
  const [filter, setFilter] = useState("open");

  const load = () => api.get("/tasks").then((r) => setTasks(r.data)).catch(() => toast.error("Failed to load corrective tasks"));
  useEffect(() => { load(); }, []);

  const updateStatus = async (id, newStatus) => {
    try {
      await api.patch(`/tasks/${id}`, { status: newStatus });
      toast.success(newStatus === "closed" ? "Task closed & verified!" : "Task reopened");
      setTasks(tasks.map(t => t.id === id ? { ...t, status: newStatus } : t));
    } catch { toast.error("Failed to update task"); }
  };

  const updateOwner = async (id, owner) => {
    try {
      await api.patch(`/tasks/${id}`, { owner });
      toast.success("Task owner assigned");
      setTasks(tasks.map(t => t.id === id ? { ...t, owner } : t));
    } catch {}
  };

  const updateDueDate = async (id, due_date) => {
    try {
      await api.patch(`/tasks/${id}`, { due_date });
      toast.success("Target completion date updated");
      setTasks(tasks.map(t => t.id === id ? { ...t, due_date } : t));
    } catch { toast.error("Failed to update target completion date"); }
  };

  const isViewOnly = user?.role === "director";

  if (tasks === null) {
    return <AppShell><div className="h-64 border border-border bg-muted/40 animate-pulse" /></AppShell>;
  }

  const displayed = tasks.filter(t => filter === "all" || t.status === filter);

  return (
    <AppShell>
      <div className="flex items-end justify-between mb-8 animate-fade-up">
        <div>
          <div className="font-mono text-[10px] tracking-[0.3em] uppercase text-accent mb-2">Remediation Protocol</div>
          <h1 className="font-display text-4xl font-black tracking-tighter">Defect Action Tracker</h1>
          <p className="text-sm text-muted-foreground mt-1">Automatically generated follow-up tasks for every failed compliance item across all inspections.</p>
        </div>

        <div className="flex items-center gap-1 border border-border bg-white p-1">
          {[
            { k: "open", l: `Open (${tasks.filter(x => x.status === "open").length})` },
            { k: "closed", l: "Resolved / Closed" },
            { k: "all", l: "All Tasks" }
          ].map((f) => (
            <button
              key={f.k}
              onClick={() => setFilter(f.k)}
              className={`px-4 h-8 text-xs font-bold tracking-wider uppercase transition-colors ${filter === f.k ? "bg-foreground text-white" : "text-muted-foreground hover:text-foreground"}`}
            >
              {f.l}
            </button>
          ))}
        </div>
      </div>

      {displayed.length === 0 ? (
        <div className="border border-border bg-white py-24 text-center animate-fade-up" data-testid="empty-tasks">
          <CheckCircle weight="duotone" size={64} className="mx-auto text-emerald-600/50" />
          <h3 className="font-display text-2xl font-bold tracking-tight mt-6">No {filter !== "all" ? filter : ""} defect tasks found</h3>
          <p className="text-sm text-muted-foreground mt-2">All dealership operational checkpoints are in verified status!</p>
        </div>
      ) : (
        <div className="space-y-4 animate-fade-up">
          {displayed.map((task) => (
            <div key={task.id} className={`border border-border p-6 bg-white transition-all ${task.status === "closed" ? "opacity-60 bg-muted/20 border-dashed" : "border-l-4 border-l-destructive"}`}>
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 text-xs text-muted-foreground font-mono mb-2">
                    <span className="bg-muted px-2 py-0.5 font-bold border border-border text-foreground">{task.item_id}</span>
                    <span>•</span>
                    <Link to={`/audits/${task.audit_id}`} className="font-semibold text-primary hover:underline">
                      {task.dealership_name}
                    </Link>
                    <span>•</span>
                    <span>{task.category_name}</span>
                  </div>
                  <h3 className="text-base font-bold text-foreground">{task.item_text}</h3>
                  {task.note && <p className="text-xs text-destructive mt-1.5 font-mono bg-destructive/5 border border-destructive/20 p-2 inline-block">“{task.note}”</p>}
                </div>

                <div className="flex flex-wrap items-center gap-4 border-t md:border-t-0 pt-4 md:pt-0">
                  <div>
                    <label className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground block mb-1">Assigned Owner</label>
                    <input
                      defaultValue={task.owner}
                      disabled={isViewOnly}
                      onBlur={(e) => updateOwner(task.id, e.target.value)}
                      className="h-9 px-2.5 border border-input text-xs font-mono bg-white focus:outline-none focus:ring-2 focus:ring-primary w-44 disabled:opacity-75 disabled:cursor-not-allowed text-foreground font-bold"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground block mb-1">Target Completion Date</label>
                    <input
                      type="date"
                      defaultValue={task.due_date}
                      disabled={isViewOnly}
                      onChange={(e) => updateDueDate(task.id, e.target.value)}
                      className="h-9 px-2.5 border border-input text-xs font-mono bg-white focus:outline-none focus:ring-2 focus:ring-primary w-44 text-foreground font-bold cursor-pointer disabled:opacity-75 disabled:cursor-not-allowed"
                    />
                  </div>
                  <div className="pt-4 md:pt-5">
                    {task.status === "open" ? (
                      <button
                        onClick={() => updateStatus(task.id, "closed")}
                        disabled={isViewOnly}
                        className="h-9 px-4 bg-emerald-600 text-white font-bold text-xs tracking-wider uppercase flex items-center gap-1.5 hover:bg-emerald-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        <CheckCircle weight="bold" size={15} /> {isViewOnly ? "Status: Open" : "Mark Resolved"}
                      </button>
                    ) : (
                      <button
                        onClick={() => updateStatus(task.id, "open")}
                        disabled={isViewOnly}
                        className="h-9 px-4 border border-border text-xs font-bold tracking-wider uppercase text-muted-foreground hover:text-foreground hover:bg-white transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        {isViewOnly ? "Status: Resolved" : "Reopen Task"}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </AppShell>
  );
}
