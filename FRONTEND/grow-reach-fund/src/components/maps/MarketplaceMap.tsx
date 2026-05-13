import { Suspense, lazy, useState } from "react";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Crosshair, Map } from "lucide-react";
import type { Listing } from "@/hooks/useListings";

const LeafletMap = lazy(() => import("./LeafletMap"));
type MapMarker = {
  id: string | number;
  lat: number;
  lng: number;
  label: string;
  description?: string;
  type?: "farm" | "listing" | "buyer";
};

interface MarketplaceMapProps {
  listings: Listing[];
  onSelectListing?: (listing: Listing) => void;
}

function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const MarketplaceMap = ({ listings, onSelectListing }: MarketplaceMapProps) => {
  const [buyerPos, setBuyerPos] = useState<[number, number] | null>(null);
  const [radius, setRadius] = useState(50);
  const [detecting, setDetecting] = useState(false);

  const handleDetect = () => {
    if (!navigator.geolocation) return;
    setDetecting(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setBuyerPos([pos.coords.latitude, pos.coords.longitude]);
        setDetecting(false);
      },
      () => setDetecting(false),
      { enableHighAccuracy: true }
    );
  };

  const geoListings = listings.filter((l) => l.gps_lat && l.gps_lng);

  const filteredListings = buyerPos
    ? geoListings.filter((l) => haversineDistance(buyerPos[0], buyerPos[1], l.gps_lat!, l.gps_lng!) <= radius)
    : geoListings;

  const markers: MapMarker[] = filteredListings.map((l) => ({
    id: l.id,
    lat: l.gps_lat!,
    lng: l.gps_lng!,
    label: l.crop_name,
    description: `KES ${l.price_per_kg}/kg · ${l.quantity_kg} kg · ${l.farmer_name ?? ""}`,
    type: "listing" as const,
  }));

  const center: [number, number] = buyerPos ?? [-1.2921, 36.8219];

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="outline" size="sm" onClick={handleDetect} disabled={detecting}>
          <Crosshair className="h-3.5 w-3.5 mr-1" />
          {detecting ? "Detecting..." : buyerPos ? "Update Location" : "Set My Location"}
        </Button>
        {buyerPos && (
          <div className="flex items-center gap-2 flex-1 min-w-[200px]">
            <span className="text-xs text-muted-foreground whitespace-nowrap">Radius: {radius} km</span>
            <Slider
              value={[radius]}
              onValueChange={([v]) => setRadius(v)}
              min={5}
              max={200}
              step={5}
              className="flex-1"
            />
          </div>
        )}
        <span className="text-xs text-muted-foreground">
          <Map className="h-3 w-3 inline mr-1" />
          {filteredListings.length} listing{filteredListings.length !== 1 ? "s" : ""} on map
        </span>
      </div>

      <Suspense fallback={<div className="h-[400px] rounded-xl border border-border bg-muted animate-pulse" />}>
        <LeafletMap
          center={center}
          zoom={buyerPos ? 10 : 7}
          markers={markers}
          radiusCenter={buyerPos ?? undefined}
          radiusKm={buyerPos ? radius : undefined}
          height="400px"
        />
      </Suspense>
    </div>
  );
};

export default MarketplaceMap;
