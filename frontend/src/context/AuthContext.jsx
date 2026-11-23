import React, { createContext, useContext, useEffect, useState } from "react";
import { api } from "@/lib/apiClient";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get("/auth/me")
      .then((res) => setUser(res.data))
      .catch((err) => {
        // ONLY invalidate token on 401 Unauthorized or 403 Forbidden.
        // On network drops or cold-start backend delays, do NOT purge saved credentials!
        if (err.response && (err.response.status === 401 || err.response.status === 403)) {
          if (typeof localStorage !== "undefined") localStorage.removeItem("oneup_token");
        }
        setUser(false);
      })
      .finally(() => setLoading(false));

    // Automated Browser Keep-Alive Heartbeat (Prevents cloud server inactivity sleep while tab is open)
    const pingInterval = setInterval(() => {
      api.get("/ping").catch(() => {});
    }, 240000);
    return () => clearInterval(pingInterval);
  }, []);

  const login = async (email, password) => {
    const cleanEmail = (email || "").trim().toLowerCase();
    const { data } = await api.post("/auth/login", { email: cleanEmail, password });
    if (data.access_token && typeof localStorage !== "undefined") {
      localStorage.setItem("oneup_token", data.access_token);
    }
    setUser(data);
    return data;
  };

  const register = async (name, email, password) => {
    const cleanEmail = (email || "").trim().toLowerCase();
    const cleanName = (name || "").trim();
    const { data } = await api.post("/auth/register", { name: cleanName, email: cleanEmail, password });
    if (data.access_token && typeof localStorage !== "undefined") {
      localStorage.setItem("oneup_token", data.access_token);
    }
    setUser(data);
    return data;
  };

  const logout = () => {
    if (typeof localStorage !== "undefined") {
      localStorage.removeItem("oneup_token");
    }
    setUser(false);
    api.post("/auth/logout").catch(() => {});
  };

  const requestPasswordReset = async (email) => {
    const cleanEmail = (email || "").trim().toLowerCase();
    const { data } = await api.post("/auth/forgot-password", { email: cleanEmail });
    return data;
  };

  const resetPassword = async (email, code, new_password) => {
    const cleanEmail = (email || "").trim().toLowerCase();
    const cleanCode = (code || "").trim();
    const { data } = await api.post("/auth/reset-password", { email: cleanEmail, code: cleanCode, new_password });
    if (data.access_token && typeof localStorage !== "undefined") {
      localStorage.setItem("oneup_token", data.access_token);
    }
    setUser(data);
    return data;
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, requestPasswordReset, resetPassword }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
