import React, { useEffect, useState } from "react";
import { api, getHostBase } from "@/lib/apiClient";
import AppShell from "@/components/AppShell";
import { useAuth } from "@/context/AuthContext";
import { ScoreBadge, scoreColor } from "@/components/StatusBits";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { Shield, Printer, FileXls, Sliders, ArrowUpRight } from "@phosphor-icons/react";

export default function AdminPortal() {
  const { user } = useAuth();
  const [audits, setAudits] = useState(null);

  useEffect(() => {
    api.get("/audits").then((r) => setAudits(r.data)).catch(() => toast.error("Failed to load records"));
  }, []);

  if (user?.role !== "admin") {
    return (
      <AppShell>
        <div className="border-2 border-destructive bg-destructive/5 p-8 sm:p-12 text-center max-w-2xl mx-auto my-6 sm:my-12 animate-fade-up">
          <Shield weight="duotone" size={56} className="mx-auto text-destructive mb-4" />
          <h2 className="font-display text-xl sm:text-2xl font-black tracking-tighter text-foreground uppercase">Access Restricted: Admin Portal</h2>
          <p className="text-xs sm:text-sm text-muted-foreground mt-2 font-mono">
            Your current authorization role is <strong>[{user?.role || "auditor"}]</strong>. Only designated OneUP Motors Administrators have rights to access this portal or download official PDF and Excel inspection reports.
          </p>
          <div className="mt-6">
            <Link to="/audits/new" className="h-11 px-6 bg-primary text-white font-bold text-xs sm:text-sm tracking-[0.15em] uppercase inline-flex items-center gap-2">
              Continue to Audit Input Console
            </Link>
          </div>
        </div>
      </AppShell>
    );
  }

  const exportPdf = (id, name) => {
    window.open(`${getHostBase()}/api/audits/${id}/pdf?auth=${encodeURIComponent(document.cookie)}`, "_blank");
    toast.success(`Generating branded PDF report for ${name}...`);
  };

  const exportExcel = (id, name) => {
    window.open(`${getHostBase()}/api/audits/${id}/excel?auth=${encodeURIComponent(document.cookie)}`, "_blank");
    toast.success(`Generating Excel spreadsheet (.xlsx) for ${name}...`);
  };

  if (!audits) return <AppShell><div className="h-64 border border-border bg-muted/40 animate-pulse" /></AppShell>;

  return (
    <AppShell>
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6 sm:mb-8 animate-fade-up">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-primary/10 border border-primary/30 text-primary font-mono text-[11px] font-bold uppercase tracking-wider mb-2 sm:mb-3">
            <Shield weight="fill" size={15} /> Executive Command Station
          </div>
          <h1 className="font-display text-3xl sm:text-4xl font-black tracking-tighter uppercase">Admin Report Portal</h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Exclusive administrative rights to inspect dealership records and generate official PDF &amp; Excel compliance spreadsheets.
          </p>
        </div>
        <Link to="/template" className="h-11 px-5 bg-foreground text-white hover:bg-primary font-bold text-xs tracking-[0.15em] uppercase inline-flex items-center justify-center gap-2 transition-colors">
          <Sliders weight="bold" size={16} /> Manage 133-Question Template
        </Link>
      </div>

      <div className="border border-border bg-white shadow-xs animate-fade-up">
        <div className="flex flex-wrap items-center justify-between px-4 sm:px-6 py-3 border-b border-border bg-muted/30 gap-2">
          <span className="font-mono text-xs font-bold tracking-widest uppercase text-muted-foreground">
            Inspections Archive ({audits.length} Records)
          </span>
          <span className="text-xs font-mono text-emerald-600 font-bold">● Admin Export Ready</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs sm:text-sm" data-testid="admin-export-table">
            <thead>
              <tr className="text-left text-[10px] tracking-[0.15em] uppercase text-muted-foreground border-b border-border bg-muted/10">
                <th className="px-4 sm:px-6 py-3 font-bold">Dealership &amp; Location</th>
                <th className="px-4 sm:px-6 py-3 font-bold hidden md:table-cell">Auditor</th>
                <th className="px-4 sm:px-6 py-3 font-bold hidden sm:table-cell">Date</th>
                <th className="px-4 sm:px-6 py-3 font-bold text-center">Score</th>
                <th className="px-4 sm:px-6 py-3 font-bold text-right">Admin Export Controls</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {audits.map((a, i) => (
                <tr key={a.id} className={`hover:bg-muted/30 transition-colors ${i % 2 ? "bg-muted/10" : ""}`}>
                  <td className="px-4 sm:px-6 py-3.5">
                    <Link to={`/audits/${a.id}`} className="font-bold text-sm sm:text-base text-foreground hover:text-primary transition-colors inline-flex items-center gap-1">
                      {a.dealership_name} <ArrowUpRight size={14} className="text-muted-foreground" />
                    </Link>
                    <div className="text-[11px] text-muted-foreground">{a.location}</div>
                  </td>
                  <td className="px-4 sm:px-6 py-3.5 font-mono text-xs text-foreground hidden md:table-cell">{a.auditor_name}</td>
                  <td className="px-4 sm:px-6 py-3.5 font-mono text-xs text-muted-foreground hidden sm:table-cell">{a.audit_date}</td>
                  <td className={`px-4 sm:px-6 py-3.5 text-center font-display font-black text-lg sm:text-xl ${scoreColor(a.overall_score)}`}>
                    {a.overall_score}%
                    <div className="mt-1 sm:hidden"><ScoreBadge status={a.status} /></div>
                  </td>
                  <td className="px-4 sm:px-6 py-3.5 text-right">
                    <div className="inline-flex flex-wrap items-center justify-end gap-1.5">
                      <button
                        onClick={() => exportPdf(a.id, a.dealership_name)}
                        className="h-8.5 px-3 bg-primary text-white font-bold text-[10px] sm:text-[11px] tracking-wider uppercase inline-flex items-center gap-1 hover:bg-blue-800 transition-colors shadow-xs"
                      >
                        <Printer weight="bold" size={14} /> PDF
                      </button>
                      <button
                        onClick={() => exportExcel(a.id, a.dealership_name)}
                        className="h-8.5 px-3 bg-emerald-700 text-white font-bold text-[10px] sm:text-[11px] tracking-wider uppercase inline-flex items-center gap-1 hover:bg-emerald-800 transition-colors shadow-xs"
                      >
                        <FileXls weight="bold" size={14} /> Excel
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {audits.length === 0 && (
                <tr>
                  <td colSpan="5" className="text-center py-16 text-muted-foreground font-mono">
                    No inspection reports recorded yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AppShell>
  );
}
