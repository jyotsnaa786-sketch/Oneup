import React, { useEffect, useState } from "react";
import { api, getHostBase } from "@/lib/apiClient";
import AppShell from "@/components/AppShell";
import { useAuth } from "@/context/AuthContext";
import { useParams, useNavigate, Link } from "react-router-dom";
import { ScoreBadge, scoreColor, ResultChip } from "@/components/StatusBits";
import { toast } from "sonner";
import { ArrowLeft, MapPin, User, CalendarBlank, NotePencil, Printer, FileXls, WarningCircle, Shield, PencilSimple, FloppyDisk, X, Camera, Trash } from "@phosphor-icons/react";

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
          if (width > height) { height = Math.round((maxWidth / width) * height); width = maxWidth; }
          else { width = Math.round((maxWidth / height) * width); height = maxWidth; }
        }
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(200, width); canvas.height = Math.max(200, height);
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

function CategoryBlock({ cat, catScore, isEditing, onUpdateItemResult, onUpdateItemNote, onAddEvidence, onRemoveEvidence, uploadingItem }) {
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
            <div className="flex items-start justify-between gap-3 flex-col sm:flex-row">
              <div className="flex-1">
                <p className="text-xs sm:text-sm font-medium leading-relaxed">{item.text}</p>
                {item.result === "fail" && !isEditing && (
                  <div className="inline-flex items-center gap-1 mt-1.5 px-2 py-0.5 bg-destructive/10 border border-destructive/30 text-destructive text-[11px] font-mono">
                    <WarningCircle weight="bold" size={13} /> Remediation Task Triggered
                  </div>
                )}
              </div>
              
              {isEditing ? (
                <div className="flex items-center gap-1 bg-muted p-1 border border-border shrink-0">
                  {["pass", "fail", "na"].map((res) => (
                    <button
                      key={res}
                      type="button"
                      onClick={() => onUpdateItemResult(cat.category_id, item.item_id, res)}
                      className={`h-7 px-3 font-mono text-[10px] font-extrabold uppercase tracking-wider transition-all ${
                        item.result === res
                          ? res === "pass" ? "bg-emerald-600 text-white shadow-xs" : res === "fail" ? "bg-destructive text-white shadow-xs" : "bg-muted-foreground text-white"
                          : "bg-white text-muted-foreground hover:bg-muted/50"
                      }`}
                    >
                      {res === "na" ? "N/A" : res.toUpperCase()}
                    </button>
                  ))}
                </div>
              ) : (
                <ResultChip result={item.result} />
              )}
            </div>

            {isEditing ? (
              <div className="mt-3">
                <label className="text-[10px] font-mono tracking-wider uppercase text-muted-foreground font-extrabold block mb-1">Admin Remark / Note:</label>
                <input
                  type="text"
                  value={item.note || ""}
                  onChange={(e) => onUpdateItemNote(cat.category_id, item.item_id, e.target.value)}
                  placeholder="Type official observation or edit auditor remark..."
                  className="w-full text-xs font-mono bg-white p-2 border border-border focus:outline-none focus:border-primary transition-colors"
                />
              </div>
            ) : (
              item.note && <p className="text-xs text-muted-foreground mt-2 italic font-mono bg-muted/40 p-2 border border-border">“{item.note}”</p>
            )}

            <div className="mt-3">
              {(item.evidence?.length > 0 || isEditing) && (
                <div className="flex flex-wrap items-center gap-2.5">
                  {(item.evidence || []).map((path) => (
                    <div key={path} className="relative group">
                      <a href={path && (path.startsWith("http://") || path.startsWith("https://")) ? path : `${getHostBase()}/api/files/${path}`} target="_blank" rel="noreferrer">
                        <EvidenceThumb path={path} />
                      </a>
                      {isEditing && (
                        <button
                          type="button"
                          onClick={() => onRemoveEvidence(cat.category_id, item.item_id, path)}
                          className="absolute -top-2 -right-2 w-6 h-6 bg-red-600 hover:bg-red-700 text-white rounded-full flex items-center justify-center font-bold text-xs shadow-md transition-transform active:scale-95 z-10"
                          title="Delete photo"
                        >
                          ×
                        </button>
                      )}
                    </div>
                  ))}

                  {isEditing && (
                    <label className="w-16 h-16 sm:w-20 sm:h-20 border-2 border-dashed border-primary/40 hover:border-primary bg-primary/5 cursor-pointer flex flex-col items-center justify-center transition-colors text-primary font-bold gap-1 shadow-2xs">
                      {uploadingItem === item.item_id ? (
                        <span className="text-[9px] font-mono animate-pulse uppercase font-black text-center">Uploading...</span>
                      ) : (
                        <>
                          <Camera size={22} />
                          <span className="text-[8px] font-mono uppercase tracking-wider font-black">+ Photo</span>
                        </>
                      )}
                      <input
                        type="file"
                        accept="image/*,.pdf"
                        disabled={uploadingItem === item.item_id}
                        className="hidden"
                        onChange={(e) => {
                          if (e.target.files?.[0]) onAddEvidence(cat.category_id, item.item_id, e.target.files[0]);
                        }}
                      />
                    </label>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function EvidenceThumb({ path }) {
  const isCloudUrl = path && (path.startsWith("http://") || path.startsWith("https://"));
  const [url, setUrl] = useState(isCloudUrl ? path : null);
  const isPdf = path && path.toLowerCase().endsWith(".pdf");

  useEffect(() => {
    let revoked;
    if (!isPdf && !isCloudUrl && path) {
      api.get(`/files/${path}`, { responseType: "blob" })
        .then((r) => { const u = URL.createObjectURL(r.data); revoked = u; setUrl(u); })
        .catch(() => {});
    }
    return () => revoked && URL.revokeObjectURL(revoked);
  }, [path, isPdf, isCloudUrl]);

  return (
    <div className="w-16 h-16 sm:w-20 sm:h-20 border border-border bg-white overflow-hidden hover:opacity-85 transition-all shadow-2xs flex items-center justify-center" title={isPdf ? "Click to open PDF report" : "Click to view full photo"} data-testid="evidence-thumb">
      {isPdf ? (
        <div className="w-full h-full bg-red-50 text-red-700 font-bold flex flex-col items-center justify-center border border-red-200 p-1 text-center">
          <span className="text-xl">📄</span>
          <span className="text-[8px] font-mono uppercase tracking-widest font-black">PDF</span>
        </div>
      ) : url ? (
        <img src={url} alt="evidence" className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full animate-pulse bg-muted flex items-center justify-center text-[9px] text-muted-foreground font-mono">Loading…</div>
      )}
    </div>
  );
}

export default function AuditDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [audit, setAudit] = useState(null);
  
  const [isEditing, setIsEditing] = useState(false);
  const [editAudit, setEditAudit] = useState(null);
  const [saving, setSaving] = useState(false);
  const [uploadingItem, setUploadingItem] = useState(null);

  useEffect(() => {
    api.get(`/audits/${id}`).then((r) => setAudit(r.data)).catch(() => { toast.error("Audit not found"); navigate("/audits"); });
  }, [id, navigate]);

  if (!audit) return <AppShell><div className="h-64 border border-border bg-muted/40 animate-pulse" /></AppShell>;

  const isAdmin = user && user.role === 'admin';
  const displayAudit = isEditing && editAudit ? editAudit : audit;
  const scoreOf = (cid) => (displayAudit.category_scores || []).find((c) => c.category_id === cid);

  const startEditing = () => {
    setEditAudit(JSON.parse(JSON.stringify(audit)));
    setIsEditing(true);
    toast.info("✏️ Admin Edit Mode Activated. Modify scores, notes, or photos below.");
  };

  const cancelEditing = () => {
    setEditAudit(null);
    setIsEditing(false);
    toast.info("Cancelled changes.");
  };

  const saveModifications = async () => {
    setSaving(true);
    try {
      const { data } = await api.put(`/audits/${id}`, editAudit);
      setAudit(data);
      setIsEditing(false);
      setEditAudit(null);
      toast.success("✨ Admin modifications permanently saved & synchronized with cloud database!");
    } catch (err) {
      toast.error("Failed to save administrative updates. Ensure network connection.");
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateMeta = (field, val) => {
    setEditAudit((prev) => ({ ...prev, [field]: val }));
  };

  const handleUpdateItemResult = (cid, iid, res) => {
    setEditAudit((prev) => {
      const next = { ...prev, categories: [...prev.categories] };
      const cIdx = next.categories.findIndex(c => c.category_id === cid);
      if (cIdx !== -1) {
        const cat = { ...next.categories[cIdx], items: [...next.categories[cIdx].items] };
        const iIdx = cat.items.findIndex(it => it.item_id === iid);
        if (iIdx !== -1) {
          cat.items[iIdx] = { ...cat.items[iIdx], result: res };
          next.categories[cIdx] = cat;
        }
      }
      return next;
    });
  };

  const handleUpdateItemNote = (cid, iid, text) => {
    setEditAudit((prev) => {
      const next = { ...prev, categories: [...prev.categories] };
      const cIdx = next.categories.findIndex(c => c.category_id === cid);
      if (cIdx !== -1) {
        const cat = { ...next.categories[cIdx], items: [...next.categories[cIdx].items] };
        const iIdx = cat.items.findIndex(it => it.item_id === iid);
        if (iIdx !== -1) {
          cat.items[iIdx] = { ...cat.items[iIdx], note: text };
          next.categories[cIdx] = cat;
        }
      }
      return next;
    });
  };

  const handleAddEvidence = async (cid, iid, file) => {
    if (!file) return;
    setUploadingItem(iid);
    const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
    try {
      const compressedFile = await compressImageFile(file, 1200, 0.8);
      const fd = new FormData();
      fd.append("file", compressedFile);
      const { data } = await api.post("/upload", fd, { headers: { "Content-Type": "multipart/form-data" } });
      setEditAudit((prev) => {
        const next = { ...prev, categories: [...prev.categories] };
        const cIdx = next.categories.findIndex(c => c.category_id === cid);
        if (cIdx !== -1) {
          const cat = { ...next.categories[cIdx], items: [...next.categories[cIdx].items] };
          const iIdx = cat.items.findIndex(it => it.item_id === iid);
          if (iIdx !== -1) {
            const ev = [...(cat.items[iIdx].evidence || []), data.path];
            cat.items[iIdx] = { ...cat.items[iIdx], evidence: ev };
            next.categories[cIdx] = cat;
          }
        }
        return next;
      });
      toast.success(isPdf ? "📄 PDF Document uploaded!" : "📸 Photo compressed & attached!");
    } catch {
      toast.error("Upload failed.");
    } finally {
      setUploadingItem(null);
    }
  };

  const handleRemoveEvidence = (cid, iid, pathToRemove) => {
    setEditAudit((prev) => {
      const next = { ...prev, categories: [...prev.categories] };
      const cIdx = next.categories.findIndex(c => c.category_id === cid);
      if (cIdx !== -1) {
        const cat = { ...next.categories[cIdx], items: [...next.categories[cIdx].items] };
        const iIdx = cat.items.findIndex(it => it.item_id === iid);
        if (iIdx !== -1) {
          const ev = (cat.items[iIdx].evidence || []).filter(p => p !== pathToRemove);
          cat.items[iIdx] = { ...cat.items[iIdx], evidence: ev };
          next.categories[cIdx] = cat;
        }
      }
      return next;
    });
    toast.success("🗑️ Picture removed from item.");
  };

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

        <div className="flex flex-wrap items-center gap-2.5">
          {isAdmin && !isEditing && (
            <button
              onClick={startEditing}
              className="h-9 sm:h-10 px-4 sm:px-5 bg-amber-600 hover:bg-amber-700 text-white font-black text-[11px] sm:text-xs tracking-[0.12em] uppercase inline-flex items-center gap-1.5 transition-colors shadow-sm"
            >
              <PencilSimple weight="bold" size={16} /> ✏️ Admin Edit Mode
            </button>
          )}

          {isEditing ? (
            <div className="flex items-center gap-2">
              <button
                onClick={saveModifications}
                disabled={saving}
                className="h-10 px-5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs tracking-wider uppercase inline-flex items-center gap-1.5 transition-colors shadow-md animate-pulse"
              >
                <FloppyDisk weight="bold" size={17} /> {saving ? "Saving..." : "💾 Save Admin Modifications"}
              </button>
              <button
                onClick={cancelEditing}
                disabled={saving}
                className="h-10 px-4 bg-white hover:bg-red-50 text-red-700 border border-red-300 font-bold text-xs uppercase inline-flex items-center gap-1 transition-colors"
              >
                <X weight="bold" size={16} /> Cancel
              </button>
            </div>
          ) : (
            <>
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
            </>
          )}
        </div>
      </div>

      <div className={`border ${isEditing ? "border-amber-500 bg-amber-50/20" : "border-border bg-white"} p-6 sm:p-8 mb-6 animate-fade-up shadow-xs`} data-testid="audit-header">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="font-mono text-[10px] tracking-[0.3em] uppercase text-accent font-bold">OneUP Motors Inspection Report</span>
              {isEditing && (
                <span className="bg-amber-100 text-amber-950 border border-amber-400 font-mono text-[9px] px-2 py-0.5 font-black uppercase tracking-wider">
                  ✏️ ADMIN LIVE EDITING
                </span>
              )}
            </div>
            
            {isEditing ? (
              <div className="space-y-3 mt-2">
                <div>
                  <label className="text-[10px] font-mono uppercase font-bold text-muted-foreground block">Dealership Branch Name</label>
                  <input
                    type="text"
                    value={displayAudit.dealership_name || ""}
                    onChange={(e) => handleUpdateMeta("dealership_name", e.target.value)}
                    className="w-full sm:w-96 font-display text-2xl font-black bg-white p-2 border border-border focus:outline-none focus:border-primary"
                  />
                </div>
                <div className="flex flex-wrap gap-3">
                  <div>
                    <label className="text-[10px] font-mono uppercase font-bold text-muted-foreground block">Location / City</label>
                    <input
                      type="text"
                      value={displayAudit.location || ""}
                      onChange={(e) => handleUpdateMeta("location", e.target.value)}
                      className="text-xs font-mono bg-white p-2 border border-border focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-mono uppercase font-bold text-muted-foreground block">Auditor Name(s)</label>
                    <input
                      type="text"
                      value={displayAudit.auditor_name || ""}
                      onChange={(e) => handleUpdateMeta("auditor_name", e.target.value)}
                      className="text-xs font-mono bg-white p-2 border border-border focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-mono uppercase font-bold text-muted-foreground block">Audit Date</label>
                    <input
                      type="date"
                      value={displayAudit.audit_date || ""}
                      onChange={(e) => handleUpdateMeta("audit_date", e.target.value)}
                      className="text-xs font-mono bg-white p-2 border border-border focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            ) : (
              <>
                <h1 className="font-display text-3xl sm:text-4xl font-black tracking-tighter">{displayAudit.dealership_name}</h1>
                <div className="flex flex-wrap gap-4 mt-3 text-xs sm:text-sm text-muted-foreground">
                  <span className="flex items-center gap-1"><MapPin size={14} />{displayAudit.location}</span>
                  <span className="flex items-center gap-1"><User size={14} />{displayAudit.auditor_name}</span>
                  <span className="flex items-center gap-1 font-mono"><CalendarBlank size={14} />{displayAudit.audit_date}</span>
                </div>
              </>
            )}
          </div>
          
          <div className="sm:text-right border-t sm:border-t-0 pt-4 sm:pt-0 border-border shrink-0">
            <div className={`font-display text-5xl sm:text-6xl font-black tracking-tighter ${scoreColor(displayAudit.overall_score)}`}>{displayAudit.overall_score}%</div>
            <div className="mt-1.5"><ScoreBadge status={displayAudit.status} /></div>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-2 sm:gap-3 mt-6 sm:mt-8 max-h-72 overflow-y-auto p-2 sm:p-3 border border-border bg-muted/10">
          {(displayAudit.category_scores || []).map((cs) => (
            <div key={cs.category_id} className="border border-border p-2.5 sm:p-3 bg-white">
              <div className="text-[9px] tracking-wider uppercase font-bold text-muted-foreground truncate" title={cs.name}>{cs.name}</div>
              <div className={`font-display text-lg sm:text-xl font-black mt-1 ${scoreColor(cs.score)}`}>{cs.score}%</div>
            </div>
          ))}
        </div>

        {(displayAudit.general_notes || isEditing) && (
          <div className="mt-6 border-t border-border pt-4">
            <div className="flex items-center gap-2 text-xs tracking-[0.2em] uppercase font-bold text-muted-foreground mb-2">
              <NotePencil size={14} /> General Summary &amp; Findings
            </div>
            {isEditing ? (
              <textarea
                value={displayAudit.general_notes || ""}
                onChange={(e) => handleUpdateMeta("general_notes", e.target.value)}
                placeholder="Enter executive findings or general audit summary..."
                className="w-full text-xs sm:text-sm font-mono bg-white p-3 border border-border focus:outline-none focus:border-primary h-24"
              />
            ) : (
              <p className="text-xs sm:text-sm leading-relaxed">{displayAudit.general_notes}</p>
            )}
          </div>
        )}
      </div>

      <div className="space-y-6 animate-fade-up">
        {(displayAudit.categories || []).map((cat) => (
          <CategoryBlock
            key={cat.category_id}
            cat={cat}
            catScore={scoreOf(cat.category_id)}
            isEditing={isEditing}
            onUpdateItemResult={handleUpdateItemResult}
            onUpdateItemNote={handleUpdateItemNote}
            onAddEvidence={handleAddEvidence}
            onRemoveEvidence={handleRemoveEvidence}
            uploadingItem={uploadingItem}
          />
        ))}
      </div>
    </AppShell>
  );
}
