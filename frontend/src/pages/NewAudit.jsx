import React, { useEffect, useState } from "react";
import { api, getHostBase } from "@/lib/apiClient";
import AppShell from "@/components/AppShell";
import PhotoAnnotator from "@/components/PhotoAnnotator";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { scoreColor } from "@/components/StatusBits";
import { Check, X, MinusCircle, ArrowLeft, ArrowRight, FloppyDisk, ImageSquare, Lightning, Camera, FileImage, PaperPlaneRight, PaintBrush, Trash } from "@phosphor-icons/react";

// Lightweight HTML5 Client-Side Photo Compression Helper (Scales 15MB Camera Shots to ~150KB in milliseconds)
async function compressImageFile(file, maxWidth = 1200, quality = 0.8) {
  return new Promise((resolve) => {
    if (!file || !file.type.startsWith("image/")) return resolve(file);
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        let width = img.width;
        let height = img.height;
        if (width > maxWidth || height > maxWidth) {
          if (width > height) {
            height = Math.round((maxWidth / width) * height);
            width = maxWidth;
          } else {
            width = Math.round((maxWidth / height) * width);
            height = maxWidth;
          }
        }
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(200, width);
        canvas.height = Math.max(200, height);
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        canvas.toBlob((blob) => {
          if (!blob) return resolve(file);
          const cleanName = (file.name ? file.name.split('.')[0] : "camera_shot") + ".jpg";
          resolve(new File([blob], cleanName, { type: "image/jpeg" }));
        }, "image/jpeg", quality);
      };
      img.onerror = () => resolve(file);
    };
    reader.onerror = () => resolve(file);
  });
}

function EvidencePreview({ path, onRemove }) {
  const isCloudUrl = path && (path.startsWith("http://") || path.startsWith("https://"));
  const isPdf = path && path.toLowerCase().endsWith(".pdf");
  const imgSrc = isCloudUrl ? path : `${getHostBase()}/api/files/${path}`;

  return (
    <div className="relative border border-border bg-white p-2 shadow-xs flex flex-col gap-2 w-28 shrink-0">
      <div className="w-full h-24 bg-muted overflow-hidden border border-border/40 flex items-center justify-center">
        {isPdf ? (
          <div className="w-full h-full bg-red-50/80 flex flex-col items-center justify-center text-red-700 font-bold p-1.5 border border-red-200 gap-1 text-center">
            <span className="text-2xl">📄</span>
            <span className="text-[9px] font-mono tracking-wider uppercase font-black">PDF DOC</span>
          </div>
        ) : (
          <img src={imgSrc} alt="evidence" className="w-full h-full object-cover hover:scale-105 transition-transform" />
        )}
      </div>
      <div className="flex items-center justify-between gap-1 border-t border-border pt-1.5">
        <a href={imgSrc} target="_blank" rel="noreferrer" className="text-[10px] font-extrabold uppercase tracking-wider text-primary hover:underline flex-1 text-center font-mono">
          VIEW 👁️
        </a>
        <button type="button" onClick={() => onRemove(path)} className="text-[11px] font-black text-destructive hover:text-red-800 px-1 transition-colors" title="Remove attachment">
          🗑️
        </button>
      </div>
    </div>
  );
}

const RESULTS = [
  { key: "pass", label: "PASS", icon: Check, active: "bg-emerald-600 text-white border-emerald-600 shadow-sm font-black" },
  { key: "fail", label: "FAIL", icon: X, active: "bg-destructive text-white border-destructive shadow-sm font-black" },
  { key: "na", label: "N/A", icon: MinusCircle, active: "bg-muted-foreground text-white border-muted-foreground" },
];

function computeScore(state, template) {
  let p = 0, applicable = 0;
  (template || []).forEach((cat) => (cat.items || []).forEach((it) => {
    const r = state[it.item_id]?.result;
    if (r === "pass") { p++; applicable++; }
    else if (r === "fail") applicable++;
  }));
  return applicable ? Math.round((p / applicable) * 1000) / 10 : 0;
}

