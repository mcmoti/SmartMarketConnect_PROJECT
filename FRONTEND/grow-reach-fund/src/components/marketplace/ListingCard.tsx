import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { MapPin, Gavel, ShoppingCart, Wheat, Star } from "lucide-react";
import type { Listing } from "@/hooks/useListings";
import { format } from "date-fns";
import { resolveImageUrl } from "@/utils/imageUtils";

const cropEmoji: Record<string, string> = {
  maize: "🌽", wheat: "🌾", beans: "🫘", tomatoes: "🍅", avocado: "🥑",
  potatoes: "🥔", rice: "🍚", cabbage: "🥬", onions: "🧅", mangoes: "🥭",
  bananas: "🍌", coffee: "☕", tea: "🍵", sugarcane: "🎋",
};

const getEmoji = (crop: string) => {
  const key = crop.toLowerCase().replace(/\s+/g, "");
  for (const [k, v] of Object.entries(cropEmoji)) {
    if (key.includes(k)) return v;
  }
  return "🌱";
};

interface Props {
  listing: Listing;
  onBid: (listing: Listing) => void;
  onBuyNow: (listing: Listing, qty: number) => void;
  onRateFarmer?: (listing: Listing) => void;
}

const ListingCard = ({ listing, onBid, onBuyNow, onRateFarmer }: Props) => {
  const [qty, setQty] = useState(1);

  return (
    <div className="bg-card rounded-xl shadow-soft border border-border overflow-hidden hover:shadow-elevated transition-all group">
      <div className="h-36 bg-muted flex items-center justify-center text-5xl relative">
        {listing.photo_urls?.[0] ? (
          <img src={resolveImageUrl(listing.photo_urls[0])} alt={listing.crop_name} className="w-full h-full object-cover" />
        ) : (
          getEmoji(listing.crop_name)
        )}
        <Badge variant="outline" className="absolute top-2 right-2 bg-card/80 backdrop-blur text-xs">
          {listing.quantity_kg} kg
        </Badge>
        {listing.availability === "limited" && (
          <Badge className="absolute top-2 left-2 bg-accent/90 text-accent-foreground text-xs">Limited</Badge>
        )}
        {listing.availability === "available" && (
          <Badge className="absolute bottom-2 left-2 bg-primary/90 text-primary-foreground text-xs">Available</Badge>
        )}
      </div>
      <div className="p-4 space-y-2">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="font-semibold text-foreground text-base">{listing.crop_name}</h3>
            <p className="text-xs text-muted-foreground">{listing.farmer_name}</p>
          </div>
          <p className="font-bold text-primary text-lg leading-tight">
            KES {listing.price_per_kg}
            <span className="text-xs text-muted-foreground font-normal block text-right">/kg</span>
          </p>
        </div>

        {listing.location && (
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <MapPin className="h-3 w-3" /> {listing.location}
          </p>
        )}

        {listing.expected_harvest_date && (
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <Wheat className="h-3 w-3" /> Harvest: {format(new Date(listing.expected_harvest_date), "MMM d, yyyy")}
          </p>
        )}

        <div className="pt-1 space-y-2">
          <div className="flex items-center gap-2">
            <label className="text-xs text-muted-foreground whitespace-nowrap">Qty (kg):</label>
            <Input
              type="number"
              min={1}
              max={listing.quantity_kg}
              value={qty}
              onChange={(e) => {
                const v = Math.max(1, Math.min(Number(e.target.value), listing.quantity_kg));
                setQty(isNaN(v) ? 1 : v);
              }}
              className="h-8 text-sm w-20 text-center px-1"
            />
            <span className="text-xs text-muted-foreground">/ {listing.quantity_kg}</span>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" className="flex-1" onClick={() => onBid(listing)}>
              <Gavel className="h-3.5 w-3.5 mr-1" /> Bid
            </Button>
            <Button size="sm" className="flex-1" onClick={() => onBuyNow(listing, qty)}>
              <ShoppingCart className="h-3.5 w-3.5 mr-1" /> Add
            </Button>
          </div>
        </div>
        {onRateFarmer && (
          <Button size="sm" variant="secondary" className="w-full mt-2" onClick={() => onRateFarmer(listing)}>
            <Star className="h-3.5 w-3.5 mr-1 text-primary" /> Rate Farmer
          </Button>
        )}
      </div>
    </div>
  );
};

export default ListingCard;
