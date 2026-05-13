import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { usePlaceBid, useBidsForListing } from "@/hooks/useBids";
import type { Listing } from "@/hooks/useListings";
import { Gavel, MessageSquare, Clock } from "lucide-react";
import { format } from "date-fns";

interface Props {
  listing: Listing | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const statusColors: Record<string, string> = {
  pending: "bg-warning/15 text-warning border-warning/30",
  accepted: "bg-primary/15 text-primary border-primary/30",
  rejected: "bg-destructive/15 text-destructive border-destructive/30",
  countered: "bg-secondary/15 text-secondary border-secondary/30",
};

const BidDialog = ({ listing, open, onOpenChange }: Props) => {
  const [pricePerKg, setPricePerKg] = useState("");
  const [quantityKg, setQuantityKg] = useState("");
  const [message, setMessage] = useState("");
  const placeBid = usePlaceBid();
  const { data: bids = [], isLoading } = useBidsForListing(open ? listing?.id ?? null : null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!listing) return;
    placeBid.mutate(
      {
        listing_id: listing.id,
        price_per_kg: parseFloat(pricePerKg),
        quantity_kg: parseFloat(quantityKg),
        message: message || undefined,
      },
      {
        onSuccess: () => {
          setPricePerKg("");
          setQuantityKg("");
          setMessage("");
        },
      }
    );
  };

  if (!listing) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Gavel className="h-5 w-5 text-primary" />
            Bid on {listing.crop_name}
          </DialogTitle>
          <DialogDescription>
            Listed at KES {listing.price_per_kg}/kg · {listing.quantity_kg} kg available
            {listing.farmer_name && ` · ${listing.farmer_name}`}
          </DialogDescription>
        </DialogHeader>

        {/* Existing bids */}
        {bids.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" /> Your Bids
            </h4>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {bids.map((bid) => (
                <div key={bid.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border border-border text-sm">
                  <div>
                    <span className="font-medium text-foreground">KES {bid.price_per_kg}/kg</span>
                    <span className="text-muted-foreground ml-2">× {bid.quantity_kg} kg</span>
                    {bid.counter_price && (
                      <span className="ml-2 text-secondary font-medium">Counter: KES {bid.counter_price}/kg</span>
                    )}
                    {bid.message && (
                      <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                        <MessageSquare className="h-3 w-3" /> {bid.message}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <Badge variant="outline" className={statusColors[bid.status] ?? ""}>
                      {bid.status}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(bid.created_at), "MMM d, HH:mm")}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Place new bid */}
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Your Price (KES/kg)</Label>
              <Input
                type="number"
                step="0.01"
                min="1"
                required
                placeholder={String(listing.price_per_kg)}
                value={pricePerKg}
                onChange={(e) => setPricePerKg(e.target.value)}
              />
            </div>
            <div>
              <Label>Quantity (kg)</Label>
              <Input
                type="number"
                step="0.1"
                min="1"
                max={listing.quantity_kg}
                required
                placeholder={String(listing.quantity_kg)}
                value={quantityKg}
                onChange={(e) => setQuantityKg(e.target.value)}
              />
            </div>
          </div>
          <div>
            <Label>Message (optional)</Label>
            <Textarea
              placeholder="Add a note for the farmer..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={2}
            />
          </div>
          <div className="flex items-center justify-between pt-2">
            <p className="text-sm text-muted-foreground">
              Total: <span className="font-bold text-foreground">
                KES {pricePerKg && quantityKg ? (parseFloat(pricePerKg) * parseFloat(quantityKg)).toLocaleString() : "—"}
              </span>
            </p>
            <Button type="submit" disabled={placeBid.isPending}>
              {placeBid.isPending ? "Placing..." : "Place Bid"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default BidDialog;
