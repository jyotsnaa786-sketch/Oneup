import React, { useState, useEffect } from "react";
import AppShell from "@/components/AppShell";
import { Link, useNavigate } from "react-router-dom";
import { FileDashed, Play, Trash, Info } from "@phosphor-icons/react";
import { toast } from "sonner";

import { api } from "@/lib/apiClient";

export default function Drafts() {
  const [draft, setDraft] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    // 1. Try local storage draft
    const saved = localStorage.getItem("oneup_audit_draft");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.meta && parsed.timestamp) {
          setDraft(parsed);
        }
      } catch (e) {}
    }

    // 2. Try server-side drafts
    api.get("/drafts").then(r => {
      if (Array.isArray(r.data) && r.data.length > 0) {
        const serverDraft = r.data[0];
        if (serverDraft && serverDraft.meta) {
          setDraft(serverDraft);
          localStorage.setItem("oneup_audit_draft", JSON.stringify(serverDraft));
        }
      }
    }).catch(() => {});
  }, []);

  const handleDiscard = () => {
    localStorage.removeItem("oneup_audit_draft");
    api.delete("/drafts").catch(() => {});
    setDraft(null);
    toast.info("🗑️ Draft successfully discarded.");
  };

  const handleResume = () => {
    if (draft) {
      localStorage.setItem("oneup_audit_draft", JSON.stringify(draft));
    }
    navigate("/audits/new", { state: { resumeDraft: true } });
  };

  return (
    <AppShell>
      <div className="flex items-end justify-between mb-8 animate-fade-up">
        <div>
          <div className="font-mono text-[10px] tracking-[0.3em] uppercase text-accent mb-2">Unfinished Work</div>
          <h1 className="font-display text-4xl font-black tracking-tighter">Saved Drafts</h1>
        </div>
      </div>

      {!draft ? (
        <div className="flex flex-col items-center justify-center p-12 bg-white border border-border border-dashed animate-fade-up shadow-sm">
          <FileDashed size={48} className="text-muted-foreground mb-4 opacity-50" />
          <h3 className="font-bold text-lg">No Pending Drafts</h3>
          <p className="text-sm text-muted-foreground text-center mt-2 max-w-sm">
            You do not have any unfinished audits saved on this device. When you start an audit, it automatically saves here in case you lose connection.
          </p>
          <Link to="/audits/new" className="mt-6 h-10 px-6 bg-primary text-white text-xs font-bold uppercase tracking-wider flex items-center justify-center hover:bg-blue-800 transition-colors">
            Start New Audit
          </Link>
        </div>
      ) : (
        <div className="bg-amber-50 border-2 border-amber-500 p-6 shadow-md animate-fade-up">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="bg-amber-500 text-white text-[10px] px-2 py-0.5 font-bold uppercase tracking-widest">Action Required</span>
                <span className="text-xs font-mono text-amber-900/70 font-semibold flex items-center gap-1">
                  <Info size={14} /> Local Device Storage
                </span>
              </div>
              <h2 className="font-display font-black text-2xl text-amber-950 mt-1">
                {draft.meta?.dealership_name || "Unknown Dealership"}
              </h2>
              <div className="text-sm font-mono text-amber-900 mt-2 space-y-1">
                <div><strong className="uppercase text-[10px] tracking-wider opacity-70">Location:</strong> {draft.meta?.location || "N/A"}</div>
                <div><strong className="uppercase text-[10px] tracking-wider opacity-70">Last Saved:</strong> {draft.timestamp}</div>
              </div>
              <p className="text-sm text-amber-900/80 mt-4 max-w-xl font-medium">
                This audit was started but never submitted. It is safely stored in this device's memory. You can resume exactly where you left off.
              </p>
            </div>
            
            <div className="flex flex-col gap-3 shrink-0 sm:min-w-[200px]">
              <button
                onClick={handleResume}
                className="w-full h-12 bg-amber-600 hover:bg-amber-700 text-white font-black text-sm tracking-widest uppercase flex items-center justify-center gap-2 shadow-lg transition-colors active:scale-95"
              >
                <Play weight="fill" size={18} />
                Resume Audit
              </button>
              <button
                onClick={handleDiscard}
                className="w-full h-10 bg-white border border-amber-300 hover:bg-amber-100 text-amber-900 font-bold text-xs tracking-wider uppercase flex items-center justify-center gap-2 transition-colors"
              >
                <Trash size={16} />
                Discard
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
