import { Link, useLocation } from "wouter";
import { 
  LayoutDashboard, 
  CreditCard, 
  KeyRound, 
  LogOut, 
  Menu, 
  X, 
  Crown,
  Settings,
  Sun,
  Moon,
  FileText,
  BookOpen,
  Bell
} from "lucide-react";
import React, { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export default function Dashboard({ children }: { children: React.ReactNode }) {
  const [location, setLocation] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    if (typeof window !== 'undefined') {
      const savedTheme = localStorage.getItem("admin_theme");
      if (savedTheme === "dark" || savedTheme === "light") return savedTheme as "light" | "dark";
    }
    return "dark";
  });

  const handleLogout = () => {
    localStorage.removeItem("admin_token");
    setLocation("/login");
  };

  const toggleTheme = () => {
    const newTheme = theme === "dark" ? "light" : "dark";
    setTheme(newTheme);
    localStorage.setItem("admin_theme", newTheme);
    document.documentElement.classList.toggle("dark", newTheme === "dark");
  };

  const menuItems = [
    { label: "Overview", icon: LayoutDashboard, href: "/overview" },
    { label: "License", icon: KeyRound, href: "/licenses" },
    { label: "Payment", icon: CreditCard, href: "/payment" },
    { label: "Payment Settings", icon: Settings, href: "/payment-settings" },
    { label: "Broadcast", icon: Bell, href: "/broadcast" },
    { label: "System Settings", icon: Settings, href: "/settings" },
    { label: "Deploy Guide", icon: BookOpen, href: "/deploy-guide" },
  ];

  const sidebarStyle = { 
    background: "var(--sidebar)", 
    borderRight: "1px solid var(--sidebar-border)" 
  };
  
  const activeItemStyle = { 
    background: "rgba(212,160,32,0.12)", 
    color: "hsl(43,82%,55%)", 
    boxShadow: "inset 0 0 0 1px rgba(212,160,32,0.25)" 
  };

  useEffect(() => {
    const savedTheme = localStorage.getItem("admin_theme") || "dark";
    setTheme(savedTheme as "light" | "dark");
    document.documentElement.classList.toggle("dark", savedTheme === "dark");
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col md:flex-row">
      {/* Mobile Header */}
      <div className="md:hidden flex items-center justify-between px-5 py-4 bg-background border-b border-border">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center border border-primary/20">
            <Crown className="w-5 h-5 text-primary" />
          </div>
          <span className="font-bold text-lg tracking-tight" style={{ fontFamily: "var(--font-serif)" }}>
            OneTailor <span className="gold-shimmer">Admin</span>
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={toggleTheme} className="rounded-full w-9 h-9">
            {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </Button>
          <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="p-2 text-muted-foreground">
            {mobileMenuOpen ? <X /> : <Menu />}
          </button>
        </div>
      </div>

      {/* Sidebar */}
      <aside className={cn(
        "fixed inset-0 z-50 transform transition-transform md:relative md:translate-x-0 w-64 flex flex-col shrink-0",
        mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
      )} style={{ background: "var(--sidebar)", borderRight: "1px solid var(--sidebar-border)" }}>
        <div className="p-6 flex flex-col h-full">
          <div className="hidden md:flex items-center gap-3 mb-10">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20">
              <Crown className="w-6 h-6 text-primary" />
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-lg leading-tight tracking-tight" style={{ fontFamily: "var(--font-serif)" }}>
                OneTailor <span className="gold-shimmer">Admin</span>
              </span>
              <span className="text-[9px] uppercase tracking-[0.2em] text-primary/60 font-black">Admin Portal</span>
            </div>
          </div>

          <nav className="space-y-1.5">
            {menuItems.map((item) => {
              const active = location === item.href;
              return (
                <Link 
                  key={item.href} 
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition-all duration-200 active:scale-95",
                    active ? "shadow-lg" : "text-muted-foreground hover:text-foreground hover:bg-white/5"
                  )}
                  style={active ? activeItemStyle : {}}
                >
                  <item.icon className={cn("w-4 h-4", active ? "text-primary" : "text-muted-foreground")} />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="mt-8 pt-8 border-t border-sidebar-border/30 space-y-4">
            <div className="px-4 py-3.5 rounded-2xl bg-primary/5 border border-primary/10">
              <div className="flex items-center gap-2.5 mb-1.5">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                <span className="text-[10px] font-black uppercase tracking-[0.1em] text-emerald-400/90">System Live</span>
              </div>
              <p className="text-[10px] text-muted-foreground/80 font-bold leading-relaxed px-0.5">
                Managing OneTailor Toolkit v2.0
              </p>
            </div>
            
            <Button 
              variant="ghost" 
              className="w-full justify-start text-red-400 hover:text-red-500 hover:bg-red-500/10 rounded-xl h-11 font-black text-[10px] uppercase tracking-wider"
              onClick={handleLogout}
            >
              <LogOut className="w-3.5 h-3.5 mr-3" />
              Logout Session
            </Button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto bg-background">
        <div className="max-w-5xl mx-auto p-6 md:p-10 pb-24 md:pb-10">
          {children}
        </div>
      </main>
    </div>
  );
}
