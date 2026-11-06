import React, { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useNavigate } from "react-router-dom";
import { formatApiErrorDetail } from "@/lib/apiClient";
import { toast } from "sonner";
import { Wrench, ArrowRight, Eye, EyeSlash } from "@phosphor-icons/react";

const HERO =
  "https://images.unsplash.com/photo-1615906655593-ad0386982a0f?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjAzNzl8MHwxfHNlYXJjaHwxfHxjYXIlMjBlbmdpbmUlMjBpbnNwZWN0aW9uJTIwbWVjaGFuaWN8ZW58MHx8fHwxNzgyMjM4MDAxfDA&ixlib=rb-4.1.0&q=85";

export default function Login() {
  const { login, register, requestPasswordReset, resetPassword } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState("login"); // "login" | "register" | "forgot"
  const [forgotStep, setForgotStep] = useState(1); // 1: request code, 2: verify & set new pass
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [resetCodeInput, setResetCodeInput] = useState("");
  const [generatedCode, setGeneratedCode] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      if (mode === "login") {
        await login(email, password);
        toast.success("Welcome to OneUP Motors Audit Protocol");
        navigate("/");
      } else if (mode === "register") {
        await register(name, email, password);
        toast.success("Welcome to OneUP Motors Audit Protocol");
        navigate("/");
      } else if (mode === "forgot" && forgotStep === 1) {
        const res = await requestPasswordReset(email);
        setGeneratedCode(res.reset_code || "");
        setResetCodeInput(res.reset_code || "");
        setForgotStep(2);
        toast.success("6-digit verification code generated!");
      } else if (mode === "forgot" && forgotStep === 2) {
        await resetPassword(email, resetCodeInput, newPassword);
        toast.success("Password reset successfully! Logged in automatically.");
        navigate("/");
      }
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

          <h1 className="font-display text-3xl sm:text-4xl font-black tracking-tighter mb-2">
            {mode === "login" ? "Audit Console" : mode === "register" ? "Create Account" : "Reset Password"}
          </h1>
          <p className="text-sm text-muted-foreground mb-8">
            {mode === "login"
              ? "Sign in to run inspections and maintain OneUP Motors dealership compliance."
              : mode === "register"
              ? "Register as an auditor to begin."
              : forgotStep === 1
              ? "Enter your email address to generate a 6-digit verification reset code."
              : "Enter your 6-digit code and choose a new password."}
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

            {(mode !== "forgot" || forgotStep === 1) && (
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
            )}

            {mode !== "forgot" && (
              <div>
                <div className="flex items-center justify-between">
                  <label className="text-xs tracking-[0.2em] uppercase font-bold text-muted-foreground">Password</label>
                  <div className="flex items-center gap-3">
                    {mode === "login" && (
                      <button
                        type="button"
                        onClick={() => { setMode("forgot"); setForgotStep(1); setError(""); }}
                        className="text-[11px] font-mono font-bold text-muted-foreground hover:text-primary transition-colors focus:outline-none cursor-pointer"
                        tabIndex={-1}
                      >
                        Forgot Password?
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="text-[11px] font-mono font-bold text-primary hover:underline focus:outline-none cursor-pointer"
                      tabIndex={-1}
                    >
                      {showPassword ? "HIDE 👁️" : "SHOW 👁️"}
                    </button>
                  </div>
                </div>
                <div className="relative mt-1">
                  <input
                    data-testid="password-input"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="w-full h-11 pl-3 pr-11 border border-input bg-white focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-muted-foreground hover:text-primary transition-colors focus:outline-none cursor-pointer"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeSlash size={20} weight="bold" /> : <Eye size={20} weight="bold" />}
                  </button>
                </div>
              </div>
            )}

            {mode === "forgot" && forgotStep === 2 && (
              <>
                {generatedCode && (
                  <div className="border border-emerald-500/40 bg-emerald-500/10 p-3 text-xs font-mono text-emerald-800 rounded-none animate-fade-up">
                    <div className="font-bold uppercase tracking-wider mb-1">🔑 Verification Code Generated</div>
                    <div>Your code: <strong className="text-sm font-bold tracking-widest text-emerald-950">{generatedCode}</strong></div>
                    <div className="text-[10px] text-muted-foreground mt-0.5">Valid for 15 minutes.</div>
                  </div>
                )}

                <div>
                  <label className="text-xs tracking-[0.2em] uppercase font-bold text-muted-foreground">6-Digit Verification Code</label>
                  <input
                    data-testid="reset-code-input"
                    type="text"
                    maxLength={6}
                    value={resetCodeInput}
                    onChange={(e) => setResetCodeInput(e.target.value)}
                    required
                    className="mt-1 w-full h-11 px-3 border border-input bg-white focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 font-mono text-center text-lg tracking-[0.3em] font-bold"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between">
                    <label className="text-xs tracking-[0.2em] uppercase font-bold text-muted-foreground">New Password</label>
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="text-[11px] font-mono font-bold text-primary hover:underline focus:outline-none cursor-pointer"
                      tabIndex={-1}
                    >
                      {showPassword ? "HIDE 👁️" : "SHOW 👁️"}
                    </button>
                  </div>
                  <div className="relative mt-1">
                    <input
                      data-testid="new-password-input"
                      type={showPassword ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                      placeholder="Enter at least 4 characters"
                      className="w-full h-11 pl-3 pr-11 border border-input bg-white focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-muted-foreground hover:text-primary transition-colors focus:outline-none cursor-pointer"
                    >
                      {showPassword ? <EyeSlash size={20} weight="bold" /> : <Eye size={20} weight="bold" />}
                    </button>
                  </div>
                </div>
              </>
            )}

            {error && (
              <div data-testid="auth-error" className="text-xs text-destructive font-medium border border-destructive/40 bg-destructive/5 px-3 py-2">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={busy}
              data-testid="submit-auth-button"
              className="w-full h-11 bg-primary text-white font-bold text-xs tracking-[0.2em] uppercase flex items-center justify-center gap-2 hover:bg-blue-800 transition-colors disabled:opacity-60 cursor-pointer"
            >
              {busy
                ? "Please wait…"
                : mode === "login"
                ? "Sign In"
                : mode === "register"
                ? "Register"
                : forgotStep === 1
                ? "Get Reset Code"
                : "Reset Password & Sign In"}
              <ArrowRight weight="bold" size={16} />
            </button>
          </form>

          <div className="mt-6 flex flex-col gap-2">
            {mode === "forgot" ? (
              <button
                type="button"
                onClick={() => { setMode("login"); setForgotStep(1); setError(""); }}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors text-left cursor-pointer"
              >
                ← Back to Sign In
              </button>
            ) : (
              <button
                data-testid="toggle-auth-mode"
                onClick={() => { setMode(mode === "login" ? "register" : "login"); setError(""); }}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors text-left cursor-pointer"
              >
                {mode === "login" ? "Need an account? Register →" : "Already registered? Sign in →"}
              </button>
            )}
          </div>
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
            Score all 19 operational pillars and 128 checkpoints across workshop bays, genuine MGP inventory, and statutory safety.
          </p>
        </div>
      </div>
    </div>
  );
}
