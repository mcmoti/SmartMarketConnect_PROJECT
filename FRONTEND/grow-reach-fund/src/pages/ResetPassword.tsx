import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Loader2, CheckCircle } from "lucide-react";
import smcLogo from "@/assets/smc-logo.png";
import { toast } from "sonner";
import { djangoAPI } from "@/integrations/django/client";

const ResetPassword = () => {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [isRecovery, setIsRecovery] = useState(false);

  useEffect(() => {
    // Check URL hash or search params for uid and token
    const hash = window.location.hash;
    const search = window.location.search;
    if (hash.includes("token=") || search.includes("token=")) {
      setIsRecovery(true);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    if (password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    setLoading(true);

    try {
      // Parse token and uid from hash
      const hashParams = new URLSearchParams(window.location.hash.replace('#', '?'));
      const uid = hashParams.get('uid');
      const token = hashParams.get('token');

      await djangoAPI.post("/auth/password-reset/confirm/", { 
        uid, 
        token, 
        password 
      });
      setSuccess(true);
      toast.success("Password updated successfully!");
    } catch (error: any) {
      toast.error(error.message || "Failed to update password");
    } finally {
      setLoading(false);
    }
  };

  if (!isRecovery && !success) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="w-full max-w-md text-center space-y-4">
          <h2 className="text-2xl font-display font-bold text-foreground">Invalid Reset Link</h2>
          <p className="text-muted-foreground">This link is invalid or has expired. Please request a new password reset.</p>
          <Button asChild>
            <Link to="/forgot-password">Request New Link</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex">
      <div className="hidden lg:flex lg:w-1/2 hero-gradient items-center justify-center p-12 relative overflow-hidden">
        <div className="absolute inset-0 flex items-center justify-center opacity-10">
          <img src={smcLogo} alt="" className="w-[500px] h-[500px] object-contain" />
        </div>
        <div className="max-w-md relative z-10 text-center">
          <img src={smcLogo} alt="SMC Logo" className="h-24 w-24 rounded-full object-cover mx-auto mb-6 shadow-elevated" />
          <h1 className="text-4xl font-display font-bold text-primary-foreground mb-4">New Password</h1>
          <p className="text-primary-foreground/80">Choose a strong password for your account.</p>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <Link to="/signin" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-8">
            <ArrowLeft className="h-4 w-4 mr-1" /> Back to sign in
          </Link>

          {success ? (
            <div className="text-center space-y-4">
              <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                <CheckCircle className="h-8 w-8 text-primary" />
              </div>
              <h2 className="text-3xl font-display font-bold text-foreground">Password Updated</h2>
              <p className="text-muted-foreground">Your password has been successfully reset.</p>
              <Button asChild className="mt-4">
                <Link to="/signin">Sign In</Link>
              </Button>
            </div>
          ) : (
            <>
              <h2 className="text-3xl font-display font-bold text-foreground mb-2">Set New Password</h2>
              <p className="text-muted-foreground mb-8">Enter your new password below</p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="password">New Password</Label>
                  <Input
                    id="password"
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    minLength={6}
                  />
                </div>

                <div>
                  <Label htmlFor="confirmPassword">Confirm Password</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    minLength={6}
                  />
                </div>

                <Button type="submit" className="w-full" size="lg" disabled={loading}>
                  {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Update Password
                </Button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
