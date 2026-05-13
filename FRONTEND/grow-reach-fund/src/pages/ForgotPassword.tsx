import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Loader2, Mail } from "lucide-react";
import smcLogo from "@/assets/smc-logo.png";
import { toast } from "sonner";
import { djangoAPI } from "@/integrations/django/client";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await djangoAPI.post("/auth/password-reset/", { email });
    } catch (error: any) {
      toast.error(error.message || "Failed to send reset link");
      return;
    } finally {
      setLoading(false);
    }

    setSent(true);
    toast.success("Password reset link sent to your email!");
  };

  return (
    <div className="min-h-screen bg-background flex">
      <div className="hidden lg:flex lg:w-1/2 hero-gradient items-center justify-center p-12 relative overflow-hidden">
        <div className="absolute inset-0 flex items-center justify-center opacity-10">
          <img src={smcLogo} alt="" className="w-[500px] h-[500px] object-contain" />
        </div>
        <div className="max-w-md relative z-10 text-center">
          <img src={smcLogo} alt="SMC Logo" className="h-24 w-24 rounded-full object-cover mx-auto mb-6 shadow-elevated" />
          <h1 className="text-4xl font-display font-bold text-primary-foreground mb-4">Reset Password</h1>
          <p className="text-primary-foreground/80">We'll send you a link to reset your password.</p>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <Link to="/signin" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-8">
            <ArrowLeft className="h-4 w-4 mr-1" /> Back to sign in
          </Link>

          {sent ? (
            <div className="text-center space-y-4">
              <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                <Mail className="h-8 w-8 text-primary" />
              </div>
              <h2 className="text-3xl font-display font-bold text-foreground">Check your email</h2>
              <p className="text-muted-foreground">
                We've sent a password reset link to <span className="font-medium text-foreground">{email}</span>.
                Click the link in the email to reset your password.
              </p>
              <Button variant="outline" asChild className="mt-4">
                <Link to="/signin">Return to Sign In</Link>
              </Button>
            </div>
          ) : (
            <>
              <h2 className="text-3xl font-display font-bold text-foreground mb-2">Forgot Password</h2>
              <p className="text-muted-foreground mb-8">Enter your email and we'll send you a reset link</p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                  />
                </div>

                <Button type="submit" className="w-full" size="lg" disabled={loading}>
                  {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Send Reset Link
                </Button>

                <p className="text-center text-sm text-muted-foreground">
                  Remember your password?{" "}
                  <Link to="/signin" className="text-primary font-medium hover:underline">Sign in</Link>
                </p>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
