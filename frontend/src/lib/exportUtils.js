import { api, getHostBase } from "./apiClient";
import { toast } from "sonner";

/**
 * Clean string for safe file names across operating systems
 */
function sanitizeFilename(name) {
  if (!name) return "Report";
  return name.replace(/[^a-zA-Z0-9_\-]/g, "_").replace(/_+/g, "_");
}

/**
 * Triggers native browser download from a Blob
 */
function triggerBlobDownload(blob, filename) {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => window.URL.revokeObjectURL(url), 2000);
}

/**
 * Downloads official audit PDF with loading progress, authentication injection, and multi-tier fallbacks
 */
export async function downloadAuditPdf(auditId, dealershipName = "Audit", auditDate = "") {
  if (!auditId) {
    toast.error("Audit ID is missing.");
    return;
  }

  const safeName = sanitizeFilename(dealershipName);
  const safeDate = sanitizeFilename(auditDate) || new Date().toISOString().split("T")[0];
  const filename = `OneUP_Motors_Audit_${safeName}_${safeDate}.pdf`;

  const toastId = toast.loading(`Generating official PDF report with photo evidence for ${dealershipName}...`);

  try {
    const response = await api.get(`/audits/${auditId}/pdf`, {
      responseType: "blob",
      timeout: 90000, // 90 seconds for large reports with 90+ high-res photos
    });

    if (response.data && response.data.size > 0) {
      triggerBlobDownload(response.data, filename);
      toast.success("OneUP Motors PDF report downloaded successfully!", { id: toastId });
      return;
    }
    throw new Error("Empty PDF response received from server");
  } catch (err) {
    console.warn("Direct blob PDF download failed, initiating browser direct stream fallback:", err);
    toast.info("Opening PDF download stream directly...", { id: toastId });

    const token = (typeof localStorage !== "undefined" && localStorage.getItem("oneup_token")) || "";
    const directUrl = `${getHostBase()}/api/audits/${auditId}/pdf?token=${encodeURIComponent(token)}&auth=${encodeURIComponent(token)}`;

    const win = window.open(directUrl, "_blank");
    if (!win) {
      const a = document.createElement("a");
      a.href = directUrl;
      a.target = "_blank";
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  }
}

/**
 * Downloads official audit Excel spreadsheet (.xlsx) with loading progress and multi-tier fallbacks
 */
export async function downloadAuditExcel(auditId, dealershipName = "Audit", auditDate = "") {
  if (!auditId) {
    toast.error("Audit ID is missing.");
    return;
  }

  const safeName = sanitizeFilename(dealershipName);
  const safeDate = sanitizeFilename(auditDate) || new Date().toISOString().split("T")[0];
  const filename = `OneUP_Motors_Audit_${safeName}_${safeDate}.xlsx`;

  const toastId = toast.loading(`Generating Microsoft Excel spreadsheet (.xlsx) for ${dealershipName}...`);

  try {
    const response = await api.get(`/audits/${auditId}/excel`, {
      responseType: "blob",
      timeout: 45000,
    });

    if (response.data && response.data.size > 0) {
      triggerBlobDownload(response.data, filename);
      toast.success("Excel spreadsheet (.xlsx) downloaded successfully!", { id: toastId });
      return;
    }
    throw new Error("Empty Excel response received from server");
  } catch (err) {
    console.warn("Direct blob Excel download failed, initiating browser direct stream fallback:", err);
    toast.info("Opening Excel stream directly...", { id: toastId });

    const token = (typeof localStorage !== "undefined" && localStorage.getItem("oneup_token")) || "";
    const directUrl = `${getHostBase()}/api/audits/${auditId}/excel?token=${encodeURIComponent(token)}&auth=${encodeURIComponent(token)}`;

    const win = window.open(directUrl, "_blank");
    if (!win) {
      const a = document.createElement("a");
      a.href = directUrl;
      a.target = "_blank";
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  }
}
