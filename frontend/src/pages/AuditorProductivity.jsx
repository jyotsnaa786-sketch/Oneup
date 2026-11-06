import React, { useEffect, useState } from "react";
import { api } from "@/lib/apiClient";
import AppShell from "@/components/AppShell";
import { ScoreBadge, scoreColor } from "@/components/StatusBits";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import {
  Users, Camera, CheckSquare, TrendUp, MagnifyingGlass,
  Sparkle, ShieldCheck, FileText, ArrowUpRight, Trophy
} from "@phosphor-icons/react";

export default function AuditorProductivity() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadData = () => {
    setLoading(true);
    api.get("/reports/auditor-productivity")
      .then((r) => setData(r.data))
      .catch((err) => {
        console.error("Failed to load auditor productivity:", err);
        toast.error("Failed to load auditor productivity metrics");
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, []);

  if (loading || !data) {
    return (
      <AppShell>
        <div className="space-y-6 animate-pulse">
          <div className="h-16 bg-muted/50 rounded-xs" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-28 bg-muted/40 border border-border" />
            ))}
          </div>
          <div className="h-96 bg-muted/30 border border-border" />
        </div>
      </AppShell>
    );
  }

  const {
    total_auditors,
    total_audits_logged,
    total_photos_archived,
    avg_photos_per_audit,
    total_observations,
    auditors = []
  } = data;

  return (
    <AppShell>
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6 pb-6 border-b border-border">
        <div>
          <div className="inline-flex items-center gap-1.5 font-mono text-[10px] tracking-[0.3em] uppercase text-accent font-black mb-2">
            <Users weight="bold" size={14} /> Field Surveillance Governance
          </div>
          <h1 className="font-display text-3xl sm:text-4xl font-black tracking-tight uppercase text-foreground">
            Auditor Productivity Tracking
          </h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
            Inspector activity metrics, evidence density ratings (photographic rigor), observation detection rates, and audit turnaround tracking across the OneUP field surveillance team.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Link
            to="/audits/new"
            className="h-10 px-4 bg-primary text-white hover:bg-blue-800 font-bold text-xs tracking-wider uppercase inline-flex items-center gap-2 transition-colors shadow-xs"
          >
            Run New Audit
          </Link>
        </div>
      </div>

      {/* KPI Ribbon */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        <div className="border border-border p-6 bg-white shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] tracking-[0.2em] uppercase font-bold text-muted-foreground">Active Inspectors</span>
            <Users size={20} className="text-primary" />
          </div>
          <div className="font-display text-4xl font-black tracking-tight">{total_auditors}</div>
          <div className="text-xs text-muted-foreground mt-2 font-mono">Field surveillance team members</div>
        </div>

        <div className="border border-border p-6 bg-white shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] tracking-[0.2em] uppercase font-bold text-muted-foreground">Audits Completed</span>
            <CheckSquare size={20} className="text-emerald-600" />
          </div>
          <div className="font-display text-4xl font-black tracking-tight">{total_audits_logged}</div>
          <div className="text-xs text-muted-foreground mt-2 font-mono">Comprehensive 20-pillar audits</div>
        </div>

        <div className="border border-border p-6 bg-white shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] tracking-[0.2em] uppercase font-bold text-muted-foreground">Evidence Density</span>
            <Camera size={20} className="text-accent" />
          </div>
          <div className="flex items-baseline gap-2">
            <div className="font-display text-4xl font-black tracking-tight">{avg_photos_per_audit}</div>
            <span className="text-xs font-mono font-bold text-muted-foreground">photos / audit</span>
          </div>
          <div className="text-xs text-muted-foreground mt-2 font-mono">{total_photos_archived} photos archived in vault</div>
        </div>

        <div className="border border-border p-6 bg-white shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] tracking-[0.2em] uppercase font-bold text-muted-foreground">Total Deficiencies</span>
            <ShieldCheck size={20} className="text-orange-500" />
          </div>
          <div className="font-display text-4xl font-black tracking-tight">{total_observations}</div>
          <div className="text-xs text-muted-foreground mt-2 font-mono">Observations & fails flagged</div>
        </div>
      </div>

      {/* Auditor Performance Table */}
      <div className="border border-border bg-white p-6 shadow-xs mb-8">
        <div className="flex items-center justify-between mb-5 pb-3 border-b border-border">
          <div>
            <div className="font-mono text-[10px] tracking-[0.2em] uppercase text-muted-foreground font-bold">Surveillance Matrix</div>
            <h2 className="font-display text-xl font-black uppercase tracking-tight flex items-center gap-2">
              <Trophy size={20} className="text-amber-500" /> Auditor Rigor & Evidence Scorecard
            </h2>
          </div>
          <span className="text-xs font-mono text-muted-foreground">
            Ranked by total completed audits
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="border-b border-border/80 text-[10px] font-mono uppercase text-muted-foreground tracking-wider">
                <th className="py-2.5 px-3 font-bold">Auditor</th>
                <th className="py-2.5 px-3 font-bold">Audits Done</th>
                <th className="py-2.5 px-3 font-bold">Avg Score Given</th>
                <th className="py-2.5 px-3 font-bold">Evidence Density</th>
                <th className="py-2.5 px-3 font-bold">Total Photos</th>
                <th className="py-2.5 px-3 font-bold">Observations / Audit</th>
                <th className="py-2.5 px-3 font-bold">Latest Inspection</th>
                <th className="py-2.5 px-3 font-bold">Surveillance Rating</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {auditors.map((aud, idx) => (
                <tr key={idx} className="hover:bg-muted/30 transition-colors">
                  <td className="py-3 px-3">
                    <div className="font-bold text-foreground text-sm flex items-center gap-2">
                      <span className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center font-mono text-xs font-bold">
                        {aud.name.charAt(0).toUpperCase()}
                      </span>
                      {aud.name}
                    </div>
                  </td>
                  <td className="py-3 px-3 font-mono font-bold text-sm">
                    {aud.audits_completed}
                  </td>
                  <td className="py-3 px-3">
                    <span className={`font-mono font-black ${scoreColor(aud.avg_score_given)}`}>
                      {aud.avg_score_given}%
                    </span>
                  </td>
                  <td className="py-3 px-3">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-xs">{aud.photos_per_audit}</span>
                      <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-accent"
                          style={{ width: `${Math.min(100, (aud.photos_per_audit / 10) * 100)}%` }}
                        />
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-3 font-mono text-xs text-muted-foreground">
                    {aud.total_photos_captured} photos
                  </td>
                  <td className="py-3 px-3 font-mono text-xs font-semibold text-red-600">
                    {aud.observations_per_audit} fails/audit
                  </td>
                  <td className="py-3 px-3 text-xs">
                    <div className="font-mono font-bold">{aud.latest_audit_date || "—"}</div>
                    <div className="text-[11px] text-muted-foreground truncate max-w-[150px]">{aud.latest_branch || "—"}</div>
                  </td>
                  <td className="py-3 px-3">
                    <span className={`inline-flex items-center gap-1 text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded-xs ${
                      aud.photos_per_audit >= 5 ? "bg-emerald-100 text-emerald-800" :
                      aud.photos_per_audit >= 2 ? "bg-blue-100 text-blue-800" : "bg-slate-100 text-slate-700"
                    }`}>
                      <Camera size={12} /> {aud.thoroughness}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Methodology & Quality Assurance Standards Note */}
      <div className="border border-border/80 bg-muted/20 p-5 rounded-xs text-xs text-muted-foreground space-y-2">
        <div className="font-bold text-foreground uppercase tracking-wider text-[11px] flex items-center gap-1.5">
          <Sparkle weight="fill" size={14} className="text-accent" /> OneUP Quality Assurance Protocol
        </div>
        <p>
          High photographic evidence density ensures that all audit scores are backed by immutable visual proof, enabling directors to review exact workshop conditions directly inside official PDF compliance records.
        </p>
      </div>
    </AppShell>
  );
}