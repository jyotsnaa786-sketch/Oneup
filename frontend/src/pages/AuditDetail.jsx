import React, { useEffect, useState } from "react";
import { api, getHostBase } from "@/lib/apiClient";
import AppShell from "@/components/AppShell";
import { useAuth } from "@/context/AuthContext";
import { useParams, useNavigate, Link } from "react-router-dom";
import { ScoreBadge, scoreColor, ResultChip } from "@/components/StatusBits";
import { toast } from "sonner";
import { ArrowLeft, MapPin, User, CalendarBlank, NotePencil, Printer, FileXls, WarningCircle, Shield } from "@phosphor-icons/react";

function CategoryBlock({ cat, catScore }) {
  return (
    <div className="border border-border bg-white">
      <div className="flex flex-wrap items-center justify-between px-4 sm:px-6 py-3.5 border-b border-border bg-muted/30 gap-2">
        <h3 className="font-display text-base sm:text-lg font-bold tracking-tight">{cat.name}</h3>
        <div className="flex items-center gap-3">
          <span className="font-mono text-xs text-muted-foreground">{catScore?.passed}/{catScore?.applicable} passed</span>
          <span className={`font-display font-black text-lg sm:text-xl ${scoreColor(catScore?.score ?? 0)}`}>{catScore?.score ?? 0}%</span>
        </div>
      </div>
      <div>
        {(cat.items || []).map((item, i) => (
          <div key={item.item_id} className={`px-4 sm:px-6 py-4 border-b border-border/60 ${i % 2 ? "bg-muted/20" : ""}`}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <p className="text-xs sm:text-sm font-medium leading-relaxed">{item.text}</p>
                {item.result === "fail" && (
                  <div className="inline-flex items-center gap-1 mt-1.5 px-2 py-0.5 bg-destructive/10 border border-destructive/30 text-destructive text-[11px] font-mono">
                    <WarningCircle weight="bold" size={13} /> Remediation Task Triggered
                  </div>
                )}
              </div>
              <ResultChip result={item.result} />
            </div>
            {item.note && <p className="text-xs text-muted-foreground mt-2 italic font-mono bg-muted/40 p-2 border border-border">“{item.note}”</p>}
            {item.evidence?.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                {item.evidence.map((path) => (
                  <a key={path} href={`${getHostBase()}/api/files/${path}`} target="_blank" rel="noreferrer">
                    <EvidenceThumb path={path} />
                  </a>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function EvidenceThumb({ path }) {
  const [url, setUrl] = useState(null);
  useEffect(() => {
    let revoked;
    api.get(`/files/${path}`, { responseType: "blob" })
      .then((r) => { const u = URL.createObjectURL(r.data); revoked = u; setUrl(u); })
      .catch(() => {});
    return () => revoked && URL.revokeObjectURL(revoked);
  }, [path]);
  return (
    <div className="w-16 h-16 sm:w-20 sm:h-20 border border-border bg-muted overflow-hidden hover:opacity-80 transition-opacity" title="Click to view full photo" data-testid="evidence-thumb">
      {url ? <img src={url} alt="evidence" className="w-full h-full object-cover" /> : <div className="w-full h-full animate-pulse" />}
    </div>
  );
}

export default function AuditDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [audit, setAudit] = useState(null);

  useEffect(() => {
    api.get(`/audits/${id}`).then((r) => setAudit(r.data)).catch(() => { toast.error("Audit not found"); navigate("/audits"); });
  }, [id, navigate]);

  if (!audit) return <AppShell><div className="h-64 border border-border bg-muted/40 animate-pulse" /></AppShell>;

  const scoreOf = (cid) => (audit.category_scores || []).find((c) => c.category_id === cid);
  const isAdmin = user?.role === "admin";

  const downloadPdf = () => {
    window.open(`${getHostBase()}/api/audits/${id}/pdf?auth=${encodeURIComponent(document.cookie)}`, "_blank");
    toast.success("Downloading OneUP Motors PDF report...");
  };

  const downloadExcel = () => {
    window.open(`${getHostBase()}/api/audits/${id}/excel?auth=${encodeURIComponent(document.cookie)}`, "_blank");
    toast.success("Downloading Microsoft Excel spreadsheet (.xlsx)...");
  };

  return (
    <AppShell>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <Link to="/audits" className="inline-flex items-center gap-2 text-xs font-bold tracking-[0.15em] uppercase text-muted-foreground hover:text-foreground transition-colors" data-testid="back-to-audits">
          <ArrowLeft size={14} /> Back to Archive
        </Link>

        {isAdmin ? (
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={downloadPdf}
              data-testid="download-pdf-btn"
              className="h-9 sm:h-10 px-4 sm:px-5 bg-foreground text-white hover:bg-primary font-bold text-[11px] sm:text-xs tracking-[0.12em] uppercase inline-flex items-center gap-1.5 transition-colors shadow-sm"
            >
              <Printer weight="bold" size={15} /> Export PDF
            </button>
            <button
              onClick={downloadExcel}
              data-testid="download-excel-btn"
              className="h-9 sm:h-10 px-4 sm:px-5 bg-emerald-700 text-white hover:bg-emerald-800 font-bold text-[11px] sm:text-xs tracking-[0.12em] uppercase inline-flex items-center gap-1.5 transition-colors shadow-sm"
            >
              <FileXls weight="bold" size={15} /> Export Excel (.xlsx)
            </button>
          </div>
        ) : (
          <div className="px-3 py-1.5 bg-muted/80 border border-border text-[11px] font-mono text-muted-foreground inline-flex items-center gap-1.5 max-w-sm">
            <Shield size={15} className="text-accent shrink-0" />
            <span>🔒 Report export reserved for Admins. Auditor: Field inspection only.</span>
          </div>
        )}
      </div>

      <div className="border border-border bg-white p-6 sm:p-8 mb-6 animate-fade-up" data-testid="audit-header">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div>
            <div className="font-mono text-[10px] tracking-[0.3em] uppercase text-accent mb-1.5">OneUP Motors Inspection Report</div>
            <h1 className="font-display text-3xl sm:text-4xl font-black tracking-tighter">{audit.dealership_name}</h1>
            <div className="flex flex-wrap gap-4 mt-3 text-xs sm:text-sm text-muted-foreground">
              <span className="flex items-center gap-1"><MapPin size={14} />{audit.location}</span>
              <span className="flex items-center gap-1"><User size={14} />{audit.auditor_name}</span>
              <span className="flex items-center gap-1 font-mono"><CalendarBlank size={14} />{audit.audit_date}</span>
            </div>
          </div>
          <div className="sm:text-right border-t sm:border-t-0 pt-4 sm:pt-0 border-border">
            <div className={`font-display text-5xl sm:text-6xl font-black tracking-tighter ${scoreColor(audit.overall_score)}`}>{audit.overall_score}%</div>
            <div className="mt-1.5"><ScoreBadge status={audit.status} /></div>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-2 sm:gap-3 mt-6 sm:mt-8 max-h-72 overflow-y-auto p-2 sm:p-3 border border-border bg-muted/10">
          {(audit.category_scores || []).map((cs) => (
            <div key={cs.category_id} className="border border-border p-2.5 sm:p-3 bg-white">
              <div className="text-[9px] tracking-wider uppercase font-bold text-muted-foreground truncate" title={cs.name}>{cs.name}</div>
              <div className={`font-display text-lg sm:text-xl font-black mt-1 ${scoreColor(cs.score)}`}>{cs.score}%</div>
            </div>
          ))}
        </div>

        {audit.general_notes && (
          <div className="mt-6 border-t border-border pt-4">
            <div className="flex items-center gap-2 text-xs tracking-[0.2em] uppercase font-bold text-muted-foreground mb-2">
              <NotePencil size={14} /> General Summary &amp; Findings
            </div>
            <p className="text-xs sm:text-sm leading-relaxed">{audit.general_notes}</p>
          </div>
        )}
      </div>

      <div className="space-y-6 animate-fade-up">
        {(audit.categories || []).map((cat) => (
          <CategoryBlock key={cat.category_id} cat={cat} catScore={scoreOf(cat.category_id)} />
        ))}
      </div>
    </AppShell>
  );
}
