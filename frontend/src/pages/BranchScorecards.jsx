import React, { useEffect, useState } from "react";
import { api, API } from "@/lib/apiClient";
import AppShell from "@/components/AppShell";
import { ScoreBadge, scoreColor } from "@/components/StatusBits";
import { Link, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line
} from "recharts";
import {
  Buildings, TrendUp, Warning, CheckCircle, ArrowRight,
  FilePdf, FileXls, Camera, ClockCountdown, ShieldWarning,
  ArrowUpRight, CaretRight, PlusCircle, Sparkle, MagnifyingGlass
} from "@phosphor-icons/react";

export default function BranchScorecards() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [branches, setBranches] = useState([]);
  const [selectedBranchId, setSelectedBranchId] = useState("");
  const [loading, setLoading] = useState(true);

  // Rectification Modal State
  const [rectifyModalTask, setRectifyModalTask] = useState(null);
  const [rectifyNote, setRectifyNote] = useState("");
  const [rectifyProofUrls, setRectifyProofUrls] = useState([]);
  const [uploadingProof, setUploadingProof] = useState(false);
  const [submittingProof, setSubmittingProof] = useState(false);

  const loadData = () => {
    setLoading(true);
    api.get("/reports/branch-scorecards")
      .then((r) => {
        setBranches(r.data || []);
        const queryBranch = searchParams.get("branch");
        if (queryBranch && r.data.some(b => b.id === queryBranch)) {
          setSelectedBranchId(queryBranch);
        } else if (r.data.length > 0) {
          setSelectedBranchId(r.data[0].id);
        }
      })
      .catch((err) => {
        console.error("Failed to load branch scorecards:", err);
        toast.error("Failed to load branch scorecards");
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, []);

  const selectBranch = (id) => {
    setSelectedBranchId(id);
    setSearchParams({ branch: id });
  };

  const handleProofFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingProof(true);
    const fd = new FormData();
    fd.append("file", file);
    try {
      const res = await api.post("/upload", fd);
      const url = res.data.path.startsWith("http") ? res.data.path : `${API}/${res.data.path.replace(/^\/?api\//, "")}`;
      setRectifyProofUrls([...rectifyProofUrls, url]);
      toast.success("Rectification proof photo uploaded!");
    } catch (err) {
      toast.error("Failed to upload proof photo");
    } finally {
      setUploadingProof(false);
    }
  };

  const submitRectification = async () => {
    if (!rectifyNote.trim() || rectifyNote.trim().length < 3) {
      toast.error("Please enter detailed rectification remarks explaining how the defect was resolved.");
      return;
    }
    setSubmittingProof(true);
    try {
      await api.post(`/capa/${rectifyModalTask.id}/rectify`, {
        rectification_note: rectifyNote.trim(),
        rectification_evidence: rectifyProofUrls
      });
      toast.success("Rectification submitted successfully! Pending auditor verification.");
      setRectifyModalTask(null);
      setRectifyNote("");
      setRectifyProofUrls([]);
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to submit rectification");
    } finally {
      setSubmittingProof(false);
    }
  };

  if (loading) {
    return (
      <AppShell>
        <div className="space-y-6 animate-pulse">
          <div className="h-16 bg-muted/50 rounded-xs" />
          <div className="h-12 bg-muted/40 rounded-xs" />
          <div className="h-96 bg-muted/30 rounded-xs" />
        </div>
      </AppShell>
    );
  }

  const selectedBranch = branches.find(b => b.id === selectedBranchId) || branches[0];

  return (
    <AppShell>
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6 pb-6 border-b border-border">
        <div>
          <div className="inline-flex items-center gap-1.5 font-mono text-[10px] tracking-[0.3em] uppercase text-accent font-black mb-2">
            <Buildings weight="bold" size={14} /> Dealership Performance Analytics
          </div>
          <h1 className="font-display text-3xl sm:text-4xl font-black tracking-tight uppercase text-foreground">
            Branch-Wise Audit Scorecards
          </h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
            In-depth compliance profiles, historical trajectory charts, 20-pillar performance benchmarks, and active remediation workflows across all 7 OneUP locations.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Link
            to="/mis"
            className="h-10 px-4 border border-border bg-white text-foreground hover:bg-muted font-bold text-xs tracking-wider uppercase inline-flex items-center gap-2 transition-colors shadow-xs"
          >
            Director MIS
          </Link>
          <Link
            to="/audits/new"
            className="h-10 px-4 bg-primary text-white hover:bg-blue-800 font-bold text-xs tracking-wider uppercase inline-flex items-center gap-2 transition-colors shadow-xs"
          >
            <PlusCircle weight="bold" size={16} /> Run Audit
          </Link>
        </div>
      </div>

      {/* Dealership Selector Tabs (Horizontal Pills) */}
      <div className="flex items-center gap-2 overflow-x-auto pb-3 mb-6 scrollbar-thin">
        {branches.map((b) => {
          const isActive = b.id === selectedBranchId;
          return (
            <button
              key={b.id}
              onClick={() => selectBranch(b.id)}
              className={`px-4 py-2.5 text-xs font-bold uppercase tracking-wider shrink-0 border transition-all flex items-center gap-2 ${
                isActive
                  ? "bg-foreground text-white border-foreground shadow-xs"
                  : "bg-white text-muted-foreground border-border hover:text-foreground hover:bg-muted/30"
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${
                b.status_tier === "Compliant" ? "bg-emerald-500" :
                b.status_tier === "Marginal" ? "bg-amber-500" :
                b.status_tier === "Critical" ? "bg-red-500" : "bg-slate-300"
              }`} />
              {b.name.replace("OneUP Motors - ", "").replace("OneUP Motors ", "")}
              {b.latest_score !== null && (
                <span className={`font-mono text-[11px] font-bold ${isActive ? "text-amber-400" : "text-foreground"}`}>
                  {b.latest_score}%
                </span>
              )}
            </button>
          );
        })}
      </div>

      {selectedBranch && (
        <div className="space-y-8 animate-fade-up">
          {/* Selected Branch Profile Banner */}
          <div className="border border-border bg-white p-6 shadow-xs relative overflow-hidden">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="font-mono text-[10px] tracking-[0.2em] uppercase font-bold text-muted-foreground bg-muted px-2 py-0.5">
                    Branch Code: {selectedBranch.code}
                  </span>
                  <ScoreBadge status={selectedBranch.status_tier} />
                </div>
                <h2 className="font-display text-2xl sm:text-3xl font-black uppercase tracking-tight text-foreground">
                  {selectedBranch.name}
                </h2>
                <div className="text-xs text-muted-foreground font-mono mt-1">
                  Location: {selectedBranch.location}
                </div>
              </div>

              {/* Quick KPI Strip */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 border-t lg:border-t-0 lg:border-l border-border pt-4 lg:pt-0 lg:pl-6 shrink-0">
                <div className="pr-4">
                  <div className="text-[10px] font-mono uppercase text-muted-foreground font-bold">Latest Score</div>
                  <div className={`font-display text-3xl font-black mt-1 ${scoreColor(selectedBranch.latest_score || 0)}`}>
                    {selectedBranch.latest_score !== null ? `${selectedBranch.latest_score}%` : "—"}
                  </div>
                </div>

                <div className="pr-4">
                  <div className="text-[10px] font-mono uppercase text-muted-foreground font-bold">Historical Avg</div>
                  <div className="font-display text-3xl font-black text-foreground mt-1">
                    {selectedBranch.avg_score ? `${selectedBranch.avg_score}%` : "—"}
                  </div>
                </div>

                <div className="pr-4">
                  <div className="text-[10px] font-mono uppercase text-muted-foreground font-bold">Inspections</div>
                  <div className="font-display text-3xl font-black text-primary mt-1">
                    {selectedBranch.total_audits}
                  </div>
                </div>

                <div>
                  <div className="text-[10px] font-mono uppercase text-muted-foreground font-bold">Open CAPA</div>
                  <div className={`font-display text-3xl font-black mt-1 ${
                    selectedBranch.capa_summary.open > 0 ? "text-red-600" : "text-emerald-600"
                  }`}>
                    {selectedBranch.capa_summary.open}
                  </div>
                  {selectedBranch.capa_summary.overdue > 0 && (
                    <div className="text-[10px] font-mono text-red-600 font-bold">
                      ({selectedBranch.capa_summary.overdue} overdue)
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Middle Row: Trajectory Chart & Top Defects */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Historical Score Trajectory (7 cols) */}
            <div className="lg:col-span-7 border border-border bg-white p-6 shadow-xs">
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-border">
                <div>
                  <div className="font-mono text-[10px] tracking-[0.2em] uppercase text-muted-foreground font-bold">Historical Audit Progress</div>
                  <h3 className="font-display text-lg font-black uppercase tracking-tight">Compliance Trajectory Over Time</h3>
                </div>
                <span className="text-xs font-mono text-muted-foreground">Target: ≥ 80%</span>
              </div>

              {selectedBranch.trajectory && selectedBranch.trajectory.length > 0 ? (
                <div>
                  <div className="h-64 mb-4">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={selectedBranch.trajectory} margin={{ top: 10, right: 20, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                        <XAxis dataKey="date" tick={{ fontSize: 10, fontFamily: "IBM Plex Mono" }} stroke="#9CA3AF" />
                        <YAxis domain={[0, 100]} tick={{ fontSize: 10, fontFamily: "IBM Plex Mono" }} stroke="#9CA3AF" />
                        <Tooltip contentStyle={{ borderRadius: 0, border: "1px solid #0A0A0A", fontSize: 12 }} />
                        <Line type="monotone" dataKey="score" stroke="#0047AB" strokeWidth={3} dot={{ r: 5, fill: "#FF5A00" }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="border-t border-border/80 pt-3">
                    <div className="text-[10px] font-mono uppercase text-muted-foreground font-bold mb-2">Past Inspection History</div>
                    <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                      {selectedBranch.trajectory.slice().reverse().map((audit, i) => (
                        <div key={i} className="flex items-center justify-between text-xs p-2 bg-muted/20 border border-border/60">
                          <div className="flex items-center gap-3">
                            <span className="font-mono text-[11px] font-bold text-foreground">{audit.date}</span>
                            <span className="text-muted-foreground">Audited by {audit.auditor}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className={`font-mono font-black ${scoreColor(audit.score)}`}>{audit.score}%</span>
                            <Link
                              to={`/audits/${audit.id}`}
                              className="text-primary hover:underline font-bold text-[11px] inline-flex items-center gap-0.5"
                            >
                              Report <ArrowUpRight size={12} />
                            </Link>
                            <a
                              href={`${API}/audits/${audit.id}/pdf`}
                              className="text-muted-foreground hover:text-foreground"
                              title="Download PDF"
                            >
                              <FilePdf size={14} />
                            </a>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="py-16 text-center text-muted-foreground">
                  No completed inspections on record for this branch yet.
                </div>
              )}
            </div>

            {/* Top Vulnerabilities & Recurring Deficiencies (5 cols) */}
            <div className="lg:col-span-5 border border-border bg-white p-6 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-border">
                  <div>
                    <div className="font-mono text-[10px] tracking-[0.2em] uppercase text-red-600 font-bold">Deficiency Analysis</div>
                    <h3 className="font-display text-lg font-black uppercase tracking-tight">Top Recurring Deficiencies</h3>
                  </div>
                </div>

                {selectedBranch.top_defects && selectedBranch.top_defects.length > 0 ? (
                  <div className="space-y-3">
                    {selectedBranch.top_defects.map((def, i) => (
                      <div key={i} className="p-3 border border-border/80 bg-red-50/15">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-mono text-[10px] uppercase font-bold text-muted-foreground truncate max-w-[160px]">
                            {def.category}
                          </span>
                          <span className={`text-[10px] font-mono px-2 py-0.5 font-bold uppercase rounded-xs ${
                            def.severity === "P0" ? "bg-red-600 text-white" : "bg-orange-500 text-white"
                          }`}>
                            {def.severity}
                          </span>
                        </div>
                        <p className="text-xs font-semibold text-foreground line-clamp-2 mb-2">
                          {def.text}
                        </p>
                        <div className="text-[10px] font-mono text-red-600 font-bold">
                          Failed in {def.count} audits at this location
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-12 text-center text-muted-foreground text-xs">
                    No recurring defects recorded for this branch.
                  </div>
                )}
              </div>

              <div className="pt-4 mt-4 border-t border-border">
                <Link
                  to="/tasks"
                  className="w-full py-2.5 bg-foreground hover:bg-primary text-white text-center text-xs font-bold uppercase tracking-wider block transition-colors"
                >
                  Manage Branch Action Tasks ({selectedBranch.capa_summary.open} Open)
                </Link>
              </div>
            </div>
          </div>

          {/* 20 Pillar Operational Radar / Breakdown */}
          <div className="border border-border bg-white p-6 shadow-xs">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-border">
              <div>
                <div className="font-mono text-[10px] tracking-[0.2em] uppercase text-muted-foreground font-bold">Comprehensive Evaluation</div>
                <h3 className="font-display text-xl font-black uppercase tracking-tight">
                  20-Pillar Operational Performance Breakdown
                </h3>
              </div>
              <span className="text-xs font-mono text-muted-foreground">
                Average score achieved per operational category across inspections
              </span>
            </div>

            {selectedBranch.category_breakdown && selectedBranch.category_breakdown.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {selectedBranch.category_breakdown.map((cat, i) => {
                  const isGood = cat.score >= 80;
                  const isMid = cat.score >= 60 && cat.score < 80;
                  return (
                    <div key={i} className="border border-border/80 p-3 bg-muted/10 hover:border-primary/50 transition-colors">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-foreground truncate pr-2" title={cat.name}>
                          {cat.name}
                        </span>
                        <span className={`font-mono text-xs font-black ${
                          isGood ? "text-emerald-600" : isMid ? "text-orange-500" : "text-red-600"
                        }`}>
                          {cat.score}%
                        </span>
                      </div>
                      <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden mb-2">
                        <div
                          className={`h-full ${isGood ? "bg-emerald-600" : isMid ? "bg-orange-500" : "bg-red-600"}`}
                          style={{ width: `${Math.min(100, cat.score)}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between text-[10px] font-mono text-muted-foreground">
                        <span>Items passed:</span>
                        <span>{cat.passed} / {cat.applicable}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-12 text-center text-muted-foreground text-xs">
                No pillar evaluations on record yet for this branch.
              </div>
            )}
          </div>

          {/* Active Branch CAPA & Remediation Tracker */}
          <div className="border border-border bg-white p-6 shadow-xs">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-border">
              <div>
                <div className="font-mono text-[10px] tracking-[0.2em] uppercase text-accent font-bold">Remediation Action Log</div>
                <h3 className="font-display text-xl font-black uppercase tracking-tight">
                  Active CAPA Items for {selectedBranch.name}
                </h3>
              </div>
              <span className="font-mono text-xs font-bold px-2.5 py-1 bg-red-50 text-red-700 border border-red-200">
                {selectedBranch.active_tasks?.length || 0} Open Items
              </span>
            </div>

            {selectedBranch.active_tasks && selectedBranch.active_tasks.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead>
                    <tr className="border-b border-border text-[10px] font-mono uppercase text-muted-foreground tracking-wider">
                      <th className="py-2.5 px-3 font-bold">Severity</th>
                      <th className="py-2.5 px-3 font-bold">Category & Inspection Finding</th>
                      <th className="py-2.5 px-3 font-bold">Assigned Owner</th>
                      <th className="py-2.5 px-3 font-bold">Target SLA Due</th>
                      <th className="py-2.5 px-3 font-bold">Ageing / Status</th>
                      <th className="py-2.5 px-3 font-bold text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {selectedBranch.active_tasks.map((task) => (
                      <tr key={task.id} className="hover:bg-muted/30 transition-colors">
                        <td className="py-3 px-3">
                          <span className={`inline-flex items-center px-2 py-0.5 text-[10px] font-mono font-bold uppercase rounded-xs ${
                            task.severity === "P0" ? "bg-red-600 text-white" :
                            task.severity === "P1" ? "bg-orange-500 text-white" : "bg-amber-400 text-slate-900"
                          }`}>
                            {task.severity} {task.severity_label}
                          </span>
                        </td>
                        <td className="py-3 px-3 max-w-sm">
                          <div className="text-[11px] font-mono text-muted-foreground uppercase">{task.category_name}</div>
                          <div className="text-xs font-semibold text-foreground mt-0.5">{task.item_text}</div>
                          {task.note && (
                            <div className="text-[11px] italic text-muted-foreground mt-1">
                              Finding: "{task.note}"
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-3 text-xs font-semibold text-muted-foreground">
                          {task.owner || "OneUP Service Manager"}
                        </td>
                        <td className="py-3 px-3 font-mono text-xs">
                          {task.due_date || "—"}
                        </td>
                        <td className="py-3 px-3">
                          {task.is_overdue ? (
                            <span className="inline-flex items-center gap-1 font-mono text-[10px] font-bold text-red-600 bg-red-50 border border-red-200 px-2 py-0.5 rounded-xs animate-pulse">
                              <ClockCountdown size={12} /> {task.days_overdue}d Overdue
                            </span>
                          ) : task.status === "rectified" ? (
                            <span className="inline-flex items-center gap-1 font-mono text-[10px] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-xs">
                              Rectified (Review)
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 font-mono text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-xs">
                              {task.age_days}d Active
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-right">
                          <button
                            onClick={() => {
                              setRectifyModalTask(task);
                              setRectifyNote(task.rectification_note || "");
                              setRectifyProofUrls(task.rectification_evidence || []);
                            }}
                            className="px-3 py-1.5 bg-primary hover:bg-blue-800 text-white font-bold text-[10px] uppercase tracking-wider transition-colors inline-flex items-center gap-1 shadow-xs"
                          >
                            <Camera size={13} /> Submit Proof
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="py-8 text-center text-muted-foreground text-xs">
                No active open CAPA defects for this dealership branch!
              </div>
            )}
          </div>
        </div>
      )}

      {/* Proof of Rectification Modal */}
      {rectifyModalTask && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-border w-full max-w-lg shadow-2xl p-6 animate-scale-up">
            <div className="flex items-start justify-between pb-3 border-b border-border mb-4">
              <div>
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-accent bg-accent/10 px-2 py-0.5">
                  CAPA Remediation Proof
                </span>
                <h3 className="font-display text-lg font-black uppercase tracking-tight text-foreground mt-1">
                  Upload Rectification Evidence
                </h3>
              </div>
              <button
                onClick={() => setRectifyModalTask(null)}
                className="text-muted-foreground hover:text-foreground text-xl font-bold leading-none"
              >
                ×
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="p-3 bg-muted/30 border border-border">
                <div className="font-mono text-[10px] text-muted-foreground uppercase">{rectifyModalTask.category_name}</div>
                <div className="font-semibold text-foreground mt-0.5">{rectifyModalTask.item_text}</div>
                {rectifyModalTask.note && (
                  <div className="text-[11px] text-red-600 mt-1">Audited Finding: "{rectifyModalTask.note}"</div>
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
                  placeholder="Detail the exact corrective action taken to fix this defect (e.g. replaced missing fire tag, re-trained technician, repaired damaged ramp)..."
                  className="w-full p-2.5 border border-input bg-white text-xs focus:ring-2 focus:ring-primary focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-foreground uppercase tracking-wider text-[11px] mb-1">
                  Photographic Proof of Resolution
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleProofFileUpload}
                  disabled={uploadingProof}
                  className="block w-full text-xs text-muted-foreground file:mr-3 file:py-1.5 file:px-3 file:border-0 file:text-xs file:font-bold file:bg-foreground file:text-white hover:file:bg-primary file:cursor-pointer"
                />
                {uploadingProof && <div className="text-[11px] text-primary font-mono mt-1">Uploading photo...</div>}

                {rectifyProofUrls.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {rectifyProofUrls.map((url, idx) => (
                      <div key={idx} className="relative w-16 h-16 border border-border overflow-hidden">
                        <img src={url} alt="Proof" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => setRectifyProofUrls(rectifyProofUrls.filter((_, i) => i !== idx))}
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
                onClick={() => setRectifyModalTask(null)}
                className="px-4 py-2 border border-border text-xs font-bold uppercase tracking-wider hover:bg-muted"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={submitRectification}
                disabled={submittingProof || uploadingProof}
                className="px-5 py-2 bg-primary hover:bg-blue-800 text-white text-xs font-bold uppercase tracking-wider transition-colors shadow-xs"
              >
                {submittingProof ? "Submitting..." : "Submit Rectification"}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}