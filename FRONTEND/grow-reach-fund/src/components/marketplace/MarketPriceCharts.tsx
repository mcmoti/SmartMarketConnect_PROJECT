import { useState, useEffect } from "react";
import { marketService, type MarketPrice } from "@/integrations/django/services";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from "recharts";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, TrendingUp } from "lucide-react";

const COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--destructive))",
  "hsl(var(--accent))",
  "#f59e0b",
  "#8b5cf6",
  "#06b6d4",
];

const MarketPriceCharts = () => {
  const [prices, setPrices] = useState<MarketPrice[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCrop, setSelectedCrop] = useState<string>("all");
  const [selectedLocation, setSelectedLocation] = useState<string>("all");

  useEffect(() => {
    void fetchPrices();
  }, []);

  const fetchPrices = async () => {
    try {
      const data = await marketService.getMarketPrices();
      setPrices(data);
    } finally {
      setLoading(false);
    }
  };

  const crops = [...new Set(prices.map((p) => p.crop_name))];
  const locations = ["Kenya"];

  // Filter
  const filtered = prices.filter(
    (p) =>
      (selectedCrop === "all" || p.crop_name === selectedCrop) &&
      (selectedLocation === "all" || selectedLocation === "Kenya")
  );

  // Line chart: price trends over time grouped by crop
  const trendData = () => {
    const dateMap: Record<string, Record<string, number>> = {};
    filtered.forEach((p) => {
      const date = new Date(p.updated_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
      if (!dateMap[date]) dateMap[date] = {};
      dateMap[date][p.crop_name] = p.average_price ?? p.unit_price;
    });
    return Object.entries(dateMap).map(([date, crops]) => ({ date, ...crops }));
  };

  // Bar chart: avg price by location for selected crop
  const locationData = () => {
    const target = selectedCrop !== "all" ? filtered : prices;
    const locMap: Record<string, { total: number; count: number }> = {};
    target.forEach((p) => {
      if (!locMap.Kenya) locMap.Kenya = { total: 0, count: 0 };
      locMap.Kenya.total += p.average_price ?? p.unit_price;
      locMap.Kenya.count += 1;
    });
    return Object.entries(locMap).map(([location, { total, count }]) => ({
      location,
      avg_price: Math.round(total / count),
    }));
  };

  const trendCrops = selectedCrop === "all" ? crops : [selectedCrop];
  const trend = trendData();
  const locData = locationData();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (prices.length === 0) {
    return (
      <div className="text-center py-20 text-muted-foreground">
        <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>No market price data available yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <Select value={selectedCrop} onValueChange={setSelectedCrop}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All Crops" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Crops</SelectItem>
            {crops.map((c) => (
              <SelectItem key={c} value={c}>{c}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={selectedLocation} onValueChange={setSelectedLocation}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All Locations" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Locations</SelectItem>
            {locations.map((l) => (
              <SelectItem key={l} value={l}>{l}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Price Trend Line Chart */}
      <div className="bg-card rounded-xl shadow-soft border border-border p-6">
        <h3 className="font-semibold text-foreground mb-4">Price Trends (KES/kg)</h3>
        {trend.length > 0 ? (
          <ResponsiveContainer width="100%" height={320}>
            <LineChart data={trend}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} className="fill-muted-foreground" />
              <YAxis tick={{ fontSize: 12 }} className="fill-muted-foreground" />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: 8,
                  color: "hsl(var(--foreground))",
                }}
              />
              <Legend />
              {trendCrops.map((crop, i) => (
                <Line
                  key={crop}
                  type="monotone"
                  dataKey={crop}
                  stroke={COLORS[i % COLORS.length]}
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-sm text-muted-foreground py-8 text-center">No trend data for current filters.</p>
        )}
      </div>

      {/* Average Price by Location Bar Chart */}
      <div className="bg-card rounded-xl shadow-soft border border-border p-6">
        <h3 className="font-semibold text-foreground mb-4">
          Average Price by Location {selectedCrop !== "all" && `— ${selectedCrop}`}
        </h3>
        {locData.length > 0 ? (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={locData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="location" tick={{ fontSize: 12 }} className="fill-muted-foreground" />
              <YAxis tick={{ fontSize: 12 }} className="fill-muted-foreground" />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: 8,
                  color: "hsl(var(--foreground))",
                }}
              />
              <Bar dataKey="avg_price" name="Avg KES/kg" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-sm text-muted-foreground py-8 text-center">No location data for current filters.</p>
        )}
      </div>
    </div>
  );
};

export default MarketPriceCharts;
