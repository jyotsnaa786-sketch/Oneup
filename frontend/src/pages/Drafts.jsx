import React, { useState, useEffect } from "react";
import AppShell from "@/components/AppShell";
import { Link, useNavigate } from "react-router-dom";
import { FileDashed, Play, Trash, Info, CloudCheck, HardDrive, CheckCircle } from "@phosphor-icons/react";
import { toast } from "sonner";
import { api } from "@/lib/apiClient";

export default function Drafts() {
  const [draftsList, setDraftsList] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const loadDrafts = async () => {
    setLoading(true);
    const combined = [];
    const seenIds = new Set();

    // 1. Fetch server-side drafts
    try {
      const res = await api.get("/drafts");
      if (Array.isArray(res.data)) {
        res.data.forEach((d) => {
          if (d && (d.meta || d.state)) {
            combined.push({
              ...d,
              isServer: true,
              key: d.id || d.user_id || `server_${Math.random()}`
            });
            if (d.id) seenIds.add(d.id);
            if (d.user_id) seenIds.add(d.user_id);
          }
        });
      }
    } catch (e) {
      console.warn("Could not reach server drafts:", e.message);
    }

    // 2. Try local storage draft
    const saved = localStorage.getItem("oneup_audit_draft");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && (parsed.meta || parsed.state)) {
          const localId = parsed.id || parsed.user_id || "local_draft";
          if (!seenIds.has(localId)) {
            combined.push({
              ...parsed,
              id: localId,
              isLocal: true,
              key: "local_draft"
            });
          }
        }
      } catch (e) {}
    }

    setDraftsList(combined);
    setLoading(false);
  };

  useEffect(() => {
    loadDrafts();
  }, []);

  const handleDiscard = async (targetDraft) => {
    const draftId = targetDraft.id || targetDraft.user_id;
    try {
      if (targetDraft.isServer || draftId) {
        await api.delete(`/drafts?id=${encodeURIComponent(draftId)}`);
      }
    } catch (e) {
      console.warn("Server delete warning:", e.message);
    }

    const saved = localStorage.getItem("oneup_audit_draft");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.id === draftId || parsed.user_id === draftId || targetDraft.isLocal) {
          localStorage.removeItem("oneup_audit_draft");
        }
      } catch (e) {
        localStorage.removeItem("oneup_audit_draft");
      }
    }

    setDraftsList((prev) => prev.filter((d) => (d.id || d.user_id) !== draftId && d.key !== targetDraft.key));
    toast.info("🗑️ Draft discarded successfully.");
  };

  const handleResume = (targetDraft) => {
    localStorage.setItem("oneup_audit_draft", JSON.stringify(targetDraft));
    navigate("/audits/new", { state: { resumeDraft: true, draft: targetDraft } });
  };

  const countAnswered = (state) => {
    if (!state || typeof state !== "object") return 0;
    return Object.keys(state).length;
  };

  const countEvidence = (state) => {
    if (!state || typeof state !== "object") return 0;
    let count = 0;
    Object.values(state).forEach((v) => {
      if (Array.isArray(v?.evidence)) count += v.evidence.length;
    });
    return count;
  };

  return (
    <AppShell>
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8 animate-fade-up">
        <div>
          <div className="font-mono text-[10px] tracking-[0.3em] uppercase text-accent mb-1 font-bold">Unfinished Work</div>
          <h1 className="font-display text-3xl sm:text-4xl font-black tracking-tight">Saved Audit Drafts</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Audits in progress are automatically backed up here and to cloud storage. You can resume any draft right where you left off.
          </p>
        </div>
        <Link
          to="/audits/new"
          className="h-11 px-5 bg-primary hover:bg-blue-800 text-white font-black text-xs tracking-wider uppercase flex items-center justify-center gap-1.5 shadow-sm transition-all shrink-0 active:scale-95"
        >
          <span>+ Start Clean Audit</span>
        </Link>
      </div>

      {loading ? (
        <div className="p-12 border border-border bg-white text-center animate-pulse">
          <div className="font-mono text-sm text-muted-foreground">Checking saved drafts from device &amp; cloud server…</div>
        </div>
      ) : draftsList.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 bg-white border border-border border-dashed animate-fade-up shadow-sm">
          <FileDashed size={56} className="text-muted-foreground mb-4 opacity-40" />
          <h3 className="font-bold text-lg">No Pending Drafts</h3>
          <p className="text-sm text-muted-foreground text-center mt-2 max-w-sm">
            All audits are completed or submitted. When you begin a new inspection, your answers, notes, and photos are automatically saved here so nothing is ever lost.
          </p>
          <Link
            to="/audits/new"
            className="mt-6 h-11 px-6 bg-primary text-white text-xs font-bold uppercase tracking-wider flex items-center justify-center hover:bg-blue-800 transition-colors shadow-sm"
          >
            Start New Audit
          </Link>
        </div>
      ) : (
        <div className="space-y-4 animate-fade-up">
          {draftsList.map((d) => {
            const answered = countAnswered(d.state);
            const evidenceCount = countEvidence(d.state);
            const dealership = d.meta?.dealership_name || "OneUP Motors";
            const location = d.meta?.location || "Branch Location";
            const auditor = d.meta?.auditor_name || d.user_name || "Field Inspector";
            const date = d.meta?.audit_date || "N/A";
            const savedTime = d.timestamp || d.updated_at || "Recent";

            return (
              <div
                key={d.key || d.id}
                className="bg-white border-2 border-amber-500/80 p-5 sm:p-6 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden"
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                  <div className="space-y-2 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="bg-amber-500 text-white text-[10px] px-2 py-0.5 font-bold uppercase tracking-widest">
                        Draft In Progress
                      </span>
                      {d.isServer ? (
                        <span className="bg-emerald-50 text-emerald-800 border border-emerald-300 text-[10px] px-2 py-0.5 font-mono font-bold flex items-center gap-1">
                          <CloudCheck size={13} weight="bold" /> Cloud Backed Up
                        </span>
                      ) : (
                        <span className="bg-blue-50 text-blue-800 border border-blue-300 text-[10px] px-2 py-0.5 font-mono font-bold flex items-center gap-1">
                          <HardDrive size={13} weight="bold" /> Device Storage
                        </span>
                      )}
                      {d.user_name && (
                        <span className="text-[11px] font-mono text-muted-foreground font-semibold">
                          Created by: <strong className="text-foreground">{d.user_name}</strong>
                        </span>
                      )}
                    </div>

                    <h2 className="font-display font-black text-2xl text-foreground">
                      {dealership}
                    </h2>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono pt-1">
                      <div className="bg-muted/40 p-2 border border-border">
                        <span className="text-[9px] uppercase tracking-wider text-muted-foreground block font-bold">Location</span>
                        <span className="font-bold text-foreground truncate block">{location}</span>
                      </div>
                      <div className="bg-muted/40 p-2 border border-border">
                        <span className="text-[9px] uppercase tracking-wider text-muted-foreground block font-bold">Auditor</span>
                        <span className="font-bold text-foreground truncate block">{auditor}</span>
                      </div>
                      <div className="bg-muted/40 p-2 border border-border">
                        <span className="text-[9px] uppercase tracking-wider text-muted-foreground block font-bold">Evaluated Items</span>
                        <span className="font-bold text-amber-700 block">
                          {answered} {answered === 1 ? "Item" : "Items"} Evaluated
                        </span>
                      </div>
                      <div className="bg-muted/40 p-2 border border-border">
                        <span className="text-[9px] uppercase tracking-wider text-muted-foreground block font-bold">Photos Attached</span>
                        <span className="font-bold text-emerald-700 block">
                          📷 {evidenceCount} {evidenceCount === 1 ? "Photo" : "Photos"}
                        </span>
                      </div>
                    </div>

                    <div className="text-xs font-mono text-muted-foreground flex items-center gap-2 pt-1">
                      <span>Inspection Date: <strong className="text-foreground">{date}</strong></span>
                      <span>•</span>
                      <span>Last Auto-Saved: <strong className="text-foreground">{savedTime}</strong></span>
                    </div>
                  </div>

                  <div className="flex sm:flex-col gap-2.5 shrink-0 lg:w-48">
                    <button
                      onClick={() => handleResume(d)}
                      className="flex-1 h-11 bg-amber-600 hover:bg-amber-700 text-white font-black text-xs tracking-widest uppercase flex items-center justify-center gap-2 shadow-sm transition-all active:scale-95"
                    >
                      <Play weight="fill" size={16} />
                      Resume Audit
                    </button>
                    <button
                      onClick={() => handleDiscard(d)}
                      className="h-11 px-4 bg-white border border-red-300 hover:bg-red-50 text-red-700 font-bold text-xs tracking-wider uppercase flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <Trash size={15} />
                      Discard
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </AppShell>
  );
}
