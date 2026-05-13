import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ShoppingCart, TrendingUp, ArrowLeft, Loader2, Sprout } from "lucide-react";
import smcLogo from "@/assets/smc-logo.png";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

type Role = "farmer" | "buyer" | "creditor";

const roles = [
  { id: "farmer" as Role, label: "Farmer", icon: Sprout },
  { id: "buyer" as Role, label: "Buyer", icon: ShoppingCart },
  { id: "creditor" as Role, label: "Creditor", icon: TrendingUp },
];

const ROLE_ROUTES: Record<Role, string> = {
  farmer: "/farmer/dashboard",
  buyer: "/buyer/marketplace",
  creditor: "/creditor/dashboard",
};

const SignIn = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({ email: "", username: "", password: "" });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRole) return;

    setLoading(true);

    try {
      const identifier = selectedRole === "creditor" ? formData.username : formData.email;
      await login(identifier, formData.password, selectedRole);
      toast.success(`Signed in successfully!`);
      navigate(ROLE_ROUTES[selectedRole], { replace: true });
    } catch (error: any) {
      const errMsg =
        error.response?.data?.non_field_errors?.[0] ||
        error.response?.data?.detail ||
        (error.response?.data && Object.values(error.response.data)[0]?.[0]) ||
        (error instanceof Error ? error.message : "Sign in failed");
      toast.error(errMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex">
      <div className="hidden lg:flex lg:w-1/2 hero-gradient items-center justify-center p-12 relative overflow-hidden">
        <div className="absolute inset-0 flex items-center justify-center opacity-10">
          <img src={smcLogo} alt="" className="w-[500px] h-[500px] object-contain" />
        </div>
        <div className="max-w-md relative z-10 text-center">
          <img src={smcLogo} alt="SMC Logo" className="h-24 w-24 rounded-full object-cover mx-auto mb-6 shadow-elevated" />
          <h1 className="text-4xl font-display font-bold text-primary-foreground mb-4">Welcome Back</h1>
          <p className="text-primary-foreground/80">Sign in to continue managing your agricultural business.</p>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <Link to="/" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-8">
            <ArrowLeft className="h-4 w-4 mr-1" /> Back to home
          </Link>

          <h2 className="text-3xl font-display font-bold text-foreground mb-2">Sign In</h2>
          <p className="text-muted-foreground mb-8">Select your role and sign in</p>

          <div className="grid grid-cols-3 gap-3 mb-8">
            {roles.map((role) => (
              <button
                key={role.id}
                onClick={() => setSelectedRole(role.id)}
                className={`p-4 rounded-xl border-2 text-center transition-all ${
                  selectedRole === role.id
                    ? "border-primary bg-primary/5 shadow-soft"
                    : "border-border hover:border-primary/30"
                }`}
              >
                <role.icon className={`h-6 w-6 mx-auto mb-2 ${selectedRole === role.id ? "text-primary" : "text-muted-foreground"}`} />
                <p className="text-sm font-semibold text-foreground">{role.label}</p>
              </button>
            ))}
          </div>

          {selectedRole && (
            <form onSubmit={handleSubmit} className="space-y-4 animate-fade-in">
              {selectedRole !== "creditor" ? (
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" name="email" type="email" required value={formData.email} onChange={handleChange} placeholder="you@example.com" />
                </div>
              ) : (
                <div>
                  <Label htmlFor="username">Business Number / Username</Label>
                  <Input id="username" name="username" required value={formData.username} onChange={handleChange} placeholder="CRD-12345" />
                </div>
              )}

              <div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  {selectedRole !== "creditor" && (
                    <Link to="/forgot-password" className="text-xs text-primary hover:underline">Forgot password?</Link>
                  )}
                </div>
                <Input id="password" name="password" type="password" required value={formData.password} onChange={handleChange} placeholder="••••••••" />
              </div>

              <Button type="submit" className="w-full" size="lg" disabled={loading}>
                {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Sign In
              </Button>

              <p className="text-center text-sm text-muted-foreground">
                Don't have an account?{" "}
                <Link to="/signup" className="text-primary font-medium hover:underline">Sign up</Link>
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default SignIn;
