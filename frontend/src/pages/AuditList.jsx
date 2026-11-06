import React, { useEffect, useState } from "react";
import { api, API } from "@/lib/apiClient";
import { useAuth } from "@/context/AuthContext";
import AppShell from "@/components/AppShell";
import { ScoreBadge, scoreColor } from "@/components/StatusBits";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import {
  PlusCircle, Trash, ClipboardText, MagnifyingGlass, FilePdf, FileXls,
  DownloadSimple, Funnel, Buildings, ShieldCheck, ArrowSquareOut, CheckCircle, WarningCircle
} from "@phosphor-icons/react";

const STANDARD_BRANCH_NAMES = [
  "OneUP Motors - Krishna-nagar",
  "OneUP Motors - Mahanagar",
  "OneUP Motors - TP Nagar",
  "OneUP Motors - Banthra",
  "OneUP Motors - Takrohi",
  "OneUP Motors - Malihabad",
  "OneUP Motors Nexa"
];

function normalizeBranchName(name = "", loc = "") {
  const combined = (String(name || "") + " " + String(loc || "")).toLowerCase();
  if (combined.includes("krishna") || combined.includes("krishana")) return "OneUP Motors - Krishna-nagar";
  if (combined.includes("mahanagar")) return "OneUP Motors - Mahanagar";
  if (combined.includes("tp nagar") || combined.includes("transport")) return "OneUP Motors - TP Nagar";
  if (combined.includes("banthra")) return "OneUP Motors - Banthra";
  if (combined.includes("takrohi")) return "OneUP Motors - Takrohi";
  if (combined.includes("malihabad")) return "OneUP Motors - Malihabad";
  if (combined.includes("nexa") || combined.includes("bhitauli")) return "OneUP Motors Nexa";
  return name.trim() || "OneUP Motors";
}

