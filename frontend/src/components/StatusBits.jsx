import React from "react";

export function ScoreBadge({ status }) {
  const map = {
    Compliant: "bg-emerald-600 text-white",
    "Needs Attention": "bg-accent text-white",
    "Non-Compliant": "bg-destructive text-white",
  };
  return (
    <span
      data-testid="status-badge"
      className={`inline-flex items-center px-3 py-1 text-[10px] font-bold tracking-[0.15em] uppercase ${map[status] || "bg-muted text-foreground"}`}
    >
      {status}
    </span>
  );
}

export function scoreColor(score) {
  if (score >= 90) return "text-emerald-600";
  if (score >= 70) return "text-accent";
  return "text-destructive";
}

export function ResultChip({ result }) {
  const map = {
    pass: "bg-emerald-600 text-white",
    fail: "bg-destructive text-white",
    na: "bg-muted-foreground text-white",
  };
  const label = { pass: "PASS", fail: "FAIL", na: "N/A" };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider ${map[result]}`}>
      {label[result]}
    </span>
  );
}
