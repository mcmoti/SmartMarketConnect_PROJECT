import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Upload, X } from "lucide-react";
import { useCreateListing } from "@/hooks/useFarmerData";
import { userProfileService } from "@/integrations/django/services";
import { resolveImageUrl } from "@/utils/imageUtils";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const CreateListingDialog = ({ open, onOpenChange }: Props) => {
  const createListing = useCreateListing();
  const [uploading, setUploading] = useState(false);
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
  const [form, setForm] = useState({
    crop_name: "",
    quantity_kg: "",
    price_per_kg: "",
    location: "",
    expected_harvest_date: "",
    quality_grade: "A",
    availability: "available",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    setUploading(true);
    try {
      const uploaded = await userProfileService.uploadFiles(Array.from(e.target.files));
      setPhotoUrls((prev) => [...prev, ...uploaded.map((file) => file.url)]);
    } finally {
      setUploading(false);
    }
  };

  const removePhoto = (idx: number) => {
    setPhotoUrls((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createListing.mutate(
      {
        crop_name: form.crop_name,
        quantity_kg: parseFloat(form.quantity_kg),
        price_per_kg: parseFloat(form.price_per_kg),
        location: form.location || undefined,
        expected_harvest_date: form.expected_harvest_date || undefined,
        photo_urls: photoUrls.length > 0 ? photoUrls : undefined,
      },
      {
        onSuccess: () => {
          onOpenChange(false);
          setForm({ crop_name: "", quantity_kg: "", price_per_kg: "", location: "", expected_harvest_date: "", quality_grade: "A", availability: "available" });
          setPhotoUrls([]);
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Create New Listing</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Crop Name</Label>
              <Input name="crop_name" required value={form.crop_name} onChange={handleChange} placeholder="e.g. Maize" />
            </div>
            <div>
              <Label>Quantity (kg)</Label>
              <Input name="quantity_kg" type="number" required min={1} value={form.quantity_kg} onChange={handleChange} placeholder="e.g. 500" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Price per kg (KES)</Label>
              <Input name="price_per_kg" type="number" required min={1} step={0.5} value={form.price_per_kg} onChange={handleChange} placeholder="e.g. 45" />
            </div>
            <div>
              <Label>Location</Label>
              <Input name="location" value={form.location} onChange={handleChange} placeholder="e.g. Nakuru" />
            </div>
          </div>
          <div>
            <Label>Expected Harvest Date</Label>
            <Input name="expected_harvest_date" type="date" value={form.expected_harvest_date} onChange={handleChange} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Quality Grade</Label>
              <select
                name="quality_grade"
                value={form.quality_grade}
                onChange={(e) => setForm({ ...form, quality_grade: e.target.value })}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="A">Grade A — Premium</option>
                <option value="B">Grade B — Standard</option>
                <option value="C">Grade C — Economy</option>
              </select>
            </div>
            <div>
              <Label>Availability</Label>
              <select
                name="availability"
                value={form.availability}
                onChange={(e) => setForm({ ...form, availability: e.target.value })}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="available">Available Now</option>
                <option value="pre-harvest">Pre-harvest</option>
                <option value="limited">Limited Stock</option>
              </select>
            </div>
          </div>

          {/* Photo Upload */}
          <div>
            <Label>Produce Photos</Label>
            <div className="mt-1 flex flex-wrap gap-2">
              {photoUrls.map((url, i) => (
                <div key={i} className="relative w-20 h-20 rounded-lg overflow-hidden border border-border">
                  <img src={resolveImageUrl(url)} alt="" className="w-full h-full object-cover" />
                  <button type="button" onClick={() => removePhoto(i)} className="absolute top-0.5 right-0.5 bg-destructive text-destructive-foreground rounded-full p-0.5">
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
              <label className="w-20 h-20 rounded-lg border-2 border-dashed border-border flex items-center justify-center cursor-pointer hover:border-primary transition-colors">
                {uploading ? <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /> : <Upload className="h-5 w-5 text-muted-foreground" />}
                <input type="file" accept="image/*" multiple className="hidden" onChange={handlePhotoUpload} disabled={uploading} />
              </label>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Upload photos so buyers can see produce quality</p>
          </div>

          <DialogFooter>
            <Button variant="outline" type="button" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={createListing.isPending}>
              {createListing.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              Create Listing
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateListingDialog;
