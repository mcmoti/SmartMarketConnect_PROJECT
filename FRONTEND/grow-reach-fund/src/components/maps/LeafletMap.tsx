import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix default marker icons for bundled builds
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

const greenIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const redIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

export interface MapMarker {
  id: string;
  lat: number;
  lng: number;
  label: string;
  description?: string;
  type?: "farm" | "listing" | "buyer";
}

interface LeafletMapProps {
  center?: [number, number];
  zoom?: number;
  markers?: MapMarker[];
  radiusCenter?: [number, number];
  radiusKm?: number;
  onClick?: (lat: number, lng: number) => void;
  selectedPosition?: [number, number] | null;
  className?: string;
  height?: string;
}

function ClickHandler({ onClick }: { onClick?: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onClick?.(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

function FlyToCenter({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo(center, map.getZoom());
  }, [center[0], center[1]]);
  return null;
}

const LeafletMap = ({
  center = [-1.2921, 36.8219], // Nairobi default
  zoom = 7,
  markers = [],
  radiusCenter,
  radiusKm,
  onClick,
  selectedPosition,
  className = "",
  height = "400px",
}: LeafletMapProps) => {
  const getIcon = (type?: string) => {
    if (type === "farm" || type === "listing") return greenIcon;
    if (type === "buyer") return redIcon;
    return new L.Icon.Default();
  };

  return (
    <MapContainer
      center={center}
      zoom={zoom}
      className={`rounded-xl border border-border z-0 ${className}`}
      style={{ height, width: "100%" }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <ClickHandler onClick={onClick} />
      {center && <FlyToCenter center={center} />}

      {markers.map((m) => (
        <Marker key={m.id} position={[m.lat, m.lng]} icon={getIcon(m.type)}>
          <Popup>
            <strong>{m.label}</strong>
            {m.description && <p className="text-xs mt-1">{m.description}</p>}
          </Popup>
        </Marker>
      ))}

      {selectedPosition && (
        <Marker position={selectedPosition} icon={greenIcon}>
          <Popup>Selected location</Popup>
        </Marker>
      )}

      {radiusCenter && radiusKm && (
        <Circle
          center={radiusCenter}
          radius={radiusKm * 1000}
          pathOptions={{
            color: "hsl(145, 63%, 32%)",
            fillColor: "hsl(145, 63%, 32%)",
            fillOpacity: 0.1,
          }}
        />
      )}
    </MapContainer>
  );
};

export default LeafletMap;
