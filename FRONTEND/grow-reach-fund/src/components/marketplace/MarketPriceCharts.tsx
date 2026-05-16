import { useState, useEffect, useMemo } from "react";
import { marketService, type MarketPrice } from "@/integrations/django/services";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie
} from "recharts";
import { Loader2, TrendingUp, Menu } from "lucide-react";

// Pastel color palette matching the template
const COLORS = [
  "#93c5fd", // blue-300
  "#c4b5fd", // purple-300
  "#67e8f9", // cyan-300
  "#fcd34d", // yellow-300
  "#86efac", // green-300
  "#f9a8d4", // pink-300
  "#d8b4fe", // fuchsia-300
  "#fdba74", // orange-300
];

const GAUGE_COLORS = ["#ef4444", "#facc15", "#22c55e"]; // Red, Yellow, Green

const RADIAN = Math.PI / 180;
const renderNeedle = (
  value: number,
  data: any[],
  cx: number,
  cy: number,
  iR: number,
  oR: number,
  color: string
) => {
  let total = 0;
  data.forEach((v) => {
    total += v.value;
  });
  const ang = 180.0 * (1 - value / total);
  const length = (iR + 2 * oR) / 3;
  const sin = Math.sin(-RADIAN * ang);
  const cos = Math.cos(-RADIAN * ang);
  const r = 5;
  const x0 = cx + 5;
  const y0 = cy + 5;
  const xba = x0 + r * sin;
  const yba = y0 - r * cos;
  const xbb = x0 - r * sin;
  const ybb = y0 + r * cos;
  const xp = x0 + length * cos;
  const yp = y0 + length * sin;

  return [
    <circle key="circle" cx={x0} cy={y0} r={r} fill={color} stroke="none" />,
    <path key="path" d={`M${xba} ${yba}L${xbb} ${ybb} L${xp} ${yp} L${xba} ${yba}`} stroke="none" fill={color} />,
  ];
};

