import React, { useEffect, useState } from "react";
import { api } from "@/lib/apiClient";
import AppShell from "@/components/AppShell";
import PhotoAnnotator from "@/components/PhotoAnnotator";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { scoreColor } from "@/components/StatusBits";
import { Check, X, MinusCircle, ArrowLeft, ArrowRight, FloppyDisk, ImageSquare, Lightning, Camera, FileImage, PaperPlaneRight } from "@phosphor-icons/react";

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

export default function NewAudit() {
  const navigate = useNavigate();
  const [template, setTemplate] = useState(null);
  const [meta, setMeta] = useState({ dealership_name: "OneUP Motors Nexa", location: "Jaipur, Rajasthan", auditor_name: "OneUP Field Inspector", audit_date: new Date().toISOString().slice(0, 10) });
  const [state, setState] = useState({});
  const [general, setGeneral] = useState("All 20 operational sections verified compliant against OneUP Motors inspection standards.");
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(null);
  
  const [annotateItem, setAnnotateItem] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);

  useEffect(() => { api.get("/audit-template").then((r) => setTemplate(r.data)).catch(() => toast.error("Failed to load template")); }, []);

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

  const onSelectPhoto = (id, file) => {
    if (!file) return;
    setSelectedFile(file);
    setAnnotateItem(id);
  };

  const executeUpload = async (id, file, caption) => {
    setAnnotateItem(null);
    setSelectedFile(null);
    setUploading(id);
    try {
      const fd = new FormData();
      fd.append("file", file);
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
      toast.success("📸 Photo compressed & saved!");
    } catch { toast.error("Upload failed. Check Wi-Fi connection."); }
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
      toast.success("🎉 Audit record uploaded at " + data.overall_score + "% compliance!");
      navigate(`/audits/${data.id}`);
    } catch { toast.error("Failed to save audit record"); }
    finally { setSaving(false); }
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

      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 mb-5 animate-fade-up w-full max-w-full overflow-hidden">
        <div>
          <div className="font-mono text-[10px] tracking-[0.2em] uppercase text-accent mb-0.5">OneUP Mobile Field Protocol</div>
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
          <h3 className="font-display text-lg sm:text-xl font-bold tracking-tight mb-4">Dealership &amp; Auditor Header</h3>
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

                <div className="flex flex-col sm:flex-row gap-2 mt-3 pt-2.5 border-t border-border/40 w-full">
                  <input
                    data-testid={`note-${item.item_id}`}
                    value={cur.note || ""}
                    onChange={(e) => setNote(item.item_id, e.target.value)}
                    placeholder="Observation note…"
                    className="w-full sm:flex-1 h-10 px-2.5 border border-input bg-white text-xs font-mono focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                  
                  <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
                    <label className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 h-10 sm:h-9 bg-accent/10 border border-accent/40 text-foreground cursor-pointer text-xs font-black tracking-wider uppercase hover:bg-accent hover:text-white transition-colors active:scale-95 ${uploading === item.item_id ? "opacity-60 pointer-events-none bg-accent text-white" : ""}`}>
                      <Camera size={16} className="text-accent shrink-0" weight="bold" />
                      <span>{uploading === item.item_id ? "Compressing…" : "📸 Camera"}</span>
                      <input type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => e.target.files[0] && onSelectPhoto(item.item_id, e.target.files[0])} />
                    </label>

                    <label className="flex-1 sm:flex-initial flex items-center justify-center gap-1 px-3 h-10 sm:h-9 border border-border cursor-pointer text-xs font-bold uppercase hover:bg-foreground hover:text-white transition-colors active:scale-95" title="Select from Gallery">
                      <FileImage size={16} className="text-muted-foreground shrink-0" />
                      <span>Gallery</span>
                      <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files[0] && onSelectPhoto(item.item_id, e.target.files[0])} />
                    </label>
                  </div>
                </div>

                {cur.evidence?.length > 0 && (
                  <div className="flex items-center gap-2 mt-2.5 text-[11px] sm:text-xs text-emerald-800 font-extrabold font-mono bg-emerald-50 border border-emerald-300 p-2 break-words w-full">
                    <ImageSquare size={16} weight="bold" className="shrink-0 text-emerald-700" /> 
                    <span>{cur.evidence.length} evidence photo(s) compressed &amp; linked!</span>
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
          onClick={() => setStep((s) => Math.max(0, s - 1))}
          disabled={step === 0}
          data-testid="prev-step"
          className="h-11 px-4 sm:px-5 border border-border font-bold text-xs tracking-wider uppercase flex items-center gap-1.5 hover:bg-foreground hover:text-white transition-colors disabled:opacity-40 shrink-0"
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
