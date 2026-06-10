import React, { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription 
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { 
  Loader2, 
  Save, 
  Sun, 
  Moon, 
  Monitor, 
  Banknote, 
  Globe, 
  Lock, 
  Building2,
  Zap,
  Link as LinkIcon,
  Trash2,
  AlertTriangle,
  Palette,
  ShieldAlert,
  RefreshCw
} from "lucide-react";

interface PaymentInfo {
  price: string;
  bankName: string;
  accountNumber: string;
  accountName: string;
  instructions: string;
  paymentLink?: string;
  globalUsageLimit: number;
  measurementLimit: number;
  proUpgradeMessage: string;
  proUpgradeLink: string;
  proUpgradeButtonText: string;
  isUsageLimitEnabled: boolean;
  isDebugMode: boolean;
}

export default function Settings() {
  const [theme, setTheme] = useState<"light" | "dark" | "system">(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem("admin_theme") as "light" | "dark" | "system") || "system";
    }
    return "system";
  });

  const [currencySymbol, setCurrencySymbol] = useState("₦");

  const updateTheme = (newTheme: "light" | "dark" | "system") => {
    setTheme(newTheme);
    localStorage.setItem("admin_theme", newTheme);
    
    if (newTheme === "system") {
      const systemTheme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
      document.documentElement.classList.toggle("dark", systemTheme === "dark");
    } else {
      document.documentElement.classList.toggle("dark", newTheme === "dark");
    }
  };

  const [settings, setSettings] = useState<PaymentInfo>({
    price: "",
    bankName: "",
    accountNumber: "",
    accountName: "",
    instructions: "",
    paymentLink: "",
    globalUsageLimit: 25,
    measurementLimit: 25,
    proUpgradeMessage: "",
    proUpgradeLink: "",
    proUpgradeButtonText: "",
    isUsageLimitEnabled: true,
    isDebugMode: false,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/payment-info");
      if (res.ok) {
        const data = await res.json();
        if (data.currencySymbol) setCurrencySymbol(data.currencySymbol);
        setSettings({
          price: (data.price !== null && data.price !== undefined) ? String(data.price) : "",
          bankName: data.bankName || "",
          accountNumber: data.accountNumber || "",
          accountName: data.accountName || "",
          instructions: data.instructions || "",
          paymentLink: data.paymentLink || "",
          globalUsageLimit: data.globalUsageLimit || 25,
          measurementLimit: data.measurementLimit || 25,
          proUpgradeMessage: data.proUpgradeMessage || "",
          proUpgradeLink: data.proUpgradeLink || "",
          isUsageLimitEnabled: data.isUsageLimitEnabled ?? true,
          isDebugMode: data.isDebugMode ?? false,
          proUpgradeButtonText: data.proUpgradeButtonText || "",
        });
      }
    } catch (error) {
      console.error("Failed to fetch payment settings:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSaveSystem = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const token = localStorage.getItem("admin_token");
      const res = await fetch("/api/payment-info", {
        method: "PUT",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(settings),
      });
      if (res.ok) {
        toast({ title: "System Settings Saved", description: "Pricing and banking details updated." });
      }
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "Failed to save settings." });
    } finally {
      setSaving(false);
    }
  };

  const handleResetUsage = async () => {
    if (!confirm("This will reset tool usage counters for ALL users. Users who reached their limit will be able to use tools again. Proceed?")) return;
    
    setSaving(true);
    try {
      const token = localStorage.getItem("admin_token");
      const res = await fetch("/api/admin/reset-usage", {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        toast({ title: "Usage Counters Reset", description: "All users have been given fresh usage credits." });
      }
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "Failed to reset usage." });
    } finally {
      setSaving(false);
    }
  };

  const handleResetData = async () => {
    if (!confirm("CRITICAL ACTION: This will permanently wipe all users, licenses, and payment history. Are you absolutely sure?")) return;
    
    setSaving(true);
    try {
      const token = localStorage.getItem("admin_token");
      const res = await fetch("/api/admin/reset-database", {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        toast({ title: "Database Wiped", description: "All system data has been cleared." });
      } else {
        throw new Error("Reset failed");
      }
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "Failed to reset database." });
    } finally {
      setSaving(false);
    }
  };

  const formatCurrency = (val: string) => {
    return val.replace("₦", currencySymbol);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground" style={{ fontFamily: "var(--font-serif)" }}>
            System <span className="gold-shimmer">Settings</span>
          </h1>
          <p className="text-muted-foreground mt-1 text-sm font-medium">Manage appearance, pricing, and security.</p>
        </div>
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => updateTheme(theme === "dark" ? "light" : "dark")}
          className="rounded-xl border border-primary/20 bg-primary/5 hover:bg-primary/10 h-11 w-11"
        >
          {theme === "dark" ? <Sun className="w-5 h-5 text-primary" /> : <Moon className="w-5 h-5 text-primary" />}
        </Button>
      </div>

      <Tabs defaultValue="appearance" className="w-full">
        <TabsList className="bg-primary/5 border border-primary/10 rounded-2xl p-1 mb-8">
          <TabsTrigger value="appearance" className="rounded-xl px-6 py-2.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground flex items-center gap-2 font-bold transition-all">
            <Palette className="w-4 h-4" /> Appearance
          </TabsTrigger>
          <TabsTrigger value="system" className="rounded-xl px-6 py-2.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground flex items-center gap-2 font-bold transition-all">
            <Globe className="w-4 h-4" /> System Config
          </TabsTrigger>
          <TabsTrigger value="security" className="rounded-xl px-6 py-2.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground flex items-center gap-2 font-bold transition-all">
            <Lock className="w-4 h-4" /> Security & Controls
          </TabsTrigger>
        </TabsList>

        <TabsContent value="appearance" className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
          <section className="space-y-4">
            <h2 className="text-xl font-bold flex items-center gap-2 text-foreground">
              <Sun className="w-5 h-5 text-primary" /> Appearance Mode
            </h2>
            <Card className="rounded-3xl border-border bg-card overflow-hidden">
              <CardContent className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Button 
                    variant={theme === "light" ? "default" : "outline"} 
                    className={cn("h-20 rounded-2xl flex-col gap-2 font-bold", theme === "light" ? "bg-primary text-primary-foreground" : "border-border hover:bg-primary/5")}
                    onClick={() => updateTheme("light")}
                  >
                    <Sun className="w-5 h-5" /> Light Theme
                  </Button>
                  <Button 
                    variant={theme === "dark" ? "default" : "outline"} 
                    className={cn("h-20 rounded-2xl flex-col gap-2 font-bold", theme === "dark" ? "bg-primary text-primary-foreground" : "border-border hover:bg-primary/5")}
                    onClick={() => updateTheme("dark")}
                  >
                    <Moon className="w-5 h-5" /> Dark Theme
                  </Button>
                  <Button 
                    variant={theme === "system" ? "default" : "outline"} 
                    className={cn("h-20 rounded-2xl flex-col gap-2 font-bold", theme === "system" ? "bg-primary text-primary-foreground" : "border-border hover:bg-primary/5")}
                    onClick={() => updateTheme("system")}
                  >
                    <Monitor className="w-5 h-5" /> System Theme
                  </Button>
                </div>
              </CardContent>
            </Card>
          </section>
        </TabsContent>

        <TabsContent value="system" className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
          <section className="space-y-4">
            <h2 className="text-xl font-bold flex items-center gap-2 text-foreground">
              <Globe className="w-5 h-5 text-primary" /> System Configuration
            </h2>
            <form onSubmit={handleSaveSystem} className="space-y-6">
              <Card className="rounded-3xl border-border bg-card overflow-hidden">
                <CardContent className="p-6 space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between px-1">
                        <label className="text-[10px] font-black uppercase tracking-wider text-primary/60">Global Usage Limit</label>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold text-muted-foreground">{settings.isUsageLimitEnabled ? "Enabled" : "Disabled"}</span>
                          <input 
                            type="checkbox" 
                            checked={settings.isUsageLimitEnabled}
                            onChange={(e) => setSettings({...settings, isUsageLimitEnabled: e.target.checked})}
                            className="w-4 h-4 accent-primary"
                          />
                        </div>
                      </div>
                      <div className="relative">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-primary/40" />
                        <Input 
                          type="number"
                          value={settings.globalUsageLimit || 0}
                          onChange={(e) => setSettings({...settings, globalUsageLimit: parseInt(e.target.value) || 0})}
                          className="h-12 pl-11 rounded-xl bg-muted/30 border-border font-bold text-foreground"
                          disabled={!settings.isUsageLimitEnabled}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between px-1">
                        <label className="text-[10px] font-black uppercase tracking-wider text-primary/60">Debug Mode</label>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold text-muted-foreground">{settings.isDebugMode ? "ON" : "OFF"}</span>
                          <input 
                            type="checkbox" 
                            checked={settings.isDebugMode}
                            onChange={(e) => setSettings({...settings, isDebugMode: e.target.checked})}
                            className="w-4 h-4 accent-red-500"
                          />
                        </div>
                      </div>
                      <div className="relative">
                        <ShieldAlert className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-red-500/40" />
                        <div className="h-12 pl-11 flex items-center rounded-xl bg-muted/10 border border-border text-[10px] font-medium text-muted-foreground">
                          Shows detailed server errors in the PWA for debugging.
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-wider text-primary/60 px-1">License Price</label>
                      <div className="relative">
                        <Banknote className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-primary/40" />
                        <Input 
                          value={settings.price || ""}
                          onChange={(e) => setSettings({...settings, price: e.target.value})}
                          placeholder={`${currencySymbol}15,000`}
                          className="h-12 pl-11 rounded-xl bg-muted/30 border-border font-bold text-foreground"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-wider text-primary/60 px-1">Measurement Limit (Free Users)</label>
                      <Input 
                        type="number"
                        value={settings.measurementLimit || 0}
                        onChange={(e) => setSettings({...settings, measurementLimit: parseInt(e.target.value) || 0})}
                        className="h-12 rounded-xl bg-muted/30 border-border font-bold text-foreground"
                      />
                    </div>
                  </div>

                  <div className="border-t border-border/50 pt-6 space-y-4">
                    <h3 className="text-sm font-bold text-primary flex items-center gap-2">
                      <Building2 className="w-4 h-4" /> Payment Details
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-wider text-primary/60 px-1">Bank Name</label>
                        <Input 
                          value={settings.bankName || ""}
                          onChange={(e) => setSettings({...settings, bankName: e.target.value})}
                          className="h-12 rounded-xl bg-muted/30 border-border font-bold text-foreground"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-wider text-primary/60 px-1">Account Number</label>
                        <Input 
                          value={settings.accountNumber || ""}
                          onChange={(e) => setSettings({...settings, accountNumber: e.target.value})}
                          className="h-12 rounded-xl bg-muted/30 border-border font-mono font-bold text-foreground"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-wider text-primary/60 px-1">Account Name</label>
                        <Input 
                          value={settings.accountName || ""}
                          onChange={(e) => setSettings({...settings, accountName: e.target.value})}
                          className="h-12 rounded-xl bg-muted/30 border-border font-bold text-foreground"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-wider text-primary/60 px-1">Payment Link (Direct Pay)</label>
                        <div className="relative">
                          <LinkIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-primary/40" />
                          <Input 
                            value={settings.paymentLink || ""}
                            onChange={(e) => setSettings({...settings, paymentLink: e.target.value})}
                            placeholder="https://paystack.com/pay/..."
                            className="h-12 pl-11 rounded-xl bg-muted/30 border-border font-bold text-foreground"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-border/50 pt-6 space-y-4">
                    <h3 className="text-sm font-bold text-primary flex items-center gap-2">
                      <Zap className="w-4 h-4" /> Unlock Premium Configuration
                    </h3>
                    <div className="grid grid-cols-1 gap-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-wider text-primary/60 px-1">Unlock Premium Message</label>
                        <Textarea 
                          value={settings.proUpgradeMessage || ""}
                          onChange={(e) => setSettings({...settings, proUpgradeMessage: e.target.value})}
                          className="min-h-[100px] rounded-xl bg-muted/30 border-border font-medium leading-relaxed text-foreground"
                          placeholder="Enter the message users see when clicking 'Unlock Premium'..."
                        />
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase tracking-wider text-primary/60 px-1">Button Link</label>
                          <div className="relative">
                            <LinkIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-primary/40" />
                            <Input 
                              value={settings.proUpgradeLink || ""}
                              onChange={(e) => setSettings({...settings, proUpgradeLink: e.target.value})}
                              placeholder="https://wa.me/..."
                              className="h-12 pl-11 rounded-xl bg-muted/30 border-border font-bold text-foreground"
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase tracking-wider text-primary/60 px-1">Button Text</label>
                          <Input 
                            value={settings.proUpgradeButtonText || ""}
                            onChange={(e) => setSettings({...settings, proUpgradeButtonText: e.target.value})}
                            className="h-12 rounded-xl bg-muted/30 border-border font-bold text-foreground"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="flex justify-end pt-2">
                <Button 
                  type="submit" 
                  disabled={saving}
                  className="rounded-2xl px-8 h-12 bg-primary text-primary-foreground font-bold shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all"
                >
                  {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                  Save All System Settings
                </Button>
              </div>
            </form>
          </section>
        </TabsContent>

        <TabsContent value="security" className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
          <section className="space-y-4">
            <h2 className="text-xl font-bold flex items-center gap-2 text-foreground">
              <ShieldAlert className="w-5 h-5 text-red-500" /> Security & Advanced Controls
            </h2>
            
            <Card className="rounded-3xl border-amber-500/20 bg-amber-500/5 overflow-hidden">
              <CardContent className="p-8 space-y-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div className="space-y-2 text-center md:text-left">
                    <h3 className="text-lg font-bold text-amber-600 flex items-center gap-2 justify-center md:justify-start">
                      <RefreshCw className="w-5 h-5" /> Reset Usage Counters
                    </h3>
                    <p className="text-sm text-muted-foreground font-medium max-w-md">
                      Give all users another {settings.globalUsageLimit} free actions. This will set everyone's usage back to 0.
                    </p>
                  </div>
                  <Button 
                    variant="outline" 
                    onClick={handleResetUsage}
                    disabled={saving}
                    className="rounded-2xl px-8 h-12 font-bold border-amber-500/20 hover:bg-amber-500/10 text-amber-600 shadow-lg shadow-amber-500/10"
                  >
                    {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
                    Reset All User Usage
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-3xl border-red-500/20 bg-red-500/5 overflow-hidden">
              <CardContent className="p-8 space-y-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div className="space-y-2 text-center md:text-left">
                    <h3 className="text-lg font-bold text-red-500 flex items-center gap-2 justify-center md:justify-start">
                      <Trash2 className="w-5 h-5" /> Danger Zone: Reset All Data
                    </h3>
                    <p className="text-sm text-muted-foreground font-medium max-w-md">
                      This action will permanently delete all users, licenses, and transaction logs. This action cannot be undone.
                    </p>
                  </div>
                  <Button 
                    variant="destructive" 
                    onClick={handleResetData}
                    disabled={saving}
                    className="rounded-2xl px-8 h-12 font-bold shadow-lg shadow-red-500/20"
                  >
                    {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <AlertTriangle className="w-4 h-4 mr-2" />}
                    Wipe Database Clean
                  </Button>
                </div>
              </CardContent>
            </Card>
          </section>
        </TabsContent>
      </Tabs>
    </div>
  );
}
