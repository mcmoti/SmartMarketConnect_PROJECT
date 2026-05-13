import { Suspense, lazy, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Mail, Phone, MapPin, Send, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import Navbar from "@/components/Navbar";
import smcLogo from "@/assets/smc-logo.png";
import { userProfileService } from "@/integrations/django/services";

const LeafletMap = lazy(() => import("@/components/maps/LeafletMap"));

const Contact = () => {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", subject: "", message: "" });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim() || !form.message.trim()) {
      toast.error("Please fill in all required fields");
      return;
    }
    setLoading(true);
    try {
      await userProfileService.submitContactInquiry(form);
      toast.success("Message sent! We'll get back to you soon.");
      setForm({ name: "", email: "", subject: "", message: "" });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to send message");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <section className="pt-28 pb-16 md:pt-36 md:pb-20">
        <div className="container mx-auto px-4">
          <motion.div className="text-center mb-12" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <h1 className="text-4xl md:text-5xl font-display font-bold text-foreground mb-4">Get in Touch</h1>
            <p className="text-lg text-muted-foreground max-w-xl mx-auto">
              Have a question or feedback? We'd love to hear from you.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-12 max-w-5xl mx-auto">
            {/* Contact Form */}
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}>
              <form onSubmit={handleSubmit} className="bg-card rounded-xl p-8 border border-border shadow-soft space-y-5">
                <div>
                  <Label htmlFor="name">Your Name *</Label>
                  <Input id="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="John Doe" className="mt-1.5 h-12" required />
                </div>
                <div>
                  <Label htmlFor="email">Email Address *</Label>
                  <Input id="email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="you@example.com" className="mt-1.5 h-12" required />
                </div>
                <div>
                  <Label htmlFor="subject">Subject</Label>
                  <Input id="subject" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} placeholder="How can we help?" className="mt-1.5 h-12" />
                </div>
                <div>
                  <Label htmlFor="message">Message *</Label>
                  <Textarea id="message" value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} placeholder="Tell us more..." className="mt-1.5 min-h-[120px]" required />
                </div>
                <Button type="submit" size="lg" className="w-full h-12" disabled={loading}>
                  {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
                  Send Message
                </Button>
              </form>
            </motion.div>

            {/* Info & Map */}
            <motion.div className="space-y-6" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}>
              <div className="bg-card rounded-xl p-8 border border-border shadow-soft space-y-6">
                <h3 className="text-xl font-display font-semibold text-foreground">Contact Information</h3>
                {[
                  { icon: Mail, label: "Email", value: "hello@smartmarketconnect.co.ke" },
                  { icon: Phone, label: "Phone", value: "+254 700 000 000" },
                  { icon: MapPin, label: "Office", value: "Nairobi, Kenya" },
                ].map((item) => (
                  <div key={item.label} className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <item.icon className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">{item.label}</p>
                      <p className="font-medium text-foreground">{item.value}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="bg-card rounded-xl border border-border shadow-soft overflow-hidden">
                <div className="p-4 border-b border-border">
                  <h3 className="text-sm font-semibold text-foreground">Our Office</h3>
                </div>
                <Suspense fallback={<div className="h-[220px] bg-muted animate-pulse" />}>
                  <LeafletMap
                    center={[-1.2921, 36.8219]}
                    zoom={13}
                    selectedPosition={[-1.2921, 36.8219]}
                    height="220px"
                  />
                </Suspense>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 bg-card border-t border-border mt-12">
        <div className="container mx-auto px-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <img src={smcLogo} alt="SMC Logo" className="h-8 w-8 rounded-full object-cover" />
            <span className="font-display font-bold text-foreground">SMC</span>
          </div>
          <div className="flex justify-center gap-6 mb-4 text-sm">
            <Link to="/" className="text-muted-foreground hover:text-foreground">Home</Link>
            <Link to="/about" className="text-muted-foreground hover:text-foreground">About</Link>
            <Link to="/contact" className="text-muted-foreground hover:text-foreground">Contact</Link>
          </div>
          <p className="text-sm text-muted-foreground">&copy; 2026 Smart Market Connect. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default Contact;
