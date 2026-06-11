import { useState, useEffect } from "react";
import {
  Crown, Loader2, Check, Users, Palette, Zap, Video, ShieldCheck, Database,
  LogIn, ChevronRight, Star
} from "lucide-react";
import { useAppStore } from "@/store/useAppStore";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

const PREMIUM_FEATURES = [
  {
    title: "Unlimited Client Database",
    desc:  "Save and access all your customers and their full measurement history — no limits.",
    icon:  Users,
  },
  {
    title: "Professional Branding",
    desc:  "Auto-extract brand colours from your logo and generate custom-themed business cards.",
    icon:  Palette,
  },
  {
    title: "Smart Media Suite",
    desc:  "Access high-quality before/after tools, flyer resizers, and watermarking for your work.",
    icon:  Zap,
  },
  {
    title: "Advanced Video Tools",
    desc:  "Resize, compress, and format videos for WhatsApp, Instagram, and TikTok in seconds.",
    icon:  Video,
  },
  {
    title: "Financial Dashboard",
    desc:  "Track profit margins, fabric costs, and expenses to grow your business confidently.",
    icon:  ShieldCheck,
  },
  {
    title: "Multi-Device Access",
    desc:  "Log in with your email on any phone or tablet and your data is always there.",
    icon:  Database,
  },
];

interface PaymentSettings {
  price: number;
  currencyCode?: string;
  currencySymbol?: string;
  isPaystackEnabled: boolean;
  isManualEnabled: boolean;
}

export default function PremiumDetails() {
  const account    = useAppStore((s) => s.account);
  const isPremium  = useAppStore((s) => s.isPremium);

  const { toast }    = useToast();
  const [, navigate] = useLocation();

  const [settings, setSettings] = useState<PaymentSettings | null>(null);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    if (isPremium) { navigate("/home"); return; }
    fetch("/api/payment-info")
      .then(r => r.json())
      .then(d => setSettings(d))
      .catch(() => toast({ title: "Error", description: "Could not load payment info.", variant: "destructive" }))
      .finally(() => setLoading(false));
  }, [isPremium]);

  const formatPrice = (p: number) =>
    new Intl.NumberFormat("en-NG", { style: "currency", currency: settings?.currencyCode || "NGN" })
      .format(p)
      .replace(settings?.currencyCode || "NGN", settings?.currencySymbol || "₦");

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh] gap-4">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Loading premium details...</p>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto px-4 pb-24 pt-6 space-y-6">

      {/* Hero Banner */}
      <div className="relative overflow-hidden px-6 py-10 rounded-3xl bg-slate-950 border border-primary/20 shadow-2xl">
        <div className="absolute -top-10 -right-10 w-40 h-40 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-8 -left-8 w-32 h-32 bg-primary/5 rounded-full blur-2xl pointer-events-none" />
        <div className="relative text-center space-y-4">
          <div className="w-16 h-16 bg-primary/20 rounded-2xl flex items-center justify-center mx-auto border border-primary/40">
            <Crown size={32} className="text-primary" />
          </div>
          <div className="flex items-center justify-center gap-1 text-primary/80">
            {[...Array(5)].map((_, i) => <Star key={i} size={12} fill="currentColor" />)}
          </div>
          <h1 className="text-3xl font-bold text-white">⭐ Unlock Premium</h1>
          <p className="text-slate-400">Professional tools for serious tailors.</p>
          <div className="text-4xl font-black text-primary">{settings ? formatPrice(settings.price) : "₦15,000.00"}</div>
          <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">One-time payment · Lifetime access · No subscriptions</p>
        </div>
      </div>

      {/* Features */}
      <div className="space-y-2">
        <p className="text-xs font-black uppercase tracking-widest text-muted-foreground px-1 mb-3">What you get</p>
        {PREMIUM_FEATURES.map((f, i) => (
          <div key={i} className="flex items-start gap-4 p-4 rounded-2xl bg-card border border-border hover:border-primary/30 transition-colors">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
              <f.icon size={20} />
            </div>
            <div className="flex-1 text-left">
              <h3 className="text-sm font-bold">{f.title}</h3>
              <p className="text-xs text-muted-foreground leading-relaxed mt-0.5">{f.desc}</p>
            </div>
            <Check size={15} className="text-emerald-500 shrink-0 mt-1 ml-auto" />
          </div>
        ))}
      </div>

      {/* CTA */}
      <div className="space-y-3 pt-2">
        {!account ? (
          <>
            <div className="p-4 bg-primary/5 border border-primary/15 rounded-2xl text-center space-y-2">
              <p className="text-sm font-semibold">Create a free account to proceed</p>
              <p className="text-xs text-muted-foreground">Takes under 2 minutes. Your account lets you restore access on any device.</p>
            </div>
            <button
              onClick={() => navigate("/pre-unlock")}
              className="w-full py-4 bg-primary text-primary-foreground rounded-2xl font-bold text-base shadow-lg shadow-primary/20 flex items-center justify-center gap-2"
            >
              Get Started — Create Account <ChevronRight size={18} />
            </button>
            <button
              onClick={() => navigate("/account-login")}
              className="w-full py-2 text-sm font-semibold text-muted-foreground flex items-center justify-center gap-2"
            >
              <LogIn size={14} /> Already have an account? Login
            </button>
          </>
        ) : (
          <>
            <div className="flex items-center justify-center gap-1.5 bg-emerald-500/10 text-emerald-500 text-xs font-bold px-3 py-1.5 rounded-full border border-emerald-500/20 w-fit mx-auto">
              <Check size={12} /> Logged in as: {account.email}
            </div>
            {!settings?.isPaystackEnabled && !settings?.isManualEnabled ? (
              <div className="p-5 text-center text-sm text-muted-foreground bg-muted/20 rounded-3xl border border-border">
                Payment methods are currently unavailable. Please check back soon.
              </div>
            ) : (
              <button
                onClick={() => navigate("/payment-method")}
                className="w-full py-5 bg-primary text-primary-foreground rounded-2xl font-bold text-lg shadow-xl shadow-primary/25 flex items-center justify-center gap-3 active:scale-[0.98] transition-all"
              >
                <Crown size={22} />
                Choose Payment Method
                <ChevronRight size={20} />
              </button>
            )}
            <p className="text-[10px] text-center text-muted-foreground">
              Secure · One-time · No hidden charges
            </p>
          </>
        )}
      </div>
    </div>
  );
}
