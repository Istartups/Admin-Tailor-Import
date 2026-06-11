import { useState, useEffect, useRef } from "react";
import {
  Loader2, Crown, ShieldCheck, LogIn, ChevronRight, Mail, Lock,
  Eye, EyeOff, Building2, Phone, X, RefreshCw, Upload, Check,
  AlertCircle
} from "lucide-react";
import { useAppStore } from "@/store/useAppStore";
import { useToast } from "@/hooks/use-toast";
import { useLocation, useRoute } from "wouter";
import { getDeviceId, validateName, validatePhone } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

const CHALLENGE_OPTIONS = [
  { id: "measuring", label: "Measuring clients accurately", emoji: "📏" },
  { id: "followup", label: "Following up with clients", emoji: "📱" },
  { id: "pricing", label: "Setting the right price", emoji: "💰" },
  { id: "records", label: "Keeping proper records", emoji: "📋" },
];

const CLIENT_RANGES = ["1-5 clients", "6-15 clients", "16-30 clients", "30+ clients"];

type Step = "lead_form" | "create_account" | "pending" | "rejected_reupload" | "success";

export default function PreUnlock() {
  const isPremium               = useAppStore((s) => s.isPremium);
  const account                 = useAppStore((s) => s.account);
  const setAccount              = useAppStore((s) => s.setAccount);
  const setIsPremium            = useAppStore((s) => s.setIsPremium);
  const setBusinessProfile      = useAppStore((s) => s.setBusinessProfile);
  const setPendingPremiumRequest = useAppStore((s) => s.setPendingPremiumRequest);
  const premiumRequestStatus    = useAppStore((s) => s.premiumRequestStatus);
  const businessProfile         = useAppStore((s) => s.businessProfile);

  const { toast } = useToast();
  const [, navigate]  = useLocation();
  const [, params]    = useRoute("/pre-unlock/:sub");
  const subRoute      = (params as any)?.sub as string | undefined;

  const getInitialStep = (): Step => {
    if (subRoute === "success") return "success";
    if (account) {
      if (premiumRequestStatus === "payment_submitted") return "pending";
      if (premiumRequestStatus === "rejected")          return "rejected_reupload";
    }
    return "lead_form";
  };

  const [step, setStep]           = useState<Step>(getInitialStep);
  const [processing, setProcessing] = useState(false);

  const [leadForm, setLeadForm] = useState({
    name:        "",
    phone:       "",
    clientRange: "",
    challenge:   "",
  });

  const [accountForm, setAccountForm] = useState({
    email:           "",
    password:        "",
    confirmPassword: "",
  });
  const [showPassword, setShowPassword]               = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [emailAvailable, setEmailAvailable]           = useState<boolean | null>(null);
  const [checkingEmail, setCheckingEmail]             = useState(false);
  const emailCheckTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const [evidence, setEvidence]             = useState<File | null>(null);
  const [evidencePreview, setEvidencePreview] = useState<string | null>(null);
  const [rejectNotes, setRejectNotes]       = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (subRoute === "success") {
      setStep("success");
      setIsPremium(true);
      return;
    }
    if (account) {
      if (premiumRequestStatus === "payment_submitted") { setStep("pending"); return; }
      if (premiumRequestStatus === "rejected")          { setStep("rejected_reupload"); return; }
      navigate("/premium");
    }
  }, [account, premiumRequestStatus, subRoute]);

  const checkEmailAvailability = async (email: string) => {
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setEmailAvailable(null); return; }
    setCheckingEmail(true);
    try {
      const res  = await fetch("/api/auth/check-email", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email }) });
      const data = await res.json();
      setEmailAvailable(data.available);
    } catch { setEmailAvailable(null); }
    finally   { setCheckingEmail(false); }
  };

  const handleEmailChange = (email: string) => {
    setAccountForm(f => ({ ...f, email }));
    clearTimeout(emailCheckTimer.current);
    emailCheckTimer.current = setTimeout(() => checkEmailAvailability(email), 600);
  };

  const handleLeadContinue = (e: React.FormEvent) => {
    e.preventDefault();
    const nameVal  = validateName(leadForm.name);
    if (!nameVal.valid)  { toast({ title: "Invalid Business Name", description: nameVal.message, variant: "destructive" }); return; }
    const phoneVal = validatePhone(leadForm.phone);
    if (!phoneVal.valid) { toast({ title: "Invalid Phone", description: phoneVal.message, variant: "destructive" }); return; }
    if (!leadForm.clientRange) { toast({ title: "Almost there", description: "Select how many clients you serve per month.", variant: "destructive" }); return; }
    setStep("create_account");
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accountForm.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(accountForm.email)) {
      toast({ title: "Invalid Email", description: "Please enter a valid email.", variant: "destructive" }); return;
    }
    if (emailAvailable === false) {
      toast({ title: "Email Taken", description: "This email is registered. Login instead.", variant: "destructive" }); return;
    }
    if (!accountForm.password || accountForm.password.length < 6) {
      toast({ title: "Weak Password", description: "Password must be at least 6 characters.", variant: "destructive" }); return;
    }
    if (accountForm.password !== accountForm.confirmPassword) {
      toast({ title: "Passwords Don't Match", description: "Please re-enter your password.", variant: "destructive" }); return;
    }
    setProcessing(true);
    try {
      const res  = await fetch("/api/auth/register", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          deviceId:     getDeviceId(),
          businessName: leadForm.name,
          phone:        leadForm.phone,
          email:        accountForm.email,
          password:     accountForm.password,
          country:      "Nigeria",
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
      setBusinessProfile({
        name:         leadForm.name,
        phone:        leadForm.phone,
        email:        accountForm.email,
        address:      "",
        socials:      businessProfile?.socials,
        brandColors:  businessProfile?.brandColors,
      });
      toast({ title: "Account Created! ✅", description: "See your premium options." });
      navigate("/premium");
    } catch {
      toast({ title: "Network Error", description: "Could not complete registration. Please try again.", variant: "destructive" });
    } finally {
      setProcessing(false);
    }
  };

  const handleRejectResubmit = async () => {
    if (!evidence) { toast({ title: "Upload Required", description: "Please upload your payment proof.", variant: "destructive" }); return; }
    setProcessing(true);
    try {
      const formData = new FormData();
      formData.append("deviceId", account?.deviceId || getDeviceId());
      formData.append("evidence", evidence);
      formData.append("amount",   "0");
      if (rejectNotes) formData.append("notes", rejectNotes);
      const res = await fetch("/api/payment/manual", { method: "POST", body: formData });
      if (res.ok) {
        setPendingPremiumRequest(true);
        setStep("pending");
        toast({ title: "Proof Resubmitted", description: "We'll verify your payment again shortly." });
      } else {
        const err = await res.json();
        toast({ title: "Error", description: err.message || "Failed to submit.", variant: "destructive" });
      }
    } catch {
      toast({ title: "Network Error", description: "Could not submit. Please try again.", variant: "destructive" });
    } finally {
      setProcessing(false);
    }
  };

  const inputClass = "w-full pl-11 pr-4 py-3.5 rounded-2xl bg-card border border-border outline-none focus:border-primary transition-colors text-sm";
  const labelClass = "text-xs font-bold uppercase tracking-wider text-muted-foreground";

  if (isPremium && step !== "success") {
    return (
      <div className="max-w-xl mx-auto px-4 py-12 text-center space-y-6">
        <div className="w-20 h-20 bg-primary/10 rounded-3xl flex items-center justify-center mx-auto border border-primary/20">
          <ShieldCheck size={40} className="text-primary" />
        </div>
        <h1 className="text-2xl font-bold">Premium Active</h1>
        <p className="text-muted-foreground">All professional tools are unlocked.</p>
        <button onClick={() => navigate("/home")} className="px-8 py-3 bg-primary text-primary-foreground rounded-xl font-bold">
          Continue to Toolkit
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto px-4 pb-20 pt-6">
      <AnimatePresence mode="wait">

        {/* ── STAGE 1: LEAD FORM ──────────────────────────────────────────────── */}
        {step === "lead_form" && (
          <motion.div key="lead_form" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-6">
            <div className="space-y-1">
              <div className="flex items-center gap-2 mb-3">
                <div className="flex gap-1">
                  <div className="w-8 h-1.5 rounded-full bg-primary" />
                  <div className="w-8 h-1.5 rounded-full bg-muted" />
                </div>
                <span className="text-xs text-muted-foreground font-semibold">Step 1 of 2</span>
              </div>
              <h2 className="text-2xl font-bold">Tell us about your business</h2>
              <p className="text-sm text-muted-foreground">Quick questions to get you set up right.</p>
            </div>

            <form onSubmit={handleLeadContinue} className="space-y-5">
              <div className="space-y-1.5">
                <label className={labelClass}>Your Business / Shop Name</label>
                <div className="relative">
                  <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                  <input
                    required type="text" placeholder="e.g. Joyful Stitches"
                    value={leadForm.name}
                    onChange={e => setLeadForm(f => ({ ...f, name: e.target.value }))}
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
                    value={leadForm.phone}
                    onChange={e => setLeadForm(f => ({ ...f, phone: e.target.value.replace(/[^0-9+]/g, "") }))}
                    className={inputClass}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className={labelClass}>How many clients do you serve per month?</label>
                <div className="grid grid-cols-2 gap-2">
                  {CLIENT_RANGES.map(range => (
                    <button
                      key={range} type="button"
                      onClick={() => setLeadForm(f => ({ ...f, clientRange: range }))}
                      className={`py-3 px-4 rounded-2xl border text-sm font-bold transition-all ${leadForm.clientRange === range ? "bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/20" : "bg-card border-border hover:border-primary/40"}`}
                    >
                      {range}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className={labelClass}>
                  What's your biggest challenge?{" "}
                  <span className="normal-case font-normal text-muted-foreground/70">(optional)</span>
                </label>
                <div className="grid grid-cols-1 gap-2">
                  {CHALLENGE_OPTIONS.map(opt => (
                    <button
                      key={opt.id} type="button"
                      onClick={() => setLeadForm(f => ({ ...f, challenge: f.challenge === opt.id ? "" : opt.id }))}
                      className={`flex items-center gap-3 py-3 px-4 rounded-2xl border text-sm font-semibold text-left transition-all ${leadForm.challenge === opt.id ? "bg-primary/10 border-primary text-primary" : "bg-card border-border hover:border-primary/30"}`}
                    >
                      <span className="text-lg">{opt.emoji}</span>
                      {opt.label}
                      {leadForm.challenge === opt.id && <Check size={14} className="ml-auto text-primary" />}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-2 space-y-3">
                <button type="submit" className="w-full py-4 bg-primary text-primary-foreground rounded-2xl font-bold text-base flex items-center justify-center gap-2">
                  Continue <ChevronRight size={18} />
                </button>
                <button type="button" onClick={() => navigate("/account-login")} className="w-full py-2 text-sm font-semibold text-muted-foreground flex items-center justify-center gap-2">
                  <LogIn size={14} /> Already have an account? Login
                </button>
              </div>
            </form>
          </motion.div>
        )}

        {/* ── STAGE 2: CREATE ACCOUNT ──────────────────────────────────────────── */}
        {step === "create_account" && (
          <motion.div key="create_account" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} className="space-y-6">
            <div className="space-y-1">
              <div className="flex items-center gap-2 mb-3">
                <div className="flex gap-1">
                  <div className="w-8 h-1.5 rounded-full bg-primary" />
                  <div className="w-8 h-1.5 rounded-full bg-primary" />
                </div>
                <span className="text-xs text-muted-foreground font-semibold">Step 2 of 2</span>
              </div>
              <h2 className="text-2xl font-bold">Create your account</h2>
              <p className="text-sm text-muted-foreground">Restores premium access on any device automatically.</p>
            </div>

            <form onSubmit={handleRegister} className="space-y-4">
              <div className="space-y-1.5">
                <label className={labelClass}>Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                  <input
                    required type="email" placeholder="you@example.com"
                    value={accountForm.email}
                    onChange={e => handleEmailChange(e.target.value)}
                    className={`${inputClass} ${emailAvailable === false ? "border-red-500" : emailAvailable === true ? "border-emerald-500" : ""}`}
                  />
                  {checkingEmail && <Loader2 className="absolute right-3.5 top-1/2 -translate-y-1/2 animate-spin text-muted-foreground" size={14} />}
                </div>
                {!checkingEmail && emailAvailable === false && (
                  <p className="text-xs text-red-500 ml-1">
                    Email already registered.{" "}
                    <button type="button" onClick={() => navigate("/account-login")} className="underline font-bold">Login instead</button>
                  </p>
                )}
                {!checkingEmail && emailAvailable === true && (
                  <p className="text-xs text-emerald-500 ml-1">✓ Email available</p>
                )}
              </div>

              <div className="space-y-1.5">
                <label className={labelClass}>Password</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                  <input
                    required type={showPassword ? "text" : "password"} placeholder="At least 6 characters"
                    value={accountForm.password}
                    onChange={e => setAccountForm(f => ({ ...f, password: e.target.value }))}
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
                    value={accountForm.confirmPassword}
                    onChange={e => setAccountForm(f => ({ ...f, confirmPassword: e.target.value }))}
                    className={`${inputClass} pr-11 ${accountForm.confirmPassword && accountForm.password !== accountForm.confirmPassword ? "border-red-500" : ""}`}
                  />
                  <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground">
                    {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {accountForm.confirmPassword && accountForm.password !== accountForm.confirmPassword && (
                  <p className="text-xs text-red-500 ml-1">Passwords don't match</p>
                )}
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setStep("lead_form")} className="flex-1 py-4 bg-secondary text-secondary-foreground rounded-2xl font-bold">
                  Back
                </button>
                <button type="submit" disabled={processing} className="flex-[2] py-4 bg-primary text-primary-foreground rounded-2xl font-bold flex items-center justify-center gap-2 disabled:opacity-50">
                  {processing ? <Loader2 className="animate-spin" size={18} /> : <><Crown size={18} /> See Premium</>}
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

        {/* ── VERIFICATION PENDING ────────────────────────────────────────────── */}
        {step === "pending" && (
          <motion.div key="pending" initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center py-12 space-y-6">
            <div className="w-24 h-24 bg-blue-500/10 rounded-full flex items-center justify-center mx-auto">
              <RefreshCw size={48} className="text-blue-500 animate-spin" style={{ animationDuration: "3s" }} />
            </div>
            <h2 className="text-2xl font-bold">Verification Pending</h2>
            <p className="text-muted-foreground leading-relaxed">
              Your proof has been submitted. We'll verify and activate your premium shortly.
            </p>
            {account?.email && (
              <div className="p-4 bg-blue-50 dark:bg-blue-950/30 rounded-2xl text-sm text-blue-700 dark:text-blue-400">
                You'll receive a confirmation at <b>{account.email}</b> once approved.
              </div>
            )}
            <button onClick={() => navigate("/home")} className="px-8 py-3 bg-primary text-primary-foreground rounded-xl font-bold">
              Back to Toolkit
            </button>
          </motion.div>
        )}

        {/* ── PAYMENT REJECTED — RE-UPLOAD ────────────────────────────────────── */}
        {step === "rejected_reupload" && (
          <motion.div key="rejected_reupload" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <div className="flex items-start gap-3 p-5 bg-red-500/10 border border-red-500/25 rounded-3xl">
              <AlertCircle size={20} className="text-red-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-black text-red-400 uppercase tracking-wider mb-1">Payment Not Verified</p>
                <p className="text-sm text-foreground/80 leading-relaxed">
                  Your previous payment proof could not be verified. Please upload a clearer receipt or screenshot and add any helpful context below.
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="font-bold text-base">Upload New Payment Proof</h3>

              {!evidencePreview ? (
                <div
                  onClick={() => fileRef.current?.click()}
                  className="h-44 rounded-2xl border-2 border-dashed border-border flex flex-col items-center justify-center gap-2 cursor-pointer bg-card hover:bg-muted/50 transition-all active:scale-[0.99]"
                >
                  <Upload className="text-muted-foreground" size={28} />
                  <p className="text-sm font-medium text-muted-foreground">Tap to upload receipt / screenshot</p>
                  <p className="text-xs text-muted-foreground/60">JPG, PNG or PDF</p>
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
                    <div className="h-44 flex flex-col items-center justify-center gap-2 text-sm font-bold">📄 PDF Selected ✓</div>
                  ) : (
                    <img src={evidencePreview} className="w-full h-44 object-cover" alt="Evidence preview" />
                  )}
                  <button
                    onClick={() => { setEvidence(null); setEvidencePreview(null); }}
                    className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/60 text-white flex items-center justify-center"
                  >
                    <X size={16} />
                  </button>
                </div>
              )}

              <div className="space-y-1.5">
                <label className={labelClass}>
                  Additional Notes{" "}
                  <span className="normal-case font-normal text-muted-foreground/60">(optional)</span>
                </label>
                <textarea
                  value={rejectNotes}
                  onChange={e => setRejectNotes(e.target.value)}
                  placeholder="e.g. I paid on June 10 at 2pm via USSD to GTBank account..."
                  className="w-full px-4 py-3 rounded-2xl bg-card border border-border outline-none focus:border-primary text-sm resize-none min-h-[100px]"
                />
              </div>
            </div>

            <div className="flex gap-3">
              <button onClick={() => navigate("/home")} className="flex-1 py-4 bg-secondary text-secondary-foreground rounded-2xl font-bold">
                Back to Home
              </button>
              <button
                onClick={handleRejectResubmit}
                disabled={processing || !evidence}
                className="flex-[2] py-4 bg-primary text-primary-foreground rounded-2xl font-bold flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {processing ? <Loader2 className="animate-spin" size={18} /> : "Resubmit Proof"}
              </button>
            </div>
          </motion.div>
        )}

        {/* ── SUCCESS ─────────────────────────────────────────────────────────── */}
        {step === "success" && (
          <motion.div key="success" initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center py-12 space-y-6">
            <div className="w-24 h-24 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto border-4 border-emerald-500/20">
              <ShieldCheck size={60} className="text-emerald-500" />
            </div>
            <h2 className="text-3xl font-bold">Premium Unlocked!</h2>
            <p className="text-muted-foreground">
              Welcome to OneTailor Premium{account?.businessName ? `, ${account.businessName}` : ""}!
            </p>
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
