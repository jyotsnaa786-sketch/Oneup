import axios from "axios";

export const getHostBase = () => {
  // 1. Explicit environment variable override (if configured)
  if (import.meta.env && import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL.replace(/\/$/, "");
  }
  if (typeof window === "undefined") return "http://localhost:8001";
  const hostname = window.location.hostname;

  // 2. Local development & LAN environments
  if (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname.startsWith("192.168.") ||
    hostname.startsWith("10.") ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(hostname)
  ) {
    if (window.location.port === "8001") {
      return `${window.location.protocol}//${window.location.host}`;
    }
    return `http://${hostname}:8001`;
  }

  // 3. Cloud / Production Hosting:
  // If hosted on Render alongside backend on the same domain:
  if (hostname.includes("onrender.com")) {
    return `${window.location.protocol}//${window.location.host}`;
  }

  // Default to live Render Backend for Vercel / External Frontend hosting
  return "https://oneup-motors-audit.onrender.com";
};

export const API = `${getHostBase()}/api`;

export const api = axios.create({
  baseURL: API,
  withCredentials: true,
});

// Automatically inject Bearer token from localStorage to survive mobile browser cookie drop rules
api.interceptors.request.use((config) => {
  if (typeof localStorage !== "undefined") {
    const token = localStorage.getItem("oneup_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

export function formatApiErrorDetail(detail, error) {
  if (error && (error.code === "ERR_NETWORK" || error.message?.includes("Network Error") || !error.response)) {
    return "Cannot connect to backend server. The backend service may be offline or suspended.";
  }
  if (error?.response?.status === 503) {
    return "Backend server is suspended or unavailable (HTTP 503). Please unsuspend or check your Render backend service.";
  }
  if (detail == null) return "Something went wrong. Please try again.";
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail))
    return detail
      .map((e) => (e && typeof e.msg === "string" ? e.msg : JSON.stringify(e)))
      .filter(Boolean)
      .join(" ");
  if (detail && typeof detail.msg === "string") return detail.msg;
  return String(detail);
}
