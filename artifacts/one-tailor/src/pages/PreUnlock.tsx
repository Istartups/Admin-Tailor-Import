import { useState, useEffect, useRef } from "react";
import { 
  Check, Crown, Zap, Loader2, KeyRound, ExternalLink, Copy, 
  CheckCircle2, AlertCircle, Building2, Users, Hash, ShieldCheck,
  Phone, Mail, MapPin, ChevronRight, CreditCard, Banknote, Upload,
  X, RefreshCw, Palette, Video, Database
} from "lucide-react";
import { useAppStore, type BusinessProfile } from "@/store/useAppStore";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { getDeviceId, validateName, validatePhone } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

const PREMIUM_FEATURES = [
  { title: "Full Client Database", desc: "Unlimited customer measurements & history on your device", icon: Users },
  { title: "Professional Branding", desc: "Automatic color extraction & brand themes for all tools", icon: Palette },
  { title: "Smart Media Suite", desc: "High-definition video & image tools with brand watermarks", icon: Zap },
  { title: "Advanced Media Suite", desc: "Custom video resizing, watermarking & social exports", icon: Video },
  { title: "Financial Dashboard", desc: "Track profit, fabric costs & business expenses", icon: ShieldCheck },
  { title: "Secure Data Backup", desc: "Export and import your data safely across devices", icon: Database },
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

type Step = "features" | "profile" | "payment_method" | "paystack" | "manual" | "success" | "pending";

export default function PreUnlock() {
  const isPremium = useAppStore((s) => s.isPremium);
  const licenseKey = useAppStore((s) => s.licenseKey);
  const businessProfile = useAppStore((s) => s.businessProfile);
  const setBusinessProfile = useAppStore((s) => s.setBusinessProfile);
  const setIsPremium = useAppStore((s) => s.setIsPremium);
  
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const [step, setStep] = useState<Step>("profile");
  const [settings, setSettings] = useState<PaymentSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [recoveryMode, setRecoveryMode] = useState(false);
  const [recoveryInput, setRecoveryInput] = useState("");

  // Form State - Pulling from Brand Kit
  const [form, setForm] = useState({
    name: businessProfile?.name || "",
    phone: businessProfile?.phone || "",
    email: businessProfile?.email || "",
    street: businessProfile?.addressDetails?.street || "",
    city: businessProfile?.addressDetails?.city || "",
    state: businessProfile?.addressDetails?.state || "",
    landmark: businessProfile?.addressDetails?.landmark || "",
    country: businessProfile?.addressDetails?.country || "Nigeria"
  });

  // Manual Payment State
  const [evidence, setEvidence] = useState<File | null>(null);
  const [evidencePreview, setEvidencePreview] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await fetch("/api/payment-info");
      if (!res.ok) throw new Error("Failed to fetch settings");
      const data = await res.json();
      setSettings(data);
    } catch (err) {
      console.error("Failed to fetch settings", err);
    } finally {
      setLoading(false);
    }
  };

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.phone || !form.city || !form.state || !form.landmark || !form.country) {
      toast({ title: "Required Fields", description: "Please fill all required fields to continue.", variant: "destructive" });
      return;
    }

    // Optional email validation
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      toast({ title: "Invalid Email", description: "Please enter a valid email address.", variant: "destructive" });
      return;
    }

    const nameVal = validateName(form.name);
    if (!nameVal.valid) {
      toast({ title: "Invalid Business Name", description: nameVal.message, variant: "destructive" });
      return;
    }

    const phoneVal = validatePhone(form.phone);
    if (!phoneVal.valid) {
      toast({ title: "Invalid Phone", description: phoneVal.message, variant: "destructive" });
      return;
    }

    setProcessing(true);
    try {
      // Pull existing details if available, or start fresh
      const newAddressDetails = {
        ...businessProfile?.addressDetails,
        street: form.street,
        city: form.city,
        state: form.state,
        landmark: form.landmark,
        country: form.country
      };

      const combinedAddress = `${newAddressDetails.street ? newAddressDetails.street + ', ' : ''}${newAddressDetails.city}, ${newAddressDetails.state}${newAddressDetails.landmark ? ' (Near ' + newAddressDetails.landmark + ')' : ''}, ${newAddressDetails.country}`;

      // Update local store
      setBusinessProfile({
        name: form.name,
        phone: form.phone,
        email: form.email,
        address: combinedAddress,
        addressDetails: newAddressDetails,
        socials: businessProfile?.socials,
        brandColors: businessProfile?.brandColors
      });

      setStep("features");
    } catch (e) {
      toast({ title: "Error", description: "Failed to save profile. Try again.", variant: "destructive" });
    } finally {
      setProcessing(false);
    }
  };

  const handlePaystackInit = async () => {
    if (!settings?.paystackPublicKey) return;
    
    setProcessing(true);
    try {
      const res = await fetch("/api/payment/paystack/initialize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          deviceId: getDeviceId(),
          email: form.email,
          amount: settings.price
        })
      });
      const data = await res.json();
      
      if (data.status && data.data.authorization_url) {
        window.location.href = data.data.authorization_url;
      } else {
        throw new Error("Paystack initialization failed");
      }
    } catch (err) {
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
      formData.append("deviceId", getDeviceId());
      formData.append("evidence", evidence);
      formData.append("amount", (settings?.price || 15000).toString());

      const res = await fetch("/api/payment/manual", {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        setStep("pending");
      } else {
        const err = await res.json();
        let errorMsg = err.message || "Failed to submit evidence. Please try again.";
        
        // Show detailed error if in debug mode
        if (settings?.isDebugMode && err.error) {
          errorMsg = `DEBUG: ${err.error}\n\n${errorMsg}`;
        }
        
        toast({ 
          title: "Error", 
          description: errorMsg, 
          variant: "destructive" 
        });
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Network error. Please try again.";
      toast({ 
        title: "Error", 
        description: settings?.isDebugMode ? `DEBUG: ${msg}` : "Network error. Please try again.", 
        variant: "destructive" 
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleRecover = async () => {
    if (!recoveryInput) return;
    setProcessing(true);
    try {
      const res = await fetch("/api/license/recover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier: recoveryInput, deviceId: getDeviceId() })
      });
      const data = await res.json();
      if (res.ok) {
        setIsPremium(true, data.license.key);
        toast({ title: "License Recovered!", description: "Premium access restored." });
        setStep("success");
      } else {
        toast({ title: "Recovery Failed", description: data.message, variant: "destructive" });
      }
    } catch (err) {
      toast({ title: "Error", description: "Check your connection.", variant: "destructive" });
    } finally {
      setProcessing(false);
    }
  };

  const formatPrice = (p: number) => {
    return new Intl.NumberFormat('en-NG', { 
      style: 'currency', 
      currency: settings?.currencyCode || 'NGN' 
    }).format(p).replace(settings?.currencyCode || 'NGN', settings?.currencySymbol || '₦');
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh] gap-4">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Preparing Premium options...</p>
      </div>
    );
  }

  if (isPremium && step !== "success") {
    return (
      <div className="max-w-xl mx-auto px-4 py-12 text-center space-y-6">
        <div className="w-20 h-20 bg-primary/10 rounded-3xl flex items-center justify-center mx-auto border border-primary/20">
          <ShieldCheck size={40} className="text-primary" />
        </div>
        <h1 className="text-2xl font-bold">Premium Active</h1>
        <p className="text-muted-foreground">Your professional license is active. All tools are unlocked.</p>
        <div className="p-4 bg-card border border-border rounded-2xl font-mono text-sm">
          {licenseKey}
        </div>
        <button onClick={() => setLocation("/home")} className="px-8 py-3 bg-primary text-primary-foreground rounded-xl font-bold">
          Continue to Toolkit
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto px-4 pb-20 pt-6">
      <AnimatePresence mode="wait">
        {/* STEP 0: FEATURES */}
        {step === "features" && !recoveryMode && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-6">
            <div className="relative overflow-hidden px-6 py-10 rounded-3xl bg-slate-950 border border-primary/20 shadow-2xl">
              <div className="absolute -top-10 -right-10 w-40 h-40 bg-primary/10 rounded-full blur-3xl" />
              <div className="relative text-center space-y-4">
                <div className="w-16 h-16 bg-primary/20 rounded-2xl flex items-center justify-center mx-auto border border-primary/40">
                  <Crown size={32} className="text-primary" />
                </div>
                <h1 className="text-3xl font-bold text-white">⭐ Unlock Premium</h1>
                <p className="text-slate-400">Unlock professional features and work 100% offline.</p>
                <div className="text-3xl font-black text-primary">{formatPrice(settings?.price || 15000)}</div>
                <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">One-time payment · Lifetime access</p>
              </div>
            </div>

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
                </div>
              ))}
            </div>

            <div className="space-y-3">
              <button onClick={() => setStep("payment_method")} className="w-full py-4 bg-primary text-primary-foreground rounded-2xl font-bold text-lg shadow-lg shadow-primary/20 active:scale-[0.98] transition-all">
                Get Started
              </button>
              <div className="flex flex-col gap-1">
                <button onClick={() => setRecoveryMode(true)} className="w-full py-2 text-sm font-semibold text-muted-foreground flex items-center justify-center gap-2">
                  <RefreshCw size={14} /> Restore License / Device Change
                </button>
                <button onClick={() => setStep("profile")} className="w-full py-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60 hover:text-primary transition-colors">
                  Edit Business Profile
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {/* RECOVERY MODE */}
        {recoveryMode && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6 pt-10">
            <div className="text-center space-y-2">
              <KeyRound size={40} className="mx-auto text-primary mb-4" />
              <h2 className="text-xl font-bold">Restore License</h2>
              <p className="text-sm text-muted-foreground">Enter your email or license key to restore access on this device.</p>
            </div>
            <div className="space-y-4">
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                <input 
                  type="text" 
                  placeholder="Email or License Key" 
                  value={recoveryInput}
                  onChange={(e) => setRecoveryInput(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 rounded-2xl bg-card border border-border focus:border-primary outline-none"
                />
              </div>
              <button 
                onClick={handleRecover}
                disabled={processing || !recoveryInput}
                className="w-full py-4 bg-primary text-primary-foreground rounded-2xl font-bold disabled:opacity-50"
              >
                {processing ? <Loader2 className="animate-spin mx-auto" /> : "Restore Access"}
              </button>
              <button onClick={() => setRecoveryMode(false)} className="w-full text-sm text-muted-foreground">
                Back to Unlock Premium
              </button>
            </div>
          </motion.div>
        )}

        {/* STEP 1: PROFILE FORM */}
        {step === "profile" && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
            <div className="space-y-1">
              <h2 className="text-2xl font-bold">Business Information</h2>
              <p className="text-sm text-muted-foreground">We need this to generate your official license.</p>
            </div>

            <form onSubmit={handleProfileSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase text-muted-foreground ml-1">Business Name</label>
                <div className="relative">
                  <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                  <input required type="text" placeholder="e.g. Joyful Stitches" value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="w-full pl-12 pr-4 py-3.5 rounded-2xl bg-card border border-border outline-none focus:border-primary" />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase text-muted-foreground ml-1">Phone Number</label>
                  <div className="relative">
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                    <input 
                      required 
                      type="tel" 
                      placeholder="080..." 
                      value={form.phone} 
                      onChange={e => setForm({...form, phone: e.target.value.replace(/[^0-9+]/g, '')})} 
                      className="w-full pl-12 pr-4 py-3.5 rounded-2xl bg-card border border-border outline-none focus:border-primary" 
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase text-muted-foreground ml-1">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                    <input type="email" placeholder="you@example.com (Optional)" value={form.email} onChange={e => setForm({...form, email: e.target.value})} className="w-full pl-12 pr-4 py-3.5 rounded-2xl bg-card border border-border outline-none focus:border-primary" />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase text-muted-foreground ml-1">City</label>
                  <div className="relative">
                    <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                    <input required type="text" placeholder="e.g. Lagos" value={form.city} onChange={e => setForm({...form, city: e.target.value})} className="w-full pl-12 pr-4 py-3.5 rounded-2xl bg-card border border-border outline-none focus:border-primary" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase text-muted-foreground ml-1">State</label>
                  <div className="relative">
                    <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                    <input required type="text" placeholder="e.g. Ikeja" value={form.state} onChange={e => setForm({...form, state: e.target.value})} className="w-full pl-12 pr-4 py-3.5 rounded-2xl bg-card border border-border outline-none focus:border-primary" />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase text-muted-foreground ml-1">Landmark</label>
                  <div className="relative">
                    <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                    <input required type="text" placeholder="e.g. Near City Mall" value={form.landmark} onChange={e => setForm({...form, landmark: e.target.value})} className="w-full pl-12 pr-4 py-3.5 rounded-2xl bg-card border border-border outline-none focus:border-primary" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase text-muted-foreground ml-1">Country</label>
                  <div className="relative">
                    <Hash className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                    <input required type="text" placeholder="Nigeria" value={form.country} onChange={e => setForm({...form, country: e.target.value})} className="w-full pl-12 pr-4 py-3.5 rounded-2xl bg-card border border-border outline-none focus:border-primary" />
                  </div>
                </div>
              </div>

              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => businessProfile ? setStep("features") : setLocation("/home")} className="flex-1 py-4 bg-secondary text-secondary-foreground rounded-2xl font-bold">
                  Cancel
                </button>
                <button type="submit" disabled={processing} className="flex-[2] py-4 bg-primary text-primary-foreground rounded-2xl font-bold flex items-center justify-center gap-2">
                  {processing ? <Loader2 className="animate-spin" /> : <>⭐ Unlock Premium <ChevronRight size={18} /></>}
                </button>
              </div>
            </form>
          </motion.div>
        )}

        {/* STEP 2: PAYMENT METHOD */}
        {step === "payment_method" && (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="space-y-6">
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-bold">Select Payment Method</h2>
              <p className="text-sm text-muted-foreground">Total to pay: <span className="font-bold text-foreground">{formatPrice(settings?.price || 0)}</span></p>
            </div>

            <div className="space-y-3">
              {settings?.isPaystackEnabled && (
                <button onClick={() => setStep("paystack")} className="w-full p-6 bg-card border border-border rounded-3xl flex items-center gap-4 hover:border-primary/50 transition-all active:scale-[0.98] group">
                  <div className="w-12 h-12 bg-emerald-500/10 rounded-2xl flex items-center justify-center text-emerald-500">
                    <CreditCard size={24} />
                  </div>
                  <div className="text-left flex-1">
                    <p className="font-bold text-lg">Paystack</p>
                    <p className="text-xs text-muted-foreground">Pay with Card, Bank Transfer, or USSD</p>
                  </div>
                  <ChevronRight size={20} className="text-muted-foreground group-hover:text-primary" />
                </button>
              )}

              {settings?.isManualEnabled && (
                <button onClick={() => setStep("manual")} className="w-full p-6 bg-card border border-border rounded-3xl flex items-center gap-4 hover:border-primary/50 transition-all active:scale-[0.98] group">
                  <div className="w-12 h-12 bg-blue-500/10 rounded-2xl flex items-center justify-center text-blue-500">
                    <Banknote size={24} />
                  </div>
                  <div className="text-left flex-1">
                    <p className="font-bold text-lg">Manual Transfer</p>
                    <p className="text-xs text-muted-foreground">Transfer to our bank and upload receipt</p>
                  </div>
                  <ChevronRight size={20} className="text-muted-foreground group-hover:text-primary" />
                </button>
              )}
            </div>

            <button onClick={() => setStep("features")} className="w-full text-sm text-muted-foreground font-medium">Back to Plans</button>
          </motion.div>
        )}

        {/* STEP 3: PAYSTACK */}
        {step === "paystack" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6 text-center py-10">
            <div className="w-20 h-20 bg-emerald-500/10 rounded-3xl flex items-center justify-center mx-auto mb-4">
              <CreditCard size={40} className="text-emerald-500" />
            </div>
            <h2 className="text-2xl font-bold">Secure Checkout</h2>
            <p className="text-muted-foreground">You will be redirected to Paystack's secure payment gateway.</p>
            
            <div className="p-4 bg-muted/50 rounded-2xl text-left space-y-2">
              <div className="flex justify-between text-sm"><span className="text-muted-foreground">Amount</span> <span className="font-bold">{formatPrice(settings?.price || 0)}</span></div>
              <div className="flex justify-between text-sm"><span className="text-muted-foreground">Email</span> <span className="font-bold">{form.email}</span></div>
            </div>

            <div className="flex gap-3">
              <button onClick={() => setStep("payment_method")} className="flex-1 py-4 bg-secondary rounded-2xl font-bold">Cancel</button>
              <button onClick={handlePaystackInit} disabled={processing} className="flex-[2] py-4 bg-emerald-600 text-white rounded-2xl font-bold flex items-center justify-center gap-2">
                {processing ? <Loader2 className="animate-spin" /> : <>Pay with Paystack <ExternalLink size={18} /></>}
              </button>
            </div>
          </motion.div>
        )}

        {/* STEP 3: MANUAL */}
        {step === "manual" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            <div className="p-6 bg-primary/5 border border-primary/20 rounded-3xl space-y-4">
              <div className="flex items-center gap-3">
                <Banknote className="text-primary" />
                <h2 className="font-bold text-lg">Bank Transfer Details</h2>
              </div>
              <div className="space-y-3">
                <div className="p-4 bg-primary/10 rounded-2xl border border-primary/20 flex flex-col items-center justify-center text-center space-y-1">
                  <p className="text-[10px] font-black uppercase tracking-widest text-primary/60">Amount to Pay</p>
                  <p className="text-3xl font-black text-primary">{formatPrice(settings?.price || 15000)}</p>
                </div>

                <div className="flex justify-between items-center p-3 bg-card rounded-xl border border-border">
                  <div><p className="text-[10px] text-muted-foreground uppercase font-bold">Bank Name</p><p className="font-bold">{settings?.bankName}</p></div>
                  <button onClick={() => { navigator.clipboard.writeText(settings?.bankName || ""); toast({ title: "Copied!" }); }}><Copy size={16} className="text-primary" /></button>
                </div>
                <div className="flex justify-between items-center p-3 bg-card rounded-xl border border-border">
                  <div><p className="text-[10px] text-muted-foreground uppercase font-bold">Account Number</p><p className="font-bold text-lg tracking-wider">{settings?.accountNumber}</p></div>
                  <button onClick={() => { navigator.clipboard.writeText(settings?.accountNumber || ""); toast({ title: "Copied!" }); }}><Copy size={16} className="text-primary" /></button>
                </div>
                <div className="flex justify-between items-center p-3 bg-card rounded-xl border border-border">
                  <div><p className="text-[10px] text-muted-foreground uppercase font-bold">Account Name</p><p className="font-bold">{settings?.accountName}</p></div>
                  <button onClick={() => { navigator.clipboard.writeText(settings?.accountName || ""); toast({ title: "Copied!" }); }}><Copy size={16} className="text-primary" /></button>
                </div>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed italic">{settings?.instructions}</p>
            </div>

            <div className="space-y-3">
              <h3 className="font-bold text-sm ml-1">Upload Receipt / Screenshot</h3>
              {!evidencePreview ? (
                <div onClick={() => fileRef.current?.click()} className="h-40 rounded-2xl border-2 border-dashed border-border flex flex-col items-center justify-center gap-2 cursor-pointer bg-card hover:bg-muted/50 transition-all">
                  <Upload className="text-muted-foreground" />
                  <p className="text-sm font-medium text-muted-foreground">Tap to upload proof</p>
                  <input ref={fileRef} type="file" accept="image/*,application/pdf" className="hidden" onChange={e => {
                    const f = e.target.files?.[0];
                    if (f) {
                      setEvidence(f);
                      if (f.type.startsWith('image/')) setEvidencePreview(URL.createObjectURL(f));
                      else setEvidencePreview('pdf');
                    }
                  }} />
                </div>
              ) : (
                <div className="relative rounded-2xl overflow-hidden border border-border bg-card">
                  {evidencePreview === 'pdf' ? (
                    <div className="h-40 flex items-center justify-center bg-slate-100 dark:bg-slate-900"><p className="font-bold">PDF Document Selected</p></div>
                  ) : (
                    <img src={evidencePreview} className="w-full h-40 object-cover" />
                  )}
                  <button onClick={() => { setEvidence(null); setEvidencePreview(null); }} className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/60 text-white flex items-center justify-center"><X size={16} /></button>
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <button onClick={() => setStep("payment_method")} className="flex-1 py-4 bg-secondary rounded-2xl font-bold">Back</button>
              <button onClick={handleManualSubmit} disabled={processing || !evidence} className="flex-[2] py-4 bg-primary text-primary-foreground rounded-2xl font-bold flex items-center justify-center gap-2">
                {processing ? <Loader2 className="animate-spin" /> : "Submit Proof"}
              </button>
            </div>
          </motion.div>
        )}

        {/* STEP 4: PENDING */}
        {step === "pending" && (
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center py-12 space-y-6">
            <div className="w-24 h-24 bg-blue-500/10 rounded-full flex items-center justify-center mx-auto">
              <RefreshCw size={48} className="text-blue-500 animate-spin-slow" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-bold">Verification Pending</h2>
              <p className="text-muted-foreground leading-relaxed">Your proof of payment has been submitted. Our admin will verify it and activate your premium status shortly.</p>
            </div>
            <div className="p-4 bg-blue-50 dark:bg-blue-950/30 rounded-2xl text-sm text-blue-700 dark:text-blue-400">
              You will receive an email once your license is activated.
            </div>
            <button onClick={() => setLocation("/home")} className="px-8 py-3 bg-primary text-primary-foreground rounded-xl font-bold">Back to Toolkit</button>
          </motion.div>
        )}

        {/* STEP 4: SUCCESS */}
        {step === "success" && (
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center py-12 space-y-6">
            <div className="w-24 h-24 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto border-4 border-emerald-500/20">
              <CheckCircle2 size={60} className="text-emerald-500" />
            </div>
            <div className="space-y-2">
              <h2 className="text-3xl font-bold">Premium Unlocked!</h2>
              <p className="text-muted-foreground">Welcome to OneTailor Premium, {form.name}!</p>
            </div>
            <div className="p-6 bg-emerald-50 dark:bg-emerald-950/30 rounded-3xl space-y-3">
              <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-600">Your Lifetime License Key</p>
              <div className="text-xl font-mono font-bold tracking-tighter text-emerald-700 dark:text-emerald-400 select-all">{licenseKey}</div>
              <button onClick={() => { navigator.clipboard.writeText(licenseKey || ""); toast({ title: "Copied to clipboard" }); }} className="flex items-center gap-2 text-xs font-bold mx-auto text-emerald-600 uppercase"><Copy size={14} /> Copy Key</button>
            </div>
            <button onClick={() => setLocation("/home")} className="w-full py-4 bg-primary text-primary-foreground rounded-2xl font-bold text-lg">Start Using Premium Features</button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