function countDraftEvidence(st) {
  if (!st || typeof st !== "object") return 0;
  let count = 0;
  Object.values(st).forEach((v) => {
    if (Array.isArray(v?.evidence)) count += v.evidence.length;
  });
  return count;
}

export default function NewAudit() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [template, setTemplate] = useState(null);
  const [meta, setMeta] = useState({
    dealership_name: "",
    location: "",
    auditor_name: user?.name || "Jitendra",
    audit_date: new Date().toISOString().slice(0, 10)
  });
  const [state, setState] = useState({});
  const [general, setGeneral] = useState("");
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(null);

  const [annotateItem, setAnnotateItem] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [draftInfo, setDraftInfo] = useState(null);
  const [pendingDraftPrompt, setPendingDraftPrompt] = useState(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [lastSavedTime, setLastSavedTime] = useState(null);

  // Sync auditor name with authenticated user if empty
  useEffect(() => {
    if (user?.name && !meta.auditor_name) {
      setMeta((m) => ({ ...m, auditor_name: user.name }));
    }
  }, [user]);

  // Purge any old submitted Malihabad October 22 draft from local storage cache
  useEffect(() => {
    const saved = localStorage.getItem("oneup_audit_draft");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed?.meta?.audit_date === "2026-10-22" || parsed?.meta?.location?.toLowerCase() === "malihabad") {
          localStorage.removeItem("oneup_audit_draft");
        }
      } catch (e) {}
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    api.get("/audit-template").then(async (r) => {
      if (!isMounted) return;
      setTemplate(r.data);

      // Explicit resume requested from Drafts page
      const incomingResumeDraft = location.state?.resumeDraft && location.state?.draft;
      if (incomingResumeDraft) {
        const d = location.state.draft;
        setDraftInfo(d);
        if (d.meta) setMeta(d.meta);
        if (d.state) setState(d.state);
        if (d.general) setGeneral(d.general);
        if (typeof d.step === "number") setStep(Math.max(1, d.step));
        else setStep(1);
        setIsInitialized(true);
        toast.success(`📝 Draft Resumed: ${d.meta?.dealership_name || "Inspection"}`);
        return;
      }

      // If user came to Run New Audit fresh, KEEP THE FORM COMPLETELY CLEAN!
      // Do not auto-populate inputs. Check if server has a recent active draft and offer optional resume.
      try {
        const dr = await api.get("/drafts");
        if (Array.isArray(dr.data) && dr.data.length > 0) {
          const serverDraft = dr.data[0];
          // Filter out obsolete 2026-10-22 Malihabad draft
          if (serverDraft && serverDraft.meta?.audit_date !== "2026-10-22" && Object.keys(serverDraft.state || {}).length > 0) {
            setPendingDraftPrompt(serverDraft);
          }
        }
      } catch (e) {}

      setIsInitialized(true);
    }).catch(() => {
      if (isMounted) toast.error("Failed to load audit template. Please refresh.");
    });

    return () => { isMounted = false; };
  }, []);

  const restoreDraft = (targetDraft) => {
    const d = targetDraft || pendingDraftPrompt || draftInfo;
    if (!d) return;
    setDraftInfo(d);
    if (d.meta) setMeta(d.meta);
    if (d.state) setState(d.state);
    if (d.general) setGeneral(d.general);
    if (typeof d.step === "number") setStep(Math.max(1, d.step));
    else setStep(1);
    setPendingDraftPrompt(null);
    localStorage.setItem("oneup_audit_draft", JSON.stringify(d));
    toast.success("📝 Inspection Draft Loaded!");
  };

  const discardDraft = (targetDraft) => {
    const d = targetDraft || pendingDraftPrompt || draftInfo;
    const draftId = d?.id || d?.user_id;
    localStorage.removeItem("oneup_audit_draft");
    if (draftId) {
      api.delete(`/drafts?id=${encodeURIComponent(draftId)}`).catch(() => {});
    } else {
      api.delete("/drafts").catch(() => {});
    }
    setDraftInfo(null);
    setPendingDraftPrompt(null);
    setState({});
    setStep(0);
    toast.info("🗑️ Draft discarded. Form is clean.");
  };

  const startCleanAudit = () => {
    localStorage.removeItem("oneup_audit_draft");
    setDraftInfo(null);
    setPendingDraftPrompt(null);
    setMeta({
      dealership_name: "",
      location: "",
      auditor_name: user?.name || "Jitendra",
      audit_date: new Date().toISOString().slice(0, 10)
    });
    setState({});
    setGeneral("");
    setStep(0);
    toast.info("✨ Form reset to blank. Starting fresh inspection.");
  };

  // Debounced auto-save effect
  useEffect(() => {
    if (!isInitialized || !template) return;
    const hasProgress = (meta.dealership_name && meta.dealership_name.trim().length > 0) || Object.keys(state).length > 0;
    if (!hasProgress) return;

    const timer = setTimeout(() => {
      const nowStr = new Date().toLocaleDateString() + " " + new Date().toLocaleTimeString();
      const payload = {
        meta,
        state,
        general,
        step,
        timestamp: nowStr
      };
      localStorage.setItem("oneup_audit_draft", JSON.stringify(payload));
      api.post("/drafts", payload).then(() => {
        setLastSavedTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      }).catch(() => {});
    }, 600);

    return () => clearTimeout(timer);
  }, [meta, state, general, step, isInitialized, template]);

  // Save on page exit / unload
  useEffect(() => {
    const handleBeforeUnload = () => {
      const hasProgress = step > 0 || Object.keys(state).length > 0;
      if (hasProgress) {
        const payload = {
          meta,
          state,
          general,
          step,
          timestamp: new Date().toLocaleDateString() + " " + new Date().toLocaleTimeString()
        };
        localStorage.setItem("oneup_audit_draft", JSON.stringify(payload));
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [meta, state, general, step]);

  if (!template) return <AppShell><div className="h-64 border border-border bg-muted/40 animate-pulse" /></AppShell>;

  const totalSteps = template.length + 2;
  const setResult = (id, text, result) => setState((s) => ({ ...s, [id]: { ...(s[id] || { note: "", evidence: [] }), text, result } }));
  const setNote = (id, note) => setState((s) => ({ ...s, [id]: { ...(s[id] || { evidence: [] }), note } }));

  const setAllToPass = () => {
    const nextState = { ...state };
    template.forEach(cat => {
      (cat.items || []).forEach(it => {
        nextState[it.item_id] = {
          ...(nextState[it.item_id] || { evidence: [] }),
          text: it.text,
          result: "pass",
          note: "Verified compliant by field inspector."
        };
      });
    });
    setState(nextState);
    toast.success("⚡ 100% Score Set! All check items graded PASS!");
  };

  const onSelectPhoto = async (id, file, openStudio = false) => {
    if (!file) return;
    if (openStudio) {
      setSelectedFile(file);
      setAnnotateItem(id);
      return;
    }
    // Instant Fast Upload with In-Browser Compression (if image) or Raw Attachment (if PDF)
    setUploading(id);
    const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
    try {
      const compressedFile = await compressImageFile(file, 1200, 0.8);
      const fd = new FormData();
      fd.append("file", compressedFile);
      const { data } = await api.post("/upload", fd, { headers: { "Content-Type": "multipart/form-data" } });
      setState((s) => ({
        ...s,
        [id]: {
          ...(s[id] || {}),
          evidence: [...(s[id]?.evidence || []), data.path]
        }
      }));
      toast.success(isPdf ? "📄 PDF Document attached & verified!" : "📸 Photo compressed & attached instantly!");
    } catch (e) {
      toast.error("Upload failed. Please verify Wi-Fi or mobile network connection.");
    } finally {
      setUploading(null);
    }
  };

  const removePhoto = (id, photoPath) => {
    setState((s) => ({
      ...s,
      [id]: {
        ...(s[id] || {}),
        evidence: (s[id]?.evidence || []).filter(p => p !== photoPath)
      }
    }));
    toast.success("🗑️ Attachment removed");
  };

  const executeUpload = async (id, file, caption) => {
    setAnnotateItem(null);
    setSelectedFile(null);
    setUploading(id);
    try {
      const compressedFile = await compressImageFile(file, 1200, 0.8);
      const fd = new FormData();
      fd.append("file", compressedFile);
      const { data } = await api.post("/upload", fd, { headers: { "Content-Type": "multipart/form-data" } });
      setState((s) => {
        const currentNote = s[id]?.note || "";
        const newNote = caption && !currentNote ? caption : caption ? `${currentNote} [Photo Note: ${caption}]` : currentNote;
        return {
          ...s,
          [id]: {
            ...(s[id] || {}),
            note: newNote,
            evidence: [...(s[id]?.evidence || []), data.path]
          }
        };
      });
      toast.success("🎨 Annotated photo saved & attached!");
    } catch (e) { toast.error("Upload failed. Check mobile connection."); }
    finally { setUploading(null); }
  };

  const submit = async () => {
    if (!meta.dealership_name || !meta.auditor_name) { toast.error("Please provide Dealership & Auditor Name"); setStep(0); return; }
    const categories = template.map((cat) => ({
      category_id: cat.category_id, name: cat.name,
      items: (cat.items || []).map((it) => ({
        item_id: it.item_id, text: it.text,
        result: state[it.item_id]?.result || "na",
        note: state[it.item_id]?.note || "",
        evidence: state[it.item_id]?.evidence || [],
      })),
    }));
    setSaving(true);
    try {
      const { data } = await api.post("/audits", { ...meta, categories, general_notes: general });
      localStorage.removeItem("oneup_audit_draft");
      api.delete("/drafts").catch(() => {});
      toast.success("🎉 Audit record uploaded at " + data.overall_score + "% compliance!");
      navigate(`/audits/${data.id}`);
    } catch (e) { toast.error("Failed to save audit record"); }
    finally { setSaving(false); }
  };

  const handlePrevStep = () => {
    if (step > 0) {
      setStep((s) => s - 1);
    } else {
      if (window.history.length > 1) {
        navigate(-1);
      } else {
        navigate("/audits");
      }
    }
  };

  const liveScore = computeScore(state, template);
  const isMeta = step === 0;
  const isReview = step === totalSteps - 1;
  const cat = !isMeta && !isReview ? template[step - 1] : null;

  return (
    <AppShell>
            {annotateItem && selectedFile && (
              <PhotoAnnotator
                file={selectedFile}
                onClose={() => { setAnnotateItem(null); setSelectedFile(null); }}
                onSave={(annotatedFile, caption) => executeUpload(annotateItem, annotatedFile, caption)}
              />
            )}

            {pendingDraftPrompt && (
              <div className="mb-5 bg-amber-50 border-2 border-amber-500 p-4 shadow-sm animate-fade-up">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="bg-amber-500 text-white text-[10px] px-2 py-0.5 font-bold uppercase tracking-widest">
                        Saved Draft Found
                      </span>
                      <span className="text-xs font-mono text-amber-900 font-semibold">
                        {pendingDraftPrompt.timestamp || "Recently saved"}
                      </span>
                    </div>
                    <div className="text-sm font-bold text-amber-950">
                      Unfinished inspection draft found for{" "}
                      <span className="underline">{pendingDraftPrompt.meta?.dealership_name || "OneUP Motors"}</span> (
                      {Object.keys(pendingDraftPrompt.state || {}).length} items evaluated
                      {countDraftEvidence(pendingDraftPrompt.state) > 0 ? `, ${countDraftEvidence(pendingDraftPrompt.state)} photos` : ""}).
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => restoreDraft(pendingDraftPrompt)}
                      className="h-9 px-4 bg-amber-600 hover:bg-amber-700 text-white font-black text-xs uppercase tracking-wider flex items-center gap-1 shadow-sm transition-all active:scale-95"
                    >
                      Resume Draft
                    </button>
                    <button
                      type="button"
                      onClick={() => discardDraft(pendingDraftPrompt)}
                      className="h-9 px-3 bg-white border border-red-300 text-red-700 hover:bg-red-50 font-bold text-xs uppercase tracking-wider transition-colors"
                    >
                      Discard
                    </button>
                    <button
                      type="button"
                      onClick={() => setPendingDraftPrompt(null)}
                      className="h-9 px-3 border border-border bg-white text-muted-foreground hover:text-foreground font-bold text-xs uppercase tracking-wider transition-colors"
                    >
                      Start Clean
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 mb-5 animate-fade-up w-full max-w-full overflow-hidden">
              <div>
                <button
                  type="button"
                  onClick={handlePrevStep}
                  data-testid="top-back-btn"
                  className="inline-flex items-center gap-1.5 text-xs font-bold tracking-[0.15em] uppercase text-muted-foreground hover:text-foreground transition-colors mb-2"
                >
                  <ArrowLeft size={14} weight="bold" /> Back
                </button>
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="font-mono text-[10px] tracking-[0.2em] uppercase text-accent font-bold">OneUP Mobile Field Protocol</span>
                  <span className="bg-emerald-100 text-emerald-900 border border-emerald-300 font-mono text-[9px] px-1.5 py-0.5 font-bold tracking-wider uppercase flex items-center gap-1">
                    <span>💾 AUTO-SAVING DRAFTS</span>
                  </span>
                </div>
                <h1 className="font-display text-2xl sm:text-4xl font-black tracking-tight truncate">Run Inspection</h1>
              </div>



              {/* RESPONSIVE MOBILE ACTION CONTROLS */}
              <div className="flex flex-wrap items-center justify-between gap-2.5 bg-white p-3 border border-border w-full lg:w-auto shadow-xs">
                <div className="flex flex-wrap items-center gap-2 flex-1 sm:flex-initial">
                  <button
                    onClick={setAllToPass}
                    data-testid="fast-pass-all-btn"
                    className="h-10 px-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] sm:text-xs tracking-wider uppercase flex items-center justify-center gap-1 transition-colors shadow-xs active:scale-95 flex-1 sm:flex-initial"
                  >
                    <Lightning weight="fill" size={15} /> 100% Pass All
                  </button>
                  <button
                    onClick={() => setStep(totalSteps - 1)}
                    className="h-10 px-3.5 bg-primary hover:bg-blue-800 text-white font-black text-[11px] sm:text-xs tracking-wider uppercase flex items-center justify-center gap-1 transition-colors shadow-xs active:scale-95 flex-1 sm:flex-initial"
                    title="Jump to Review & Submit"
                  >
                    <PaperPlaneRight weight="bold" size={15} /> Review &amp; Submit
                  </button>
                </div>

                <div className="text-right pl-3 border-l border-border shrink-0">
                  <div className="text-[9px] tracking-widest uppercase font-bold text-muted-foreground">Live Score</div>
                  <div className={`font-display text-2xl font-black ${scoreColor(liveScore)}`}>{liveScore}%</div>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1 mb-5 overflow-x-auto py-1 w-full max-w-full no-scrollbar" data-testid="audit-stepper">
              {["Header", ...template.map((c) => c.name.split(" ")[0].substring(0, 8)), "Review"].map((label, i) => (
                <button
                  key={i}
                  onClick={() => setStep(i)}
                  className={`flex-1 min-w-[22px] sm:min-w-[28px] h-2 sm:h-2.5 transition-all shrink-0 ${i <= step ? "bg-primary" : "bg-border/60 hover:bg-border"}`}
                  title={label}
                />
              ))}
            </div>

            {isMeta && (
              <div className="border border-border bg-white p-4 sm:p-8 animate-fade-up w-full max-w-full overflow-hidden" data-testid="audit-meta-form">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
                  <div>
                    <h3 className="font-display text-lg sm:text-xl font-bold tracking-tight">Dealership &amp; Auditor Header</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">Enter dealership branch and field inspector details for this inspection.</p>
                  </div>
                  <button
                    type="button"
                    onClick={startCleanAudit}
                    className="text-xs font-mono font-bold text-muted-foreground hover:text-red-700 underline flex items-center gap-1 self-start sm:self-auto"
                  >
                    Clear Form / Start Fresh
                  </button>
                </div>
                <div className="mb-4">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground font-bold block mb-1.5">Quick Select Branch Preset:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      { name: "OneUP Motors - Krishna-nagar", loc: "Krishna Nagar, Lucknow" },
                      { name: "OneUP Motors - Mahanagar", loc: "Mahanagar, Lucknow" },
                      { name: "OneUP Motors - TP Nagar", loc: "Transport Nagar, Lucknow" },
                      { name: "OneUP Motors - Banthra", loc: "Banthra, Lucknow" },
                      { name: "OneUP Motors - Takrohi", loc: "Takrohi, Lucknow" },
                      { name: "OneUP Motors Nexa", loc: "Bhitauli, Lucknow" },
                    ].map((p) => (
                      <button
                        key={p.name}
                        type="button"
                        onClick={() => setMeta((m) => ({ ...m, dealership_name: p.name, location: p.loc }))}
                        className="text-[11px] font-mono px-2.5 py-1 bg-muted/60 hover:bg-primary hover:text-white border border-border transition-colors font-bold"
                      >
                        {p.name.replace("OneUP Motors - ", "")}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {[
                    { k: "dealership_name", label: "Dealership Name", ph: "e.g. OneUP Motors Nexa" },
                    { k: "location", label: "Branch Location", ph: "e.g. Jaipur, Rajasthan" },
                    { k: "auditor_name", label: "Field Inspector Name", ph: "Your full name" },
                    { k: "audit_date", label: "Inspection Date", type: "date" },
                  ].map((f) => (
                    <div key={f.k} className="w-full max-w-full">
                      <label className="text-[11px] tracking-[0.12em] uppercase font-bold text-muted-foreground block">{f.label}</label>
                      <input
                        data-testid={`meta-${f.k}`}
                        type={f.type || "text"}
                        value={meta[f.k]}
                        placeholder={f.ph}
                        onChange={(e) => setMeta((m) => ({ ...m, [f.k]: e.target.value }))}
                        className="mt-1 w-full max-w-full h-11 px-3 border border-input bg-white focus:outline-none focus:ring-2 focus:ring-primary font-mono text-sm sm:text-base"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {cat && (
              <div className="border border-border bg-white animate-fade-up w-full max-w-full overflow-hidden" data-testid={`category-${cat.category_id}`}>
                <div className="flex items-center justify-between px-3 sm:px-6 py-3 border-b border-border bg-muted/30 gap-2 w-full">
                  <div className="truncate pr-2">
                    <span className="font-mono text-[9px] tracking-widest uppercase text-accent font-bold block">Pillar #{step} of 20</span>
                    <h3 className="font-display text-base sm:text-xl font-bold tracking-tight truncate">{cat.name}</h3>
                  </div>
                  <span className="font-mono text-[11px] sm:text-xs text-muted-foreground font-bold bg-white px-2 py-1 border border-border shrink-0">{(cat.items || []).length} Items</span>
                </div>

                {(cat.items || []).map((item, i) => {
                  const cur = state[item.item_id] || {};
                  return (
                    <div key={item.item_id} className={`p-3 sm:px-6 sm:py-5 border-b border-border/60 w-full max-w-full overflow-hidden ${i % 2 ? "bg-muted/10" : ""}`}>
                      <div className="flex flex-col gap-2.5 w-full">
                        <p className="text-xs sm:text-base font-medium leading-normal text-foreground break-words w-full">{item.text}</p>

                        {/* Thumb-Friendly Mobile 3-Button Row */}
                        <div className="grid grid-cols-3 gap-1.5 sm:flex sm:gap-2 w-full max-w-md">
                          {RESULTS.map((r) => {
                            const Icon = r.icon;
                            const on = cur.result === r.key;
                            return (
                              <button
                                key={r.key}
                                data-testid={`result-${item.item_id}-${r.key}`}
                                onClick={() => setResult(item.item_id, item.text, r.key)}
                                className={`flex items-center justify-center gap-1 h-10 sm:h-9 px-2 border text-[11px] sm:text-xs font-black tracking-wider uppercase transition-all ${on ? r.active : "border-border bg-white text-muted-foreground hover:border-foreground"}`}
                              >
                                <Icon weight="bold" size={14} /> {r.label}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <div className="flex flex-col sm:flex-row gap-2.5 mt-3.5 pt-3 border-t border-border/40 w-full">
                        <input
                          data-testid={`note-${item.item_id}`}
                          value={cur.note || ""}
                          onChange={(e) => setNote(item.item_id, e.target.value)}
                          placeholder="Observation note…"
                          className="w-full sm:flex-1 h-10 px-3 border border-input bg-white text-xs sm:text-sm font-mono focus:outline-none focus:ring-1 focus:ring-primary"
                        />

                        <div className="flex flex-wrap sm:flex-nowrap items-center gap-1.5 w-full sm:w-auto shrink-0">
                          <label className={`flex-1 sm:flex-initial flex items-center justify-center gap-1 px-2.5 h-10 sm:h-9 bg-accent/15 border border-accent text-foreground cursor-pointer text-[11px] sm:text-xs font-black tracking-wider uppercase hover:bg-accent hover:text-white transition-all active:scale-95 ${uploading === item.item_id ? "opacity-70 pointer-events-none bg-accent text-white" : ""}`} title="Instant camera photo shot">
                            <Camera size={16} className="text-accent shrink-0" weight="bold" />
                            <span>{uploading === item.item_id ? "Saving…" : "📸 Camera"}</span>
                            <input type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => e.target.files[0] && onSelectPhoto(item.item_id, e.target.files[0], false)} />
                          </label>

                          <label className="flex-1 sm:flex-initial flex items-center justify-center gap-1 px-2.5 h-10 sm:h-9 border border-border cursor-pointer text-[11px] sm:text-xs font-extrabold uppercase hover:bg-foreground hover:text-white transition-all active:scale-95" title="Pick photo from gallery">
                            <FileImage size={16} className="text-muted-foreground shrink-0" />
                            <span>Gallery</span>
                            <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files[0] && onSelectPhoto(item.item_id, e.target.files[0], false)} />
                          </label>

                          <label className="flex-1 sm:flex-initial flex items-center justify-center gap-1 px-2.5 h-10 sm:h-9 bg-red-50 border border-red-400/60 text-red-700 cursor-pointer text-[11px] sm:text-xs font-bold uppercase hover:bg-red-700 hover:text-white transition-all active:scale-95" title="Attach PDF document report or invoice">
                            <span className="text-sm">📄</span>
                            <span>PDF Doc</span>
                            <input type="file" accept=".pdf,application/pdf" className="hidden" onChange={(e) => e.target.files[0] && onSelectPhoto(item.item_id, e.target.files[0], false)} />
                          </label>

                          <label className="flex-1 sm:flex-initial flex items-center justify-center gap-1 px-2.5 h-10 sm:h-9 bg-primary/10 border border-primary/50 text-primary cursor-pointer text-[11px] sm:text-xs font-bold uppercase hover:bg-primary hover:text-white transition-all active:scale-95" title="Draw arrows & annotate photo">
                            <PaintBrush size={16} className="shrink-0" weight="bold" />
                            <span>🎨 Draw</span>
                            <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files[0] && onSelectPhoto(item.item_id, e.target.files[0], true)} />
                          </label>
                        </div>
                      </div>

                      {cur.evidence?.length > 0 && (
                        <div className="mt-3 p-3 bg-muted/15 border border-border/80 w-full">
                          <div className="flex items-center justify-between text-xs text-emerald-800 font-extrabold font-mono mb-2">
                            <span className="flex items-center gap-1.5">
                              <ImageSquare size={16} weight="bold" className="text-emerald-700" />
                              {cur.evidence.length} File Attachment(s) Linked &amp; Verified
                            </span>
                            <span className="text-[10px] text-muted-foreground font-sans uppercase font-bold">Ready for Report Archives</span>
                          </div>
                          <div className="flex flex-wrap items-center gap-3 overflow-x-auto py-1">
                            {cur.evidence.map((path) => (
                              <EvidencePreview key={path} path={path} onRemove={(p) => removePhoto(item.item_id, p)} />
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {isReview && (
              <div className="border border-border bg-white p-4 sm:p-8 animate-fade-up w-full max-w-full overflow-hidden" data-testid="audit-review">
                <h3 className="font-display text-xl sm:text-2xl font-bold tracking-tight mb-1">Final Review &amp; Upload</h3>
                <p className="text-xs text-muted-foreground mb-4">Computed overall compliance score: <span className={`font-display font-black text-lg sm:text-xl ${scoreColor(liveScore)}`}>{liveScore}%</span></p>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-5 max-h-64 overflow-y-auto p-2 border border-border bg-muted/10 w-full">
                  {template.map((c) => {
                    const s = computeScore({ ...state }, [c]);
                    return (
                      <div key={c.category_id} className="border border-border p-2 bg-white w-full overflow-hidden">
                        <div className="text-[9px] tracking-wider uppercase font-bold text-muted-foreground truncate" title={c.name}>{c.name}</div>
                        <div className={`font-display text-sm sm:text-base font-black mt-0.5 ${scoreColor(s)}`}>{s}%</div>
                      </div>
                    );
                  })}
                </div>

                <label className="text-[11px] tracking-[0.12em] uppercase font-bold text-muted-foreground block">General Field Summary</label>
                <textarea
                  data-testid="general-notes"
                  value={general}
                  onChange={(e) => setGeneral(e.target.value)}
                  rows={3}
                  placeholder="Final summary observations…"
                  className="mt-1 w-full p-2.5 border border-input bg-white text-xs sm:text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            )}

            <div className="flex items-center justify-between mt-5 gap-3 w-full max-w-full overflow-hidden">
              <button
                onClick={handlePrevStep}
                data-testid="prev-step"
                className="h-11 px-4 sm:px-5 border border-border font-bold text-xs tracking-wider uppercase flex items-center gap-1.5 hover:bg-foreground hover:text-white transition-colors shrink-0"
              >
                <ArrowLeft weight="bold" size={15} /> Back
              </button>

              {isReview ? (
                <button
                  onClick={submit}
                  disabled={saving}
                  data-testid="submit-audit-button"
                  className="flex-1 sm:flex-initial h-12 px-6 bg-primary text-white font-black text-xs sm:text-sm tracking-wider uppercase flex items-center justify-center gap-2 hover:bg-blue-800 transition-all disabled:opacity-60 shadow-xl active:scale-95"
                >
                  <FloppyDisk weight="bold" size={18} /> {saving ? "Uploading…" : "Submit Inspection"}
                </button>
              ) : (
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => setStep(totalSteps - 1)}
                    className="h-11 px-3 sm:px-4 bg-emerald-700 hover:bg-emerald-800 text-white font-black text-xs tracking-wider uppercase flex items-center gap-1 transition-colors shadow-xs shrink-0"
                  >
                    <PaperPlaneRight weight="bold" size={15} /> <span className="hidden sm:inline">Jump to Submit</span>
                  </button>
                  <button
                    onClick={() => setStep((s) => Math.min(totalSteps - 1, s + 1))}
                    data-testid="next-step"
                    className="h-11 px-5 sm:px-6 bg-foreground text-white font-bold text-xs tracking-wider uppercase flex items-center gap-1.5 hover:bg-primary transition-colors shrink-0"
                  >
                    Next <ArrowRight weight="bold" size={15} />
                  </button>
                </div>
              )}
            </div>
          </AppShell>
        );
      }
