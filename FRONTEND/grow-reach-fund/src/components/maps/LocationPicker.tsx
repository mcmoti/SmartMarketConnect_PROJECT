import { useState, Suspense } from "react";
import { Button } from "@/components/ui/button";
import { MapPin, Crosshair } from "lucide-react";
import ErrorBoundary from "../ErrorBoundary";
import LeafletMap from "./LeafletMap";

interface LocationPickerProps {
  lat: number | null;
  lng: number | null;
  onLocationChange: (lat: number, lng: number) => void;
  label?: string;
}

const LocationPicker = ({ lat, lng, onLocationChange, label = "Tag your farm on the map" }: LocationPickerProps) => {
  const [detecting, setDetecting] = useState(false);

  const handleDetectLocation = () => {
    if (!navigator.geolocation) return;
    setDetecting(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        onLocationChange(pos.coords.latitude, pos.coords.longitude);
        setDetecting(false);
      },
      () => setDetecting(false),
      { enableHighAccuracy: true }
    );
  };

  const center: [number, number] = lat && lng ? [lat, lng] : [-1.2921, 36.8219];

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-foreground flex items-center gap-1.5">
          <MapPin className="h-4 w-4 text-primary" /> {label}
        </p>
        <Button type="button" variant="outline" size="sm" onClick={handleDetectLocation} disabled={detecting}>
          <Crosshair className="h-3.5 w-3.5 mr-1" />
          {detecting ? "Detecting..." : "Use My Location"}
        </Button>
      </div>
      <ErrorBoundary fallback={<div className="h-[250px] rounded-xl border border-destructive/50 bg-destructive/10 flex items-center justify-center p-4"><p className="text-sm font-medium text-destructive text-center">Map component unavailable. Please specify farm location in the text field above.</p></div>}>
        <Suspense fallback={<div className="h-[250px] rounded-xl border border-border bg-muted animate-pulse" />}>
          <LeafletMap
            center={center}
            zoom={lat ? 13 : 7}
            onClick={(newLat, newLng) => onLocationChange(newLat, newLng)}
            selectedPosition={lat && lng ? [lat, lng] : null}
            height="250px"
          />
        </Suspense>
      </ErrorBoundary>
      {lat && lng && (
        <p className="text-xs text-muted-foreground">
          📍 {lat.toFixed(5)}, {lng.toFixed(5)}
        </p>
      )}
    </div>
  );
};

export default LocationPicker;