export default function AuditList() {
  const { user } = useAuth();
  const [audits, setAudits] = useState(null);
  const [q, setQ] = useState("");
  const [selectedBranch, setSelectedBranch] = useState("all");
  const [selectedTier, setSelectedTier] = useState("all");
  const [sortBy, setSortBy] = useState("date_desc");

  const isAdmin = user?.role === "admin";

  const load = () => {
    api.get("/audits")
      .then((r) => setAudits(r.data))
      .catch(() => toast.error("Failed to load audit vault"));
  };

  useEffect(() => {
    load();
  }, []);

  const remove = async (id, name) => {
    if (!window.confirm(`Are you sure you want to permanently delete audit record for "${name}"?`)) {
      return;
    }
    try {
      await api.delete(`/audits/${id}`);
      toast.success("Audit permanently removed from repository");
      setAudits((a) => a.filter((x) => x.id !== id));
    } catch (e) {
      toast.error("Delete failed");
    }
  };

  // Filter & Sort Logic
  const allAudits = audits || [];
  const filtered = allAudits.filter((a) => {
    const canonical = normalizeBranchName(a.dealership_name, a.location);
    const searchMatch =
      canonical.toLowerCase().includes(q.toLowerCase()) ||
      (a.location || "").toLowerCase().includes(q.toLowerCase()) ||
      (a.auditor_name || "").toLowerCase().includes(q.toLowerCase()) ||
      (a.general_notes || "").toLowerCase().includes(q.toLowerCase());

    if (!searchMatch) return false;

    if (selectedBranch !== "all" && canonical !== selectedBranch) {
      return false;
    }

    if (selectedTier === "compliant" && a.overall_score < 80) return false;
    if (selectedTier === "marginal" && (a.overall_score < 60 || a.overall_score >= 80)) return false;
    if (selectedTier === "critical" && a.overall_score >= 60) return false;

    return true;
  }).sort((a, b) => {
    if (sortBy === "date_desc") return new Date(b.audit_date || b.created_at) - new Date(a.audit_date || a.created_at);
    if (sortBy === "date_asc") return new Date(a.audit_date || a.created_at) - new Date(b.audit_date || b.created_at);
    if (sortBy === "score_desc") return (b.overall_score || 0) - (a.overall_score || 0);
    if (sortBy === "score_asc") return (a.overall_score || 0) - (b.overall_score || 0);
    return 0;
  });

  // Export filtered dataset to CSV
  const exportToCSV = () => {
    if (filtered.length === 0) {
      toast.error("No audits available to export");
      return;
    }
    const headers = ["Dealership Branch", "Location", "Auditor Name", "Audit Date", "Overall Score (%)", "Compliance Status", "Audit Ledger ID"];
    const rows = filtered.map(a => [
      `"${normalizeBranchName(a.dealership_name, a.location)}"`,
      `"${a.location || ""}"`,
      `"${a.auditor_name || ""}"`,
      `"${a.audit_date || ""}"`,
      a.overall_score,
      `"${a.status || ""}"`,
      `"${a.id}"`
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `OneUP_Motors_Audit_Repository_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Repository exported to CSV successfully!");
  };

  // Metrics computation for ribbon
  const totalCount = allAudits.length;
  const avgScore = totalCount > 0 ? Math.round((allAudits.reduce((acc, a) => acc + (a.overall_score || 0), 0) / totalCount) * 10) / 10 : 0;
  const compliantCount = allAudits.filter(a => a.overall_score >= 80).length;
  const marginalCount = allAudits.filter(a => a.overall_score >= 60 && a.overall_score < 80).length;
  const criticalCount = allAudits.filter(a => a.overall_score < 60).length;

  return (
    <AppShell>
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6 pb-6 border-b border-border">
        <div>
          <div className="inline-flex items-center gap-1.5 font-mono text-[10px] tracking-[0.3em] uppercase text-accent font-black mb-2">
            <ClipboardText weight="bold" size={14} /> OneUP Central Audit Repository
          </div>
          <h1 className="font-display text-3xl sm:text-4xl font-black tracking-tight uppercase text-foreground">
            Central Audit Repository
          </h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
            Immutable inspection archive, official compliance records, evidence-based formal reports, and multi-branch search across all OneUP facilities.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={exportToCSV}
            className="h-10 px-4 border border-border bg-white text-foreground hover:bg-muted font-bold text-xs tracking-wider uppercase inline-flex items-center gap-2 transition-colors shadow-xs"
          >
            <DownloadSimple size={15} /> Export CSV
          </button>
          <Link
            to="/audits/new"
            data-testid="list-new-audit"
            className="h-10 px-4 bg-primary text-white hover:bg-blue-800 font-bold text-xs tracking-wider uppercase inline-flex items-center gap-2 transition-colors shadow-xs"
          >
            <PlusCircle weight="bold" size={16} /> Run New Audit
          </Link>
        </div>
      </div>

      {/* Metrics Ribbon */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
        <div className="border border-border p-4 bg-white shadow-xs">
          <div className="text-[10px] font-mono uppercase text-muted-foreground font-bold">Total Vault Audits</div>
          <div className="font-display text-2xl font-black text-foreground mt-1">{totalCount}</div>
        </div>

        <div className="border border-border p-4 bg-white shadow-xs">
          <div className="text-[10px] font-mono uppercase text-muted-foreground font-bold">Avg Compliance</div>
          <div className={`font-display text-2xl font-black mt-1 ${scoreColor(avgScore)}`}>{avgScore}%</div>
        </div>

        <div className="border border-border p-4 bg-white shadow-xs">
          <div className="text-[10px] font-mono uppercase text-emerald-700 font-bold">Compliant (≥80%)</div>
          <div className="font-display text-2xl font-black text-emerald-600 mt-1">{compliantCount}</div>
        </div>

        <div className="border border-border p-4 bg-white shadow-xs">
          <div className="text-[10px] font-mono uppercase text-amber-700 font-bold">Marginal (60-79%)</div>
          <div className="font-display text-2xl font-black text-orange-500 mt-1">{marginalCount}</div>
        </div>

        <div className="border border-border p-4 bg-white shadow-xs col-span-2 sm:col-span-1">
          <div className="text-[10px] font-mono uppercase text-red-700 font-bold">Critical (&lt;60%)</div>
          <div className="font-display text-2xl font-black text-red-600 mt-1">{criticalCount}</div>
        </div>
      </div>

      {/* Advanced Filter Toolbar */}
      <div className="bg-white border border-border p-4 mb-6 shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
          {/* Search Box */}
          <div className="sm:col-span-5 relative">
            <MagnifyingGlass size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              data-testid="audit-search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search dealership, location, auditor, notes..."
              className="w-full h-10 pl-9 pr-3 border border-input bg-white text-xs focus:ring-2 focus:ring-primary focus:outline-none"
            />
          </div>

          {/* Branch Dropdown */}
          <div className="sm:col-span-3">
            <select
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(e.target.value)}
              className="w-full h-10 px-3 border border-input bg-white text-xs font-semibold focus:ring-2 focus:ring-primary focus:outline-none"
            >
              <option value="all">All Dealership Branches</option>
              {STANDARD_BRANCH_NAMES.map((name) => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
          </div>

          {/* Tier Dropdown */}
          <div className="sm:col-span-2">
            <select
              value={selectedTier}
              onChange={(e) => setSelectedTier(e.target.value)}
              className="w-full h-10 px-3 border border-input bg-white text-xs font-semibold focus:ring-2 focus:ring-primary focus:outline-none"
            >
              <option value="all">All Compliance Tiers</option>
              <option value="compliant">Compliant (≥80%)</option>
              <option value="marginal">Marginal (60-79%)</option>
              <option value="critical">Critical (&lt;60%)</option>
            </select>
          </div>

          {/* Sort By Dropdown */}
          <div className="sm:col-span-2">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="w-full h-10 px-3 border border-input bg-white text-xs font-semibold focus:ring-2 focus:ring-primary focus:outline-none"
            >
              <option value="date_desc">Date: Newest First</option>
              <option value="date_asc">Date: Oldest First</option>
              <option value="score_desc">Score: High to Low</option>
              <option value="score_asc">Score: Low to High</option>
            </select>
          </div>
        </div>

        <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t border-border/60">
          <div>
            Showing <span className="font-bold text-foreground">{filtered.length}</span> of {totalCount} total audit records
          </div>
          {(q || selectedBranch !== "all" || selectedTier !== "all") && (
            <button
              onClick={() => { setQ(""); setSelectedBranch("all"); setSelectedTier("all"); }}
              className="text-primary hover:underline font-bold text-xs"
            >
              Reset All Filters
            </button>
          )}
        </div>
      </div>

      {/* Main Table */}
      {audits === null ? (
        <div className="h-64 border border-border bg-muted/40 animate-pulse" />
      ) : filtered.length === 0 ? (
        <div className="border border-border bg-white py-24 text-center animate-fade-up" data-testid="empty-audits">
          <ClipboardText weight="duotone" size={64} className="mx-auto text-muted-foreground/50" />
          <h3 className="font-display text-2xl font-bold tracking-tight mt-6">No audits matched your criteria</h3>
          <p className="text-sm text-muted-foreground mt-2 mb-4">Try clearing active filters or initiate a new inspection.</p>
          <button
            onClick={() => { setQ(""); setSelectedBranch("all"); setSelectedTier("all"); }}
            className="px-4 py-2 bg-foreground text-white text-xs font-bold uppercase tracking-wider hover:bg-primary transition-colors"
          >
            Clear Filters
          </button>
        </div>
      ) : (
        <div className="border border-border bg-white shadow-xs animate-fade-up overflow-x-auto">
          <table className="w-full text-sm text-left" data-testid="audits-table">
            <thead>
              <tr className="border-b border-border bg-muted/30 text-[10px] font-mono uppercase text-muted-foreground tracking-wider">
                <th className="py-3 px-4 font-bold">Dealership Branch</th>
                <th className="py-3 px-4 font-bold">Inspector</th>
                <th className="py-3 px-4 font-bold">Audit Date</th>
                <th className="py-3 px-4 font-bold text-right">Score</th>
                <th className="py-3 px-4 font-bold">Status</th>
                <th className="py-3 px-4 font-bold">Ledger ID</th>
                <th className="py-3 px-4 font-bold text-right">Official Reports & Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {filtered.map((a, i) => {
                const canonicalName = normalizeBranchName(a.dealership_name, a.location);
                return (
                  <tr
                    key={a.id}
                    className={`hover:bg-muted/30 transition-colors ${i % 2 === 1 ? "bg-muted/15" : ""}`}
                  >
                    <td className="py-3.5 px-4">
                      <Link
                        to={`/audits/${a.id}`}
                        className="font-bold text-foreground hover:text-primary transition-colors block text-sm"
                        data-testid={`audit-row-${a.id}`}
                      >
                        {canonicalName}
                      </Link>
                      <div className="text-xs text-muted-foreground mt-0.5">{a.location}</div>
                    </td>

                    <td className="py-3.5 px-4 font-medium text-xs">
                      {a.auditor_name}
                    </td>

                    <td className="py-3.5 px-4 font-mono text-xs text-foreground font-semibold">
                      {a.audit_date}
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <div className="inline-flex items-center gap-2">
                        <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden hidden sm:block">
                          <div
                            className={`h-full ${
                              a.overall_score >= 80 ? "bg-emerald-600" :
                              a.overall_score >= 60 ? "bg-orange-500" : "bg-red-600"
                            }`}
                            style={{ width: `${Math.min(100, a.overall_score)}%` }}
                          />
                        </div>
                        <span className={`font-display font-black text-base ${scoreColor(a.overall_score)}`}>
                          {a.overall_score}%
                        </span>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <ScoreBadge status={a.status} />
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="font-mono text-[10px] text-muted-foreground bg-muted/60 px-1.5 py-0.5 rounded-xs" title={`Ledger Record: ${a.id}`}>
                        #{a.id.slice(0, 8)}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        <Link
                          to={`/audits/${a.id}`}
                          className="h-8 px-2.5 bg-foreground hover:bg-primary text-white text-[10px] font-bold uppercase tracking-wider inline-flex items-center gap-1 transition-colors"
                          title="View Full Inspection"
                        >
                          View
                        </Link>

                        <a
                          href={`${API}/audits/${a.id}/pdf`}
                          className="w-8 h-8 border border-border inline-flex items-center justify-center hover:bg-red-50 hover:text-red-700 hover:border-red-300 transition-colors"
                          title="Download Evidence-Embedded PDF"
                        >
                          <FilePdf size={16} />
                        </a>

                        <a
                          href={`${API}/audits/${a.id}/excel`}
                          className="w-8 h-8 border border-border inline-flex items-center justify-center hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-300 transition-colors"
                          title="Download Inspection Excel Matrix"
                        >
                          <FileXls size={16} />
                        </a>

                        {isAdmin && (
                          <button
                            onClick={() => remove(a.id, canonicalName)}
                            data-testid={`delete-audit-${a.id}`}
                            className="w-8 h-8 border border-border inline-flex items-center justify-center hover:bg-destructive hover:text-white hover:border-destructive transition-colors text-muted-foreground"
                            title="Delete"
                          >
                            <Trash size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </AppShell>
  );
}