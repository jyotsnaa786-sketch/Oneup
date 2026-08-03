import React, { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useNavigate } from "react-router-dom";
import { formatApiErrorDetail } from "@/lib/apiClient";
import { toast } from "sonner";
import { Wrench, ArrowRight } from "@phosphor-icons/react";

const HERO =
  "https://images.unsplash.com/photo-1615906655593-ad0386982a0f?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjAzNzl8MHwxfHNlYXJjaHwxfHxjYXIlMjBlbmdpbmUlMjBpbnNwZWN0aW9uJTIwbWVjaGFuaWN8ZW58MHx8fHwxNzgyMjM4MDAxfDA&ixlib=rb-4.1.0&q=85";

export default function Login() {
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      if (mode === "login") await login(email, password);
      else await register(name, email, password);
      toast.success("Welcome to OneUP Motors Audit Protocol");
      navigate("/");
    } catch (err) {
      const msg = formatApiErrorDetail(err.response?.data?.detail) || err.message;
      setError(msg);
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      <div className="flex items-center justify-center px-6 py-12 bg-background">
        <div className="w-full max-w-sm animate-fade-up">
          <div className="flex items-center gap-3 mb-10">
            <div className="w-10 h-10 bg-primary flex items-center justify-center">
              <Wrench weight="bold" className="text-white" size={22} />
            </div>
            <div className="leading-none">
              <div className="font-display font-black text-xl tracking-tighter uppercase">ONEUP MOTORS</div>
              <div className="font-mono text-[10px] tracking-[0.2em] uppercase text-muted-foreground">
                After-Sales Audit System
              </div>
            </div>
          </div>

          <h1 className="font-display text-4xl font-black tracking-tighter mb-2">
            {mode === "login" ? "Audit Console" : "Create Account"}
          </h1>
          <p className="text-sm text-muted-foreground mb-8">
            {mode === "login"
              ? "Sign in to run inspections and maintain OneUP Motors dealership compliance."
              : "Register as an auditor to begin."}
          </p>

          <form onSubmit={submit} className="space-y-4">
            {mode === "register" && (
              <div>
                <label className="text-xs tracking-[0.2em] uppercase font-bold text-muted-foreground">Name</label>
                <input
                  data-testid="name-input"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="mt-1 w-full h-11 px-3 border border-input bg-white focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1"
                />
              </div>
            )}
            <div>
              <label className="text-xs tracking-[0.2em] uppercase font-bold text-muted-foreground">Email</label>
              <input
                data-testid="email-input"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="mt-1 w-full h-11 px-3 border border-input bg-white focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 font-mono"
              />
            </div>
            <div>
              <label className="text-xs tracking-[0.2em] uppercase font-bold text-muted-foreground">Password</label>
              <input
                data-testid="password-input"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="mt-1 w-full h-11 px-3 border border-input bg-white focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 font-mono"
              />
            </div>

            {error && (
              <div data-testid="auth-error" className="text-xs text-destructive font-medium border border-destructive/40 bg-destructive/5 px-3 py-2">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={busy}
              data-testid="submit-auth-button"
              className="w-full h-11 bg-primary text-white font-bold text-xs tracking-[0.2em] uppercase flex items-center justify-center gap-2 hover:bg-blue-800 transition-colors disabled:opacity-60"
            >
              {busy ? "Please wait…" : mode === "login" ? "Sign In" : "Register"}
              <ArrowRight weight="bold" size={16} />
            </button>
          </form>

          <button
            data-testid="toggle-auth-mode"
            onClick={() => { setMode(mode === "login" ? "register" : "login"); setError(""); }}
            className="mt-6 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            {mode === "login" ? "Need an account? Register →" : "Already registered? Sign in →"}
          </button>
        </div>
      </div>

      <div className="hidden lg:block relative bg-foreground">
        <img src={HERO} alt="Workshop inspection" className="absolute inset-0 w-full h-full object-cover opacity-70" />
        <div className="absolute inset-0 bg-gradient-to-t from-foreground via-foreground/40 to-transparent" />
        <div className="absolute bottom-0 left-0 p-12">
          <div className="font-mono text-[10px] tracking-[0.3em] uppercase text-accent mb-3">
            OneUP Motors — Franchise Compliance Protocol
          </div>
          <h2 className="font-display text-4xl font-black tracking-tighter text-white leading-tight max-w-md">
            Standardized inspections. Verifiable 100% compliance.
          </h2>
          <p className="text-white/70 text-sm mt-4 max-w-sm">
            Score all 20 operational pillars and 133 checkpoints across workshop bays, genuine MGP inventory, and statutory safety.
          </p>
        </div>
      </div>
    </div>
  );
}
