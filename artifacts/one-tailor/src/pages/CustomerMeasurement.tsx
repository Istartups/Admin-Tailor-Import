import { useState, useEffect, useMemo } from "react";
import { 
  Users, UserPlus, Search, Ruler, History, Save, X, Edit2, Trash2, 
  ChevronRight, Contact, AlertCircle, Plus, LayoutGrid, CheckCircle2,
  Phone, Mail, MapPin, Building2, Crown, ShieldCheck, Download,
  ChevronDown, ChevronUp, MessageCircle, ExternalLink
} from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { useAppStore } from "@/store/useAppStore";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { getDeviceId, validateName, validatePhone } from "@/lib/utils";

// --- Constants ---

const MEASUREMENT_TEMPLATES = {
  "Senator / Native": [
    "Neck", "Shoulder", "Chest", "Stomach", "Hip", "Sleeve", 
    "Round Sleeve", "Cuff", "Top Length", "Waist", 
    "Seat", "Thigh", "Knee", "Bottom", "Trouser Length"
  ],
  "Suit": [
    "Neck", "Shoulder", "Chest", "Waist", "Hip", "Sleeve", 
    "Round Sleeve", "Jacket Length", "Waist", "Seat", 
    "Thigh", "Knee", "Bottom", "Trouser Length"
  ],
  "Shirt": [
    "Neck", "Shoulder", "Chest", "Waist", "Sleeve", 
    "Round Sleeve", "Cuff", "Shirt Length"
  ],
  "Agbada": ["Shoulder", "Length", "Sleeve"],
  "Kaftan": ["Neck", "Shoulder", "Chest", "Stomach", "Sleeve", "Round Sleeve", "Length"],
  "Female Dress": [
    "Bust", "Under Bust", "Waist", "Hip", "Shoulder", "Sleeve", 
    "Round Sleeve", "Full Length", "Shoulder To Bust", "Bust Span", 
    "Waist To Hip", "Waist To Knee"
  ],
  "Wrapper / Skirt": ["Waist", "Hip", "Length"]
};

type Gender = "male" | "female" | "others";

interface Customer {
  id: number;
  name: string;
  phone: string;
  gender: Gender;
  email?: string;
  address?: string;
  notes?: string;
  updatedAt: string;
}

interface Measurement {
  id: number;
  customerId: number;
  label: string;
  category: string;
  values: string; // From API it's a JSON string
  createdAt: string;
}

type View = 
  | "clients" 
  | "client_detail" 
  | "add_client" 
  | "edit_client" 
  | "add_measurement" 
  | "edit_measurement" 
  | "measurement_cards";

