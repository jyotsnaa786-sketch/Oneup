import React from "react";
import { useAuth } from "@/context/AuthContext";
import { Link, useLocation, useNavigate } from "react-router-dom";
import InstallPrompt from "@/components/InstallPrompt";
import { Gauge, ClipboardText, PlusCircle, SignOut, Wrench, WarningCircle, Sliders, Shield } from "@phosphor-icons/react";

export default function AppShell({ children }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const isAdmin = user?.role === "admin";

  const navItems = [
    { to: "/", label: "Dashboard", short: "Home", icon: Gauge, testid: "nav-dashboard", allow: true },
    { to: "/audits", label: "Audits Archive", short: "Archive", icon: ClipboardText, testid: "nav-audits", allow: true },
    { to: "/tasks", label: "Action Tracker", short: "Tasks", icon: WarningCircle, testid: "nav-tasks", allow: true },
    { to: "/admin", label: "Admin Portal", short: "Admin", icon: Shield, testid: "nav-admin", allow: isAdmin },
    { to: "/template", label: "Template Editor", short: "Template", icon: Sliders, testid: "nav-template", allow: isAdmin },
    { to: "/audits/new", label: "Run New Audit", short: "Run Audit", icon: PlusCircle, testid: "nav-new-audit", allow: true, isAction: true },
  ].filter(item => item.allow);

  // Clean 5-tab mobile navigation without overlapping protrusions
  const mobileItems = [
    { to: "/", label: "Home", icon: Gauge },
    { to: "/audits", label: "Archive", icon: ClipboardText },
    { to: "/audits/new", label: "Run Audit", icon: PlusCircle, highlight: true },
    { to: "/tasks", label: "Tasks", icon: WarningCircle },
    { to: isAdmin ? "/admin" : "/login", label: isAdmin ? "Admin" : "Profile", icon: isAdmin ? Shield : SignOut, isLogout: !isAdmin },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col w-full max-w-[100vw] overflow-x-hidden">
      {/* Smart Automated App Installation & Mobile QR Banner */}
      <InstallPrompt />

      {/* Desktop & Tablet Top Navigation Bar */}
      <header className="sticky top-0 z-40 bg-white border-b border-border shadow-xs w-full max-w-full" data-testid="app-header">
        <div className="max-w-[1400px] w-full mx-auto px-3 sm:px-6 h-16 flex items-center justify-between overflow-hidden">
          <Link to="/" className="flex items-center gap-2 sm:gap-3 shrink-0 truncate" data-testid="brand-logo">
            <div className="w-8 h-8 bg-primary flex items-center justify-center shrink-0">
              <Wrench weight="bold" className="text-white" size={17} />
            </div>
            <div className="leading-none truncate">
              <div className="font-display font-black text-sm sm:text-lg tracking-tight uppercase truncate">ONEUP MOTORS</div>
              <div className="font-mono text-[8px] sm:text-[10px] tracking-[0.1em] uppercase text-muted-foreground truncate">
                After-Sales Audit
              </div>
            </div>
          </Link>

          <nav className="hidden xl:flex items-center gap-1">
            {navItems.map((item) => {
              const active = item.to === "/" ? location.pathname === "/" : location.pathname.startsWith(item.to);
              const Icon = item.icon;
              if (item.isAction) {
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    data-testid={item.testid}
                    className="ml-2 h-10 px-4 bg-primary hover:bg-blue-800 text-white text-xs font-bold tracking-wider uppercase inline-flex items-center gap-1.5 transition-colors shadow-xs"
                  >
                    <Icon weight="bold" size={16} />
                    {item.label}
                  </Link>
                );
              }
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  data-testid={item.testid}
                  className={`flex items-center gap-1.5 px-3 h-16 text-xs font-bold tracking-wider uppercase border-b-2 transition-colors ${
                    active
                      ? "border-accent text-foreground bg-muted/20"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Icon weight={active ? "fill" : "regular"} size={16} />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <div className="text-right hidden sm:block">
              <div className="text-xs font-semibold leading-none flex items-center gap-1 justify-end">
                {user?.name || "Auditor"}
                {isAdmin && <span className="bg-emerald-600 text-white font-mono text-[8px] px-1 py-0.5 uppercase">ADMIN</span>}
              </div>
              <div className="font-mono text-[9px] tracking-wider uppercase text-muted-foreground mt-0.5">
                Role: {user?.role || "auditor"}
              </div>
            </div>
            <button
              onClick={handleLogout}
              data-testid="logout-button"
              className="w-8 h-8 border border-border flex items-center justify-center hover:bg-foreground hover:text-white transition-colors shrink-0"
              title="Log out"
            >
              <SignOut size={16} />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area - Generous bottom padding added for mobile to never occlude buttons */}
      <main className="max-w-[1400px] w-full max-w-full mx-auto px-3 sm:px-6 py-5 sm:py-8 flex-1 pb-28 xl:pb-10 overflow-x-hidden">{children}</main>

      {/* ZERO-OVERLAP UNIFORM MOBILE BOTTOM NAVIGATION BAR */}
      <nav className="xl:hidden fixed bottom-0 left-0 right-0 w-full z-50 h-16 bg-white border-t-2 border-primary grid grid-cols-5 shadow-2xl overflow-hidden">
        {mobileItems.map((m) => {
          const active = m.to === "/" ? location.pathname === "/" : location.pathname.startsWith(m.to) && m.to !== "/login";
          const Icon = m.icon;

          if (m.isLogout) {
            return (
              <button
                key="mobile-logout"
                onClick={handleLogout}
                className="flex flex-col items-center justify-center h-full py-1 text-muted-foreground hover:text-destructive transition-colors w-full overflow-hidden"
              >
                <Icon size={20} />
                <span className="text-[9px] tracking-wider uppercase mt-1 truncate max-w-full px-1">Logout</span>
              </button>
            );
          }

          if (m.highlight) {
            return (
              <Link
                key={m.to}
                to={m.to}
                className={`flex flex-col items-center justify-center h-full py-1 transition-colors w-full overflow-hidden ${
                  active ? "bg-primary text-white font-bold" : "bg-accent text-white font-extrabold hover:bg-orange-700"
                }`}
                title={m.label}
              >
                <Icon weight="bold" size={22} className="shrink-0" />
                <span className="text-[9px] font-black uppercase tracking-wider mt-0.5 truncate max-w-full px-1">Run Audit</span>
              </Link>
            );
          }

          return (
            <Link
              key={m.to}
              to={m.to}
              className={`flex flex-col items-center justify-center h-full py-1 transition-colors w-full overflow-hidden ${
                active ? "text-primary border-t-2 border-primary font-bold bg-blue-50/50" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon weight={active ? "fill" : "regular"} size={20} className="shrink-0" />
              <span className="text-[9px] sm:text-[10px] tracking-wider uppercase mt-1 truncate max-w-full px-1">{m.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
