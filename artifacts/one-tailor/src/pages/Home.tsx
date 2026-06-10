import { useLocation } from "wouter";
import { useState } from "react";
import { 
  Search, Star, Crown, ChevronRight, Grid3X3, Clock, ArrowRight, 
  ShieldCheck, X, ExternalLink, Users, UserPlus, Ruler, LayoutGrid, 
  ChevronDown, MessageCircle, MoreHorizontal
} from "lucide-react";
import { useAppStore } from "@/store/useAppStore";
import { ALL_TOOLS, CATEGORY_LABELS, type ToolCategory, getToolById } from "@/lib/tools";

const POPULAR_TOOL_IDS = ["watermark", "delivery-date", "fabric-requirement", "queue-manager", "profit", "whatsapp-link"];
const CATEGORIES: { id: ToolCategory; emoji: string }[] = [
  { id: "tailoring", emoji: "🧵" },
  { id: "marketing", emoji: "📣" },
  { id: "business",  emoji: "💼" },
  { id: "media",     emoji: "🖼️" },
];

function ToolChip({ toolId, onClick, isFav, onFav }: { toolId: string; onClick: () => void; isFav: boolean; onFav: () => void }) {
  const tool = getToolById(toolId);
  if (!tool) return null;
  const Icon = tool.icon;
  return (
    <div className="w-full h-full rounded-2xl p-3 flex flex-col gap-2 active:scale-[0.96] transition-all"
      style={{ background: "linear-gradient(135deg, hsl(218,44%,11%) 0%, hsl(218,40%,12%) 100%)", border: `1px solid ${tool.borderColor}` }}>
      <div className="flex items-start justify-between">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center"
          style={{ background: tool.iconBg, border: `1px solid ${tool.borderColor}` }}>
          <Icon size={17} strokeWidth={2} style={{ color: tool.iconColor }} />
        </div>
        <button onClick={(e) => { e.stopPropagation(); onFav(); }}
          className="w-6 h-6 flex items-center justify-center active:scale-90">
          <Star size={13} fill={isFav ? "hsl(43,82%,55%)" : "none"} style={{ color: isFav ? "hsl(43,82%,55%)" : "hsl(218,20%,45%)" }} />
        </button>
      </div>
      <button onClick={onClick} className="text-left flex-1 flex flex-col">
        <p className="font-bold text-[11px] leading-tight flex-1" style={{ color: "hsl(43,25%,90%)" }}>{tool.name}</p>
        {tool.isNew && (
          <span className="inline-block w-fit text-[8px] font-bold px-1.5 py-0.5 rounded-full mt-1"
            style={{ background: "rgba(74,222,128,0.12)", color: "hsl(142,65%,55%)", border: "1px solid rgba(74,222,128,0.2)" }}>NEW</span>
        )}
      </button>
    </div>
  );
}

