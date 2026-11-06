import React, { useEffect, useState } from "react";
import { api, API } from "@/lib/apiClient";
import AppShell from "@/components/AppShell";
import { ScoreBadge, scoreColor } from "@/components/StatusBits";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, AreaChart, Area
} from "recharts";
import {
  Buildings, TrendUp, WarningOctagon, ClockCountdown, ShieldWarning,
  CheckCircle, ArrowUpRight, CaretRight, Printer, Sparkle, Trophy, FileText
} from "@phosphor-icons/react";

function ExecutiveMetric({ label, value, sub, icon: Icon, accent, badge, isAlert }) {
  return (
    <div className={`border p-6 bg-white shadow-xs relative overflow-hidden transition-all ${isAlert ? "border-red-400 bg-red-50/20" : "border-border"}`}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-[11px] tracking-[0.2em] uppercase font-bold text-muted-foreground">{label}</span>
        <div className={`p-2 rounded-sm ${isAlert ? "bg-red-100 text-red-600" : "bg-muted text-foreground"}`}>
          <Icon weight="bold" size={20} className={accent} />
        </div>
      </div>
      <div className="flex items-baseline gap-2">
        <div className="font-display text-4xl font-black tracking-tight">{value}</div>
        {badge && (
          <span className="text-[10px] font-mono px-2 py-0.5 font-bold uppercase tracking-wider bg-primary/10 text-primary">
            {badge}
          </span>
        )}
      </div>
      {sub && <div className="text-xs text-muted-foreground mt-2 font-mono">{sub}</div>}
    </div>
  );
}

