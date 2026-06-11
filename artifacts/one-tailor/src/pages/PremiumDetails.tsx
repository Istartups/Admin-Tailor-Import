import { useState, useEffect, useRef } from "react";
import {
  Crown, Loader2, Check, Users, Palette, Zap, Video, ShieldCheck, Database,
  CreditCard, Banknote, ChevronRight, Copy, Upload, X, ExternalLink,
  LogIn, ArrowLeft
} from "lucide-react";
import { useAppStore } from "@/store/useAppStore";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { getDeviceId } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

const PREMIUM_FEATURES = [
  { title: "Full Client Database", desc: "Unlimited customer measurements & history", icon: Users },
  { title: "Professional Branding", desc: "Auto color extraction & brand themes", icon: Palette },
  { title: "Smart Media Suite", desc: "High-definition video & image tools", icon: Zap },
  { title: "Advanced Video Tools", desc: "Custom resizing, watermarking & social exports", icon: Video },
  { title: "Financial Dashboard", desc: "Track profit, fabric costs & expenses", icon: ShieldCheck },
  { title: "Secure Data Backup", desc: "Export and import data safely across devices", icon: Database },
];

interface PaymentSettings {
  price: number;
  bankName: string;
  accountNumber: string;
  accountName: string;
  instructions: string;
  isPaystackEnabled: boolean;
  isManualEnabled: boolean;
  paystackPublicKey?: string;
  currencyCode?: string;
  currencySymbol?: string;
}

type PayStep = "select" | "paystack_confirm" | "manual";