function ToolRow({ toolId, onClick, isFav, onFav }: { toolId: string; onClick: () => void; isFav: boolean; onFav: () => void }) {
  const tool = getToolById(toolId);
  if (!tool) return null;
  const Icon = tool.icon;
  return (
    <div className="w-full flex items-center gap-3.5 p-3.5 rounded-2xl active:scale-[0.98] transition-all"
      style={{ background: "linear-gradient(135deg, hsl(218,44%,11%) 0%, hsl(218,40%,12%) 100%)", border: `1px solid ${tool.borderColor}` }}>
      <button onClick={onClick} className="flex items-center gap-3.5 flex-1 min-w-0 text-left">
        <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: tool.iconBg, border: `1px solid ${tool.borderColor}` }}>
          <Icon size={20} strokeWidth={2} style={{ color: tool.iconColor }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <p className="font-bold text-sm" style={{ color: "hsl(43,25%,90%)" }}>{tool.name}</p>
            {tool.premium && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full shrink-0" style={{ background: "rgba(212,160,32,0.15)", color: "hsl(43,82%,58%)", border: "1px solid rgba(212,160,32,0.2)" }}>PREMIUM</span>}
            {tool.isNew && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full shrink-0" style={{ background: "rgba(74,222,128,0.12)", color: "hsl(142,65%,55%)", border: "1px solid rgba(74,222,128,0.2)" }}>NEW</span>}
          </div>
          <p className="text-xs mt-0.5 text-muted-foreground truncate">{tool.description}</p>
        </div>
      </button>
      <button onClick={onFav} className="w-7 h-7 flex items-center justify-center rounded-lg active:scale-90 shrink-0">
        <Star size={15} fill={isFav ? "hsl(43,82%,55%)" : "none"} style={{ color: isFav ? "hsl(43,82%,55%)" : "hsl(218,20%,42%)" }} />
      </button>
    </div>
  );
}

export default function Home() {
  const [, setLocation] = useLocation();
  const isPremium          = useAppStore((s) => s.isPremium);
  const appName        = useAppStore((s) => s.appName);
  const appLogo        = useAppStore((s) => s.appLogo);
  const favorites      = useAppStore((s) => s.favorites);
  const recentTools    = useAppStore((s) => s.recentTools);
  const proUpgradeMessage = useAppStore((s) => s.proUpgradeMessage);
  const proUpgradeLink = useAppStore((s) => s.proUpgradeLink);
  const proUpgradeButtonText = useAppStore((s) => s.proUpgradeButtonText);
  const toggleFavorite = useAppStore((s) => s.toggleFavorite);
  const addRecentTool  = useAppStore((s) => s.addRecentTool);
  const logoSrc = appLogo ?? "/onetailor-logo.png";
  const [searchQuery, setSearchQuery] = useState("");
  const [showProPopup, setShowProPopup] = useState(false);

  const handleOpen = (toolId: string, path: string) => {
    addRecentTool(toolId);
    setLocation(path);
    window.dispatchEvent(new PopStateEvent("popstate"));
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setLocation(`/all-tools?q=${encodeURIComponent(searchQuery)}`);
    window.dispatchEvent(new PopStateEvent("popstate"));
  };

  const handleNavigate = (path: string) => {
    setLocation(path);
    window.dispatchEvent(new PopStateEvent("popstate"));
  };

  // New Reordering Logic: Exclude favorites from recents
  const displayedFavorites = favorites.slice(0, 4);
  const filteredRecent = recentTools
    .filter(id => !displayedFavorites.includes(id))
    .slice(0, 4);

  const RECOMMENDED_TOOL_IDS = [
    "customer-measurement",
    "measurement-card",
    "profit",
    "fabric-cost",
    "social-video-resizer",
    "bg-remover"
  ];
  const recommendedTools = RECOMMENDED_TOOL_IDS.map(id => getToolById(id)).filter((t): t is NonNullable<ReturnType<typeof getToolById>> => !!t);

  return (
    <div className="max-w-2xl mx-auto px-4 pb-8">
      {/* Header */}
      <div className="pt-7 pb-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div style={{ width: 46, height: 46, borderRadius: 13, overflow: "hidden", border: "1.5px solid rgba(212,160,32,0.35)", flexShrink: 0, boxShadow: "0 0 20px rgba(212,160,32,0.15)" }}>
              <img src={logoSrc} alt={appName} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            </div>
            <div>
              <div className="flex items-baseline gap-0.5">
                <span className="text-foreground" style={{ fontFamily: "'Playfair Display', serif", fontSize: 20, fontWeight: 800 }}>
                  {appName.includes(" ") ? appName.split(" ")[0] : appName}
                </span>
                {appName.includes(" ") && (
                  <span className="gold-shimmer" style={{ fontFamily: "'Playfair Display', serif", fontSize: 20, fontWeight: 800 }}>
                    {appName.split(" ").slice(1).join(" ")}
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground" style={{ letterSpacing: "0.04em" }}>Business tools for tailors</p>
            </div>
          </div>
          {isPremium ? (
            <button 
              onClick={() => setShowProPopup(true)}
              className="flex items-center gap-1.5 rounded-full px-3 py-1.5 active:scale-95 transition-transform"
              style={{ background: "rgba(212,160,32,0.1)", border: "1px solid rgba(212,160,32,0.3)", color: "hsl(43,82%,60%)", fontSize: 11, fontWeight: 700 }}>
              <Crown size={12} /> ⭐ Unlock Premium
            </button>
          ) : (
            <button onClick={() => setLocation("/pre-unlock")}
              className="flex items-center gap-1.5 rounded-full px-3 py-1.5 active:scale-95 transition-transform"
              style={{ background: "rgba(212,160,32,0.1)", border: "1px solid rgba(212,160,32,0.3)", color: "hsl(43,82%,60%)", fontSize: 11, fontWeight: 700 }}>
              <ShieldCheck size={12} /> ⭐ Unlock Premium
            </button>
          )}
        </div>
      </div>

      {/* Premium Status Popup */}
      {showProPopup && (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-card w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl border border-primary/20 animate-in zoom-in-95 duration-200">
            <div className="p-4 flex items-center justify-between border-b border-border bg-muted/20">
              <div className="flex items-center gap-2 text-primary">
                <Crown size={18} />
                <h3 className="text-sm font-black uppercase tracking-wider">OneTailor Premium</h3>
              </div>
              <button onClick={() => setShowProPopup(false)} className="w-8 h-8 flex items-center justify-center rounded-full bg-muted/50 hover:bg-muted transition-colors">
                <X size={16} />
              </button>
            </div>
            <div className="p-6 space-y-6">
              <p className="text-sm text-foreground font-medium leading-relaxed">
                {proUpgradeMessage}
              </p>
              
              <div className="space-y-3">
                <a 
                  href={proUpgradeLink || "#"} 
                  target={proUpgradeLink ? "_blank" : "_self"}
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center w-full py-4 bg-primary text-primary-foreground rounded-2xl font-bold text-sm active:scale-[0.98] transition-all shadow-lg shadow-primary/20 gap-2"
                >
                  <ExternalLink size={16} />
                  {proUpgradeButtonText}
                </a>
                <button 
                  onClick={() => setShowProPopup(false)}
                  className="w-full py-3 text-xs font-bold text-muted-foreground hover:text-foreground transition-colors"
                >
                  Maybe Later
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Search bar */}
      <form onSubmit={handleSearch} className="mb-6">
        <div className="relative">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground/50" />
          <input
            type="text"
            placeholder="Search tools…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => setLocation("/all-tools")}
            className="w-full pl-10 pr-4 py-3 rounded-2xl text-sm outline-none shadow-sm"
            style={{ background: "hsl(218,44%,11%)", border: "1px solid hsl(218,38%,18%)", color: "hsl(43,25%,88%)" }}
            readOnly
          />
        </div>
      </form>

      {/* Clients Module */}
      <section className="mb-8">
        <div className="flex items-center justify-between mb-3 px-1">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-500 border border-blue-500/20">
              <Users size={16} />
            </div>
            <p className="text-xs font-black uppercase tracking-[0.15em] text-foreground/80">Client Management</p>
          </div>
          <button 
            onClick={() => handleNavigate("/customer-measurement")}
            className="text-[10px] font-black uppercase tracking-widest text-primary hover:text-primary/80 transition-colors"
          >
            View All <ChevronRight size={10} className="inline ml-0.5" />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button 
            onClick={() => handleNavigate("/customer-measurement")}
            className="group flex items-center gap-3.5 p-4 rounded-2xl bg-gradient-to-br from-blue-600/10 to-blue-600/[0.02] border border-blue-500/20 active:scale-[0.98] transition-all text-left"
          >
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-600/20 group-hover:scale-110 transition-transform">
              <Users size={20} />
            </div>
            <div>
              <p className="text-[13px] font-black text-foreground">Clients</p>
              <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-tight">Database</p>
            </div>
          </button>

          <button 
            onClick={() => handleNavigate("/measurement-card")}
            className="group flex items-center gap-3.5 p-4 rounded-2xl bg-gradient-to-br from-amber-600/10 to-amber-600/[0.02] border border-amber-500/20 active:scale-[0.98] transition-all text-left"
          >
            <div className="w-10 h-10 rounded-xl bg-amber-600 text-white flex items-center justify-center shadow-lg shadow-amber-600/20 group-hover:scale-110 transition-transform">
              <LayoutGrid size={20} />
            </div>
            <div>
              <p className="text-[13px] font-black text-foreground">Cards</p>
              <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-tight">Generator</p>
            </div>
          </button>
        </div>
      </section>

      {/* Favorites */}
      {displayedFavorites.length > 0 && (
        <section className="mb-8">
          <div className="flex items-center justify-between mb-3 px-1">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-pink-500/10 flex items-center justify-center text-pink-500 border border-pink-500/20">
                <Star size={16} />
              </div>
              <p className="text-xs font-black uppercase tracking-[0.15em] text-foreground/80">Favorites</p>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {displayedFavorites.map((id) => {
              const tool = getToolById(id)!;
              return (
                <button
                  key={id}
                  onClick={() => handleNavigate(tool.path)}
                  className="p-4 rounded-2xl bg-card border border-border flex flex-col gap-3 active:scale-[0.98] transition-all text-left"
                >
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: tool.iconBg, color: tool.iconColor }}>
                    <tool.icon size={20} />
                  </div>
                  <div>
                    <p className="text-[13px] font-black text-foreground line-clamp-1">{tool.name}</p>
                    <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-tight line-clamp-1">{tool.category}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* Recent Tools */}
      {filteredRecent.length > 0 && (
        <section className="mb-8">
          <div className="flex items-center justify-between mb-3 px-1">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-500 border border-emerald-500/20">
                <Clock size={16} />
              </div>
              <p className="text-xs font-black uppercase tracking-[0.15em] text-foreground/80">Recently Used</p>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {filteredRecent.map((id) => {
              const tool = getToolById(id)!;
              return (
                <button
                  key={id}
                  onClick={() => handleNavigate(tool.path)}
                  className="p-4 rounded-2xl bg-card border border-border flex flex-col gap-3 active:scale-[0.98] transition-all text-left"
                >
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: tool.iconBg, color: tool.iconColor }}>
                    <tool.icon size={20} />
                  </div>
                  <div>
                    <p className="text-[13px] font-black text-foreground line-clamp-1">{tool.name}</p>
                    <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-tight line-clamp-1">{tool.category}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* Categories */}
      <section className="mb-6">
        <div className="flex items-center justify-between mb-2.5">
          <p className="text-[10px] font-bold" style={{ color: "rgba(212,160,32,0.55)", letterSpacing: "0.2em", textTransform: "uppercase" }}>Categories</p>
        </div>
        <div className="grid grid-cols-2 gap-2.5">
          {CATEGORIES.map(({ id, emoji }) => {
            const count = ALL_TOOLS.filter((t) => t.category === id).length;
            return (
              <button key={id} onClick={() => handleNavigate(`/all-tools?cat=${id}`)}
                className="flex items-center gap-3 p-3.5 rounded-2xl text-left active:scale-[0.97] transition-all"
                style={{ background: "hsl(218,44%,11%)", border: "1px solid hsl(218,38%,18%)" }}>
                <span className="text-2xl">{emoji}</span>
                <div>
                  <p className="font-bold text-sm capitalize" style={{ color: "hsl(43,25%,88%)" }}>{id}</p>
                  <p className="text-xs text-muted-foreground">{count} tools</p>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* Recommended Tools */}
      <section className="mb-6">
        <div className="flex items-center justify-between mb-2.5">
          <p className="text-[10px] font-bold" style={{ color: "rgba(212,160,32,0.55)", letterSpacing: "0.2em", textTransform: "uppercase" }}>Recommended Tools</p>
          <button onClick={() => handleNavigate("/all-tools")}
            className="flex items-center gap-1 text-xs font-semibold active:scale-95"
            style={{ color: "hsl(43,82%,55%)" }}>
            All <ArrowRight size={12} />
          </button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {recommendedTools.map((tool) => (
            <ToolRow 
              key={tool.id} 
              toolId={tool.id}
              onClick={() => handleOpen(tool.id, tool.path)}
              isFav={favorites.includes(tool.id)}
              onFav={() => toggleFavorite(tool.id)} 
            />
          ))}
        </div>
      </section>

      {/* Browse All */}
      <button onClick={() => handleNavigate("/all-tools")}
        className="w-full py-4 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
        style={{ background: "hsl(218,44%,11%)", border: "1px solid hsl(218,38%,18%)", color: "hsl(43,25%,88%)" }}>
        <Grid3X3 size={15} />
        Browse All {ALL_TOOLS.length} Tools
        <ChevronRight size={15} className="text-muted-foreground/50" />
      </button>

      {/* Premium Teaser */}
      {!isPremium && (
        <div onClick={() => setLocation("/upgrade")} className="mt-3 relative overflow-hidden p-6 rounded-[2.5rem] bg-slate-900 border border-primary/20 cursor-pointer active:scale-[0.98] transition-all group">
          <div className="absolute -top-12 -right-12 w-32 h-32 bg-primary/10 rounded-full blur-3xl group-hover:bg-primary/20 transition-colors" />
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-primary/20 rounded-2xl flex items-center justify-center border border-primary/30 group-hover:scale-110 transition-transform">
              <Crown size={28} className="text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-black text-white leading-tight">⭐ Unlock Premium</h3>
              <p className="text-xs text-slate-400 mt-1">Unlock all professional tailoring tools</p>
            </div>
            <ChevronRight className="text-primary" />
          </div>
        </div>
      )}
    </div>
  );
}
