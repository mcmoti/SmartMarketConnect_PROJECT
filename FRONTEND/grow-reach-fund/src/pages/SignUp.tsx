import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ShoppingCart, TrendingUp, ArrowLeft, Loader2, Sprout } from "lucide-react";
import smcLogo from "@/assets/smc-logo.png";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import MultiSelectChips from "@/components/ui/MultiSelectChips";
import LocationPicker from "@/components/maps/LocationPicker";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Role = "farmer" | "buyer" | "creditor";

const roles = [
  { id: "farmer" as Role, label: "Farmer", icon: Sprout, desc: "Sell your produce" },
  { id: "buyer" as Role, label: "Buyer", icon: ShoppingCart, desc: "Buy fresh produce" },
  { id: "creditor" as Role, label: "Creditor", icon: TrendingUp, desc: "Provide credit" },
];

const CROPS = ["Maize", "Beans", "Kales", "Potatoes", "Tomatoes", "Onions", "Wheat", "Cabbage", "Carrots", "Spinach"];
const BUYER_TYPES = ["Individual", "Retailer", "Wholesaler"];
const VOLUMES = [
  { value: "small", label: "Small (0–50 kg)" },
  { value: "medium", label: "Medium (50–500 kg)" },
  { value: "large", label: "Large (500+ kg)" },
];
const INSTITUTION_TYPES = ["Bank", "SACCO", "Microfinance", "Individual Lender"];
const RISK_LEVELS = ["Low", "Medium", "High"];

