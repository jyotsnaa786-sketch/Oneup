import React, { useEffect, useState } from "react";
import { api } from "@/lib/apiClient";
import AppShell from "@/components/AppShell";
import { toast } from "sonner";
import { Wrench, PlusCircle, Trash, FloppyDisk, ArrowDown, ArrowUp, CheckCircle } from "@phosphor-icons/react";

export default function TemplateEditor() {
  const [template, setTemplate] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get("/audit-template").then((r) => setTemplate(r.data)).catch(() => toast.error("Failed to load template"));
  }, []);

  const saveTemplate = async () => {
    setSaving(true);
    try {
      await api.put("/audit-template", template);
      toast.success("Audit Template successfully updated across all dealerships!");
    } catch (e) {
      toast.error("Failed to update template");
    } finally {
      setSaving(false);
    }
  };

  const addItem = (catIdx) => {
    const next = [...template];
    const newId = `item_${Date.now().toString().slice(-4)}`;
    next[catIdx].items.push({ item_id: newId, text: "New inspection criteria checklist item..." });
    setTemplate(next);
  };

  const deleteItem = (catIdx, itemIdx) => {
    const next = [...template];
    next[catIdx].items.splice(itemIdx, 1);
    setTemplate(next);
  };

  const updateText = (catIdx, itemIdx, val) => {
    const next = [...template];
    next[catIdx].items[itemIdx].text = val;
    setTemplate(next);
  };

  const moveItem = (catIdx, itemIdx, dir) => {
    const next = [...template];
    const targetIdx = itemIdx + dir;
    if (targetIdx < 0 || targetIdx >= next[catIdx].items.length) return;
    const temp = next[catIdx].items[itemIdx];
    next[catIdx].items[itemIdx] = next[catIdx].items[targetIdx];
    next[catIdx].items[targetIdx] = temp;
    setTemplate(next);
  };

  if (!template) {
    return <AppShell><div className="h-64 border border-border bg-muted/40 animate-pulse" /></AppShell>;
  }

  return (
    <AppShell>
      <div className="flex items-end justify-between mb-8 animate-fade-up">
        <div>
          <div className="font-mono text-[10px] tracking-[0.3em] uppercase text-accent mb-2">Manager Protocol Governance</div>
          <h1 className="font-display text-4xl font-black tracking-tighter">Checklist Template Editor</h1>
          <p className="text-sm text-muted-foreground mt-1">Modify inspection questions and criteria to match evolving Maruti Suzuki arena and nexa compliance standards.</p>
        </div>
        <button
          onClick={saveTemplate}
          disabled={saving}
          data-testid="save-template"
          className="h-11 px-6 bg-primary text-white font-bold text-xs tracking-[0.2em] uppercase flex items-center gap-2 hover:bg-blue-800 transition-colors disabled:opacity-60"
        >
          <FloppyDisk weight="bold" size={18} /> {saving ? "Saving…" : "Save Template Changes"}
        </button>
      </div>

      <div className="space-y-8 animate-fade-up">
        {template.map((cat, catIdx) => (
          <div key={cat.category_id} className="border border-border bg-white shadow-sm">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-muted/30">
              <div>
                <span className="font-mono text-[10px] tracking-widest text-muted-foreground uppercase">Category Pillar</span>
                <h3 className="font-display text-xl font-black tracking-tight">{cat.name}</h3>
              </div>
              <button
                onClick={() => addItem(catIdx)}
                className="inline-flex items-center gap-2 px-4 h-9 bg-foreground text-white font-bold text-xs tracking-[0.15em] uppercase hover:bg-primary transition-colors"
              >
                <PlusCircle size={15} /> Add Question
              </button>
            </div>

            <div className="divide-y divide-border/60">
              {cat.items.map((it, itemIdx) => (
                <div key={it.item_id} className="p-4 flex items-center gap-4 hover:bg-muted/20 transition-colors">
                  <span className="font-mono text-xs text-muted-foreground font-bold w-12 text-center bg-muted py-1.5 border border-border">
                    {it.item_id}
                  </span>
                  <input
                    value={it.text}
                    onChange={(e) => updateText(catIdx, itemIdx, e.target.value)}
                    className="flex-1 h-10 px-3 border border-input bg-white text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                  <div className="flex items-center gap-1">
                    <button onClick={() => moveItem(catIdx, itemIdx, -1)} disabled={itemIdx === 0} className="w-8 h-8 border border-border flex items-center justify-center hover:bg-muted disabled:opacity-30" title="Move Up">
                      <ArrowUp size={14} />
                    </button>
                    <button onClick={() => moveItem(catIdx, itemIdx, 1)} disabled={itemIdx === cat.items.length - 1} className="w-8 h-8 border border-border flex items-center justify-center hover:bg-muted disabled:opacity-30" title="Move Down">
                      <ArrowDown size={14} />
                    </button>
                    <button onClick={() => deleteItem(catIdx, itemIdx)} className="w-8 h-8 border border-border flex items-center justify-center text-destructive hover:bg-destructive hover:text-white transition-colors ml-2" title="Delete Question">
                      <Trash size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </AppShell>
  );
}
