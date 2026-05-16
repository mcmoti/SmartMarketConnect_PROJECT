import { useMemo, useState } from "react";
import { BarChart, Bar, PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { Button } from "@/components/ui/button";
import { Package, DollarSign, Clock, TrendingDown, Download } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface InventoryItem {
  id: string;
  crop: string;
  quantity_kg: number;
  created_at: string;
  expected_harvest_date?: string | null;
  notes?: string | null;
}

interface Payment {
  id: string;
  crop_name: string;
  amount: number;
  date: string;
  status: string;
}

interface StaffEntry {
  hours: number;
  rate_per_hour: number | null;
  date: string;
}

type Period = "week" | "month" | "all";

const COLORS = [
  "hsl(152, 45%, 28%)", "hsl(38, 72%, 56%)", "hsl(142, 71%, 45%)",
  "hsl(200, 60%, 50%)", "hsl(280, 50%, 55%)", "hsl(20, 70%, 50%)",
];

const getDaysInStore = (createdAt: string) => {
  const diff = Date.now() - new Date(createdAt).getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
};

const getAgeColor = (days: number) => {
  if (days < 7) return "text-primary";
  if (days <= 30) return "text-accent-foreground";
  return "text-destructive";
};

const getAgeBg = (days: number) => {
  if (days < 7) return "bg-primary/10";
  if (days <= 30) return "bg-accent/20";
  return "bg-destructive/10";
};

interface Props {
  inventory: InventoryItem[];
  payments: Payment[];
  staffHours: StaffEntry[];
}

const InventoryCharts = ({ inventory, payments, staffHours }: Props) => {
  const [period, setPeriod] = useState<Period>("all");

  const filterByPeriod = <T extends { date?: string; created_at?: string }>(items: T[]): T[] => {
    if (period === "all") return items;
    const now = new Date();
    const cutoff = new Date();
    if (period === "week") cutoff.setDate(now.getDate() - 7);
    else cutoff.setMonth(now.getMonth() - 1);
    return items.filter((item) => {
      const d = new Date((item as any).date || (item as any).created_at);
      return d >= cutoff;
    });
  };

  const handleExportCSV = () => {
    const headers = ["Crop,Quantity (kg),Days in Store,Status"];
    const rows = inventory.map(item => {
      const days = getDaysInStore(item.created_at);
      const status = days < 7 ? "Fresh" : days <= 30 ? "Aging" : "Old Stock";
      return `"${item.crop}",${Number(item.quantity_kg).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }).replace(/,/g, '')},${days},"${status}"`;
    });
    
    const csvContent = headers.concat(rows).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `inventory_report_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportPDF = () => {
    const doc = new jsPDF();
    doc.text("Inventory Report", 14, 15);
    doc.setFontSize(10);
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 22);

    const tableData = inventory.map(item => {
      const days = getDaysInStore(item.created_at);
      const status = days < 7 ? "Fresh" : days <= 30 ? "Aging" : "Old Stock";
      return [item.crop, `${Number(item.quantity_kg).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} kg`, `${days} days`, status];
    });

    autoTable(doc, {
      startY: 28,
      head: [["Crop", "Quantity", "Days in Store", "Status"]],
      body: tableData,
    });

    doc.save(`inventory_report_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const filteredPayments = filterByPeriod(payments.map((p) => ({ ...p })));

  // Stock levels by crop
  const stockData = useMemo(() => {
    const map: Record<string, number> = {};
    inventory.forEach((i) => { map[i.crop] = (map[i.crop] || 0) + Number(i.quantity_kg); });
    return Object.entries(map).map(([crop, qty]) => ({ crop, quantity: qty }));
  }, [inventory]);

  // Stock value distribution (pie)
  const stockValueData = useMemo(() => {
    const map: Record<string, number> = {};
    inventory.forEach((i) => { map[i.crop] = (map[i.crop] || 0) + Number(i.quantity_kg); });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [inventory]);

  // Sales over time (line)
  const salesData = useMemo(() => {
    const map: Record<string, number> = {};
    filteredPayments.forEach((p) => {
      const key = new Date(p.date).toLocaleDateString("en-US", { month: "short", day: "numeric" });
      map[key] = (map[key] || 0) + Number(p.amount);
    });
    return Object.entries(map).map(([date, amount]) => ({ date, amount }));
  }, [filteredPayments]);

  // Revenue by crop
  const revenueByCrop = useMemo(() => {
    const map: Record<string, number> = {};
    filteredPayments.forEach((p) => { map[p.crop_name] = (map[p.crop_name] || 0) + Number(p.amount); });
    return Object.entries(map).map(([crop, revenue]) => ({ crop, revenue }));
  }, [filteredPayments]);

  // Financial summary
  const totalRevenue = filteredPayments.reduce((s, p) => s + Number(p.amount), 0);
  const totalStaffCost = filterByPeriod(staffHours.map((s) => ({ ...s, date: s.date }))).reduce((s, h) => s + Number(h.hours) * (Number(h.rate_per_hour) || 0), 0);
  const netIncome = totalRevenue - totalStaffCost;
  const totalStockKg = inventory.reduce((s, i) => s + Number(i.quantity_kg), 0);
  const agingItems = inventory.filter((i) => getDaysInStore(i.created_at) > 30).length;

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground font-medium">Period:</span>
          {(["week", "month", "all"] as Period[]).map((p) => (
            <Button key={p} size="sm" variant={period === p ? "default" : "outline"} onClick={() => setPeriod(p)}>
              {p === "week" ? "This Week" : p === "month" ? "This Month" : "All Time"}
            </Button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={handleExportCSV} className="gap-2 border-primary/20 hover:bg-primary/5">
            <Download className="h-4 w-4 text-primary" />
            Export CSV
          </Button>
          <Button size="sm" variant="outline" onClick={handleExportPDF} className="gap-2 border-destructive/20 hover:bg-destructive/5 text-destructive hover:text-destructive">
            <Download className="h-4 w-4" />
            Export PDF
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-card p-4 rounded-xl shadow-soft border border-border">
          <div className="flex items-center gap-2 mb-1">
            <Package className="h-4 w-4 text-primary" />
            <p className="text-xs text-muted-foreground">Total Stock</p>
          </div>
          <p className="text-2xl font-display font-bold text-foreground">{totalStockKg.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} kg</p>
        </div>
        <div className="bg-card p-4 rounded-xl shadow-soft border border-border">
          <div className="flex items-center gap-2 mb-1">
            <DollarSign className="h-4 w-4 text-primary" />
            <p className="text-xs text-muted-foreground">Revenue</p>
          </div>
          <p className="text-2xl font-display font-bold text-primary">KES {totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
        </div>
        <div className="bg-card p-4 rounded-xl shadow-soft border border-border">
          <div className="flex items-center gap-2 mb-1">
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
            <p className="text-xs text-muted-foreground">Staff Costs</p>
          </div>
          <p className="text-2xl font-display font-bold text-muted-foreground">KES {totalStaffCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
        </div>
        <div className="bg-card p-4 rounded-xl shadow-soft border border-border">
          <div className="flex items-center gap-2 mb-1">
            <DollarSign className="h-4 w-4 text-primary" />
            <p className="text-xs text-muted-foreground">Net Income</p>
          </div>
          <p className={`text-2xl font-display font-bold ${netIncome >= 0 ? "text-primary" : "text-destructive"}`}>
            KES {netIncome.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </div>
      </div>

      {/* Aging Alert */}
      {agingItems > 0 && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
          <Clock className="h-4 w-4 text-destructive" />
          <p className="text-sm text-destructive font-medium">{agingItems} item(s) have been in store for over 30 days</p>
        </div>
      )}

      {/* Charts Grid */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Stock Levels */}
        <div className="bg-card p-5 rounded-xl shadow-soft border border-border">
          <h4 className="font-semibold text-foreground mb-4">Stock Levels by Crop</h4>
          {stockData.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No inventory data</p>
          ) : (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={stockData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="crop" tick={{ fontSize: 12 }} className="fill-muted-foreground" />
                <YAxis tick={{ fontSize: 12 }} className="fill-muted-foreground" />
                <Tooltip formatter={(value: number) => [`${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} kg`, "Quantity"]} />
                <Bar dataKey="quantity" fill="hsl(152, 45%, 28%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Stock Distribution */}
        <div className="bg-card p-5 rounded-xl shadow-soft border border-border">
          <h4 className="font-semibold text-foreground mb-4">Stock Distribution</h4>
          {stockValueData.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No inventory data</p>
          ) : (
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={stockValueData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label>
                  {stockValueData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => [`${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} kg`, "Quantity"]} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Sales Over Time */}
        <div className="bg-card p-5 rounded-xl shadow-soft border border-border">
          <h4 className="font-semibold text-foreground mb-4">Sales Over Time</h4>
          {salesData.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No sales data yet</p>
          ) : (
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={salesData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} className="fill-muted-foreground" />
                <YAxis tick={{ fontSize: 12 }} className="fill-muted-foreground" />
                <Tooltip formatter={(value: number) => [`KES ${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, "Sales"]} />
                <Line type="monotone" dataKey="amount" stroke="hsl(152, 45%, 28%)" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Revenue by Crop */}
        <div className="bg-card p-5 rounded-xl shadow-soft border border-border">
          <h4 className="font-semibold text-foreground mb-4">Revenue by Crop</h4>
          {revenueByCrop.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No revenue data yet</p>
          ) : (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={revenueByCrop}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="crop" tick={{ fontSize: 12 }} className="fill-muted-foreground" />
                <YAxis tick={{ fontSize: 12 }} className="fill-muted-foreground" />
                <Tooltip formatter={(value: number) => [`KES ${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, "Revenue"]} />
                <Bar dataKey="revenue" fill="hsl(38, 72%, 56%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Inventory Table with Aging */}
      <div className="bg-card rounded-xl shadow-soft border border-border">
        <div className="p-4 border-b border-border">
          <h4 className="font-semibold text-foreground">Inventory Aging</h4>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">Crop</th>
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">Qty (kg)</th>
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">Days in Store</th>
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">Status</th>
              </tr>
            </thead>
            <tbody>
              {inventory.map((item) => {
                const days = getDaysInStore(item.created_at);
                return (
                  <tr key={item.id} className="border-b border-border last:border-0">
                    <td className="p-4 font-medium text-foreground">{item.crop}</td>
                    <td className="p-4 text-muted-foreground">{Number(item.quantity_kg).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} kg</td>
                    <td className={`p-4 font-semibold ${getAgeColor(days)}`}>{days} days</td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getAgeBg(days)} ${getAgeColor(days)}`}>
                        {days < 7 ? "Fresh" : days <= 30 ? "Aging" : "Old Stock"}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default InventoryCharts;
