import React, { useState, useEffect } from "react";
import { getHostBase } from "@/lib/apiClient";
import { DownloadSimple, X, ShareNetwork, PlusSquare, DeviceMobile, Desktop, DotsThreeVertical, CheckCircle, QrCode, Copy, Check, WindowsLogo } from "@phosphor-icons/react";

export default function InstallPrompt() {
  const [showBanner, setShowBanner] = useState(true);
  const [showQrModal, setShowQrModal] = useState(false);
  const [showGuideModal, setShowGuideModal] = useState(false);
  const [deviceType, setDeviceType] = useState("desktop");
  const [copied, setCopied] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  // The definitive local Wi-Fi mobile address
  const mobileLink = "http://192.168.1.152:8001";
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=${encodeURIComponent(mobileLink)}&color=0047AB&bgcolor=FFFFFF`;

  useEffect(() => {
    const inStandalone = window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
    setIsStandalone(inStandalone);
    if (inStandalone) return;

    const ua = navigator.userAgent || "";
    if (/iPad|iPhone|iPod/.test(ua) && !window.MSStream) {
      setDeviceType("ios");
    } else if (/Android/.test(ua)) {
      setDeviceType("android");
    } else {
      setDeviceType("desktop");
    }
  }, []);

  const copyLink = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(mobileLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    }
  };

  const downloadWindowsInstaller = () => {
    window.open(`${getHostBase()}/api/download/windows-app`, "_blank");
  };

  if (isStandalone || !showBanner) return null;

  return (
    <>
      {/* Universal Top App Installation & QR Banner */}
      <div className="bg-accent text-white px-4 py-3.5 shadow-xl border-b border-white/20 animate-fade-down relative z-50">
        <div className="max-w-[1400px] mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 bg-white text-accent flex items-center justify-center font-black text-xs shrink-0 shadow-sm border border-white/40">
              <QrCode size={28} weight="bold" />
            </div>
            <div>
              <div className="font-display font-black text-base sm:text-lg tracking-tight uppercase flex items-center gap-2">
                <span>Get OneUP Mobile Field App</span>
                <span className="bg-white/20 text-[10px] px-2 py-0.5 uppercase tracking-widest font-mono font-bold">Wi-Fi Ready</span>
              </div>
              <div className="text-xs opacity-95 font-mono leading-tight mt-0.5">Scan QR code or copy direct mobile link to install onto any iPhone or Android smartphone!</div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto justify-end">
            <button
              onClick={() => setShowQrModal(true)}
              data-testid="get-mobile-link-btn"
              className="h-10 px-5 bg-white text-accent hover:bg-black hover:text-white font-black text-xs sm:text-sm tracking-wider uppercase inline-flex items-center gap-2 transition-all shadow-md active:scale-95 flex-1 sm:flex-initial justify-center"
            >
              <DeviceMobile weight="fill" size={18} /> Get Mobile Link &amp; QR
            </button>
            <button
              onClick={() => setShowGuideModal(true)}
              className="h-10 px-4 bg-primary text-white hover:bg-blue-800 font-extrabold text-xs sm:text-sm tracking-wider uppercase inline-flex items-center gap-1.5 transition-all shadow-md active:scale-95 flex-1 sm:flex-initial justify-center"
              title="View install guidance"
            >
              <DownloadSimple weight="bold" size={17} /> Install App
            </button>
            <button
              onClick={() => setShowBanner(false)}
              className="w-8 h-8 flex items-center justify-center hover:bg-white/20 transition-colors shrink-0 hidden sm:flex"
              title="Close Banner"
            >
              <X size={20} weight="bold" />
            </button>
          </div>
        </div>
      </div>

      {/* MOBILE APP QR CODE & DIRECT LINK HUB MODAL */}
      {showQrModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-white border-4 border-accent w-full max-w-lg p-6 sm:p-8 shadow-2xl animate-fade-up text-foreground">
            <div className="flex items-start justify-between pb-4 border-b border-border mb-5">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-accent text-white flex items-center justify-center font-black shrink-0 shadow-sm">
                  <QrCode size={30} weight="bold" />
                </div>
                <div>
                  <h3 className="font-display font-black text-2xl tracking-tight uppercase text-foreground">Mobile App Hub</h3>
                  <span className="text-xs font-mono tracking-wider uppercase text-accent font-bold">OneUP Motors Field Access</span>
                </div>
              </div>
              <button onClick={() => setShowQrModal(false)} className="w-9 h-9 flex items-center justify-center border border-border text-muted-foreground hover:bg-foreground hover:text-white transition-colors">
                <X size={22} weight="bold" />
              </button>
            </div>

            <div className="text-center bg-muted/20 p-6 border-2 border-dashed border-accent/40 mb-6">
              <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground block mb-3 font-mono">
                📸 Option 1: Point Your Smartphone Camera Below
              </span>
              <div className="bg-white p-4 inline-block border-2 border-border shadow-md mb-3">
                <img src={qrCodeUrl} alt="OneUP Mobile App QR Code" className="w-56 h-56 mx-auto" />
              </div>
              <p className="text-xs text-foreground font-medium max-w-sm mx-auto">
                Open your camera app on iPhone or Android and point it at this QR Code. Tap the notification to launch the mobile app instantly!
              </p>
            </div>

            <div className="bg-muted/30 p-4 border border-border mb-6">
              <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground block mb-2 font-mono">
                🔗 Option 2: Direct Mobile URL (Share with Auditors)
              </span>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={mobileLink}
                  className="flex-1 h-11 px-3 bg-white border border-border font-mono text-sm sm:text-base font-bold text-primary select-all"
                />
                <button
                  onClick={copyLink}
                  className={`h-11 px-4 font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 transition-colors shadow-sm ${
                    copied ? "bg-emerald-600 text-white" : "bg-foreground text-white hover:bg-primary"
                  }`}
                >
                  {copied ? <Check weight="bold" size={16} /> : <Copy weight="bold" size={16} />}
                  {copied ? "Copied!" : "Copy Link"}
                </button>
              </div>
              <p className="text-[11px] text-muted-foreground mt-2 font-mono">
                Make sure your mobile phone is connected to the same Wi-Fi network before opening this link!
              </p>
            </div>

            <div className="p-4 bg-accent/10 border border-accent/30 text-xs text-foreground mb-6 font-sans">
              <span className="font-bold text-accent uppercase block mb-1">💡 How to save icon to Phone Screen:</span>
              Once opened on your phone, simply tap your browser menu <strong>(⋮ or Share ⬆️)</strong> and select <strong>"Add to Home Screen"</strong> to install the standalone OneUP app!
            </div>

            <button
              onClick={() => setShowQrModal(false)}
              className="w-full h-12 bg-accent hover:bg-orange-700 text-white font-black text-sm tracking-[0.15em] uppercase transition-colors shadow-lg flex items-center justify-center gap-2"
            >
              <CheckCircle size={20} weight="fill" /> Close &amp; Return to Dashboard
            </button>
          </div>
        </div>
      )}

      {/* UNIVERSAL INSTALL GUIDANCE MODAL */}
      {showGuideModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-white border-2 border-primary w-full max-w-xl p-6 sm:p-8 shadow-2xl animate-fade-up text-foreground">
            <div className="flex items-start justify-between pb-4 border-b border-border mb-5">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-primary text-white flex items-center justify-center font-black shrink-0 shadow-sm">
                  {deviceType === "desktop" ? <Desktop size={28} weight="bold" /> : <DeviceMobile size={28} weight="fill" />}
                </div>
                <div>
                  <h3 className="font-display font-black text-2xl tracking-tight uppercase text-foreground">Install Guidance</h3>
                  <span className="text-xs font-mono tracking-wider uppercase text-accent font-bold">Select Your Device</span>
                </div>
              </div>
              <button onClick={() => setShowGuideModal(false)} className="w-9 h-9 flex items-center justify-center border border-border text-muted-foreground hover:bg-foreground hover:text-white transition-colors">
                <X size={20} weight="bold" />
              </button>
            </div>

            <div className="space-y-4 mb-6 max-h-96 overflow-y-auto pr-2 font-sans text-sm">
              <div className="p-4 bg-blue-50 border-2 border-primary/40">
                <div className="font-bold text-primary mb-2 uppercase text-xs tracking-wider flex items-center gap-1.5">
                  <DeviceMobile weight="fill" size={16} /> Android Smartphone (Chrome / Samsung)
                </div>
                <p className="text-xs text-foreground mb-1">
                  1. Open <strong>http://192.168.1.152:8001</strong> on your Android phone over Wi-Fi.
                </p>
                <p className="text-xs text-foreground">
                  2. Tap the 3-dots menu <strong>(⋮)</strong> in the top right and tap <strong>"Add to Home screen"</strong> or <strong>"Install app"</strong>.
                </p>
              </div>

              <div className="p-4 bg-orange-50 border-2 border-orange-400">
                <div className="font-bold text-orange-900 mb-2 uppercase text-xs tracking-wider flex items-center gap-1.5">
                  <DeviceMobile weight="fill" size={16} /> iPhone / iPad (iOS Safari)
                </div>
                <p className="text-xs text-foreground mb-1">
                  1. Open <strong>http://192.168.1.152:8001</strong> inside Safari on your iPhone.
                </p>
                <p className="text-xs text-foreground">
                  2. Tap Safari's bottom Share icon <strong>(⬆️)</strong> and select <strong>"Add to Home Screen"</strong>.
                </p>
              </div>

              <div className="p-4 bg-muted/20 border border-border">
                <div className="font-bold text-muted-foreground mb-2 uppercase text-xs tracking-wider flex items-center gap-1.5">
                  <Desktop weight="bold" size={16} /> Windows / Desktop Laptops
                </div>
                <p className="text-xs text-foreground mb-2">
                  If your laptop blocks automated shortcuts, simply look inside your top browser address bar on the right side and click the little install computer icon <strong>(➕ or 💻)</strong>, or download our installer script below:
                </p>
                <button
                  onClick={downloadWindowsInstaller}
                  className="h-9 px-4 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-[11px] tracking-wider uppercase inline-flex items-center gap-1.5 shadow-xs"
                >
                  <WindowsLogo weight="fill" size={15} /> Download PC Script (.bat)
                </button>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              <button
                onClick={() => { setShowGuideModal(false); setShowQrModal(true); }}
                className="w-full sm:w-auto h-11 px-5 bg-accent hover:bg-orange-700 text-white font-bold text-xs tracking-wider uppercase transition-colors shadow-sm inline-flex items-center justify-center gap-1.5"
              >
                <QrCode weight="bold" size={16} /> Open Mobile QR Code
              </button>
              <button
                onClick={() => setShowGuideModal(false)}
                className="w-full sm:w-auto h-11 px-6 bg-primary hover:bg-blue-800 text-white font-bold text-xs tracking-wider uppercase transition-colors shadow-sm inline-flex items-center justify-center gap-1.5"
              >
                <CheckCircle size={16} weight="fill" /> Close Guide
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