const MarketPriceCharts = () => {
  const [prices, setPrices] = useState<MarketPrice[]>([]);
  const [loading, setLoading] = useState(true);

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

  const dashboardData = useMemo(() => {
    const cropsSet = new Set(prices.map((p) => p.crop_name));
    const totalCrops = cropsSet.size;
    const activeMarkets = 1; // Assuming Kenya currently

    const validPrices = prices.map((p) => p.average_price ?? p.unit_price).filter(Boolean) as number[];
    const avgPrice = validPrices.length ? Math.round(validPrices.reduce((a, b) => a + b, 0) / validPrices.length) : 0;
    const highestPrice = validPrices.length ? Math.max(...validPrices) : 0;
    const lowestPrice = validPrices.length ? Math.min(...validPrices) : 0;
    
    // Calculate an arbitrary market index for the gauge chart (based on a fake target of 150 KES)
    // 0-50: Red, 50-100: Yellow, 100-150: Green
    const marketIndexValue = Math.min(avgPrice, 150);
    const marketIndexPercent = ((marketIndexValue / 150) * 100).toFixed(2);

    // Group average prices by crop for the bar chart
    const cropAvgMap: Record<string, { total: number; count: number }> = {};
    prices.forEach((p) => {
      if (!cropAvgMap[p.crop_name]) cropAvgMap[p.crop_name] = { total: 0, count: 0 };
      cropAvgMap[p.crop_name].total += p.average_price ?? p.unit_price ?? 0;
      cropAvgMap[p.crop_name].count += 1;
    });

    const barData = Object.entries(cropAvgMap).map(([crop, { total, count }]) => ({
      crop,
      price: Math.round(total / count),
    })).sort((a, b) => b.price - a.price);

    return {
      totalCrops,
      avgPrice,
      highestPrice,
      lowestPrice,
      activeMarkets,
      totalRecords: prices.length,
      marketIndexValue,
      marketIndexPercent,
      barData
    };
  }, [prices]);

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

  const { totalCrops, avgPrice, highestPrice, lowestPrice, activeMarkets, totalRecords, marketIndexValue, marketIndexPercent, barData } = dashboardData;

  const gaugeData = [
    { name: "Low", value: 50, color: GAUGE_COLORS[0] },
    { name: "Medium", value: 50, color: GAUGE_COLORS[1] },
    { name: "High", value: 50, color: GAUGE_COLORS[2] },
  ];

  return (
    <div className="space-y-6 bg-slate-50/50 p-6 rounded-xl border border-slate-100">
      
      {/* Header */}
      <div className="flex items-center gap-3 pb-2">
        <div className="p-2 bg-white rounded-lg border border-slate-200 shadow-sm">
          <Menu className="h-5 w-5 text-slate-700" />
        </div>
        <h2 className="text-xl font-bold text-slate-800">Market Prices Dashboard</h2>
      </div>

      {/* Top Section: KPIs and Gauge */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* KPI Grid (2/3 width) */}
        <div className="lg:col-span-2 grid grid-cols-2 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm flex flex-col items-center justify-center text-center">
            <span className="text-sm font-medium text-slate-500 mb-2">Tracked Crops</span>
            <span className="text-3xl font-bold text-slate-800">{totalCrops}</span>
          </div>
          <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm flex flex-col items-center justify-center text-center">
            <span className="text-sm font-medium text-slate-500 mb-2">Overall Avg Price</span>
            <span className="text-3xl font-bold text-amber-500">KES {avgPrice}</span>
          </div>
          <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm flex flex-col items-center justify-center text-center">
            <span className="text-sm font-medium text-slate-500 mb-2">Total Records</span>
            <span className="text-3xl font-bold text-slate-800">{totalRecords}</span>
          </div>
          <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm flex flex-col items-center justify-center text-center">
            <span className="text-sm font-medium text-slate-500 mb-2">Active Markets</span>
            <span className="text-3xl font-bold text-slate-800">{activeMarkets}</span>
          </div>
          <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm flex flex-col items-center justify-center text-center">
            <span className="text-sm font-medium text-slate-500 mb-2">Highest Price</span>
            <span className="text-3xl font-bold text-rose-500">KES {highestPrice}</span>
          </div>
          <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm flex flex-col items-center justify-center text-center">
            <span className="text-sm font-medium text-slate-500 mb-2">Lowest Price</span>
            <span className="text-3xl font-bold text-slate-800">KES {lowestPrice}</span>
          </div>
        </div>

        {/* Gauge Chart (1/3 width) */}
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm flex flex-col items-center relative overflow-hidden">
          <span className="text-sm font-medium text-slate-500 mb-6 z-10 relative">Market Index</span>
          <div className="h-[140px] w-[300px] flex items-center justify-center -mt-4 relative">
            <PieChart width={300} height={140}>
              <Pie
                dataKey="value"
                startAngle={180}
                endAngle={0}
                data={gaugeData}
                cx={150}
                cy={105}
                innerRadius={60}
                outerRadius={80}
                stroke="none"
              >
                {gaugeData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              {renderNeedle(marketIndexValue, gaugeData, 150, 105, 60, 80, "#1e293b")}
            </PieChart>
          </div>
          <div className="absolute bottom-4 left-0 right-0 text-center z-10">
            <div className="inline-block bg-emerald-500 text-white px-6 py-2 rounded-lg text-xl font-bold shadow-md">
              {marketIndexPercent}%
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Section: Bar Chart */}
      <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
        <h3 className="text-sm font-medium text-slate-500 mb-6">Market Prices by Crop</h3>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={barData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis 
                dataKey="crop" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fontSize: 12, fill: "#64748b" }} 
                dy={10}
              />
              <YAxis 
                axisLine={false} 
                tickLine={false} 
                tick={{ fontSize: 12, fill: "#64748b" }} 
              />
              <Tooltip
                cursor={{ fill: "transparent" }}
                contentStyle={{
                  backgroundColor: "#ffffff",
                  border: "1px solid #e2e8f0",
                  borderRadius: "8px",
                  boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                  color: "#1e293b",
                }}
                formatter={(value: number) => [`KES ${value}`, "Average Price"]}
              />
              <Bar 
                dataKey="price" 
                radius={[4, 4, 0, 0]} 
                maxBarSize={60}
              >
                {barData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-4 mt-6">
          {barData.slice(0, COLORS.length).map((entry, index) => (
            <div key={entry.crop} className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }}></span>
              <span className="text-xs text-slate-600">{entry.crop}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default MarketPriceCharts;
