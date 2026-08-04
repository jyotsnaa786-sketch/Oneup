import React, { useState, useRef, useEffect } from "react";
import { X, Check, ArrowClockwise, PaintBrush, Tag, FloppyDisk, Lightning } from "@phosphor-icons/react";

export default function PhotoAnnotator({ file, onClose, onSave }) {
  const canvasRef = useRef(null);
  const [imageObj, setImageObj] = useState(null);
  const [color, setColor] = useState("#FF5A00");
  const [lineWidth, setLineWidth] = useState(4);
  const [drawing, setDrawing] = useState(false);
  const [caption, setCaption] = useState("");
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      setImageObj(img);
      const cvs = canvasRef.current;
      if (!cvs) return;
      
      // Clamp resolution for lightning-fast JPEG processing without phone lag
      const maxDim = 960;
      let w = img.width;
      let h = img.height;
      if (w > maxDim || h > maxDim) {
        if (w > h) {
          h = Math.round((maxDim / w) * h);
          w = maxDim;
        } else {
          w = Math.round((maxDim / h) * w);
          h = maxDim;
        }
      }
      cvs.width = Math.max(200, w);
      cvs.height = Math.max(200, h);
      const ctx = cvs.getContext("2d");
      ctx.drawImage(img, 0, 0, cvs.width, cvs.height);
      URL.revokeObjectURL(url);
    };
    img.src = url;
  }, [file]);

  const getCoordinates = (e) => {
    const cvs = canvasRef.current;
    if (!cvs) return { x: 0, y: 0 };
    const rect = cvs.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    const scaleX = cvs.width / (rect.width || 1);
    const scaleY = cvs.height / (rect.height || 1);
    return { x: (clientX - rect.left) * scaleX, y: (clientY - rect.top) * scaleY };
  };

  const startDraw = (e) => {
    if (e.cancelable) e.preventDefault();
    setDrawing(true);
    const { x, y } = getCoordinates(e);
    const cvs = canvasRef.current;
    const ctx = cvs.getContext("2d");
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e) => {
    if (!drawing) return;
    if (e.cancelable) e.preventDefault();
    const { x, y } = getCoordinates(e);
    const cvs = canvasRef.current;
    const ctx = cvs.getContext("2d");
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.lineCap = "round";
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const endDraw = () => {
    setDrawing(false);
  };

  const reset = () => {
    if (!imageObj || !canvasRef.current) return;
    const cvs = canvasRef.current;
    const ctx = cvs.getContext("2d");
    ctx.clearRect(0, 0, cvs.width, cvs.height);
    ctx.drawImage(imageObj, 0, 0, cvs.width, cvs.height);
  };

  const handleSave = () => {
    const cvs = canvasRef.current;
    if (!cvs || processing) return;
    setProcessing(true);
    
    const ctx = cvs.getContext("2d");
    if (caption.trim()) {
      ctx.fillStyle = "#0A0A0AD0";
      ctx.fillRect(0, cvs.height - 40, cvs.width, 40);
      ctx.fillStyle = "#FFFFFF";
      ctx.font = "bold 13px IBM Plex Mono, monospace";
      ctx.fillText(`NOTE: ${caption.trim()}`, 10, cvs.height - 15);
    }

    // High-speed compressed JPEG export (~80KB instead of 20MB PNG)
    cvs.toBlob((blob) => {
      if (!blob) {
        setProcessing(false);
        return;
      }
      const cleanName = file.name ? file.name.split('.')[0] : "photo";
      const annotatedFile = new File([blob], `${cleanName}_evidence.jpg`, { type: "image/jpeg" });
      onSave(annotatedFile, caption);
    }, "image/jpeg", 0.75);
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/90 flex flex-col items-center justify-center animate-fade-in w-full h-[100dvh] max-w-full overflow-hidden">
      <div className="bg-white max-w-2xl w-full h-full sm:h-auto sm:max-h-[92dvh] flex flex-col shadow-2xl overflow-hidden max-w-full">
        
        {/* STICKY TOP HEADER WITH IMMEDIATE SUBMIT BUTTON */}
        <div className="flex items-center justify-between px-3 sm:px-5 py-3 border-b-2 border-primary bg-white shrink-0 gap-2 w-full max-w-full overflow-hidden">
          <div className="flex items-center gap-2 truncate">
            <PaintBrush size={20} className="text-accent shrink-0 weight-bold" />
            <span className="font-display font-black text-xs sm:text-base uppercase tracking-tight truncate">Photo Studio</span>
          </div>
          
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={handleSave}
              disabled={processing}
              data-testid="sticky-top-submit-photo"
              className="h-9 px-3 sm:px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-[11px] sm:text-xs tracking-wider uppercase inline-flex items-center gap-1 shadow-sm active:scale-95 transition-all disabled:opacity-50"
            >
              <Check weight="bold" size={15} /> {processing ? "Saving…" : "SUBMIT & ATTACH"}
            </button>
            <button
              onClick={onClose}
              disabled={processing}
              className="w-9 h-9 border border-border flex items-center justify-center text-muted-foreground hover:bg-destructive hover:text-white transition-colors shrink-0"
              title="Cancel & Close"
            >
              <X size={18} weight="bold" />
            </button>
          </div>
        </div>

        {/* SCROLLABLE INTERMEDIATE WORKSPACE */}
        <div className="flex-1 overflow-y-auto p-2.5 sm:p-4 flex flex-col items-center justify-start gap-3 bg-[#EAECEF] w-full max-w-full">
          
          <div className="flex flex-wrap items-center justify-between gap-2 w-full bg-white p-2 border border-border shadow-xs shrink-0 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-[10px] tracking-wider uppercase font-bold text-muted-foreground">Color:</span>
              {[
                { c: "#FF5A00", l: "Orange" },
                { c: "#DC2626", l: "Red" },
                { c: "#2563EB", l: "Blue" },
                { c: "#16A34A", l: "Green" }
              ].map(col => (
                <button
                  key={col.c}
                  onClick={() => setColor(col.c)}
                  className={`w-6 h-6 border-2 transition-transform ${color === col.c ? "scale-125 border-black z-10 shadow-sm" : "border-white"}`}
                  style={{ backgroundColor: col.c }}
                  title={col.l}
                />
              ))}
            </div>
            <button onClick={reset} className="inline-flex items-center gap-1 px-2.5 h-7 text-[10px] font-bold uppercase tracking-wider border border-border bg-muted/20 hover:bg-muted transition-colors">
              <ArrowClockwise size={13} /> Clear
            </button>
          </div>

          {/* TOUCH ENABLED CANVAS WORKSPACE */}
          <div className="border border-border bg-white flex items-center justify-center overflow-hidden shadow-sm shrink-0 w-full max-w-full p-1">
            <canvas
              ref={canvasRef}
              onMouseDown={startDraw}
              onMouseMove={draw}
              onMouseUp={endDraw}
              onMouseLeave={endDraw}
              onTouchStart={startDraw}
              onTouchMove={draw}
              onTouchEnd={endDraw}
              className="cursor-crosshair bg-white touch-none max-w-full h-auto max-h-[55vh] object-contain block mx-auto"
            />
          </div>

          <div className="w-full bg-white p-2.5 border border-border shadow-xs shrink-0">
            <label className="flex items-center gap-1 text-[10px] font-bold tracking-[0.1em] uppercase text-muted-foreground mb-1">
              <Tag size={14} className="text-accent" /> Defect Observation / Note
            </label>
            <input
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Enter brief finding (optional)…"
              className="w-full h-10 px-2.5 border border-input bg-white font-mono text-xs focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

        </div>

        {/* STICKY BOTTOM BAR */}
        <div className="flex items-center justify-between px-3 sm:px-4 py-3 border-t-2 border-border bg-white shrink-0 gap-2 w-full max-w-full">
          <button onClick={onClose} disabled={processing} className="h-11 px-4 border border-border font-bold text-xs tracking-wider uppercase hover:bg-muted transition-colors">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={processing}
            data-testid="sticky-bottom-submit-photo"
            className="flex-1 sm:flex-initial h-11 px-6 bg-primary text-white font-black text-xs sm:text-sm tracking-[0.1em] uppercase flex items-center justify-center gap-2 hover:bg-blue-800 transition-colors shadow-md active:scale-95 disabled:opacity-50"
          >
            <FloppyDisk weight="bold" size={17} /> {processing ? "PROCESSING..." : "SUBMIT & LINK PHOTO"}
          </button>
        </div>
      </div>
    </div>
  );
}