export default function DirectorMIS() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadData = () => {
    setLoading(true);
    api.get("/reports/director-mis")
      .then((r) => setData(r.data))
      .catch((err) => {
        console.error("Failed to load Director MIS:", err);
        toast.error("Failed to load executive MIS data");
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, []);

  const handlePrint = () => {
    window.print();
  };

  if (loading || !data) {
    return (
      <AppShell>
        <div className="space-y-6 animate-pulse">
          <div className="h-20 bg-muted/50 rounded-xs" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-muted/40 border border-border" />
            ))}
          </div>
          <div className="h-96 bg-muted/30 border border-border" />
        </div>
      </AppShell>
    );
  }

  const {
    network_compliance_index,
    total_audits,
    total_open_capa,
    total_overdue_capa,
    total_p0_critical,
    branch_leaderboard = [],
    risk_heatmap = [],
    ageing_breakdown = {},
    monthly_trends = []
  } = data;

  const ageingData = [
    { name: "On Track", count: ageing_breakdown.on_track || 0, fill: "#059669" },
    { name: "1-7d Overdue", count: ageing_breakdown.overdue_1_7 || 0, fill: "#EAB308" },
    { name: "8-15d Overdue", count: ageing_breakdown.overdue_8_15 || 0, fill: "#F97316" },
    { name: ">15d Overdue", count: ageing_breakdown.overdue_gt_15 || 0, fill: "#DC2626" }
  ];

  return (
    <AppShell>
      {/* Executive Header Banner */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8 pb-6 border-b border-border">
        <div>
          <div className="inline-flex items-center gap-1.5 font-mono text-[10px] tracking-[0.3em] uppercase text-accent font-black mb-2">
            <Sparkle weight="fill" size={14} /> OneUP Motors Enterprise Governance
          </div>
          <h1 className="font-display text-3xl sm:text-4xl font-black tracking-tight uppercase text-foreground">
            Director-Level Consolidated MIS
          </h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
            Consolidated network compliance index, multi-branch audit performance, critical risk exposure, and CAPA resolution tracking across all 7 dealerships.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={handlePrint}
            className="h-10 px-4 border border-border bg-white text-foreground hover:bg-muted font-bold text-xs tracking-wider uppercase inline-flex items-center gap-2 transition-colors shadow-xs"
          >
            <Printer size={16} /> Print Executive Brief
          </button>
          <Link
            to="/audits/new"
            className="h-10 px-4 bg-primary text-white hover:bg-blue-800 font-bold text-xs tracking-wider uppercase inline-flex items-center gap-2 transition-colors shadow-xs"
          >
            Run OneUP Audit
          </Link>
        </div>
      </div>

      {/* 4 Core Executive Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        <ExecutiveMetric
          label="Network Compliance Index"
          value={`${network_compliance_index}%`}
          badge={network_compliance_index >= 80 ? "Pass (≥80%)" : "Attention Required"}
          sub="Weighted average across all inspections"
          icon={TrendUp}
          accent="text-emerald-600"
        />
        <ExecutiveMetric
          label="Total Dealership Audits"
          value={total_audits}
          sub="7 Dealership branches monitored"
          icon={Buildings}
          accent="text-primary"
        />
        <ExecutiveMetric
          label="Critical (P0) Non-Compliances"
          value={total_p0_critical}
          sub="Safety, Fire & Gate Pass Violations"
          icon={ShieldWarning}
          accent="text-red-600"
          isAlert={total_p0_critical > 0}
        />
        <ExecutiveMetric
          label="Overdue CAPA Remediations"
          value={total_overdue_capa}
          sub={`Unresolved actions past SLA target`}
          icon={ClockCountdown}
          accent="text-orange-600"
          isAlert={total_overdue_capa > 0}
        />
      </div>

      {/* Main Grid: Dealership Leaderboard & Trajectory */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-8">
        {/* Dealership Leaderboard (8 cols) */}
        <div className="lg:col-span-8 border border-border bg-white p-6 shadow-xs">
          <div className="flex items-center justify-between mb-5 pb-3 border-b border-border">
            <div>
              <div className="font-mono text-[10px] tracking-[0.2em] uppercase text-muted-foreground font-bold">Performance Matrix</div>
              <h2 className="font-display text-xl font-black uppercase tracking-tight flex items-center gap-2">
                <Trophy weight="duotone" size={20} className="text-amber-500" /> Dealership Compliance Leaderboard
              </h2>
            </div>
            <Link
              to="/scorecards"
              className="text-xs font-bold text-primary hover:underline inline-flex items-center gap-1 font-mono uppercase tracking-wider"
            >
              Full Scorecards <ArrowUpRight size={14} />
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="border-b border-border/80 text-[10px] font-mono uppercase text-muted-foreground tracking-wider">
                  <th className="py-2.5 px-3 font-bold">Rank</th>
                  <th className="py-2.5 px-3 font-bold">Dealership Branch</th>
                  <th className="py-2.5 px-3 font-bold">Audits</th>
                  <th className="py-2.5 px-3 font-bold">Latest Score</th>
                  <th className="py-2.5 px-3 font-bold">Average</th>
                  <th className="py-2.5 px-3 font-bold">Compliance Status</th>
                  <th className="py-2.5 px-3 font-bold text-right">Open CAPA</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {branchLeaderboard.map((branch, idx) => {
                  const isTop = idx === 0 && branch.latest_score !== null;
                  return (
                    <tr
                      key={branch.id}
                      className={`hover:bg-muted/40 transition-colors ${idx % 2 === 1 ? "bg-muted/15" : ""}`}
                    >
                      <td className="py-3 px-3 font-mono font-bold text-xs">
                        <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs ${
                          idx === 0 ? "bg-amber-100 text-amber-800 font-black" :
                          idx === 1 ? "bg-slate-200 text-slate-800 font-bold" :
                          idx === 2 ? "bg-amber-800/10 text-amber-900 font-bold" :
                          "text-muted-foreground"
                        }`}>
                          #{idx + 1}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <Link
                          to={`/scorecards?branch=${branch.id}`}
                          className="font-bold text-foreground hover:text-primary transition-colors flex items-center gap-1.5"
                        >
                          {branch.name}
                        </Link>
                        <div className="text-[11px] text-muted-foreground font-mono">{branch.location}</div>
                      </td>
                      <td className="py-3 px-3 font-mono text-xs">{branch.audit_count}</td>
                      <td className="py-3 px-3">
                        {branch.latest_score !== null ? (
                          <div className="flex items-center gap-2">
                            <span className={`font-display font-black text-base ${scoreColor(branch.latest_score)}`}>
                              {branch.latest_score}%
                            </span>
                            <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden hidden sm:block">
                              <div
                                className={`h-full ${
                                  branch.latest_score >= 80 ? "bg-emerald-600" :
                                  branch.latest_score >= 60 ? "bg-orange-500" : "bg-red-600"
                                }`}
                                style={{ width: `${Math.min(100, branch.latest_score)}%` }}
                              />
                            </div>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground font-mono">Pending</span>
                        )}
                      </td>
                      <td className="py-3 px-3 font-mono text-xs font-semibold">
                        {branch.avg_score ? `${branch.avg_score}%` : "—"}
                      </td>
                      <td className="py-3 px-3">
                        <ScoreBadge status={branch.status_tier} />
                      </td>
                      <td className="py-3 px-3 text-right">
                        <span className={`inline-flex items-center gap-1 font-mono font-bold text-xs px-2 py-0.5 rounded-xs ${
                          branch.open_capa > 0 ? "bg-red-50 text-red-700 border border-red-200" : "bg-emerald-50 text-emerald-700"
                        }`}>
                          {branch.open_capa} open
                          {branch.overdue_capa > 0 && (
                            <span className="text-[10px] text-red-600 font-extrabold">({branch.overdue_capa} overdue)</span>
                          )}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* CAPA Ageing & Monthly Trends (4 cols) */}
        <div className="lg:col-span-4 space-y-6">
          {/* Overdue Ageing Breakdown */}
          <div className="border border-border bg-white p-6 shadow-xs">
            <div className="font-mono text-[10px] tracking-[0.2em] uppercase text-muted-foreground font-bold mb-1">
              SLA Compliance
            </div>
            <h3 className="font-display text-lg font-black uppercase tracking-tight mb-4">
              CAPA Ageing & Overdue Exposure
            </h3>
            <p className="text-xs text-muted-foreground mb-4">
              Remediation tasks overdue by days elapsed past agreed service manager SLA target.
            </p>

            <div className="space-y-3 mb-6">
              {ageingData.map((ad) => (
                <div key={ad.name} className="flex items-center justify-between text-xs">
                  <span className="font-semibold flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: ad.fill }} />
                    {ad.name}
                  </span>
                  <span className="font-mono font-bold">{ad.count} items</span>
                </div>
              ))}
            </div>

            <div className="h-36">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={ageingData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                  <XAxis dataKey="name" tick={{ fontSize: 9, fontFamily: "IBM Plex Mono" }} stroke="#9CA3AF" />
                  <YAxis tick={{ fontSize: 9, fontFamily: "IBM Plex Mono" }} stroke="#9CA3AF" />
                  <Tooltip contentStyle={{ borderRadius: 0, border: "1px solid #0A0A0A", fontSize: 12 }} />
                  <Bar dataKey="count" fill="#DC2626" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <Link
              to="/tasks"
              className="mt-4 block w-full py-2.5 bg-foreground hover:bg-primary text-white text-center text-xs font-bold uppercase tracking-wider transition-colors"
            >
              Open Defect Action Tracker
            </Link>
          </div>

          {/* Monthly Trajectory */}
          {monthlyTrends.length > 0 && (
            <div className="border border-border bg-white p-6 shadow-xs">
              <div className="font-mono text-[10px] tracking-[0.2em] uppercase text-muted-foreground font-bold mb-1">
                Historical Progress
              </div>
              <h3 className="font-display text-lg font-black uppercase tracking-tight mb-4">
                Monthly Compliance Trend
              </h3>
              <div className="h-40">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={monthlyTrends} margin={{ top: 5, right: 10, left: -25, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                    <XAxis dataKey="month" tick={{ fontSize: 9, fontFamily: "IBM Plex Mono" }} stroke="#9CA3AF" />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 9, fontFamily: "IBM Plex Mono" }} stroke="#9CA3AF" />
                    <Tooltip contentStyle={{ borderRadius: 0, border: "1px solid #0A0A0A", fontSize: 12 }} />
                    <Area type="monotone" dataKey="avg_score" stroke="#0047AB" fill="#0047AB" fillOpacity={0.15} strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Network Risk Heatmap (Recurring Deficiencies Across All Workshops) */}
      <div className="border border-border bg-white p-6 shadow-xs mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 mb-4 border-b border-border gap-2">
          <div>
            <div className="font-mono text-[10px] tracking-[0.2em] uppercase text-red-600 font-bold flex items-center gap-1.5">
              <WarningOctagon weight="fill" size={14} /> Network Risk Heatmap
            </div>
            <h2 className="font-display text-xl font-black uppercase tracking-tight">
              Top Recurring Non-Compliances Across Network
            </h2>
          </div>
          <span className="text-xs text-muted-foreground font-mono">
            Identifies systemic vulnerabilities requiring central SOP intervention
          </span>
        </div>

        {riskHeatmap.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground text-sm">
            No recurring non-compliances logged across inspections.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {riskHeatmap.map((item, idx) => (
              <div
                key={idx}
                className="border border-border/80 p-4 bg-muted/20 hover:border-primary/50 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono text-[10px] tracking-wider uppercase text-muted-foreground font-bold truncate max-w-[130px]">
                      {item.category_name}
                    </span>
                    <span className={`text-[10px] font-mono px-2 py-0.5 font-bold uppercase rounded-xs ${
                      item.severity === "P0" ? "bg-red-600 text-white" :
                      item.severity === "P1" ? "bg-orange-500 text-white" : "bg-amber-400 text-slate-900"
                    }`}>
                      {item.severity} {item.severity_label}
                    </span>
                  </div>
                  <p className="text-xs font-semibold text-foreground line-clamp-3 mb-3">
                    {item.item_text}
                  </p>
                </div>

                <div className="pt-3 border-t border-border/60 flex items-center justify-between text-xs">
                  <span className="text-muted-foreground font-mono">Failed in:</span>
                  <span className="font-mono font-bold text-red-600">
                    {item.fail_count} Audits ({item.fail_rate_percent}%)
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick Action Footer */}
      <div className="bg-primary/5 border border-primary/20 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="font-bold text-sm text-foreground">Need detailed branch-by-branch analysis?</div>
          <div className="text-xs text-muted-foreground">
            Explore operational pillar benchmarking radars and dedicated profiles for each dealership.
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Link
            to="/scorecards"
            className="h-9 px-4 bg-primary text-white font-bold text-xs uppercase tracking-wider inline-flex items-center gap-2 hover:bg-blue-800 transition-colors"
          >
            Branch Scorecards <CaretRight weight="bold" size={14} />
          </Link>
          <Link
            to="/audits"
            className="h-9 px-4 border border-border bg-white text-foreground font-bold text-xs uppercase tracking-wider inline-flex items-center gap-2 hover:bg-muted transition-colors"
          >
            Central Repository <CaretRight weight="bold" size={14} />
          </Link>
        </div>
      </div>
    </AppShell>
  );
}