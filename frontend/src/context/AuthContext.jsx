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
      .catch(() => {
        if (typeof localStorage !== "undefined") localStorage.removeItem("oneup_token");
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
    const { data } = await api.post("/auth/login", { email, password });
    if (data.access_token && typeof localStorage !== "undefined") {
      localStorage.setItem("oneup_token", data.access_token);
    }
    setUser(data);
    return data;
  };

  const register = async (name, email, password) => {
    const { data } = await api.post("/auth/register", { name, email, password });
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
    const { data } = await api.post("/auth/forgot-password", { email });
    return data;
  };

  const resetPassword = async (email, code, new_password) => {
    const { data } = await api.post("/auth/reset-password", { email, code, new_password });
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
