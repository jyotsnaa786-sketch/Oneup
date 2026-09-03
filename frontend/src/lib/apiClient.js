import axios from "axios";

export const getHostBase = () => {
  if (import.meta.env && import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL.replace(/\/$/, "");
  }
  if (typeof window === "undefined") return "http://localhost:8001";
  if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") {
    if (window.location.port === "8001") {
      return `${window.location.protocol}//${window.location.host}`;
    }
    return `http://${window.location.hostname}:8001`;
  }
  // If hosted on Render directly alongside backend:
  if (window.location.hostname.includes("onrender.com")) {
    return `${window.location.protocol}//${window.location.host}`;
  }
  // Default Render Backend URL for Vercel / External Frontend hosting:
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

export function formatApiErrorDetail(detail) {
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