const SignUp = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { register } = useAuth();
  const [selectedRole, setSelectedRole] = useState<Role | null>(
    (searchParams.get("role") as Role) || null
  );
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    fullName: "", email: "", phone: "", password: "", confirmPassword: "",
    location: "", username: "",
  });

  const [farmSize, setFarmSize] = useState("");
  const [mainCrops, setMainCrops] = useState<string[]>([]);
  const [gpsLat, setGpsLat] = useState<number | null>(null);
  const [gpsLng, setGpsLng] = useState<number | null>(null);
  const [buyerType, setBuyerType] = useState("");
  const [preferredProducts, setPreferredProducts] = useState<string[]>([]);
  const [purchaseVolume, setPurchaseVolume] = useState("");
  const [institutionType, setInstitutionType] = useState("");
  const [contactPerson, setContactPerson] = useState("");
  const [minLoan, setMinLoan] = useState("");
  const [maxLoan, setMaxLoan] = useState("");
  const [interestMin, setInterestMin] = useState("");
  const [interestMax, setInterestMax] = useState("");
  const [loanDuration, setLoanDuration] = useState("");
  const [riskPreference, setRiskPreference] = useState("");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // Creditors have 3 steps (basic info → location/institution → loan preferences)
  const totalSteps = selectedRole === "creditor" ? 3 : 2;

  const canProceedStep1 = () => {
    if (!selectedRole) return false;
    if (selectedRole === "creditor") {
      return formData.fullName && formData.username;
    }
    return formData.fullName && formData.email && formData.phone;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRole) return;

    // Safety guard: if somehow the form submits before the final step, advance instead
    if (step < totalSteps) {
      setStep(step + 1);
      return;
    }

    if (selectedRole === "creditor") {
      if (!minLoan || !maxLoan || !interestMin || !interestMax || !loanDuration || !riskPreference) {
        toast.error("Please fill in all lending preferences");
        return;
      }
    }

    if (selectedRole === "buyer") {
      if (!buyerType || preferredProducts.length === 0 || !purchaseVolume || !formData.location) {
        toast.error("Please fill in all buyer details");
        return;
      }
    }

    if (formData.password !== formData.confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    if (formData.password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    setLoading(true);

    try {
      const email = selectedRole === "creditor"
        ? `${formData.username.replace(/[^a-zA-Z0-9]/g, "")}@smc-creditor.local`
        : formData.email;

      // Map frontend state to flat profile_data keys that the backend expects
      const profile_data =
        selectedRole === "farmer"
          ? {
              farm_size: farmSize ? parseFloat(farmSize) : null,
              crops: mainCrops,
            }
          : selectedRole === "buyer"
            ? {
                business_name: formData.fullName,
                buyer_type: buyerType,
                preferred_products: preferredProducts,
                purchase_volume: purchaseVolume,
              }
            : {
                // These flat keys match CreditorProfile.objects.create() in the backend
                institution_name: formData.fullName,
                description: institutionType
                  ? `${institutionType}${contactPerson ? " — " + contactPerson : ""}`
                  : contactPerson,
                interest_rate_prime: interestMin ? parseFloat(interestMin) : 8.0,
                interest_rate_low: interestMin ? parseFloat(interestMin) + 2 : 10.0,
                interest_rate_medium: interestMax
                  ? Math.max(parseFloat(interestMax) - 2, parseFloat(interestMin || "0") + 2)
                  : 16.0,
                interest_rate_high: interestMax ? parseFloat(interestMax) : 22.0,
                min_loan_amount: minLoan ? parseFloat(minLoan) : 5000,
                max_loan_amount: maxLoan ? parseFloat(maxLoan) : 1000000,
              };

      await register({
        email,
        password: formData.password,
        full_name: formData.fullName || formData.username,
        phone: formData.phone,
        role: selectedRole,
        location: formData.location,
        username: formData.username || formData.email,
        latitude: gpsLat ?? undefined,
        longitude: gpsLng ?? undefined,
        profile_data,
      });

      toast.success(`Account created as ${selectedRole}!`);

      if (selectedRole === "farmer") navigate("/farmer/onboarding");
      else if (selectedRole === "buyer") navigate("/buyer/marketplace");
      else navigate("/creditor/dashboard");
    } catch (error: any) {
      const errMsg =
        error.response?.data?.non_field_errors?.[0] ||
        error.response?.data?.detail ||
        (error.response?.data && Object.values(error.response.data)[0]?.[0]) ||
        (error instanceof Error ? error.message : "Registration failed");
      toast.error(errMsg);
    } finally {
      setLoading(false);
    }
  };

  // ── Step 1: Role + basic credentials ──────────────────────────────────────
  const renderStep1 = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3 mb-6">
        {roles.map((role) => (
          <button
            key={role.id}
            type="button"
            onClick={() => { setSelectedRole(role.id); setStep(1); }}
            className={`p-4 rounded-xl border-2 text-center transition-all min-h-[80px] ${
              selectedRole === role.id
                ? "border-primary bg-primary/5 shadow-soft"
                : "border-border hover:border-primary/30"
            }`}
          >
            <role.icon className={`h-6 w-6 mx-auto mb-2 ${selectedRole === role.id ? "text-primary" : "text-muted-foreground"}`} />
            <p className="text-sm font-semibold text-foreground">{role.label}</p>
            <p className="text-xs text-muted-foreground mt-0.5 hidden sm:block">{role.desc}</p>
          </button>
        ))}
      </div>

      {selectedRole && (
        <>
          <div>
            <Label htmlFor="fullName">{selectedRole === "creditor" ? "Institution Name" : "Full Name"}</Label>
            <Input id="fullName" name="fullName" required value={formData.fullName} onChange={handleChange}
              placeholder={selectedRole === "creditor" ? "Acme Finance Ltd" : "John Doe"} className="mt-1.5 h-12" />
          </div>

          {(selectedRole === "farmer" || selectedRole === "buyer") && (
            <>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input id="email" name="email" type="email" required value={formData.email} onChange={handleChange} placeholder="you@example.com" className="mt-1.5 h-12" />
              </div>
              <div>
                <Label htmlFor="phone">Phone Number</Label>
                <Input id="phone" name="phone" type="tel" required value={formData.phone} onChange={handleChange} placeholder="+254 700 000 000" className="mt-1.5 h-12" />
              </div>
            </>
          )}

          {selectedRole === "creditor" && (
            <>
              <div>
                <Label htmlFor="username">Business Number / Username</Label>
                <Input id="username" name="username" required value={formData.username} onChange={handleChange} placeholder="e.g. CRD-12345" className="mt-1.5 h-12" />
              </div>
              <div>
                <Label htmlFor="contactPerson">Contact Person Name</Label>
                <Input id="contactPerson" value={contactPerson} onChange={(e) => setContactPerson(e.target.value)} placeholder="Jane Doe" className="mt-1.5 h-12" />
              </div>
              <div>
                <Label htmlFor="phone">Phone Number</Label>
                <Input id="phone" name="phone" type="tel" value={formData.phone} onChange={handleChange} placeholder="+254 700 000 000" className="mt-1.5 h-12" />
              </div>
            </>
          )}

          <div>
            <Label htmlFor="password">Password</Label>
            <Input id="password" name="password" type="password" required value={formData.password} onChange={handleChange} placeholder="••••••••" className="mt-1.5 h-12" />
          </div>
          <div>
            <Label htmlFor="confirmPassword">Confirm Password</Label>
            <Input id="confirmPassword" name="confirmPassword" type="password" required value={formData.confirmPassword} onChange={handleChange} placeholder="••••••••" className="mt-1.5 h-12" />
          </div>
        </>
      )}
    </div>
  );

  // ── Step 2: Location + role-specific details ───────────────────────────────
  const renderStep2 = () => {
    if (selectedRole === "farmer") {
      return (
        <div className="space-y-5">
          <div>
            <Label htmlFor="farmSize">Farm Size (acres)</Label>
            <Input id="farmSize" type="number" min={0} step={0.1} value={farmSize} onChange={(e) => setFarmSize(e.target.value)} placeholder="e.g. 5" className="mt-1.5 h-12" />
          </div>
          <MultiSelectChips label="What crops do you grow?" options={CROPS} selected={mainCrops} onChange={setMainCrops} />
          <LocationPicker lat={gpsLat} lng={gpsLng} onLocationChange={(lat, lng) => { setGpsLat(lat); setGpsLng(lng); }} label="Tag your farm location" />
          <div>
            <Label htmlFor="locationText">Location (town/county)</Label>
            <Input id="locationText" name="location" value={formData.location} onChange={handleChange} placeholder="e.g. Nakuru, Kenya" className="mt-1.5 h-12" />
          </div>
        </div>
      );
    }

    if (selectedRole === "buyer") {
      return (
        <div className="space-y-5">
          <div>
            <Label>Buyer Type</Label>
            <div className="grid grid-cols-3 gap-3 mt-1.5">
              {BUYER_TYPES.map((type) => (
                <button
                  key={type} type="button" onClick={() => setBuyerType(type)}
                  className={`p-3 rounded-xl border-2 text-center text-sm font-medium min-h-[48px] transition-all ${
                    buyerType === type ? "border-primary bg-primary/5 text-primary" : "border-border text-muted-foreground hover:border-primary/30"
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>
          <MultiSelectChips label="Products you want to buy" options={CROPS} selected={preferredProducts} onChange={setPreferredProducts} />
          <div>
            <Label>Estimated Purchase Volume</Label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-1.5">
              {VOLUMES.map((v) => (
                <button
                  key={v.value} type="button" onClick={() => setPurchaseVolume(v.value)}
                  className={`p-3 rounded-xl border-2 text-center text-sm font-medium min-h-[48px] transition-all ${
                    purchaseVolume === v.value ? "border-primary bg-primary/5 text-primary" : "border-border text-muted-foreground hover:border-primary/30"
                  }`}
                >
                  {v.label}
                </button>
              ))}
            </div>
          </div>
          <LocationPicker lat={gpsLat} lng={gpsLng} onLocationChange={(lat, lng) => { setGpsLat(lat); setGpsLng(lng); }} label="Your location" />
          <div>
            <Label htmlFor="locationText">Location (town/county)</Label>
            <Input id="locationText" name="location" required value={formData.location} onChange={handleChange} placeholder="e.g. Nairobi, Kenya" className="mt-1.5 h-12" />
          </div>
        </div>
      );
    }

    // Creditor step 2: Institution type + office location
    if (selectedRole === "creditor") {
      return (
        <div className="space-y-5">
          <div>
            <Label>Institution Type</Label>
            <Select value={institutionType} onValueChange={setInstitutionType}>
              <SelectTrigger className="mt-1.5 h-12"><SelectValue placeholder="Select type" /></SelectTrigger>
              <SelectContent>
                {INSTITUTION_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <LocationPicker lat={gpsLat} lng={gpsLng} onLocationChange={(lat, lng) => { setGpsLat(lat); setGpsLng(lng); }} label="Office location" />
          <div>
            <Label htmlFor="locationText">Location (town/county)</Label>
            <Input id="locationText" name="location" value={formData.location} onChange={handleChange} placeholder="e.g. Nairobi, Kenya" className="mt-1.5 h-12" />
          </div>
        </div>
      );
    }

    return null;
  };

  // ── Step 3: Creditor lending preferences (loan range + rates) ─────────────
  const renderStep3 = () => {
    if (selectedRole !== "creditor") return null;
    return (
      <div className="space-y-5">
        <div>
          <h3 className="font-display font-semibold text-foreground text-lg">Lending Preferences</h3>
          <p className="text-sm text-muted-foreground mt-0.5">
            Set the loan range and interest rates visible to farmers when they apply.
          </p>
        </div>

        {/* Loan range */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Min Loan Amount (KES)</Label>
            <Input type="number" min={0} required value={minLoan} onChange={(e) => setMinLoan(e.target.value)} placeholder="10,000" className="mt-1.5 h-12" />
          </div>
          <div>
            <Label>Max Loan Amount (KES)</Label>
            <Input type="number" min={0} required value={maxLoan} onChange={(e) => setMaxLoan(e.target.value)} placeholder="500,000" className="mt-1.5 h-12" />
          </div>
        </div>

        {/* Interest rate band */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Min Interest Rate (%)</Label>
            <p className="text-xs text-muted-foreground mb-1">Applied to prime / low-risk borrowers</p>
            <Input type="number" min={0} step={0.1} required value={interestMin} onChange={(e) => setInterestMin(e.target.value)} placeholder="e.g. 8" className="h-12" />
          </div>
          <div>
            <Label>Max Interest Rate (%)</Label>
            <p className="text-xs text-muted-foreground mb-1">Applied to high-risk borrowers</p>
            <Input type="number" min={0} step={0.1} required value={interestMax} onChange={(e) => setInterestMax(e.target.value)} placeholder="e.g. 22" className="h-12" />
          </div>
        </div>

        {/* Duration */}
        <div>
          <Label>Loan Duration</Label>
          <Input required value={loanDuration} onChange={(e) => setLoanDuration(e.target.value)} placeholder="e.g. 3–24 months" className="mt-1.5 h-12" />
        </div>

        {/* Risk preference */}
        <div>
          <Label>Risk Appetite</Label>
          <div className="grid grid-cols-3 gap-3 mt-1.5">
            {RISK_LEVELS.map((level) => (
              <button
                key={level} type="button" onClick={() => setRiskPreference(level)}
                className={`p-3 rounded-xl border-2 text-center text-sm font-medium min-h-[48px] transition-all ${
                  riskPreference === level ? "border-primary bg-primary/5 text-primary" : "border-border text-muted-foreground hover:border-primary/30"
                }`}
              >
                {level} Risk
              </button>
            ))}
          </div>
        </div>

        {/* Live preview */}
        {(minLoan || maxLoan || interestMin || interestMax) && (
          <div className="rounded-xl bg-primary/5 border border-primary/20 p-4 space-y-2">
            <p className="text-xs font-semibold text-primary uppercase tracking-wider">Preview — as seen by farmers</p>
            <p className="text-sm text-foreground font-medium">
              Loan range: KES {minLoan ? Number(minLoan).toLocaleString() : "—"} – {maxLoan ? Number(maxLoan).toLocaleString() : "—"}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {interestMin && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                  {interestMin}% Prime
                </span>
              )}
              {interestMax && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-700 border border-red-200">
                  {interestMax}% High Risk
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background flex">
      <div className="hidden lg:flex lg:w-1/2 hero-gradient items-center justify-center p-12 relative overflow-hidden">
        <div className="absolute inset-0 flex items-center justify-center opacity-10">
          <img src={smcLogo} alt="" className="w-[500px] h-[500px] object-contain" />
        </div>
        <div className="max-w-md relative z-10 text-center">
          <img src={smcLogo} alt="SMC Logo" className="h-24 w-24 rounded-full object-cover mx-auto mb-6 shadow-elevated" />
          <h1 className="text-4xl font-display font-bold text-primary-foreground mb-4">
            Join the SMC Community
          </h1>
          <p className="text-primary-foreground/80">
            Connect with farmers, buyers, and creditors to build a stronger agricultural marketplace.
          </p>
        </div>
      </div>

      <div className="flex-1 flex items-start justify-center p-6 overflow-y-auto">
        <div className="w-full max-w-md py-4">
          <Link to="/" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-6">
            <ArrowLeft className="h-4 w-4 mr-1" /> Back to home
          </Link>

          <h2 className="text-3xl font-display font-bold text-foreground mb-1">Create Account</h2>
          <p className="text-muted-foreground mb-6">
            {step === 1
              ? "Select your role and basic info"
              : step === 2
                ? selectedRole === "creditor" ? "Institution details & location" : "Tell us more about you"
                : "Set your lending preferences"}
          </p>

          {selectedRole && (
            <div className="flex gap-2 mb-6">
              {Array.from({ length: totalSteps }, (_, i) => (
                <div
                  key={i}
                  className={`h-1.5 flex-1 rounded-full transition-colors ${
                    i + 1 <= step ? "bg-primary" : "bg-border"
                  }`}
                />
              ))}
            </div>
          )}

          {/* 
            The onKeyDown guard prevents pressing Enter in a text field from
            accidentally submitting the form before reaching the final step.
            HTML5 will fire form submit on Enter if there's no submit button
            visible in the DOM (which is the case on steps 1 and 2).
          */}
          <form
            onSubmit={handleSubmit}
            onKeyDown={(e) => {
              if (e.key === "Enter" && step < totalSteps) {
                e.preventDefault();
              }
            }}
          >
            {step === 1 && renderStep1()}
            {step === 2 && renderStep2()}
            {step === 3 && renderStep3()}

            {selectedRole && (
              <div className="flex gap-3 mt-6">
                {step > 1 && (
                  <Button type="button" variant="outline" className="min-h-[48px]" onClick={() => setStep(step - 1)}>
                    Back
                  </Button>
                )}
                {step < totalSteps ? (
                  <Button
                    type="button"
                    className="flex-1 min-h-[48px]"
                    disabled={step === 1 && !canProceedStep1()}
                    onClick={() => setStep(step + 1)}
                  >
                    Continue
                  </Button>
                ) : (
                  <Button type="submit" className="flex-1 min-h-[48px]" disabled={loading}>
                    {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Create Account
                  </Button>
                )}
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
};

export default SignUp;
