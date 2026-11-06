import React, { useEffect, useState } from "react";
import { api, API } from "@/lib/apiClient";
import { useAuth } from "@/context/AuthContext";
import AppShell from "@/components/AppShell";
import { toast } from "sonner";
import {
  CheckCircle, Clock, User, CalendarBlank, Tag, MagnifyingGlass, Funnel,
  ShieldWarning, Warning, ClockCountdown, Camera, Checks, XCircle,
  Buildings, ArrowUpRight, ArrowClockwise
} from "@phosphor-icons/react";
import { Link } from "react-router-dom";

const STANDARD_BRANCH_NAMES = [
  "OneUP Motors - Krishna-nagar",
  "OneUP Motors - Mahanagar",
  "OneUP Motors - TP Nagar",
  "OneUP Motors - Banthra",
  "OneUP Motors - Takrohi",
  "OneUP Motors - Malihabad",
  "OneUP Motors Nexa"
];

export default function TaskList() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState(null);
  const [filter, setFilter] = useState("open");
  const [branchFilter, setBranchFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Rectification Modal
  const [rectifyTask, setRectifyTask] = useState(null);
  const [rectifyNote, setRectifyNote] = useState("");
  const [rectifyPhotos, setRectifyPhotos] = useState([]);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [submittingRectify, setSubmittingRectify] = useState(false);

  // Auditor Verification Modal
  const [verifyTask, setVerifyTask] = useState(null);
  const [verifyNote, setVerifyNote] = useState("");
  const [submittingVerify, setSubmittingVerify] = useState(false);

  const load = () => {
    api.get("/tasks")
      .then((r) => setTasks(r.data))
      .catch(() => toast.error("Failed to load corrective tasks"));
  };

  useEffect(() => {
    load();
  }, []);

  const isViewOnly = user?.role === "director";
  const isAuditorOrAdmin = user?.role === "admin" || user?.role === "auditor";

  const handleProofUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingPhoto(true);
    const fd = new FormData();
    fd.append("file", file);
    try {
      const res = await api.post("/upload", fd);
      const url = res.data.path.startsWith("http") ? res.data.path : `${API}/${res.data.path.replace(/^\/?api\//, "")}`;
      setRectifyPhotos([...rectifyPhotos, url]);
      toast.success("Rectification photo proof attached!");
    } catch (err) {
      toast.error("Failed to upload photo");
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleRectifySubmit = async () => {
    if (!rectifyNote.trim() || rectifyNote.trim().length < 3) {
      toast.error("Action Taken Remarks must be at least 3 characters long");
      return;
    }
    setSubmittingRectify(true);
    try {
      const res = await api.post(`/capa/${rectifyTask.id}/rectify`, {
        rectification_note: rectifyNote.trim(),
        rectification_evidence: rectifyPhotos
      });
      toast.success("Rectification submitted! Awaiting auditor verification.");
      setTasks(tasks.map(t => t.id === rectifyTask.id ? res.data : t));
      setRectifyTask(null);
      setRectifyNote("");
      setRectifyPhotos([]);
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to submit rectification");
    } finally {
      setSubmittingRectify(false);
    }
  };

  const handleVerifySubmit = async (approved) => {
    setSubmittingVerify(true);
    try {
      const res = await api.post(`/capa/${verifyTask.id}/verify`, {
        approved,
        verification_note: verifyNote.trim() || (approved ? "Verified and signed off by auditor." : "Rejected. Further rectification required.")
      });
      toast.success(approved ? "Observation formally closed & verified!" : "Rectification rejected and returned to open status.");
      setTasks(tasks.map(t => t.id === verifyTask.id ? res.data : t));
      setVerifyTask(null);
      setVerifyNote("");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Verification failed");
    } finally {
      setSubmittingVerify(false);
    }
  };

  const updateOwner = async (id, owner) => {
    try {
      await api.patch(`/tasks/${id}`, { owner });
      toast.success("Task owner assigned");
      setTasks(tasks.map(t => t.id === id ? { ...t, owner } : t));
    } catch (e) {}
  };

  const updateDueDate = async (id, due_date) => {
    try {
      await api.patch(`/tasks/${id}`, { due_date });
      toast.success("Target SLA date updated");
      setTasks(tasks.map(t => t.id === id ? { ...t, due_date } : t));
    } catch (e) {
      toast.error("Failed to update target date");
    }
  };

  const updateSeverity = async (id, severity) => {
    try {
      await api.patch(`/tasks/${id}`, { severity });
      toast.success(`Severity set to ${severity}`);
      setTasks(tasks.map(t => t.id === id ? { ...t, severity } : t));
    } catch (e) {
      toast.error("Failed to update severity");
    }
  };

  if (tasks === null) {
    return (
      <AppShell>
        <div className="space-y-6 animate-pulse">
          <div className="h-16 bg-muted/50 rounded-xs" />
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 bg-muted/40 border border-border" />
            ))}
          </div>
          <div className="h-96 bg-muted/30 border border-border" />
        </div>
      </AppShell>
    );
  }

  // Aggregate counts
  const allTasks = tasks || [];
  const openCount = allTasks.filter(t => t.status === "open").length;
  const p0Count = allTasks.filter(t => t.severity === "P0" && t.status !== "closed").length;
  const overdueCount = allTasks.filter(t => t.is_overdue && t.status !== "closed").length;
  const rectifiedCount = allTasks.filter(t => t.status === "rectified").length;
  const closedCount = allTasks.filter(t => t.status === "closed").length;

  // Filter pipeline
  const displayed = allTasks.filter(t => {
    // Tab filter
    if (filter === "open" && t.status !== "open") return false;
    if (filter === "p0" && (t.severity !== "P0" || t.status === "closed")) return false;
    if (filter === "overdue" && (!t.is_overdue || t.status === "closed")) return false;
    if (filter === "rectified" && t.status !== "rectified") return false;
    if (filter === "closed" && t.status !== "closed") return false;

    // Branch filter
    if (branchFilter !== "all" && t.dealership_name !== branchFilter) return false;

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const match =
        (t.item_text || "").toLowerCase().includes(q) ||
        (t.category_name || "").toLowerCase().includes(q) ||
        (t.dealership_name || "").toLowerCase().includes(q) ||
        (t.note || "").toLowerCase().includes(q) ||
        (t.action_remark || "").toLowerCase().includes(q) ||
        (t.rectification_note || "").toLowerCase().includes(q);
      if (!match) return false;
    }

    return true;
  });

  return (
    <AppShell>
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6 pb-6 border-b border-border">
        <div>
          <div className="inline-flex items-center gap-1.5 font-mono text-[10px] tracking-[0.3em] uppercase text-accent font-black mb-2">
            <ShieldWarning weight="bold" size={14} /> Closed-Loop Remediation Protocol
          </div>
          <h1 className="font-display text-3xl sm:text-4xl font-black tracking-tight uppercase text-foreground">
            Corrective Action & Closure Monitoring (CAPA)
          </h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
            Observation severity classification (P0/P1/P2), SLA overdue tracking, proof-of-rectification photo uploads, and formal auditor verification sign-offs.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Link
            to="/scorecards"
            className="h-10 px-4 border border-border bg-white text-foreground hover:bg-muted font-bold text-xs tracking-wider uppercase inline-flex items-center gap-2 transition-colors shadow-xs"
          >
            Branch Scorecards
          </Link>
          <Link
            to="/mis"
            className="h-10 px-4 bg-primary text-white hover:bg-blue-800 font-bold text-xs tracking-wider uppercase inline-flex items-center gap-2 transition-colors shadow-xs"
          >
            Director MIS
          </Link>
        </div>
      </div>

      {/* 4 KPI Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <div className="border border-border p-4 bg-white shadow-xs">
          <div className="text-[10px] font-mono uppercase text-muted-foreground font-bold">Open Deficiencies</div>
          <div className="font-display text-3xl font-black text-foreground mt-1">{openCount}</div>
          <div className="text-[11px] text-muted-foreground font-mono mt-1">Requiring workshop remediation</div>
        </div>

        <div className={`border p-4 shadow-xs ${p0Count > 0 ? "border-red-400 bg-red-50/20" : "border-border bg-white"}`}>
          <div className="text-[10px] font-mono uppercase text-red-600 font-bold flex items-center gap-1">
            <ShieldWarning size={12} /> P0 Critical Safety
          </div>
          <div className="font-display text-3xl font-black text-red-600 mt-1">{p0Count}</div>
          <div className="text-[11px] text-muted-foreground font-mono mt-1">3 Days SLA (Immediate Hazard)</div>
        </div>

        <div className={`border p-4 shadow-xs ${overdueCount > 0 ? "border-orange-400 bg-orange-50/20" : "border-border bg-white"}`}>
          <div className="text-[10px] font-mono uppercase text-orange-600 font-bold flex items-center gap-1">
            <ClockCountdown size={12} /> Overdue Remediations
          </div>
          <div className="font-display text-3xl font-black text-orange-600 mt-1">{overdueCount}</div>
          <div className="text-[11px] text-muted-foreground font-mono mt-1">Exceeded target SLA window</div>
        </div>

        <div className="border border-border p-4 bg-white shadow-xs">
          <div className="text-[10px] font-mono uppercase text-blue-700 font-bold flex items-center gap-1">
            <Checks size={12} /> Pending Auditor Review
          </div>
          <div className="font-display text-3xl font-black text-blue-700 mt-1">{rectifiedCount}</div>
          <div className="text-[11px] text-muted-foreground font-mono mt-1">Rectification proof uploaded</div>
        </div>
      </div>

      {/* Filter Tabs & Search Controls */}
      <div className="bg-white border border-border p-4 mb-6 shadow-xs space-y-3">
        {/* Filter Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto pb-2 scrollbar-thin border-b border-border/60">
          {[
            { k: "open", l: `Open Actions (${openCount})` },
            { k: "p0", l: `P0 Critical (${p0Count})` },
            { k: "overdue", l: `Overdue SLA (${overdueCount})` },
            { k: "rectified", l: `Review Proof (${rectifiedCount})` },
            { k: "closed", l: `Resolved (${closedCount})` },
            { k: "all", l: `All Tasks (${allTasks.length})` }
          ].map((f) => (
            <button
              key={f.k}
              onClick={() => setFilter(f.k)}
              className={`px-3.5 py-1.5 text-xs font-bold uppercase tracking-wider transition-colors shrink-0 ${
                filter === f.k
                  ? "bg-foreground text-white"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
            >
              {f.l}
            </button>
          ))}
        </div>

        {/* Secondary Search & Branch Dropdown */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 pt-1">
          <div className="sm:col-span-8 relative">
            <MagnifyingGlass size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search deficiency text, category, observation notes, or action remarks..."
              className="w-full h-9 pl-9 pr-3 border border-input bg-white text-xs focus:ring-2 focus:ring-primary focus:outline-none"
            />
          </div>

          <div className="sm:col-span-4">
            <select
              value={branchFilter}
              onChange={(e) => setBranchFilter(e.target.value)}
              className="w-full h-9 px-3 border border-input bg-white text-xs font-semibold focus:ring-2 focus:ring-primary focus:outline-none"
            >
              <option value="all">All Dealership Branches</option>
              {STANDARD_BRANCH_NAMES.map((name) => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center justify-between text-[11px] text-muted-foreground font-mono">
          <span>Showing {displayed.length} of {allTasks.length} corrective tasks</span>
          {(searchQuery || branchFilter !== "all" || filter !== "open") && (
            <button
              onClick={() => { setSearchQuery(""); setBranchFilter("all"); setFilter("open"); }}
              className="text-primary hover:underline font-bold"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Task Cards List */}
      {displayed.length === 0 ? (
        <div className="border border-border bg-white py-24 text-center animate-fade-up">
          <CheckCircle weight="duotone" size={64} className="mx-auto text-emerald-600/50" />
          <h3 className="font-display text-2xl font-bold tracking-tight mt-6">
            No corrective tasks matching this view
          </h3>
          <p className="text-sm text-muted-foreground mt-2">
            All checkpoints are compliant or no tasks match your active filter criteria.
          </p>
        </div>
      ) : (
        <div className="space-y-4 animate-fade-up">
          {displayed.map((task) => {
            const isClosed = task.status === "closed";
            const isRectified = task.status === "rectified";
            const isOverdue = task.is_overdue;

            return (
              <div
                key={task.id}
                className={`border bg-white transition-all p-5 shadow-xs ${
                  isClosed
                    ? "border-emerald-600/30 bg-emerald-50/15 opacity-80"
                    : isRectified
                    ? "border-blue-400 bg-blue-50/10 border-l-4 border-l-blue-600"
                    : task.severity === "P0"
                    ? "border-red-400 border-l-4 border-l-red-600"
                    : "border-border border-l-4 border-l-accent"
                }`}
              >
                {/* Header Row: Severity Chip, Ageing Badge, Branch, Category */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3 pb-3 border-b border-border/60">
                  <div className="flex flex-wrap items-center gap-2">
                    {/* Severity Badge */}
                    <span className={`inline-flex items-center gap-1 font-mono text-[10px] font-bold px-2.5 py-0.5 uppercase rounded-xs ${
                      task.severity === "P0" ? "bg-red-600 text-white" :
                      task.severity === "P1" ? "bg-orange-500 text-white" : "bg-amber-400 text-slate-900"
                    }`}>
                      <ShieldWarning size={12} />
                      {task.severity} {task.severity_label} ({task.sla_days || 7}d SLA)
                    </span>

                    {/* Ageing / SLA Status Badge */}
                    {isClosed ? (
                      <span className="inline-flex items-center gap-1 font-mono text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-xs">
                        <CheckCircle size={12} /> Closed & Verified
                      </span>
                    ) : isRectified ? (
                      <span className="inline-flex items-center gap-1 font-mono text-[10px] font-bold bg-blue-100 text-blue-800 px-2 py-0.5 rounded-xs">
                        <Checks size={12} /> Proof Uploaded (Review)
                      </span>
                    ) : isOverdue ? (
                      <span className="inline-flex items-center gap-1 font-mono text-[10px] font-bold bg-red-100 text-red-700 border border-red-300 px-2 py-0.5 rounded-xs animate-pulse">
                        <ClockCountdown size={12} /> {task.days_overdue} Days Overdue ({task.sla_bracket})
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 font-mono text-[10px] font-bold bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-xs">
                        <Clock size={12} /> {task.age_days}d Active (On Track)
                      </span>
                    )}

                    <span className="text-muted-foreground font-mono text-xs">•</span>
                    <span className="font-mono text-xs text-muted-foreground bg-muted px-2 py-0.5 border border-border">
                      {task.item_id}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-xs font-mono">
                    <Link
                      to={`/scorecards?branch=${encodeURIComponent(task.dealership_name)}`}
                      className="font-bold text-foreground hover:text-primary transition-colors flex items-center gap-1"
                    >
                      <Buildings size={14} className="text-muted-foreground" /> {task.dealership_name}
                    </Link>
                  </div>
                </div>

                {/* Question Text & Auditor Finding */}
                <div className="mb-4">
                  <div className="font-mono text-[11px] text-muted-foreground uppercase font-bold mb-1">
                    Pillar: {task.category_name}
                  </div>
                  <h3 className="text-sm sm:text-base font-bold text-foreground leading-snug">
                    {task.item_text}
                  </h3>

                  {task.note && (
                    <div className="mt-2.5 p-2.5 bg-red-50/60 border border-red-200/80 rounded-xs text-xs text-red-800 font-medium flex items-start gap-2">
                      <Warning size={16} className="text-red-600 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold uppercase font-mono text-[10px] block">Audited Inspection Finding:</span>
                        “{task.note}”
                      </div>
                    </div>
                  )}
                </div>

                {/* Rectification Evidence & Remarks (If submitted) */}
                {(task.rectification_note || (task.rectification_evidence && task.rectification_evidence.length > 0)) && (
                  <div className="mb-4 p-3.5 bg-blue-50/40 border border-blue-200/60 rounded-xs text-xs">
                    <div className="font-mono font-bold text-[10px] uppercase text-blue-900 flex items-center justify-between mb-1.5">
                      <span className="flex items-center gap-1.5">
                        <Camera size={14} className="text-blue-700" /> Submitted Proof of Rectification:
                      </span>
                      {task.rectified_by && (
                        <span className="text-muted-foreground">By: {task.rectified_by}</span>
                      )}
                    </div>
                    {task.rectification_note && (
                      <p className="font-semibold text-blue-950 mb-2">"{task.rectification_note}"</p>
                    )}
                    {task.rectification_evidence && task.rectification_evidence.length > 0 && (
                      <div className="flex flex-wrap gap-2 pt-1">
                        {task.rectification_evidence.map((url, idx) => (
                          <a
                            key={idx}
                            href={url}
                            target="_blank"
                            rel="noreferrer"
                            className="block relative w-16 h-16 border border-blue-300 rounded-xs overflow-hidden hover:opacity-90 shadow-xs"
                            title="Click to view full photo"
                          >
                            <img src={url} alt="Proof" className="w-full h-full object-cover" />
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Verification Sign-Off Record (If verified) */}
                {task.verification_note && (
                  <div className="mb-4 p-3 bg-emerald-50/50 border border-emerald-200 text-xs text-emerald-950 rounded-xs flex items-center justify-between">
                    <div>
                      <span className="font-mono font-bold text-[10px] uppercase text-emerald-800 block">
                        Auditor Sign-off Remark:
                      </span>
                      "{task.verification_note}"
                    </div>
                    {task.verified_by && (
                      <span className="font-mono text-[10px] text-emerald-700 shrink-0">
                        Verified by {task.verified_by}
                      </span>
                    )}
                  </div>
                )}

                {/* Assignment & Controls Footer */}
                <div className="pt-3 border-t border-border flex flex-col md:flex-row md:items-center justify-between gap-4">
                  {/* Owner & SLA Date Controls */}
                  <div className="flex flex-wrap items-center gap-3 text-xs">
                    <div>
                      <span className="text-[10px] font-mono uppercase text-muted-foreground font-bold block">Assigned Owner</span>
                      <input
                        defaultValue={task.owner || "OneUP Service Manager"}
                        disabled={isViewOnly}
                        onBlur={(e) => updateOwner(task.id, e.target.value)}
                        className="h-8 px-2 border border-input text-xs font-mono bg-white font-bold text-foreground w-40 disabled:opacity-75 focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>

                    <div>
                      <span className="text-[10px] font-mono uppercase text-muted-foreground font-bold block">Target Due Date</span>
                      <input
                        type="date"
                        defaultValue={task.due_date}
                        disabled={isViewOnly}
                        onChange={(e) => updateDueDate(task.id, e.target.value)}
                        className="h-8 px-2 border border-input text-xs font-mono bg-white font-bold text-foreground disabled:opacity-75 focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>

                    {isAuditorOrAdmin && (
                      <div>
                        <span className="text-[10px] font-mono uppercase text-muted-foreground font-bold block">Severity</span>
                        <select
                          value={task.severity || "P1"}
                          onChange={(e) => updateSeverity(task.id, e.target.value)}
                          className="h-8 px-2 border border-input text-xs font-mono bg-white font-bold focus:outline-none focus:ring-1 focus:ring-primary"
                        >
                          <option value="P0">P0 (Critical 3d)</option>
                          <option value="P1">P1 (Major 7d)</option>
                          <option value="P2">P2 (Minor 14d)</option>
                        </select>
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-2 shrink-0">
                    {!isViewOnly && (
                      <button
                        onClick={() => {
                          setRectifyTask(task);
                          setRectifyNote(task.rectification_note || "");
                          setRectifyPhotos(task.rectification_evidence || []);
                        }}
                        className="h-9 px-3.5 bg-primary hover:bg-blue-800 text-white font-bold text-xs uppercase tracking-wider inline-flex items-center gap-1.5 transition-colors shadow-xs"
                      >
                        <Camera size={15} /> Submit Proof
                      </button>
                    )}

                    {isAuditorOrAdmin && (
                      <button
                        onClick={() => {
                          setVerifyTask(task);
                          setVerifyNote("");
                        }}
                        className="h-9 px-3.5 bg-foreground hover:bg-emerald-700 text-white font-bold text-xs uppercase tracking-wider inline-flex items-center gap-1.5 transition-colors shadow-xs"
                      >
                        <CheckCircle size={15} /> Verify & Close
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Submit Rectification Proof Modal */}
      {rectifyTask && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-border w-full max-w-lg shadow-2xl p-6 animate-scale-up">
            <div className="flex items-start justify-between pb-3 border-b border-border mb-4">
              <div>
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-accent bg-accent/10 px-2 py-0.5">
                  CAPA Remediation Protocol
                </span>
                <h3 className="font-display text-lg font-black uppercase tracking-tight text-foreground mt-1">
                  Upload Rectification Proof
                </h3>
              </div>
              <button
                onClick={() => setRectifyTask(null)}
                className="text-muted-foreground hover:text-foreground text-xl font-bold leading-none"
              >
                ×
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="p-3 bg-muted/30 border border-border">
                <div className="font-mono text-[10px] text-muted-foreground uppercase">{rectifyTask.category_name}</div>
                <div className="font-semibold text-foreground mt-0.5">{rectifyTask.item_text}</div>
                {rectifyTask.note && (
                  <div className="text-[11px] text-red-600 mt-1">Audited Finding: "{rectifyTask.note}"</div>
                )}
              </div>

              <div>
                <label className="block font-bold text-foreground uppercase tracking-wider text-[11px] mb-1">
                  Action Taken Remarks (Required) *
                </label>
                <textarea
                  value={rectifyNote}
                  onChange={(e) => setRectifyNote(e.target.value)}
                  rows={3}
                  placeholder="Describe the exact corrective measure completed (e.g., replaced defective equipment, trained technician, repaired dent, cleared wash bay)..."
                  className="w-full p-2.5 border border-input bg-white text-xs focus:ring-2 focus:ring-primary focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-foreground uppercase tracking-wider text-[11px] mb-1">
                  Attach Photographic Proof of Rectification
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleProofUpload}
                  disabled={uploadingPhoto}
                  className="block w-full text-xs text-muted-foreground file:mr-3 file:py-1.5 file:px-3 file:border-0 file:text-xs file:font-bold file:bg-foreground file:text-white hover:file:bg-primary file:cursor-pointer"
                />
                {uploadingPhoto && <div className="text-[11px] text-primary font-mono mt-1">Uploading proof photo to vault...</div>}

                {rectifyPhotos.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {rectifyPhotos.map((url, idx) => (
                      <div key={idx} className="relative w-16 h-16 border border-border overflow-hidden">
                        <img src={url} alt="Proof" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => setRectifyPhotos(rectifyPhotos.filter((_, i) => i !== idx))}
                          className="absolute top-0 right-0 bg-red-600 text-white w-4 h-4 flex items-center justify-center text-[10px]"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-4 mt-6 border-t border-border">
              <button
                type="button"
                onClick={() => setRectifyTask(null)}
                className="px-4 py-2 border border-border text-xs font-bold uppercase tracking-wider hover:bg-muted"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRectifySubmit}
                disabled={submittingRectify || uploadingPhoto}
                className="px-5 py-2 bg-primary hover:bg-blue-800 text-white text-xs font-bold uppercase tracking-wider transition-colors shadow-xs"
              >
                {submittingRectify ? "Submitting..." : "Submit for Auditor Verification"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Auditor Verification Sign-Off Modal */}
      {verifyTask && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-border w-full max-w-lg shadow-2xl p-6 animate-scale-up">
            <div className="flex items-start justify-between pb-3 border-b border-border mb-4">
              <div>
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2 py-0.5">
                  Auditor Verification & Sign-Off
                </span>
                <h3 className="font-display text-lg font-black uppercase tracking-tight text-foreground mt-1">
                  Inspect & Formally Close Defect
                </h3>
              </div>
              <button
                onClick={() => setVerifyTask(null)}
                className="text-muted-foreground hover:text-foreground text-xl font-bold leading-none"
              >
                ×
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="p-3 bg-muted/30 border border-border">
                <div className="font-mono text-[10px] text-muted-foreground uppercase">{verifyTask.category_name}</div>
                <div className="font-semibold text-foreground mt-0.5">{verifyTask.item_text}</div>
                {verifyTask.note && (
                  <div className="text-[11px] text-red-600 mt-1 font-medium">Audited Finding: "{verifyTask.note}"</div>
                )}
              </div>

              {/* Submitted Proof Review */}
              {verifyTask.rectification_note && (
                <div className="p-3 bg-blue-50/50 border border-blue-200">
                  <div className="font-mono font-bold text-[10px] uppercase text-blue-900 mb-1">
                    Branch Rectification Remarks:
                  </div>
                  <p className="font-semibold text-blue-950">"{verifyTask.rectification_note}"</p>
                  {verifyTask.rectification_evidence && verifyTask.rectification_evidence.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {verifyTask.rectification_evidence.map((url, idx) => (
                        <a key={idx} href={url} target="_blank" rel="noreferrer" className="w-16 h-16 border border-blue-300 block overflow-hidden">
                          <img src={url} alt="Proof" className="w-full h-full object-cover" />
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div>
                <label className="block font-bold text-foreground uppercase tracking-wider text-[11px] mb-1">
                  Auditor Verification Remarks
                </label>
                <textarea
                  value={verifyNote}
                  onChange={(e) => setVerifyNote(e.target.value)}
                  rows={2}
                  placeholder="Record formal verification comment (e.g. Verified physically on site, resolution compliant with Maruti protocol)..."
                  className="w-full p-2.5 border border-input bg-white text-xs focus:ring-2 focus:ring-primary focus:outline-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 mt-6 border-t border-border">
              <button
                type="button"
                onClick={() => handleVerifySubmit(false)}
                disabled={submittingVerify}
                className="px-4 py-2 bg-red-100 hover:bg-red-200 text-red-800 text-xs font-bold uppercase tracking-wider transition-colors inline-flex items-center gap-1"
              >
                <XCircle size={15} /> Reject & Return to Open
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setVerifyTask(null)}
                  className="px-3 py-2 border border-border text-xs font-bold uppercase tracking-wider hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleVerifySubmit(true)}
                  disabled={submittingVerify}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold uppercase tracking-wider transition-colors shadow-xs inline-flex items-center gap-1"
                >
                  <CheckCircle size={15} /> Approve & Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}