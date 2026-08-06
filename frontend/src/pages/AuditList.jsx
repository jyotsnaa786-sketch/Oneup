import React, { useEffect, useState } from "react";
import { api } from "@/lib/apiClient";
import AppShell from "@/components/AppShell";
import { ScoreBadge, scoreColor } from "@/components/StatusBits";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { PlusCircle, Trash, ClipboardText, MagnifyingGlass } from "@phosphor-icons/react";

export default function AuditList() {
  const [audits, setAudits] = useState(null);
  const [q, setQ] = useState("");

  const load = () => api.get("/audits").then((r) => setAudits(r.data)).catch(() => toast.error("Failed to load audits"));
  useEffect(() => { load(); }, []);

  const remove = async (id) => {
    try {
      await api.delete(`/audits/${id}`);
      toast.success("Audit deleted");
      setAudits((a) => a.filter((x) => x.id !== id));
    } catch (e) {
      toast.error("Delete failed");
    }
  };

  const filtered = (audits || []).filter(
    (a) => a.dealership_name.toLowerCase().includes(q.toLowerCase()) || a.location.toLowerCase().includes(q.toLowerCase())
  );

  return (
    <AppShell>
      <div className="flex items-end justify-between mb-8 animate-fade-up">
        <div>
          <div className="font-mono text-[10px] tracking-[0.3em] uppercase text-accent mb-2">Inspection Records</div>
          <h1 className="font-display text-4xl font-black tracking-tighter">Audits</h1>
        </div>
        <Link to="/audits/new" data-testid="list-new-audit" className="h-11 px-5 bg-primary text-white font-bold text-xs tracking-[0.2em] uppercase flex items-center gap-2 hover:bg-blue-800 transition-colors">
          <PlusCircle weight="bold" size={16} /> New Audit
        </Link>
      </div>

      <div className="relative mb-4 max-w-sm animate-fade-up">
        <MagnifyingGlass size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          data-testid="audit-search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search dealership or locationâ€¦"
          className="w-full h-10 pl-9 pr-3 border border-input bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1"
        />
      </div>

      {audits === null ? (
        <div className="h-64 border border-border bg-muted/40 animate-pulse" />
      ) : filtered.length === 0 ? (
        <div className="border border-border bg-white py-24 text-center animate-fade-up" data-testid="empty-audits">
          <ClipboardText weight="duotone" size={64} className="mx-auto text-muted-foreground/50" />
          <h3 className="font-display text-2xl font-bold tracking-tight mt-6">No audits found</h3>
          <p className="text-sm text-muted-foreground mt-2">Adjust your search or start a new inspection.</p>
        </div>
      ) : (
        <div className="border border-border bg-white animate-fade-up">
          <table className="w-full text-sm" data-testid="audits-table">
            <thead>
              <tr className="text-left text-[10px] tracking-[0.15em] uppercase text-muted-foreground border-b border-border">
                <th className="px-6 py-3 font-bold">Dealership</th>
                <th className="px-6 py-3 font-bold">Auditor</th>
                <th className="px-6 py-3 font-bold">Date</th>
                <th className="px-6 py-3 font-bold text-right">Score</th>
                <th className="px-6 py-3 font-bold">Status</th>
                <th className="px-6 py-3 font-bold text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((a, i) => (
                <tr key={a.id} className={`border-b border-border/60 hover:bg-muted/40 transition-colors ${i % 2 ? "bg-muted/20" : ""}`}>
                  <td className="px-6 py-3">
                    <Link to={`/audits/${a.id}`} className="font-semibold hover:text-primary" data-testid={`audit-row-${a.id}`}>
                      {a.dealership_name}
                    </Link>
                    <div className="text-xs text-muted-foreground">{a.location}</div>
                  </td>
                  <td className="px-6 py-3">{a.auditor_name}</td>
                  <td className="px-6 py-3 font-mono text-xs">{a.audit_date}</td>
                  <td className={`px-6 py-3 text-right font-display font-black ${scoreColor(a.overall_score)}`}>{a.overall_score}%</td>
                  <td className="px-6 py-3"><ScoreBadge status={a.status} /></td>
                  <td className="px-6 py-3 text-right">
                    <button
                      onClick={() => remove(a.id)}
                      data-testid={`delete-audit-${a.id}`}
                      className="w-8 h-8 border border-border inline-flex items-center justify-center hover:bg-destructive hover:text-white hover:border-destructive transition-colors"
                      title="Delete"
                    >
                      <Trash size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AppShell>
  );
}
