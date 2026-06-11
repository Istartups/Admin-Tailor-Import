import { useState, useEffect, useRef } from "react";
import { 
  Check, Crown, Zap, Loader2, ExternalLink, Copy, 
  CheckCircle2, Building2, Users, Hash, ShieldCheck,
  Phone, Mail, MapPin, ChevronRight, CreditCard, Banknote, Upload,
  X, RefreshCw, Palette, Video, Database, Eye, EyeOff, LogIn, Lock
} from "lucide-react";
import { useAppStore, type BusinessProfile } from "@/store/useAppStore";
import { useToast } from "@/hooks/use-toast";
import { useLocation, useRoute } from "wouter";
import { getDeviceId, validateName, validatePhone } from "@/lib/utils";
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
  isDebugMode?: boolean;
}

type Step = "features" | "create_account" | "business_details" | "payment_method" | "paystack" | "manual" | "success" | "pending";

export default function PreUnlock() {
  const isPremium      = useAppStore((s) => s.isPremium);
  const account        = useAppStore((s) => s.account);
  const setAccount     = useAppStore((s) => s.setAccount);
  const setIsPremium   = useAppStore((s) => s.setIsPremium);
  const businessProfile   = useAppStore((s) => s.businessProfile);
  const setBusinessProfile = useAppStore((s) => s.setBusinessProfile);
  const setPendingPremiumRequest = useAppStore((s) => s.setPendingPremiumRequest);
  const premiumRequestStatus = useAppStore((s) => s.premiumRequestStatus);

  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [, params] = useRoute("/pre-unlock/:sub");
  const subRoute = (params as any)?.sub as string | undefined;

  const getInitialStep = (): Step => {
    if (subRoute === "success") return "success";
    if (account) {
      // Auto-resume from the correct step based on existing request status
      if (premiumRequestStatus === "payment_submitted") return "pending";
      if (premiumRequestStatus === "rejected") return "payment_method";
      if (premiumRequestStatus === "pending") return "payment_method";
      return "features";
    }
    return "features"; // show premium pitch first
  };

  const [step, setStep] = useState<Step>(getInitialStep);
  const [settings, setSettings] = useState<PaymentSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  // ─── Form State ───────────────────────────────────────────────────────────
  const [form, setForm] = useState({
    // Page 1: Account credentials
    name: businessProfile?.name || account?.businessName || "",
    phone: businessProfile?.phone || account?.phone || "",
    email: businessProfile?.email || account?.email || "",
    password: "",
    confirmPassword: "",
    // Page 2: Location details
    city:     businessProfile?.addressDetails?.city || "",
    state:    businessProfile?.addressDetails?.state || "",
    landmark: businessProfile?.addressDetails?.landmark || "",
    country:  businessProfile?.addressDetails?.country || "Nigeria",
  });

  const [showPassword, setShowPassword]        = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [emailAvailable, setEmailAvailable]    = useState<boolean | null>(null);
  const [checkingEmail, setCheckingEmail]      = useState(false);
  const emailCheckTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Manual payment evidence state
  const [evidence, setEvidence]       = useState<File | null>(null);
  const [evidencePreview, setEvidencePreview] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  // When subRoute is "success" (redirect back from Paystack), show success screen
  useEffect(() => {
    if (subRoute === "success") {
      setStep("success");
      setIsPremium(true);
    }
  }, [subRoute]);

  const fetchSettings = async () => {
    try {
      const res = await fetch("/api/payment-info");
      if (!res.ok) throw new Error("Failed to fetch settings");
      const data = await res.json();
      setSettings(data);
    } catch {
      toast({ title: "Connection Error", description: "Could not load payment info.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const checkEmailAvailability = async (email: string) => {
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setEmailAvailable(null);
      return;
    }
    setCheckingEmail(true);
    try {
      const res = await fetch("/api/auth/check-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      setEmailAvailable(data.available);
    } catch {
      setEmailAvailable(null);
    } finally {
      setCheckingEmail(false);
    }
  };

  const handleEmailChange = (email: string) => {
    setForm(f => ({ ...f, email }));
    clearTimeout(emailCheckTimer.current);
    emailCheckTimer.current = setTimeout(() => checkEmailAvailability(email), 600);
  };

  // ─── Step 1a: Account Details Validation ─────────────────────────────────

  const handleAccountSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const nameVal = validateName(form.name);
    if (!nameVal.valid) { toast({ title: "Invalid Business Name", description: nameVal.message, variant: "destructive" }); return; }
    const phoneVal = validatePhone(form.phone);
    if (!phoneVal.valid) { toast({ title: "Invalid Phone", description: phoneVal.message, variant: "destructive" }); return; }
    if (!form.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      toast({ title: "Invalid Email", description: "Please enter a valid email address.", variant: "destructive" }); return;
    }
    if (emailAvailable === false) {
      toast({ title: "Email Taken", description: "This email already has an account. Please login.", variant: "destructive" }); return;
    }
    if (!form.password || form.password.length < 6) {
      toast({ title: "Weak Password", description: "Password must be at least 6 characters.", variant: "destructive" }); return;
    }
    if (form.password !== form.confirmPassword) {
      toast({ title: "Passwords Don't Match", description: "Please re-enter your password.", variant: "destructive" }); return;
    }
    setStep("business_details"); // proceed to location step
  };

  // ─── Step 1b: Register & Proceed to Payment ───────────────────────────────

  const handleRegisterAndProceed = async (e: React.FormEvent) => {
    e.preventDefault();
    setProcessing(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          deviceId: getDeviceId(),
          businessName: form.name,
          phone: form.phone,
          email: form.email,
          password: form.password,
          city: form.city || undefined,
          state: form.state || undefined,
          landmark: form.landmark || undefined,
          country: form.country || "Nigeria",
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        if (data.shouldLogin) {
          toast({ title: "Account Exists", description: "This email is already registered. Please login.", variant: "destructive" });
          navigate("/account-login");
          return;
        }
        toast({ title: "Registration Failed", description: data.message, variant: "destructive" });
        return;
      }

      localStorage.setItem("user_token", data.token);
      setAccount(data.user);

      // Update local business profile too
      const combinedAddress = [form.city, form.state, form.country].filter(Boolean).join(", ");
      setBusinessProfile({
        name: form.name,
        phone: form.phone,
        email: form.email,
        address: combinedAddress,
        addressDetails: { city: form.city, state: form.state, landmark: form.landmark, country: form.country },
        socials: businessProfile?.socials,
        brandColors: businessProfile?.brandColors,
      });

      toast({ title: "Account Created! ✅", description: "Now choose your payment method." });
      setStep("payment_method");
    } catch {
      toast({ title: "Network Error", description: "Could not complete registration. Please try again.", variant: "destructive" });
    } finally {
      setProcessing(false);
    }
  };

  // ─── Paystack Payment ─────────────────────────────────────────────────────

  const handlePaystackInit = async () => {
    if (!settings?.paystackPublicKey) return;
    setProcessing(true);
    try {
      const userDeviceId = account?.deviceId || getDeviceId();
      const userEmail    = account?.email || form.email;
      const res = await fetch("/api/payment/paystack/initialize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deviceId: userDeviceId, email: userEmail, amount: settings.price }),
      });
      const data = await res.json();
      if (data.status && data.data.authorization_url) {
        window.location.href = data.data.authorization_url;
      } else {
        throw new Error("Paystack initialization failed");
      }
    } catch {
      toast({ title: "Payment Error", description: "Could not start Paystack payment.", variant: "destructive" });
    } finally {
      setProcessing(false);
    }
  };

  // ─── Manual Payment Submission ────────────────────────────────────────────

  const handleManualSubmit = async () => {
    if (!evidence) return;
    setProcessing(true);
    try {
      const formData = new FormData();
      formData.append("deviceId", account?.deviceId || getDeviceId());
      formData.append("evidence", evidence);
      formData.append("amount", (settings?.price || 15000).toString());

      const res = await fetch("/api/payment/manual", { method: "POST", body: formData });
      if (res.ok) {
        setPendingPremiumRequest(true);
        setStep("pending");
      } else {
        const err = await res.json();
        toast({ title: "Error", description: err.message || "Failed to submit evidence.", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Network error. Please try again.", variant: "destructive" });
    } finally {
      setProcessing(false);
    }
  };

  const formatPrice = (p: number) => {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: settings?.currencyCode || "NGN",
    }).format(p).replace(settings?.currencyCode || "NGN", settings?.currencySymbol || "₦");
  };

  const inputClass = "w-full pl-11 pr-4 py-3.5 rounded-2xl bg-card border border-border outline-none focus:border-primary transition-colors text-sm";
  const labelClass = "text-xs font-bold uppercase tracking-wider text-muted-foreground";

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
        <p className="text-muted-foreground">All professional tools are unlocked.</p>
        {account && (
          <p className="text-sm text-muted-foreground">Signed in as <b>{account.email}</b></p>
        )}
        <button onClick={() => navigate("/home")} className="px-8 py-3 bg-primary text-primary-foreground rounded-xl font-bold">
          Continue to Toolkit
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto px-4 pb-20 pt-6">
      <AnimatePresence mode="wait">

        {/* ── FEATURES / INTRO SCREEN ────────────────────────────────────────── */}
        {step === "features" && (
          <motion.div key="features" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-6">
            <div className="relative overflow-hidden px-6 py-10 rounded-3xl bg-slate-950 border border-primary/20 shadow-2xl">
              <div className="absolute -top-10 -right-10 w-40 h-40 bg-primary/10 rounded-full blur-3xl" />
              <div className="relative text-center space-y-4">
                <div className="w-16 h-16 bg-primary/20 rounded-2xl flex items-center justify-center mx-auto border border-primary/40">
                  <Crown size={32} className="text-primary" />
                </div>
                <h1 className="text-3xl font-bold text-white">⭐ Unlock Premium</h1>
                <p className="text-slate-400">Professional tools for serious tailors.</p>
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
              <button
                onClick={() => account ? setStep("payment_method") : setStep("create_account")}
                className="w-full py-4 bg-primary text-primary-foreground rounded-2xl font-bold text-lg shadow-lg shadow-primary/20 active:scale-[0.98] transition-all"
              >
                {account ? "Choose Payment Method" : "Get Started →"}
              </button>
              <button
                onClick={() => navigate("/account-login")}
                className="w-full py-2 text-sm font-semibold text-muted-foreground flex items-center justify-center gap-2"
              >
                <LogIn size={14} /> Already have an account? Login
              </button>
            </div>
          </motion.div>
        )}

        {/* ── STEP 1a: CREATE ACCOUNT ────────────────────────────────────────── */}
        {step === "create_account" && (
          <motion.div key="create_account" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} className="space-y-6">
            <div className="space-y-1">
              <div className="flex items-center gap-2 mb-2">
                <div className="flex gap-1">
                  <div className="w-6 h-1.5 rounded-full bg-primary" />
                  <div className="w-6 h-1.5 rounded-full bg-muted" />
                </div>
                <span className="text-xs text-muted-foreground">Step 1 of 2</span>
              </div>
              <h2 className="text-2xl font-bold">Create Account</h2>
              <p className="text-sm text-muted-foreground">Your account lets you restore premium on any device.</p>
            </div>

            <form onSubmit={handleAccountSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className={labelClass}>Business Name</label>
                <div className="relative">
                  <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                  <input
                    required type="text" placeholder="e.g. Joyful Stitches"
                    value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    className={inputClass}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className={labelClass}>Phone Number</label>
                <div className="relative">
                  <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                  <input
                    required type="tel" placeholder="080..."
                    value={form.phone}
                    onChange={e => setForm(f => ({ ...f, phone: e.target.value.replace(/[^0-9+]/g, "") }))}
                    className={inputClass}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className={labelClass}>Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                  <input
                    required type="email" placeholder="you@example.com"
                    value={form.email} onChange={e => handleEmailChange(e.target.value)}
                    className={`${inputClass} ${emailAvailable === false ? "border-red-500" : emailAvailable === true ? "border-emerald-500" : ""}`}
                  />
                  {checkingEmail && <Loader2 className="absolute right-3.5 top-1/2 -translate-y-1/2 animate-spin text-muted-foreground" size={14} />}
                  {!checkingEmail && emailAvailable === false && (
                    <p className="text-xs text-red-500 mt-1 ml-1">Email already registered. <button type="button" onClick={() => navigate("/account-login")} className="underline font-bold">Login instead</button></p>
                  )}
                  {!checkingEmail && emailAvailable === true && (
                    <p className="text-xs text-emerald-500 mt-1 ml-1">✓ Email available</p>
                  )}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className={labelClass}>Password</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                  <input
                    required type={showPassword ? "text" : "password"} placeholder="At least 6 characters"
                    value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                    className={`${inputClass} pr-11`}
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground">
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className={labelClass}>Confirm Password</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                  <input
                    required type={showConfirmPassword ? "text" : "password"} placeholder="Repeat password"
                    value={form.confirmPassword} onChange={e => setForm(f => ({ ...f, confirmPassword: e.target.value }))}
                    className={`${inputClass} pr-11 ${form.confirmPassword && form.password !== form.confirmPassword ? "border-red-500" : ""}`}
                  />
                  <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground">
                    {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {form.confirmPassword && form.password !== form.confirmPassword && (
                  <p className="text-xs text-red-500 ml-1">Passwords don't match</p>
                )}
              </div>

              <div className="pt-2">
                <button type="submit" className="w-full py-4 bg-primary text-primary-foreground rounded-2xl font-bold flex items-center justify-center gap-2">
                  Continue <ChevronRight size={18} />
                </button>
              </div>

              <div className="text-center">
                <button type="button" onClick={() => navigate("/account-login")} className="text-sm text-muted-foreground">
                  Already have an account? <span className="text-primary font-semibold">Login</span>
                </button>
              </div>
            </form>
          </motion.div>
        )}

        {/* ── STEP 1b: BUSINESS LOCATION ─────────────────────────────────────── */}
        {step === "business_details" && (
          <motion.div key="business_details" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} className="space-y-6">
            <div className="space-y-1">
              <div className="flex items-center gap-2 mb-2">
                <div className="flex gap-1">
                  <div className="w-6 h-1.5 rounded-full bg-primary" />
                  <div className="w-6 h-1.5 rounded-full bg-primary" />
                </div>
                <span className="text-xs text-muted-foreground">Step 2 of 2</span>
              </div>
              <h2 className="text-2xl font-bold">Business Location</h2>
              <p className="text-sm text-muted-foreground">Helps us issue your official record. You're almost there!</p>
            </div>

            <form onSubmit={handleRegisterAndProceed} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className={labelClass}>City</label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={14} />
                    <input type="text" placeholder="e.g. Ikeja" value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))}
                      className="w-full pl-9 pr-3 py-3 rounded-xl bg-card border border-border outline-none focus:border-primary text-sm" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className={labelClass}>State</label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={14} />
                    <input type="text" placeholder="e.g. Lagos" value={form.state} onChange={e => setForm(f => ({ ...f, state: e.target.value }))}
                      className="w-full pl-9 pr-3 py-3 rounded-xl bg-card border border-border outline-none focus:border-primary text-sm" />
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className={labelClass}>Nearest Landmark (Optional)</label>
                <div className="relative">
                  <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" size={14} />
                  <input type="text" placeholder="e.g. Near City Mall" value={form.landmark}
                    onChange={e => setForm(f => ({ ...f, landmark: e.target.value }))}
                    className={inputClass} />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className={labelClass}>Country</label>
                <div className="relative">
                  <Hash className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" size={14} />
                  <input type="text" placeholder="Nigeria" value={form.country}
                    onChange={e => setForm(f => ({ ...f, country: e.target.value }))}
                    className={inputClass} />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setStep("create_account")} className="flex-1 py-4 bg-secondary text-secondary-foreground rounded-2xl font-bold">Back</button>
                <button type="submit" disabled={processing} className="flex-[2] py-4 bg-primary text-primary-foreground rounded-2xl font-bold flex items-center justify-center gap-2 disabled:opacity-50">
                  {processing ? <Loader2 className="animate-spin" size={18} /> : <><Crown size={18} /> Register & Continue</>}
                </button>
              </div>
            </form>
          </motion.div>
        )}

        {/* ── STEP 2: PAYMENT METHOD ─────────────────────────────────────────── */}
        {step === "payment_method" && (
          <motion.div key="payment_method" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="space-y-6">
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-bold">Select Payment Method</h2>
              <p className="text-sm text-muted-foreground">Total: <span className="font-bold text-foreground">{formatPrice(settings?.price || 0)}</span></p>
              {account && (
                <div className="inline-flex items-center gap-1.5 bg-emerald-500/10 text-emerald-400 text-xs font-bold px-3 py-1.5 rounded-full border border-emerald-500/20">
                  <Check size={12} /> Account: {account.email}
                </div>
              )}
            </div>

            {premiumRequestStatus === "rejected" && (
              <div className="flex items-start gap-3 p-4 bg-red-500/10 border border-red-500/25 rounded-2xl">
                <X size={16} className="text-red-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs font-black text-red-400 uppercase tracking-wider mb-0.5">Previous Payment Rejected</p>
                  <p className="text-xs text-foreground/70 leading-relaxed">Your previous payment proof could not be verified. Please try again with a clear receipt, or pay directly with Paystack.</p>
                </div>
              </div>
            )}

            <div className="space-y-3">
              {settings?.isPaystackEnabled && (
                <button onClick={() => setStep("paystack")} className="w-full p-6 bg-card border border-border rounded-3xl flex items-center gap-4 hover:border-primary/50 transition-all active:scale-[0.98] group">
                  <div className="w-12 h-12 bg-emerald-500/10 rounded-2xl flex items-center justify-center text-emerald-500"><CreditCard size={24} /></div>
                  <div className="text-left flex-1">
                    <p className="font-bold text-lg">Paystack</p>
                    <p className="text-xs text-muted-foreground">Pay with Card, Bank Transfer, or USSD</p>
                  </div>
                  <ChevronRight size={20} className="text-muted-foreground group-hover:text-primary" />
                </button>
              )}
              {settings?.isManualEnabled && (
                <button onClick={() => setStep("manual")} className="w-full p-6 bg-card border border-border rounded-3xl flex items-center gap-4 hover:border-primary/50 transition-all active:scale-[0.98] group">
                  <div className="w-12 h-12 bg-blue-500/10 rounded-2xl flex items-center justify-center text-blue-500"><Banknote size={24} /></div>
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

        {/* ── STEP 3: PAYSTACK CONFIRM ──────────────────────────────────────── */}
        {step === "paystack" && (
          <motion.div key="paystack" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6 text-center py-10">
            <div className="w-20 h-20 bg-emerald-500/10 rounded-3xl flex items-center justify-center mx-auto mb-4">
              <CreditCard size={40} className="text-emerald-500" />
            </div>
            <h2 className="text-2xl font-bold">Secure Checkout</h2>
            <p className="text-muted-foreground">You'll be redirected to Paystack's secure gateway.</p>
            <div className="p-4 bg-muted/50 rounded-2xl text-left space-y-2">
              <div className="flex justify-between text-sm"><span className="text-muted-foreground">Amount</span><span className="font-bold">{formatPrice(settings?.price || 0)}</span></div>
              <div className="flex justify-between text-sm"><span className="text-muted-foreground">Email</span><span className="font-bold">{account?.email || form.email}</span></div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setStep("payment_method")} className="flex-1 py-4 bg-secondary rounded-2xl font-bold">Cancel</button>
              <button onClick={handlePaystackInit} disabled={processing} className="flex-[2] py-4 bg-emerald-600 text-white rounded-2xl font-bold flex items-center justify-center gap-2">
                {processing ? <Loader2 className="animate-spin" /> : <>Pay with Paystack <ExternalLink size={18} /></>}
              </button>
            </div>
          </motion.div>
        )}

        {/* ── STEP 3b: MANUAL PAYMENT ───────────────────────────────────────── */}
        {step === "manual" && (
          <motion.div key="manual" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            <div className="p-6 bg-primary/5 border border-primary/20 rounded-3xl space-y-4">
              <div className="flex items-center gap-3">
                <Banknote className="text-primary" />
                <h2 className="font-bold text-lg">Bank Transfer Details</h2>
              </div>
              <div className="space-y-3">
                <div className="p-4 bg-primary/10 rounded-2xl border border-primary/20 flex flex-col items-center text-center space-y-1">
                  <p className="text-[10px] font-black uppercase tracking-widest text-primary/60">Amount to Pay</p>
                  <p className="text-3xl font-black text-primary">{formatPrice(settings?.price || 15000)}</p>
                </div>
                {[
                  { label: "Bank Name", value: settings?.bankName },
                  { label: "Account Number", value: settings?.accountNumber },
                  { label: "Account Name", value: settings?.accountName },
                ].map(({ label, value }) => (
                  <div key={label} className="flex justify-between items-center p-3 bg-card rounded-xl border border-border">
                    <div><p className="text-[10px] text-muted-foreground uppercase font-bold">{label}</p><p className="font-bold text-sm">{value}</p></div>
                    <button onClick={() => { navigator.clipboard.writeText(value || ""); toast({ title: "Copied!" }); }}>
                      <Copy size={16} className="text-primary" />
                    </button>
                  </div>
                ))}
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
                    if (f) { setEvidence(f); if (f.type.startsWith("image/")) setEvidencePreview(URL.createObjectURL(f)); else setEvidencePreview("pdf"); }
                  }} />
                </div>
              ) : (
                <div className="relative rounded-2xl overflow-hidden border border-border bg-card">
                  {evidencePreview === "pdf" ? (
                    <div className="h-40 flex items-center justify-center"><p className="font-bold">PDF Selected</p></div>
                  ) : (
                    <img src={evidencePreview} className="w-full h-40 object-cover" />
                  )}
                  <button onClick={() => { setEvidence(null); setEvidencePreview(null); }} className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/60 text-white flex items-center justify-center"><X size={16} /></button>
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <button onClick={() => setStep("payment_method")} className="flex-1 py-4 bg-secondary rounded-2xl font-bold">Back</button>
              <button onClick={handleManualSubmit} disabled={processing || !evidence} className="flex-[2] py-4 bg-primary text-primary-foreground rounded-2xl font-bold flex items-center justify-center gap-2 disabled:opacity-50">
                {processing ? <Loader2 className="animate-spin" /> : "Submit Proof"}
              </button>
            </div>
          </motion.div>
        )}

        {/* ── PENDING ───────────────────────────────────────────────────────── */}
        {step === "pending" && (
          <motion.div key="pending" initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center py-12 space-y-6">
            <div className="w-24 h-24 bg-blue-500/10 rounded-full flex items-center justify-center mx-auto">
              <RefreshCw size={48} className="text-blue-500 animate-spin-slow" />
            </div>
            <h2 className="text-2xl font-bold">Verification Pending</h2>
            <p className="text-muted-foreground leading-relaxed">Your proof has been submitted. We'll verify and activate your premium shortly.</p>
            <div className="p-4 bg-blue-50 dark:bg-blue-950/30 rounded-2xl text-sm text-blue-700 dark:text-blue-400">
              {account?.email
                ? <>You'll receive a confirmation at <b>{account.email}</b> once approved.</>
                : "You'll receive an email notification once your license is activated."}
            </div>
            <button onClick={() => navigate("/home")} className="px-8 py-3 bg-primary text-primary-foreground rounded-xl font-bold">Back to Toolkit</button>
          </motion.div>
        )}

        {/* ── SUCCESS ───────────────────────────────────────────────────────── */}
        {step === "success" && (
          <motion.div key="success" initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center py-12 space-y-6">
            <div className="w-24 h-24 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto border-4 border-emerald-500/20">
              <CheckCircle2 size={60} className="text-emerald-500" />
            </div>
            <h2 className="text-3xl font-bold">Premium Unlocked!</h2>
            <p className="text-muted-foreground">Welcome to OneTailor Premium{account?.businessName ? `, ${account.businessName}` : ""}!</p>
            <div className="p-5 bg-emerald-50 dark:bg-emerald-950/30 rounded-3xl space-y-2">
              <p className="text-sm font-bold text-emerald-700 dark:text-emerald-400">✅ Premium Access: ACTIVE</p>
              <p className="text-xs text-muted-foreground">Log in on any device with your email to restore premium automatically.</p>
            </div>
            <button onClick={() => navigate("/home")} className="w-full py-4 bg-primary text-primary-foreground rounded-2xl font-bold text-lg">
              Start Using Premium Features
            </button>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
}