export default function PremiumDetails() {
  const account                  = useAppStore((s) => s.account);
  const isPremium                = useAppStore((s) => s.isPremium);
  const setPendingPremiumRequest = useAppStore((s) => s.setPendingPremiumRequest);

  const { toast }     = useToast();
  const [, navigate]  = useLocation();

  const [settings, setSettings] = useState<PaymentSettings | null>(null);
  const [loading, setLoading]   = useState(true);
  const [processing, setProcessing] = useState(false);
  const [payStep, setPayStep]   = useState<PayStep>("select");

  const [evidence, setEvidence]             = useState<File | null>(null);
  const [evidencePreview, setEvidencePreview] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

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

  const handlePaystackInit = async () => {
    setProcessing(true);
    try {
      const res  = await fetch("/api/payment/paystack/initialize", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          deviceId: account?.deviceId || getDeviceId(),
          email:    account?.email,
          amount:   settings?.price,
        }),
      });
      const data = await res.json();
      if (data.status && data.data?.authorization_url) {
        window.location.href = data.data.authorization_url;
      } else {
        throw new Error("Paystack init failed");
      }
    } catch {
      toast({ title: "Payment Error", description: "Could not start Paystack payment.", variant: "destructive" });
    } finally {
      setProcessing(false);
    }
  };

  const handleManualSubmit = async () => {
    if (!evidence) return;
    setProcessing(true);
    try {
      const formData = new FormData();
      formData.append("deviceId", account?.deviceId || getDeviceId());
      formData.append("evidence", evidence);
      formData.append("amount",   (settings?.price || 15000).toString());
      const res = await fetch("/api/payment/manual", { method: "POST", body: formData });
      if (res.ok) {
        setPendingPremiumRequest(true);
        navigate("/pre-unlock");
        toast({ title: "Submitted!", description: "We'll verify your payment shortly." });
      } else {
        const err = await res.json();
        toast({ title: "Error", description: err.message || "Failed to submit.", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Network error. Please try again.", variant: "destructive" });
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh] gap-4">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Loading premium details...</p>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto px-4 pb-20 pt-6 space-y-6">
      {/* Header Banner */}
      <div className="relative overflow-hidden px-6 py-10 rounded-3xl bg-slate-950 border border-primary/20 shadow-2xl">
        <div className="absolute -top-10 -right-10 w-40 h-40 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative text-center space-y-4">
          <div className="w-16 h-16 bg-primary/20 rounded-2xl flex items-center justify-center mx-auto border border-primary/40">
            <Crown size={32} className="text-primary" />
          </div>
          <h1 className="text-3xl font-bold text-white">⭐ Unlock Premium</h1>
          <p className="text-slate-400">Professional tools for serious tailors.</p>
          <div className="text-3xl font-black text-primary">{settings ? formatPrice(settings.price) : "₦15,000.00"}</div>
          <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">One-time payment · Lifetime access</p>
        </div>
      </div>

      {/* Features List */}
      <div className="grid grid-cols-1 gap-3">
        {PREMIUM_FEATURES.map((f, i) => (
          <div key={i} className="flex items-start gap-4 p-4 rounded-2xl bg-card border border-border hover:border-primary/30 transition-colors">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
              <f.icon size={20} />
            </div>
            <div className="text-left">
              <h3 className="text-sm font-bold">{f.title}</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">{f.desc}</p>
            </div>
            <Check size={16} className="text-emerald-500 shrink-0 mt-0.5 ml-auto" />
          </div>
        ))}
      </div>

      {/* ── Payment Section ─────────────────────────────────────────────────── */}
      {!account ? (
        <div className="space-y-3 pt-2">
          <div className="p-5 bg-primary/5 border border-primary/15 rounded-3xl text-center space-y-3">
            <Crown size={28} className="text-primary mx-auto" />
            <p className="text-sm font-semibold">Create a free account to get premium</p>
            <p className="text-xs text-muted-foreground">Takes less than 2 minutes. Your account lets you restore access on any device.</p>
          </div>
          <button
            onClick={() => navigate("/pre-unlock")}
            className="w-full py-4 bg-primary text-primary-foreground rounded-2xl font-bold text-base shadow-lg shadow-primary/20"
          >
            Get Started — Create Account
          </button>
          <button
            onClick={() => navigate("/account-login")}
            className="w-full py-2 text-sm font-semibold text-muted-foreground flex items-center justify-center gap-2"
          >
            <LogIn size={14} /> Already have an account? Login
          </button>
        </div>
      ) : (
        <AnimatePresence mode="wait">
          {payStep === "select" && (
            <motion.div key="select" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
              <h3 className="text-base font-bold text-center">Choose Payment Method</h3>
              <div className="flex items-center justify-center gap-1.5 bg-emerald-500/10 text-emerald-400 text-xs font-bold px-3 py-1.5 rounded-full border border-emerald-500/20 w-fit mx-auto">
                <Check size={12} /> Logged in as: {account.email}
              </div>
              <div className="space-y-3">
                {settings?.isPaystackEnabled && (
                  <button
                    onClick={() => setPayStep("paystack_confirm")}
                    className="w-full p-6 bg-card border border-border rounded-3xl flex items-center gap-4 hover:border-primary/50 transition-all active:scale-[0.98] group"
                  >
                    <div className="w-12 h-12 bg-emerald-500/10 rounded-2xl flex items-center justify-center text-emerald-500 shrink-0">
                      <CreditCard size={24} />
                    </div>
                    <div className="text-left flex-1">
                      <p className="font-bold text-base">Paystack</p>
                      <p className="text-xs text-muted-foreground">Card, Bank Transfer or USSD — instant activation</p>
                    </div>
                    <ChevronRight size={20} className="text-muted-foreground group-hover:text-primary" />
                  </button>
                )}
                {settings?.isManualEnabled && (
                  <button
                    onClick={() => setPayStep("manual")}
                    className="w-full p-6 bg-card border border-border rounded-3xl flex items-center gap-4 hover:border-primary/50 transition-all active:scale-[0.98] group"
                  >
                    <div className="w-12 h-12 bg-blue-500/10 rounded-2xl flex items-center justify-center text-blue-500 shrink-0">
                      <Banknote size={24} />
                    </div>
                    <div className="text-left flex-1">
                      <p className="font-bold text-base">Manual Transfer</p>
                      <p className="text-xs text-muted-foreground">Transfer to our bank and upload your receipt</p>
                    </div>
                    <ChevronRight size={20} className="text-muted-foreground group-hover:text-primary" />
                  </button>
                )}
                {!settings?.isPaystackEnabled && !settings?.isManualEnabled && (
                  <div className="p-6 text-center text-sm text-muted-foreground bg-muted/20 rounded-3xl border border-border">
                    Payment methods are currently unavailable. Please contact support.
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {payStep === "paystack_confirm" && (
            <motion.div key="paystack_confirm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6 text-center py-4">
              <div className="w-20 h-20 bg-emerald-500/10 rounded-3xl flex items-center justify-center mx-auto">
                <CreditCard size={40} className="text-emerald-500" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">Secure Checkout</h2>
                <p className="text-muted-foreground text-sm mt-1">You'll be redirected to Paystack's secure gateway.</p>
              </div>
              <div className="p-4 bg-muted/50 rounded-2xl text-left space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Amount</span>
                  <span className="font-bold">{formatPrice(settings?.price || 0)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Email</span>
                  <span className="font-bold">{account.email}</span>
                </div>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setPayStep("select")} className="flex-1 py-4 bg-secondary rounded-2xl font-bold flex items-center justify-center gap-2">
                  <ArrowLeft size={16} /> Back
                </button>
                <button
                  onClick={handlePaystackInit}
                  disabled={processing}
                  className="flex-[2] py-4 bg-emerald-600 text-white rounded-2xl font-bold flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {processing ? <Loader2 className="animate-spin" size={18} /> : <>Pay Now <ExternalLink size={18} /></>}
                </button>
              </div>
            </motion.div>
          )}

          {payStep === "manual" && (
            <motion.div key="manual" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
              <div className="p-5 bg-primary/5 border border-primary/20 rounded-3xl space-y-4">
                <div className="flex items-center gap-3">
                  <Banknote className="text-primary" />
                  <h2 className="font-bold text-base">Bank Transfer Details</h2>
                </div>
                <div className="p-4 bg-primary/10 rounded-2xl border border-primary/20 flex flex-col items-center text-center space-y-1">
                  <p className="text-[10px] font-black uppercase tracking-widest text-primary/60">Amount to Pay</p>
                  <p className="text-3xl font-black text-primary">{formatPrice(settings?.price || 15000)}</p>
                </div>
                <div className="space-y-2">
                  {[
                    { label: "Bank Name",      value: settings?.bankName },
                    { label: "Account Number", value: settings?.accountNumber },
                    { label: "Account Name",   value: settings?.accountName },
                  ].map(({ label, value }) => (
                    <div key={label} className="flex justify-between items-center p-3 bg-card rounded-xl border border-border">
                      <div>
                        <p className="text-[10px] text-muted-foreground uppercase font-bold">{label}</p>
                        <p className="font-bold text-sm">{value || "—"}</p>
                      </div>
                      <button onClick={() => { navigator.clipboard.writeText(value || ""); toast({ title: "Copied!" }); }} className="p-2">
                        <Copy size={15} className="text-primary" />
                      </button>
                    </div>
                  ))}
                </div>
                {settings?.instructions && (
                  <p className="text-xs text-muted-foreground leading-relaxed italic">{settings.instructions}</p>
                )}
              </div>

              <div className="space-y-3">
                <h3 className="font-bold text-sm">Upload Receipt / Screenshot</h3>
                {!evidencePreview ? (
                  <div
                    onClick={() => fileRef.current?.click()}
                    className="h-40 rounded-2xl border-2 border-dashed border-border flex flex-col items-center justify-center gap-2 cursor-pointer bg-card hover:bg-muted/50 transition-all active:scale-[0.99]"
                  >
                    <Upload className="text-muted-foreground" size={24} />
                    <p className="text-sm font-medium text-muted-foreground">Tap to upload proof of payment</p>
                    <p className="text-xs text-muted-foreground/60">JPG, PNG or PDF accepted</p>
                    <input
                      ref={fileRef} type="file" accept="image/*,application/pdf" className="hidden"
                      onChange={e => {
                        const f = e.target.files?.[0];
                        if (f) { setEvidence(f); setEvidencePreview(f.type.startsWith("image/") ? URL.createObjectURL(f) : "pdf"); }
                      }}
                    />
                  </div>
                ) : (
                  <div className="relative rounded-2xl overflow-hidden border border-border bg-card">
                    {evidencePreview === "pdf" ? (
                      <div className="h-40 flex items-center justify-center text-sm font-bold">📄 PDF Selected ✓</div>
                    ) : (
                      <img src={evidencePreview} className="w-full h-40 object-cover" alt="Evidence" />
                    )}
                    <button
                      onClick={() => { setEvidence(null); setEvidencePreview(null); }}
                      className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/60 text-white flex items-center justify-center"
                    >
                      <X size={16} />
                    </button>
                  </div>
                )}
              </div>

              <div className="flex gap-3">
                <button onClick={() => setPayStep("select")} className="flex-1 py-4 bg-secondary rounded-2xl font-bold flex items-center justify-center gap-2">
                  <ArrowLeft size={16} /> Back
                </button>
                <button
                  onClick={handleManualSubmit}
                  disabled={processing || !evidence}
                  className="flex-[2] py-4 bg-primary text-primary-foreground rounded-2xl font-bold flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {processing ? <Loader2 className="animate-spin" size={18} /> : "Submit Proof"}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      )}
    </div>
  );
}