export default function CustomerMeasurement() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const isPremium = useAppStore(s => s.isPremium);
  const measurementLimit = useAppStore(s => s.measurementLimit);
  const proUpgradeMessage = useAppStore(s => s.proUpgradeMessage);
  const proUpgradeLink = useAppStore(s => s.proUpgradeLink);
  const proUpgradeButtonText = useAppStore(s => s.proUpgradeButtonText);

  // UI State
  const [view, setView] = useState<View>("clients");
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showOptional, setShowOptional] = useState(false);
  
  // Data State
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [measurements, setMeasurements] = useState<Measurement[]>([]);

  // Form States
  const [customerForm, setCustomerForm] = useState({
    name: "", phone: "", gender: "male" as Gender, email: "", address: "", notes: ""
  });
  const [measurementForm, setMeasurementForm] = useState({
    id: undefined as number | undefined,
    label: "Initial Measurement",
    category: "",
    unit: "Inches" as "Inches" | "CM",
    values: {} as Record<string, string>,
    customFields: [] as { name: string; value: string }[]
  });

  useEffect(() => {
    fetchCustomers();
  }, [searchQuery]);

  const fetchCustomers = async () => {
    try {
      const res = await fetch(`/api/tailoring/customers?deviceId=${getDeviceId()}&search=${encodeURIComponent(searchQuery)}`);
      if (res.ok) {
        const data = await res.json();
        setCustomers(data);
      }
    } catch (e) {
      console.error("Fetch error:", e);
    }
  };

  const fetchMeasurements = async (customerId: number) => {
    try {
      const res = await fetch(`/api/tailoring/measurements/${customerId}`);
      if (res.ok) setMeasurements(await res.json());
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteCustomer = async (id: number) => {
    if (!confirm("Are you sure you want to delete this customer? This will also delete all their measurements.")) return;
    try {
      const res = await fetch(`/api/tailoring/customers/${id}`, { method: "DELETE" });
      if (res.ok) {
        toast({ title: "Deleted", description: "Customer and measurements removed." });
        await fetchCustomers();
        setView("clients");
      }
    } catch (e) {
      toast({ title: "Error", description: "Failed to delete customer." });
    }
  };

  const handleDeleteMeasurement = async (id: number) => {
    if (!confirm("Delete this measurement record?")) return;
    try {
      const res = await fetch(`/api/tailoring/measurements/${id}`, { method: "DELETE" });
      if (res.ok) {
        toast({ title: "Deleted", description: "Measurement record removed." });
        if (selectedCustomer) fetchMeasurements(selectedCustomer.id);
      }
    } catch (e) {
      toast({ title: "Error", description: "Failed to delete measurement." });
    }
  };

  const handleSaveCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerForm.name || !customerForm.phone) {
      toast({ title: "Required Fields", description: "Name and Phone are required.", variant: "destructive" });
      return;
    }

    const nameVal = validateName(customerForm.name);
    if (!nameVal.valid) {
      toast({ title: "Invalid Name", description: nameVal.message, variant: "destructive" });
      return;
    }

    const phoneVal = validatePhone(customerForm.phone);
    if (!phoneVal.valid) {
      toast({ title: "Invalid Phone", description: phoneVal.message, variant: "destructive" });
      return;
    }

    if (!selectedCustomer && !isPremium && customers.length >= measurementLimit) {
      toast({ title: "Limit Reached", description: `Unlock Premium to add more than ${measurementLimit} customers.`, variant: "destructive" });
      setLocation("/pre-unlock");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/tailoring/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          ...customerForm, 
          deviceId: getDeviceId(),
          id: selectedCustomer?.id 
        })
      });
      if (res.ok) {
        toast({ title: "Success", description: "Customer profile saved." });
        await fetchCustomers(); // Reload list
        setView("clients");
        resetForms();
      } else {
        const error = await res.json();
        toast({ title: "Error", description: error.message || "Failed to save customer.", variant: "destructive" });
      }
    } catch (e) {
      toast({ title: "Error", description: "Connection error. Try again.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const validateMeasurementValue = (val: string) => {
    if (!val) return true;
    // Allow numbers and decimals
    return /^\d*\.?\d*$/.test(val);
  };

  const handleSaveMeasurement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer || !measurementForm.category) return;

    // Validate all measurement values
    for (const [key, val] of Object.entries(measurementForm.values)) {
      if (!validateMeasurementValue(val)) {
        toast({ title: "Invalid Measurement", description: `Please enter only numbers for ${key}.`, variant: "destructive" });
        return;
      }
    }
    for (const cf of measurementForm.customFields) {
      if (cf.value && !validateMeasurementValue(cf.value)) {
        toast({ title: "Invalid Custom Field", description: `Please enter only numbers for ${cf.name}.`, variant: "destructive" });
        return;
      }
    }

    // Combine standard values and custom fields
    const finalValues = { ...measurementForm.values };
    measurementForm.customFields.forEach(cf => {
      if (cf.name.trim()) {
        finalValues[cf.name.trim()] = cf.value;
      }
    });

    setLoading(true);
    try {
      const isUpdating = !!measurementForm.id;
      const res = await fetch("/api/tailoring/measurements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: measurementForm.id,
          customerId: selectedCustomer.id,
          label: measurementForm.label,
          category: measurementForm.category,
          unit: measurementForm.unit,
          values: finalValues // Send as object, not stringified!
        })
      });
      if (res.ok) {
        toast({ title: "Success", description: isUpdating ? "Measurement record updated." : "Measurement record saved." });
        fetchMeasurements(selectedCustomer.id);
        setView("client_detail");
      }
    } catch (e) {
      toast({ title: "Error", description: "Failed to save measurement.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const resetForms = () => {
    setCustomerForm({ name: "", phone: "", gender: "male", email: "", address: "", notes: "" });
    setMeasurementForm({ id: undefined, label: "Initial Measurement", category: "", unit: "Inches", values: {}, customFields: [] });
    setSelectedCustomer(null);
    setShowOptional(false);
  };

  const handleViewDetail = (c: Customer) => {
    setSelectedCustomer(c);
    fetchMeasurements(c.id);
    setView("client_detail");
  };

  const onBack = () => {
    if (view === "client_detail") {
      setSelectedCustomer(null);
      setView("clients");
    } else if (view === "add_measurement" || view === "edit_measurement") {
      setView("client_detail");
    } else if (view === "add_client" || view === "edit_client") {
      if (selectedCustomer) {
        setView("client_detail");
      } else {
        setView("clients");
      }
    } else if (view === "measurement_cards") {
      setView("client_detail");
    } else {
      setLocation("/all-tools?cat=tailoring");
    }
  };

  const filteredCategories = useMemo(() => {
    const cats = Object.keys(MEASUREMENT_TEMPLATES);
    const gender = selectedCustomer?.gender || customerForm.gender;
    if (gender === "others") return cats;
    if (gender === "male") return cats.filter(c => c !== "Female Dress" && c !== "Wrapper / Skirt");
    return cats.filter(c => c !== "Suit" && c !== "Native / Senator");
  }, [customerForm.gender, selectedCustomer?.gender]);

  const parseMeasurements = (valStr: string) => {
    try {
      let parsed = JSON.parse(valStr);
      // Handle double stringification
      if (typeof parsed === 'string') {
        parsed = JSON.parse(parsed);
      }
      return parsed || {};
    } catch (e) {
      console.error("Failed to parse measurements:", e);
      return {};
    }
  };

  const inp = "w-full text-sm rounded-xl px-4 py-3 bg-card border border-border focus:border-primary/50 outline-none transition-all";

  return (
    <div className="max-w-xl mx-auto pb-24 relative min-h-screen">
      <PageHeader 
        title={view === "clients" ? "Clients" : view === "client_detail" ? selectedCustomer?.name || "Client Detail" : view === "add_client" ? "Add Client" : view === "edit_client" ? "Edit Client" : "Measurements"} 
        subtitle={view === "clients" ? "Manage your client records" : ""} 
        onBack={onBack}
      />

      <div className="px-4 py-4 space-y-6">
        {/* 1. CUSTOMER LIST */}
        {view === "clients" && (
          <div className="space-y-4 animate-in fade-in duration-300">
            <div className="relative">
              <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input 
                placeholder="Search by name or phone..." 
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className={`${inp} pl-11`}
              />
            </div>

            <div className="space-y-3">
              {customers.length === 0 ? (
                <div className="text-center py-20 bg-card border border-dashed border-border rounded-3xl">
                  <Contact size={40} className="mx-auto text-muted-foreground/20 mb-4" />
                  <p className="text-muted-foreground text-sm">No customers found</p>
                </div>
              ) : (
                customers.map(c => (
                  <div key={c.id} onClick={() => handleViewDetail(c)} className="p-4 bg-card border border-border rounded-2xl flex items-center justify-between cursor-pointer hover:border-primary/30 transition-all active:scale-[0.98]">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${c.gender === 'female' ? 'bg-pink-500/10 text-pink-500' : c.gender === 'male' ? 'bg-blue-500/10 text-blue-500' : 'bg-purple-500/10 text-purple-500'}`}>
                        {c.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h4 className="font-bold text-sm">{c.name}</h4>
                        <p className="text-[10px] text-muted-foreground">{c.phone}</p>
                      </div>
                    </div>
                    <ChevronRight size={16} className="text-muted-foreground" />
                  </div>
                ))
              )}
            </div>

            {/* Floating Action Button */}
            <div className="fixed bottom-24 right-6 flex flex-col gap-3 items-end">
              <button 
                onClick={() => { resetForms(); setView("add_client"); }}
                className="group flex items-center gap-3 bg-primary text-primary-foreground pl-4 pr-4 py-3.5 rounded-2xl shadow-2xl active:scale-95 transition-all"
              >
                <span className="text-xs font-black uppercase tracking-widest overflow-hidden transition-all duration-300">Add Client</span>
                <UserPlus size={20} />
              </button>
              <button 
                onClick={() => { toast({ title: "Select Client", description: "Please tap a client from the list to add a measurement." }); }}
                className="group flex items-center gap-3 bg-card text-foreground border border-border pl-4 pr-4 py-3.5 rounded-2xl shadow-2xl active:scale-95 transition-all"
              >
                <span className="text-xs font-black uppercase tracking-widest overflow-hidden transition-all duration-300">Add Measurement</span>
                <Ruler size={20} />
              </button>
            </div>
          </div>
        )}

        {/* 2. ADD/EDIT CUSTOMER FORM */}
        {(view === "add_client" || view === "edit_client") && (
          <form onSubmit={handleSaveCustomer} className="bg-card border border-border rounded-3xl p-6 space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1 mb-1.5 block">Full Name *</label>
                <input 
                  placeholder="e.g. John Doe" 
                  value={customerForm.name}
                  onChange={e => setCustomerForm({ ...customerForm, name: e.target.value })}
                  className={inp}
                  required
                />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1 mb-1.5 block">Phone Number *</label>
                <input 
                  type="tel"
                  placeholder="e.g. 08012345678" 
                  value={customerForm.phone}
                  onChange={e => setCustomerForm({ ...customerForm, phone: e.target.value })}
                  className={inp}
                  required
                />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1 mb-1.5 block">Gender</label>
                <div className="grid grid-cols-3 gap-2">
                  {(["male", "female", "others"] as const).map(g => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => setCustomerForm({ ...customerForm, gender: g })}
                      className={`py-3 rounded-xl text-xs font-bold border transition-all capitalize ${customerForm.gender === g ? "bg-primary/10 border-primary text-primary" : "bg-card border-border text-muted-foreground"}`}
                    >
                      {g}
                    </button>
                  ))}
                </div>
              </div>

              {/* Collapsible Optional Fields */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setShowOptional(!showOptional)}
                  className="flex items-center gap-2 text-xs font-bold text-primary/80 hover:text-primary transition-colors ml-1"
                >
                  {showOptional ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  {showOptional ? "Hide Additional Info" : "Add Email, Address & Notes"}
                </button>

                {showOptional && (
                  <div className="mt-4 space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1 mb-1.5 block">Email Address</label>
                      <div className="relative">
                        <Mail size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground/50" />
                        <input 
                          type="email"
                          placeholder="client@example.com" 
                          value={customerForm.email}
                          onChange={e => setCustomerForm({ ...customerForm, email: e.target.value })}
                          className={`${inp} pl-11`}
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1 mb-1.5 block">Delivery Address</label>
                      <div className="relative">
                        <MapPin size={14} className="absolute left-4 top-3 text-muted-foreground/50" />
                        <textarea 
                          placeholder="Delivery address..."
                          value={customerForm.address}
                          onChange={e => setCustomerForm({ ...customerForm, address: e.target.value })}
                          className={`${inp} pl-11 min-h-[80px] py-3`}
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1 mb-1.5 block">Internal Notes</label>
                      <textarea 
                        placeholder="Any special requests or details..."
                        value={customerForm.notes}
                        onChange={e => setCustomerForm({ ...customerForm, notes: e.target.value })}
                        className={`${inp} min-h-[80px]`}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="w-full py-4 bg-primary text-primary-foreground rounded-2xl font-bold shadow-lg shadow-primary/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? "Saving..." : (view === "edit_client" ? "Update Customer" : "Create Customer")}
              {!loading && <CheckCircle2 size={18} />}
            </button>
          </form>
        )}

        {/* 3. CUSTOMER DETAIL */}
        {view === "client_detail" && selectedCustomer && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="p-6 bg-card border border-border rounded-3xl text-center space-y-4 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1.5 bg-primary/20" />
              <div className={`w-20 h-20 rounded-full flex items-center justify-center text-3xl font-black mx-auto shadow-inner ${selectedCustomer.gender === 'female' ? 'bg-pink-500/10 text-pink-500' : selectedCustomer.gender === 'male' ? 'bg-blue-500/10 text-blue-500' : 'bg-purple-500/10 text-purple-500'}`}>
                {selectedCustomer.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <h2 className="text-2xl font-black tracking-tight">{selectedCustomer.name}</h2>
                <div className="flex items-center justify-center gap-2 mt-1">
                  <Phone size={12} className="text-muted-foreground" />
                  <p className="text-sm font-bold text-muted-foreground">{selectedCustomer.phone}</p>
                </div>
                {selectedCustomer.notes && (
                  <div className="mt-4 p-3 bg-muted/30 rounded-xl text-[10px] text-muted-foreground italic leading-relaxed">
                    "{selectedCustomer.notes}"
                  </div>
                )}
              </div>

              {/* QUICK ACTIONS */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2">
                <button 
                  onClick={() => { 
                    setCustomerForm({
                      name: selectedCustomer.name,
                      phone: selectedCustomer.phone,
                      gender: selectedCustomer.gender,
                      email: selectedCustomer.email || "",
                      address: selectedCustomer.address || "",
                      notes: selectedCustomer.notes || ""
                    }); 
                    setShowOptional(true); 
                    setView("edit_client"); 
                  }} 
                  className="flex flex-col items-center gap-1.5 p-3 rounded-2xl bg-muted/50 hover:bg-muted text-foreground transition-all"
                >
                  <Edit2 size={16} />
                  <span className="text-[9px] font-black uppercase tracking-widest">Edit</span>
                </button>
                <button 
                  onClick={() => {
                    setMeasurementForm({ id: undefined, label: "Initial Measurement", category: "", unit: "Inches", values: {}, customFields: [] });
                    setView("add_measurement");
                  }}
                  className="flex flex-col items-center gap-1.5 p-3 rounded-2xl bg-primary/10 hover:bg-primary/20 text-primary transition-all"
                >
                  <Plus size={16} />
                  <span className="text-[9px] font-black uppercase tracking-widest">Measure</span>
                </button>
                <button 
                onClick={() => setLocation(`/measurement-card?customerId=${selectedCustomer.id}`)}
                className="flex flex-col items-center gap-1.5 p-3 rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/20 active:scale-95 transition-all"
              >
                <LayoutGrid size={16} />
                <span className="text-[9px] font-black uppercase tracking-widest">Card</span>
              </button>
              <button 
                onClick={() => setLocation("/invite")}
                className="flex flex-col items-center gap-1.5 p-3 rounded-2xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 transition-all"
              >
                <Users size={16} />
                <span className="text-[9px] font-black uppercase tracking-widest">Invite</span>
              </button>
              <button 
                onClick={() => window.open(`https://wa.me/${selectedCustomer.phone.replace(/\+/g, '')}`, '_blank')}
                className="flex flex-col items-center gap-1.5 p-3 rounded-2xl bg-green-500/10 hover:bg-green-500/20 text-green-600 transition-all"
              >
                <MessageCircle size={16} />
                <span className="text-[9px] font-black uppercase tracking-widest">WhatsApp</span>
              </button>
            </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between px-1">
                <h3 className="font-bold flex items-center gap-2 text-sm uppercase tracking-widest text-muted-foreground"><Ruler size={14} /> Measurement Records</h3>
              </div>
              
              {measurements.length === 0 ? (
                <div className="text-center py-16 bg-card border border-dashed border-border rounded-3xl">
                  <Ruler size={32} className="mx-auto text-muted-foreground/20 mb-3" />
                  <p className="text-xs text-muted-foreground">No measurements recorded yet</p>
                  <button onClick={() => setView("add_measurement")} className="mt-4 text-xs font-black text-primary uppercase tracking-widest">Create First Record</button>
                </div>
              ) : (
                measurements.map(m => (
                  <div key={m.id} className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm hover:border-primary/20 transition-all">
                    <div className="p-4 bg-muted/10 flex justify-between items-center border-b border-border">
                      <div>
                        <p className="text-xs font-black">{m.label}</p>
                        <p className="text-[9px] text-muted-foreground uppercase tracking-widest">{m.category}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => setLocation(`/measurement-card?customerId=${selectedCustomer.id}&recordId=${m.id}`)}
                          className="p-1.5 rounded-md bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                          title="Generate Card"
                        >
                          <LayoutGrid size={12} />
                        </button>
                        <button 
                          onClick={() => {
                            const vals = parseMeasurements(m.values);
                            setMeasurementForm({
                              id: m.id,
                              label: m.label,
                              category: m.category,
                              unit: (m as any).unit || "Inches",
                              values: vals,
                              customFields: []
                            });
                            setView("edit_measurement");
                          }}
                          className="p-1.5 rounded-md hover:bg-muted text-foreground"
                          title="Edit"
                        >
                          <Edit2 size={12} />
                        </button>
                        <button onClick={() => handleDeleteMeasurement(m.id)} className="p-1.5 rounded-md hover:bg-red-500/10 text-red-500"><Trash2 size={12} /></button>
                      </div>
                    </div>
                    <div className="p-4 grid grid-cols-2 gap-x-6 gap-y-2">
                      {Object.entries(parseMeasurements(m.values)).map(([k, v]) => (
                        <div key={k} className="flex justify-between border-b border-border/30 pb-1.5">
                          <span className="text-[10px] text-muted-foreground font-medium">{k}</span>
                          <span className="text-[10px] font-bold">{v as string}{(m as any).unit === 'CM' ? 'cm' : '"'}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
            
            <button 
              onClick={() => handleDeleteCustomer(selectedCustomer.id)}
              className="w-full py-4 text-xs font-bold text-red-500/50 hover:text-red-500 transition-colors"
            >
              Delete Client Profile
            </button>
          </div>
        )}

        {/* 4. MEASUREMENT FORM */}
        {(view === "add_measurement" || view === "edit_measurement") && selectedCustomer && (
          <form onSubmit={handleSaveMeasurement} className="bg-card border border-border rounded-3xl p-6 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="space-y-5">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1 mb-1.5 block">Record Name *</label>
                <input placeholder="e.g. Wedding Suit" value={measurementForm.label} onChange={e => setMeasurementForm({...measurementForm, label: e.target.value})} className={inp} required />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1 mb-1.5 block">Measurement Unit</label>
                <div className="grid grid-cols-2 gap-2">
                  {(["Inches", "CM"] as const).map(u => (
                    <button
                      key={u}
                      type="button"
                      onClick={() => setMeasurementForm({ ...measurementForm, unit: u })}
                      className={`py-2.5 rounded-xl text-xs font-bold border transition-all ${measurementForm.unit === u ? "bg-primary/10 border-primary text-primary" : "bg-card border-border text-muted-foreground"}`}
                    >
                      {u}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1 mb-1.5 block">Category *</label>
                <div className="grid grid-cols-2 gap-2 mt-1">
                  {filteredCategories.map(cat => (
                    <button 
                      key={cat}
                      type="button"
                      onClick={() => setMeasurementForm({...measurementForm, category: cat, values: {}})}
                      className={`p-3 text-left rounded-xl border text-xs font-bold transition-all ${measurementForm.category === cat ? 'bg-primary/10 border-primary text-primary' : 'bg-muted/20 border-border text-muted-foreground'}`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {measurementForm.category && (
                <div className="space-y-6 pt-4 border-t border-border">
                  <div className="grid grid-cols-2 gap-4">
                    {MEASUREMENT_TEMPLATES[measurementForm.category as keyof typeof MEASUREMENT_TEMPLATES].map(field => (
                      <div key={field}>
                        <label className="text-[10px] font-bold text-muted-foreground mb-1.5 block">{field}</label>
                        <input 
                          type="text" 
                          placeholder="0.0"
                          value={measurementForm.values[field] || ""}
                          onChange={e => setMeasurementForm({
                            ...measurementForm, 
                            values: {...measurementForm.values, [field]: e.target.value}
                          })}
                          className={`${inp} py-2.5`} 
                        />
                      </div>
                    ))}
                  </div>

                  {/* Custom Fields */}
                  <div className="space-y-4 pt-4 border-t border-border/50">
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] font-black uppercase tracking-widest text-primary">Custom Fields</p>
                      <button 
                        type="button" 
                        onClick={() => setMeasurementForm({
                          ...measurementForm,
                          customFields: [...measurementForm.customFields, { name: "", value: "" }]
                        })}
                        className="text-[10px] font-bold text-primary flex items-center gap-1"
                      >
                        <Plus size={12} /> Add Field
                      </button>
                    </div>

                    <div className="space-y-3">
                      {measurementForm.customFields.map((cf, idx) => (
                        <div key={idx} className="flex gap-2 items-end">
                          <div className="flex-1">
                            <input 
                              placeholder="Field Name" 
                              value={cf.name}
                              onChange={e => {
                                const newFields = [...measurementForm.customFields];
                                newFields[idx].name = e.target.value;
                                setMeasurementForm({ ...measurementForm, customFields: newFields });
                              }}
                              className={`${inp} py-2 text-xs`}
                            />
                          </div>
                          <div className="flex-1">
                            <input 
                              placeholder="Value" 
                              value={cf.value}
                              onChange={e => {
                                const newFields = [...measurementForm.customFields];
                                newFields[idx].value = e.target.value;
                                setMeasurementForm({ ...measurementForm, customFields: newFields });
                              }}
                              className={`${inp} py-2 text-xs`}
                            />
                          </div>
                          <button 
                            type="button" 
                            onClick={() => {
                              const newFields = measurementForm.customFields.filter((_, i) => i !== idx);
                              setMeasurementForm({ ...measurementForm, customFields: newFields });
                            }}
                            className="p-2.5 text-red-500"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <button 
              type="submit" 
              disabled={loading || !measurementForm.category} 
              className="w-full py-4 bg-primary text-primary-foreground rounded-2xl font-bold shadow-lg shadow-primary/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? "Saving..." : (measurementForm.id ? "Update Measurement Record" : "Save Measurement Record")}
              {!loading && <CheckCircle2 size={18} />}
            </button>
          </form>
        )}

        {/* Teaser Section */}
        {isPremium ? (
          /* Pro Teaser for Premium Users */
          <div className="mt-12 p-6 rounded-3xl bg-primary/5 border border-primary/10 space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="flex items-center gap-3 text-primary">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Crown size={20} />
              </div>
              <h3 className="text-sm font-black uppercase tracking-wider">Unlock OneTailor Pro</h3>
            </div>
            
            <p className="text-xs text-foreground font-medium leading-relaxed opacity-80">
              {proUpgradeMessage}
            </p>
            
            <a 
              href={proUpgradeLink || "#"}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full py-4 bg-primary text-primary-foreground rounded-2xl font-bold text-xs shadow-lg shadow-primary/20 hover:scale-[1.01] active:scale-95 transition-all"
            >
              <ExternalLink size={14} />
              {proUpgradeButtonText}
            </a>
          </div>
        ) : (
          /* Premium Teaser for Free Users */
          <div className="mt-12 p-6 rounded-3xl bg-amber-500/5 border border-amber-500/10 space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="flex items-center gap-3 text-amber-600">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
                <ShieldCheck size={20} />
              </div>
              <h3 className="text-sm font-black uppercase tracking-wider">Unlock Premium</h3>
            </div>
            
            <p className="text-xs text-foreground font-medium leading-relaxed opacity-80">
              Unlock professional features like cloud backup, unlimited tool actions, and advanced tailoring tools.
            </p>
            
            <button 
              onClick={() => setLocation("/pre-unlock")}
              className="flex items-center justify-center gap-2 w-full py-4 bg-amber-500 text-amber-950 rounded-2xl font-bold text-xs shadow-lg shadow-amber-500/20 hover:scale-[1.01] active:scale-95 transition-all"
            >
              <Crown size={14} />
              Unlock Premium Now
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function Button({ children, className, ...props }: any) {
  return (
    <button className={`inline-flex items-center justify-center bg-primary text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-50 ${className}`} {...props}>
      {children}
    </button>
  );
}
