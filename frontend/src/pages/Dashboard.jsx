import React, { useEffect, useState } from "react";
import { api } from "@/lib/apiClient";
import AppShell from "@/components/AppShell";
import { ScoreBadge, scoreColor } from "@/components/StatusBits";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line,
} from "recharts";
import { ClipboardText, TrendUp, CheckCircle, Warning, XCircle, PlusCircle, ArrowRight } from "@phosphor-icons/react";

function Metric({ label, value, sub, icon: Icon, accent }) {
  return (
    <div className="border border-border p-6 bg-white shadow-xs" data-testid={`metric-${label.toLowerCase().replace(/\s+/g, "-")}`}>
      <div className="flex items-center justify-between mb-4">
        <span className="text-xs tracking-[0.2em] uppercase font-bold text-muted-foreground">{label}</span>
        <Icon weight="duotone" size={22} className={accent} />
      </div>
      <div className="font-display text-4xl font-black tracking-tighter">{value}</div>
      {sub && <div className="text-xs text-muted-foreground mt-1 font-mono">{sub}</div>}
    </div>
  );
}

export default function Dashboard() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    api.get("/dashboard/stats").then((r) => setStats(r.data)).catch(() => toast.error("Failed to load dashboard"));
  }, []);

  if (!stats) {
    return (
      <AppShell>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => <div key={i} className="h-32 border border-border bg-muted/40 animate-pulse" />)}
        </div>
      </AppShell>
    );
  }

  const empty = stats.total_audits === 0;

  return (
    <AppShell>
      <div className="flex items-end justify-between mb-8 animate-fade-up">
        <div>
          <div className="font-mono text-[10px] tracking-[0.3em] uppercase text-accent mb-2">OneUP Motors Executive Protocol</div>
          <h1 className="font-display text-4xl font-black tracking-tighter uppercase">After-Sales Surveillance Hub</h1>
        </div>
        <Link to="/audits/new" data-testid="dashboard-new-audit" className="h-11 px-5 bg-primary text-white font-bold text-xs tracking-[0.2em] uppercase flex items-center gap-2 hover:bg-blue-800 transition-colors shadow-sm">
          <PlusCircle weight="bold" size={16} /> Run OneUP Audit
        </Link>
      </div>

      {empty ? (
        <div className="border border-border bg-white py-24 text-center animate-fade-up" data-testid="empty-dashboard">
          <ClipboardText weight="duotone" size={64} className="mx-auto text-muted-foreground/50" />
          <h3 className="font-display text-2xl font-bold tracking-tight mt-6">No audits yet</h3>
          <p className="text-sm text-muted-foreground mt-2 mb-6">Run your first OneUP Motors inspection to populate compliance metrics.</p>
          <Link to="/audits/new" className="inline-flex items-center gap-2 h-11 px-6 bg-foreground text-white font-bold text-xs tracking-[0.2em] uppercase hover:bg-primary transition-colors">
            Start New Audit <ArrowRight weight="bold" size={16} />
          </Link>
        </div>
      ) : (
        <div className="space-y-6 animate-fade-up">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <Metric label="Avg Score" value={`${stats.avg_score}%`} sub="Across all OneUP dealerships" icon={TrendUp} accent="text-emerald-600" />
            <Metric label="Compliant" value={stats.compliant} sub="≥ 90% compliance verified" icon={CheckCircle} accent="text-emerald-600" />
            <Metric label="Needs Attention" value={stats.needs_attention} sub="70–89% score window" icon={Warning} accent="text-accent" />
            <Metric label="Non-Compliant" value={stats.non_compliant} sub="< 70% immediate action required" icon={XCircle} accent="text-destructive" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-6 border border-border bg-white p-6 shadow-xs">
              <h3 className="text-xs tracking-[0.2em] uppercase font-bold text-muted-foreground mb-6">Chronological Compliance Trend (100% Target)</h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={stats.trend} margin={{ left: -20, right: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fontFamily: "IBM Plex Mono" }} stroke="#9CA3AF" />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 10, fontFamily: "IBM Plex Mono" }} stroke="#9CA3AF" />
                  <Tooltip contentStyle={{ borderRadius: 0, border: "1px solid #0A0A0A", fontSize: 12 }} />
                  <Line type="monotone" dataKey="score" stroke="#059669" strokeWidth={3} dot={{ r: 4, fill: "#FF5A00" }} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="lg:col-span-6 border border-border bg-white p-6 shadow-xs">
              <h3 className="text-xs tracking-[0.2em] uppercase font-bold text-muted-foreground mb-6">20 Pillar Category Averages (%)</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={stats.category_averages} layout="vertical" margin={{ left: 20, right: 16 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" horizontal={false} />
                  <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10, fontFamily: "IBM Plex Mono" }} stroke="#9CA3AF" />
                  <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 9, fontFamily: "IBM Plex Mono" }} stroke="#0A0A0A" />
                  <Tooltip contentStyle={{ borderRadius: 0, border: "1px solid #0A0A0A", fontSize: 12 }} />
                  <Bar dataKey="score" fill="#0047AB" barSize={12} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="border border-border bg-white shadow-xs">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-muted/20">
              <h3 className="text-xs tracking-[0.2em] uppercase font-bold text-muted-foreground">Recent OneUP Dealership Inspections</h3>
              <Link to="/audits" className="text-xs font-bold text-primary hover:underline">View all archive →</Link>
            </div>
            <table className="w-full text-sm" data-testid="recent-audits-table">
              <thead>
                <tr className="text-left text-[10px] tracking-[0.15em] uppercase text-muted-foreground border-b border-border bg-muted/10">
                  <th className="px-6 py-3 font-bold">Dealership &amp; Branch</th>
                  <th className="px-6 py-3 font-bold">Date</th>
                  <th className="px-6 py-3 font-bold text-right">Overall Score</th>
                  <th className="px-6 py-3 font-bold">Status Bin</th>
                </tr>
              </thead>
              <tbody>
                {stats.recent.map((a, i) => (
                  <tr key={a.id} className={`border-b border-border/60 hover:bg-muted/40 transition-colors ${i % 2 ? "bg-muted/20" : ""}`}>
                    <td className="px-6 py-3">
                      <Link to={`/audits/${a.id}`} className="font-semibold text-foreground hover:text-primary transition-colors" data-testid={`recent-audit-${a.id}`}>
                        {a.dealership_name}
                      </Link>
                      <div className="text-xs text-muted-foreground">{a.location}</div>
                    </td>
                    <td className="px-6 py-3 font-mono text-xs">{a.audit_date}</td>
                    <td className={`px-6 py-3 text-right font-display font-black text-lg ${scoreColor(a.overall_score)}`}>{a.overall_score}%</td>
                    <td className="px-6 py-3"><ScoreBadge status={a.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </AppShell>
  );
}
