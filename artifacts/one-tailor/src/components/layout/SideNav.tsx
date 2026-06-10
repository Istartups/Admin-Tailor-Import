import { useLocation } from "wouter";
import { useMemo } from "react";
import { Home, Grid3X3, Star, Scissors, TrendingUp, Briefcase, Video, Crown, Settings, Users } from "lucide-react";
import { useAppStore } from "@/store/useAppStore";
import { ALL_TOOLS } from "@/lib/tools";
import { useSearch } from "@/hooks/use-search";

export default function SideNav() {
  const [location, setLocation] = useLocation();
  const [search] = useSearch();
  const appName  = useAppStore((s) => s.appName);
  const appLogo  = useAppStore((s) => s.appLogo);
  const favorites = useAppStore((s) => s.favorites);
  const isPremium = useAppStore((s) => s.isPremium);
  const logoSrc  = appLogo ?? "/onetailor-logo.png";
  const nameParts = appName.includes(" ")
    ? [appName.split(" ")[0], appName.split(" ").slice(1).join(" ")]
    : [appName, ""];

  const navItemsWithCounts = useMemo(() => [
    { path: "/home",          label: "Home",           icon: Home },
    { path: "/all-tools",     label: "All Tools",      icon: Grid3X3, count: ALL_TOOLS.length },
    { path: "/all-tools?cat=fav", label: "Favourites",     icon: Star, count: favorites.length },
    { path: "/all-tools?cat=tailoring", label: "Tailoring", icon: Scissors, count: ALL_TOOLS.filter(t => t.category === "tailoring").length },
    { path: "/all-tools?cat=marketing", label: "Marketing", icon: TrendingUp, count: ALL_TOOLS.filter(t => t.category === "marketing").length },
    { path: "/all-tools?cat=business",  label: "Business",  icon: Briefcase, count: ALL_TOOLS.filter(t => t.category === "business").length },
    { path: "/all-tools?cat=media",     label: "Media",     icon: Video, count: ALL_TOOLS.filter(t => t.category === "media").length },
  ], [favorites.length]);

  const handleNavigate = (path: string) => {
    setLocation(path);
    // Force a re-render for search param changes
    window.dispatchEvent(new PopStateEvent("popstate"));
  };

  const isActive = (path: string) => {
    const currentFull = location + search;
    
    // Exact match for home
    if (path === "/home") return location === "/home";
    
    // Favourites match
    if (path.includes("cat=fav")) {
      return search.includes("cat=fav");
    }
    
    // Category matches
    if (path.includes("?cat=")) {
      return currentFull === path;
    }
    
    // All Tools match (when no category is selected)
    if (path === "/all-tools") {
      return location === "/all-tools" && !search.includes("cat=");
    }
    
    return location.startsWith(path);
  };

  return (
    <aside className="hidden md:flex flex-col w-56 min-h-screen fixed left-0 top-0 bottom-0 z-40 border-r border-sidebar-border bg-sidebar">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-sidebar-border">
        <div style={{ width: 36, height: 36, borderRadius: 10, overflow: "hidden", border: "1.5px solid rgba(212,160,32,0.35)", flexShrink: 0 }}>
          <img src={logoSrc} alt="Logo" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        </div>
        <div>
          <div className="flex items-baseline gap-0.5">
            <span style={{ fontFamily: "'Playfair Display', serif", fontSize: 16, fontWeight: 800, color: "hsl(43,25%,90%)" }}>{nameParts[0]}</span>
            {nameParts[1] && <span className="gold-shimmer" style={{ fontFamily: "'Playfair Display', serif", fontSize: 16, fontWeight: 800 }}>{nameParts[1]}</span>}
          </div>
          <p style={{ fontSize: 9, letterSpacing: "0.15em", color: "rgba(212,160,32,0.5)", textTransform: "uppercase", fontWeight: 600 }}>Tailors Toolkit</p>
        </div>
      </div>

      <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto">
        {navItemsWithCounts.map(({ path, label, icon: Icon, count }) => {
          const active = isActive(path);
          return (
            <button key={path} onClick={() => handleNavigate(path)}
              className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 active:scale-[0.97]"
              style={active ? { background: "hsl(218,40%,15%)", color: "hsl(43,82%,60%)", fontWeight: 600, boxShadow: "inset 0 0 0 1px rgba(212,160,32,0.2)" } : { color: "hsl(218,20%,55%)" }}>
              <div className="flex items-center gap-3">
                <Icon size={18} strokeWidth={active ? 2.5 : 1.8} style={{ color: active ? "hsl(43,82%,60%)" : "hsl(218,20%,55%)" }} />
                <span className="truncate">{label}</span>
              </div>
              {count !== undefined && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded-md transition-colors ${active ? "bg-primary/20 text-primary" : "bg-white/5 text-muted-foreground"}`}>
                  {count}
                </span>
              )}
            </button>
          );
        })}

        <div className="pt-4 mt-4 border-t border-sidebar-border space-y-0.5">
          <button onClick={() => handleNavigate("/invite")}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 active:scale-[0.97]"
            style={location === "/invite" ? { background: "hsl(218,40%,15%)", color: "hsl(43,82%,60%)", fontWeight: 600, boxShadow: "inset 0 0 0 1px rgba(212,160,32,0.2)" } : { color: "hsl(218,20%,55%)" }}>
            <Users size={18} strokeWidth={isActive("/invite") ? 2.5 : 1.8} style={{ color: isActive("/invite") ? "hsl(43,82%,60%)" : "hsl(218,20%,55%)" }} />
            <span className="truncate">Invite Tailors</span>
          </button>
          <button onClick={() => handleNavigate("/pre-unlock")}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 active:scale-[0.97]"
            style={location === "/pre-unlock" ? { background: "hsl(218,40%,15%)", color: "hsl(43,82%,60%)", fontWeight: 600, boxShadow: "inset 0 0 0 1px rgba(212,160,32,0.2)" } : { color: "hsl(218,20%,55%)" }}>
            <Crown size={18} strokeWidth={isActive("/pre-unlock") ? 2.5 : 1.8} style={{ color: isActive("/pre-unlock") ? "hsl(43,82%,60%)" : "hsl(218,20%,55%)" }} />
            <span className="truncate">{isPremium ? "Premium Active" : "Unlock Premium"}</span>
          </button>
          <button onClick={() => handleNavigate("/settings")}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 active:scale-[0.97]"
            style={location === "/settings" ? { background: "hsl(218,40%,15%)", color: "hsl(43,82%,60%)", fontWeight: 600, boxShadow: "inset 0 0 0 1px rgba(212,160,32,0.2)" } : { color: "hsl(218,20%,55%)" }}>
            <Settings size={18} strokeWidth={isActive("/settings") ? 2.5 : 1.8} style={{ color: isActive("/settings") ? "hsl(43,82%,60%)" : "hsl(218,20%,55%)" }} />
            <span className="truncate">Settings</span>
          </button>
        </div>
      </nav>

      <div className="px-4 py-4 border-t border-sidebar-border">
        <p style={{ fontSize: 10, color: "rgba(212,160,32,0.3)", textAlign: "center", letterSpacing: "0.08em" }}>v2.0 · {ALL_TOOLS.length} Tools · Tailors Toolkit</p>
      </div>
    </aside>
  );
}
