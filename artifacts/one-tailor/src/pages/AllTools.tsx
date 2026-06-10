import { useState, useMemo } from "react";
import { useLocation } from "wouter";
import { Search, Star, X } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { useAppStore } from "@/store/useAppStore";
import { ALL_TOOLS, CATEGORY_LABELS, searchTools, type ToolCategory } from "@/lib/tools";
import { useSearch } from "@/hooks/use-search";

const CATEGORIES: ToolCategory[] = ["tailoring", "marketing", "business", "media"];

export default function AllTools() {
  const [location, setLocation]   = useLocation();
  const [search, updateSearch]    = useSearch();
  const favorites         = useAppStore((s) => s.favorites);
  const toggleFavorite    = useAppStore((s) => s.toggleFavorite);
  const addRecentTool     = useAppStore((s) => s.addRecentTool);
  const [query, setQuery] = useState("");

  const searchParams = new URLSearchParams(search);
  const catParam = searchParams.get("cat");
  const activeCategory = (catParam as ToolCategory | "fav" | "all") || "all";

  const setActiveCategory = (cat: string) => {
    if (cat === "all") {
      setLocation("/all-tools");
    } else {
      updateSearch(`?cat=${cat}`);
    }
    // Ensure search params are picked up immediately
    window.dispatchEvent(new PopStateEvent("popstate"));
    // On mobile, scroll to top of tools list when category changes
    if (window.innerWidth < 768) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const displayed = useMemo(() => {
    let tools = ALL_TOOLS;
    if (query.trim()) {
      return searchTools(query);
    }
    if (activeCategory === "fav") {
      return ALL_TOOLS.filter((t) => favorites.includes(t.id));
    }
    if (activeCategory === "all") return ALL_TOOLS;
    return ALL_TOOLS.filter((t) => t.category === activeCategory);
  }, [query, activeCategory, favorites]);

  const handleOpen = (toolId: string, path: string) => {
    addRecentTool(toolId);
    setLocation(path);
  };

  return (
    <div className="max-w-2xl mx-auto">
      <PageHeader title="All Tools" subtitle={`${ALL_TOOLS.length} tools for tailors`} backPath="/home" />

      <div className="px-4 pt-2 pb-5 space-y-4">
        {/* Search */}
        <div className="relative">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground/60" />
          <input
            type="text"
            placeholder="Search tools…"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setActiveCategory("all"); }}
            className="w-full pl-10 pr-10 py-3 rounded-2xl text-sm outline-none border border-border bg-card text-foreground"
          />
          {query && (
            <button onClick={() => setQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground active:scale-90">
              <X size={16} />
            </button>
          )}
        </div>

        {/* Category filter */}
        {!query && (
          <div className="flex flex-wrap gap-2 pb-1">
            <button
              onClick={() => setActiveCategory("all")}
              className="shrink-0 px-4 py-1.5 rounded-full text-xs font-semibold border transition-all flex items-center gap-1.5"
              style={activeCategory === "all"
                ? { background: "rgba(212,160,32,0.15)", borderColor: "rgba(212,160,32,0.4)", color: "hsl(43,82%,60%)" }
                : { borderColor: "hsl(218,38%,22%)", color: "hsl(218,20%,55%)" }}>
              All
              <span className="opacity-60 text-[10px] bg-white/5 px-1.5 rounded-md">{ALL_TOOLS.length}</span>
            </button>
            <button
              onClick={() => setActiveCategory("fav")}
              className="shrink-0 px-4 py-1.5 rounded-full text-xs font-semibold border transition-all flex items-center gap-1.5"
              style={activeCategory === "fav"
                ? { background: "rgba(212,160,32,0.15)", borderColor: "rgba(212,160,32,0.4)", color: "hsl(43,82%,60%)" }
                : { borderColor: "hsl(218,38%,22%)", color: "hsl(218,20%,55%)" }}>
              <Star size={12} className={activeCategory === "fav" ? "fill-current" : ""} />
              Favourites
              <span className="opacity-60 text-[10px] bg-white/5 px-1.5 rounded-md">{favorites.length}</span>
            </button>
            {CATEGORIES.map((cat) => {
              const count = ALL_TOOLS.filter(t => t.category === cat).length;
              return (
                <button key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className="shrink-0 px-4 py-1.5 rounded-full text-xs font-semibold border transition-all capitalize flex items-center gap-1.5"
                  style={activeCategory === cat
                    ? { background: "rgba(212,160,32,0.15)", borderColor: "rgba(212,160,32,0.4)", color: "hsl(43,82%,60%)" }
                    : { borderColor: "hsl(218,38%,22%)", color: "hsl(218,20%,55%)" }}>
                  {cat}
                  <span className="opacity-60 text-[10px] bg-white/5 px-1.5 rounded-md">{count}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Results count when searching */}
        {query && (
          <p className="text-xs text-muted-foreground px-1">
            {displayed.length} result{displayed.length !== 1 ? "s" : ""} for "{query}"
          </p>
        )}

        {/* Tools list by category */}
        {!query && activeCategory === "all" ? (
          <div className="space-y-6">
            {CATEGORIES.map((cat) => {
              const tools = ALL_TOOLS.filter((t) => t.category === cat);
              return (
                <div key={cat}>
                  <p className="text-[10px] font-bold mb-2 px-1" style={{ color: "rgba(212,160,32,0.55)", letterSpacing: "0.2em", textTransform: "uppercase" }}>
                    {CATEGORY_LABELS[cat]}
                  </p>
                  <div className="space-y-2">
                    {tools.map((tool) => {
                      const isFav = favorites.includes(tool.id);
                      const Icon = tool.icon;
                      return (
                        <div key={tool.id} className="flex items-center gap-3 p-3.5 rounded-2xl active:scale-[0.98] transition-all"
                          style={{ background: "linear-gradient(135deg, hsl(218,44%,11%) 0%, hsl(218,40%,12%) 100%)", border: `1px solid ${tool.borderColor}` }}>
                          <button className="flex items-center gap-3 flex-1 min-w-0 text-left" onClick={() => handleOpen(tool.id, tool.path)}>
                            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                              style={{ background: tool.iconBg, border: `1px solid ${tool.borderColor}` }}>
                              <Icon size={18} strokeWidth={2} style={{ color: tool.iconColor }} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <p className="font-bold text-sm" style={{ color: "hsl(43,25%,90%)" }}>{tool.name}</p>
                                {tool.premium && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full shrink-0" style={{ background: "rgba(212,160,32,0.15)", color: "hsl(43,82%,58%)", border: "1px solid rgba(212,160,32,0.2)" }}>PREMIUM</span>}
                                {tool.isNew && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full shrink-0" style={{ background: "rgba(74,222,128,0.12)", color: "hsl(142,65%,55%)", border: "1px solid rgba(74,222,128,0.2)" }}>NEW</span>}
                              </div>
                              <p className="text-xs text-muted-foreground truncate mt-0.5">{tool.description}</p>
                            </div>
                          </button>
                          <button onClick={() => toggleFavorite(tool.id)}
                            className="w-8 h-8 flex items-center justify-center rounded-lg transition-all active:scale-90 shrink-0">
                            <Star size={16} strokeWidth={2} fill={isFav ? "hsl(43,82%,55%)" : "none"}
                              style={{ color: isFav ? "hsl(43,82%,55%)" : "hsl(218,20%,45%)" }} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="space-y-2">
            {displayed.length === 0 ? (
              <div className="text-center py-12">
                <Search size={36} className="text-muted-foreground/25 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">No tools found</p>
              </div>
            ) : (
              displayed.map((tool) => {
                const isFav = favorites.includes(tool.id);
                const Icon = tool.icon;
                return (
                  <div key={tool.id} className="flex items-center gap-3 p-3.5 rounded-2xl transition-all"
                    style={{ background: "linear-gradient(135deg, hsl(218,44%,11%) 0%, hsl(218,40%,12%) 100%)", border: `1px solid ${tool.borderColor}` }}>
                    <button className="flex items-center gap-3 flex-1 min-w-0 text-left" onClick={() => handleOpen(tool.id, tool.path)}>
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                        style={{ background: tool.iconBg, border: `1px solid ${tool.borderColor}` }}>
                        <Icon size={18} strokeWidth={2} style={{ color: tool.iconColor }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <p className="font-bold text-sm" style={{ color: "hsl(43,25%,90%)" }}>{tool.name}</p>
                          {tool.premium && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full shrink-0" style={{ background: "rgba(212,160,32,0.15)", color: "hsl(43,82%,58%)", border: "1px solid rgba(212,160,32,0.2)" }}>PREMIUM</span>}
                          {tool.isNew && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full shrink-0" style={{ background: "rgba(74,222,128,0.12)", color: "hsl(142,65%,55%)", border: "1px solid rgba(74,222,128,0.2)" }}>NEW</span>}
                        </div>
                        <p className="text-xs text-muted-foreground truncate mt-0.5">{tool.description}</p>
                      </div>
                    </button>
                    <button onClick={() => toggleFavorite(tool.id)}
                      className="w-8 h-8 flex items-center justify-center rounded-lg transition-all active:scale-90 shrink-0">
                      <Star size={16} strokeWidth={2} fill={isFav ? "hsl(43,82%,55%)" : "none"}
                        style={{ color: isFav ? "hsl(43,82%,55%)" : "hsl(218,20%,45%)" }} />
                    </button>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
    </div>
  );
}
