import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Sprout, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { userProfileService } from "@/integrations/django/services";
import LocationPicker from "@/components/maps/LocationPicker";

const FarmerOnboarding = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    farmSize: "",
    produce: "",
    amountProduced: "",
    location: "",
    targetMarket: "",
  });
  const [gps, setGps] = useState<{ lat: number | null; lng: number | null }>({ lat: null, lng: null });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    try {
      await userProfileService.updateFarmerProfile({
        farm_size: parseFloat(form.farmSize) || undefined,
        crops: form.produce.split(",").map((s) => s.trim()).filter(Boolean),
        amount_produced: parseFloat(form.amountProduced) || undefined,
        location: form.location,
        target_market: form.targetMarket,
        gps_lat: gps.lat ?? undefined,
        gps_lng: gps.lng ?? undefined,
      });
      toast.success("Farm details saved!");
      navigate("/farmer/dashboard");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-lg">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-lg hero-gradient flex items-center justify-center">
            <Sprout className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-display font-bold text-foreground">Farm Details</h1>
            <p className="text-sm text-muted-foreground">Tell us about your farm</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 bg-card p-8 rounded-xl shadow-soft border border-border">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="farmSize">Farm Size (acres)</Label>
              <Input id="farmSize" name="farmSize" required value={form.farmSize} onChange={handleChange} placeholder="e.g. 50" />
            </div>
            <div>
              <Label htmlFor="amountProduced">Amount Produced (tons/yr)</Label>
              <Input id="amountProduced" name="amountProduced" required value={form.amountProduced} onChange={handleChange} placeholder="e.g. 200" />
            </div>
          </div>

          <div>
            <Label htmlFor="produce">Produce (comma-separated)</Label>
            <Input id="produce" name="produce" required value={form.produce} onChange={handleChange} placeholder="e.g. Maize, Wheat, Beans" />
          </div>

          <div>
            <Label htmlFor="location">Farm Location</Label>
            <Input id="location" name="location" required value={form.location} onChange={handleChange} placeholder="e.g. Nakuru County, Kenya" />
          </div>

          {/* GPS Map Picker */}
          <LocationPicker
            lat={gps.lat}
            lng={gps.lng}
            onLocationChange={(lat, lng) => setGps({ lat, lng })}
          />

          <div>
            <Label htmlFor="targetMarket">Target Market</Label>
            <Textarea id="targetMarket" name="targetMarket" value={form.targetMarket} onChange={handleChange} placeholder="Describe your ideal buyers and markets..." rows={3} />
          </div>

          <Button type="submit" className="w-full" size="lg" disabled={saving}>
            {saving ? "Saving..." : "Continue to Dashboard"} <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </form>
      </div>
    </div>
  );
};

export default FarmerOnboarding;
