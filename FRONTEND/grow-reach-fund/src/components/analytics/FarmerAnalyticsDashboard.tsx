import React, { useMemo, useState } from "react";
import { format, subMonths, isSameMonth, parseISO } from "date-fns";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowDown, ArrowUp, Calendar, Download } from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface Payment {
  id: number | string;
  amount: string | number;
  date: string;
  crop_name?: string;
  status: string;
}

interface StaffHour {
  id: number | string;
  staff_name: string;
  role?: string;
  hours: string | number;
  date: string;
  rate_per_hour?: string | number;
}

interface Props {
  payments: Payment[];
  staffHours: StaffHour[];
}

const COLORS = ["#10b981", "#3b82f6", "#f59e0b", "#8b5cf6", "#ec4899", "#14b8a6"];

const FarmerAnalyticsDashboard: React.FC<Props> = ({ payments, staffHours }) => {
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const data = useMemo(() => {
    let filteredPayments = payments;
    let filteredStaffHours = staffHours;

    if (fromDate && toDate) {
      const start = new Date(fromDate);
      const end = new Date(toDate);
      end.setHours(23, 59, 59, 999);
      filteredPayments = payments.filter((p) => {
        const d = new Date(p.date);
        return d >= start && d <= end;
      });
      filteredStaffHours = staffHours.filter((s) => {
        const d = new Date(s.date);
        return d >= start && d <= end;
      });
    }

    const totalIncome = filteredPayments.reduce((sum, p) => sum + Number(p.amount), 0);
    const totalExpenses = filteredStaffHours.reduce((sum, s) => {
      const rate = s.rate_per_hour ? Number(s.rate_per_hour) : 0;
      return sum + (Number(s.hours) * rate);
    }, 0);

    const netBalance = totalIncome - totalExpenses;
    const profitMargin = totalIncome > 0 ? ((netBalance / totalIncome) * 100).toFixed(1) : "0.0";

    // Previous month data for percentage changes
    const now = new Date();
    const lastMonth = subMonths(now, 1);
    
    const lastMonthPayments = payments.filter(p => isSameMonth(new Date(p.date), lastMonth));
    const lastMonthStaffHours = staffHours.filter(s => isSameMonth(new Date(s.date), lastMonth));

    const lmIncome = lastMonthPayments.reduce((sum, p) => sum + Number(p.amount), 0);
    const lmExpenses = lastMonthStaffHours.reduce((sum, s) => sum + (Number(s.hours) * (Number(s.rate_per_hour) || 0)), 0);

    const incomeChange = lmIncome > 0 ? (((totalIncome - lmIncome) / lmIncome) * 100).toFixed(1) : "100";
    const expenseChange = lmExpenses > 0 ? (((totalExpenses - lmExpenses) / lmExpenses) * 100).toFixed(1) : "100";

    // Monthly data for Bar Chart (last 6 months dynamically based on data)
    const monthlyDataMap: Record<string, { month: string; Income: number; Expenses: number; timestamp: number }> = {};
    
    [...filteredPayments, ...filteredStaffHours].forEach(item => {
      const d = new Date(item.date);
      const key = format(d, "MMM yyyy");
      if (!monthlyDataMap[key]) {
        monthlyDataMap[key] = { month: key, Income: 0, Expenses: 0, timestamp: d.getTime() };
      }
    });

    filteredPayments.forEach(p => {
      const key = format(new Date(p.date), "MMM yyyy");
      monthlyDataMap[key].Income += Number(p.amount);
    });

    filteredStaffHours.forEach(s => {
      const key = format(new Date(s.date), "MMM yyyy");
      monthlyDataMap[key].Expenses += Number(s.hours) * (Number(s.rate_per_hour) || 0);
    });

    const monthlyData = Object.values(monthlyDataMap).sort((a, b) => a.timestamp - b.timestamp);

    // Income by Category
    const incomeCategoryMap: Record<string, number> = {};
    filteredPayments.forEach(p => {
      const cat = p.crop_name || "General";
      incomeCategoryMap[cat] = (incomeCategoryMap[cat] || 0) + Number(p.amount);
    });
    const incomeByCategory = Object.entries(incomeCategoryMap)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    // Expenses by Category
    const expenseCategoryMap: Record<string, number> = {};
    filteredStaffHours.forEach(s => {
      const cat = s.role || "General Labor";
      expenseCategoryMap[cat] = (expenseCategoryMap[cat] || 0) + (Number(s.hours) * (Number(s.rate_per_hour) || 0));
    });
    const expensesByCategory = Object.entries(expenseCategoryMap)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    // Split Data
    const splitData = [
      { name: "Income", value: totalIncome },
      { name: "Expense", value: totalExpenses },
    ];

    const leadingIncomeCategory = incomeByCategory[0]?.name || "N/A";
    const leadingIncomeCatPercent = totalIncome > 0 ? ((incomeByCategory[0]?.value || 0) / totalIncome * 100).toFixed(1) : "0";
    
    const leadingExpenseCategory = expensesByCategory[0]?.name || "N/A";
    const leadingExpenseCatPercent = totalExpenses > 0 ? ((expensesByCategory[0]?.value || 0) / totalExpenses * 100).toFixed(1) : "0";

    const incomeExceedsPercent = totalExpenses > 0 ? (((totalIncome - totalExpenses) / totalExpenses) * 100).toFixed(1) : "100";

    return {
      totalIncome, totalExpenses, netBalance, profitMargin,
      incomeChange, expenseChange,
      monthlyData, incomeByCategory, expensesByCategory,
      splitData,
      leadingIncomeCategory, leadingIncomeCatPercent,
      leadingExpenseCategory, leadingExpenseCatPercent,
      incomeExceedsPercent
    };
  }, [payments, staffHours, fromDate, toDate]);

  return (
    <div className="space-y-6">
      {/* Header Area */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card p-4 rounded-xl shadow-sm border border-border">
        <div>
          <h2 className="text-xl font-bold text-foreground">Financial Reports</h2>
          <p className="text-xs text-muted-foreground mt-1">Data refreshed: {new Date().toLocaleString()}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">From</span>
            <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="h-9 w-[130px] text-xs" />
            <span className="text-xs text-muted-foreground">To</span>
            <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="h-9 w-[130px] text-xs" />
          </div>
          <Button size="sm" variant="outline" className="h-9"><Calendar className="mr-2 h-4 w-4" /> Apply</Button>
          <Button size="sm" variant="outline" className="h-9"><Download className="mr-2 h-4 w-4" /> Excel</Button>
          <Button size="sm" variant="outline" className="h-9"><Download className="mr-2 h-4 w-4" /> PDF</Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Income */}
        <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-5 relative overflow-hidden">
          <div className="relative z-10">
            <p className="text-xs font-semibold text-emerald-800 uppercase tracking-wider mb-1">Total Income</p>
            <h3 className="text-2xl font-bold text-emerald-900">KSH {data.totalIncome.toLocaleString()}</h3>
            <p className="text-xs text-emerald-700 mt-2 flex items-center">
              <ArrowUp className="h-3 w-3 mr-1" /> {data.incomeChange}% vs last month
            </p>
          </div>
        </div>
        
        {/* Total Expenses */}
        <div className="bg-rose-50 border border-rose-100 rounded-xl p-5 relative overflow-hidden">
          <div className="relative z-10">
            <p className="text-xs font-semibold text-rose-800 uppercase tracking-wider mb-1">Total Expenses</p>
            <h3 className="text-2xl font-bold text-rose-900">KSH {data.totalExpenses.toLocaleString()}</h3>
            <p className="text-xs text-rose-700 mt-2 flex items-center">
              <ArrowUp className="h-3 w-3 mr-1" /> {data.expenseChange}% vs last month
            </p>
          </div>
        </div>

        {/* Net Balance */}
        <div className="bg-blue-600 border border-blue-500 rounded-xl p-5 relative overflow-hidden text-white shadow-md">
          <div className="relative z-10">
            <p className="text-xs font-semibold text-blue-100 uppercase tracking-wider mb-1">Net Balance</p>
            <h3 className="text-2xl font-bold text-white">KSH {data.netBalance.toLocaleString()}</h3>
            <p className="text-xs text-blue-200 mt-2">Income minus expenses</p>
          </div>
        </div>

        {/* Profit Margin */}
        <div className="bg-orange-500 border border-orange-400 rounded-xl p-5 relative overflow-hidden text-white shadow-md">
          <div className="relative z-10">
            <p className="text-xs font-semibold text-orange-100 uppercase tracking-wider mb-1">Profit Margin</p>
            <div className="flex items-center justify-between">
              <h3 className="text-2xl font-bold text-white">{data.profitMargin}%</h3>
              <span className="text-3xl font-light opacity-50">%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Middle Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Income vs Expense Split */}
        <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
          <h3 className="text-sm font-semibold mb-4 text-foreground">Income vs Expense Split</h3>
          <div className="flex flex-col sm:flex-row items-center gap-6 h-[250px]">
            <div className="flex-1 w-full h-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data.splitData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    <Cell fill="#10b981" />
                    <Cell fill="#ef4444" />
                  </Pie>
                  <Tooltip formatter={(value) => `KSH ${Number(value).toLocaleString()}`} />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex-1 space-y-3">
              <p className="text-xs text-muted-foreground"><span className="inline-block w-2 h-2 rounded-full bg-emerald-500 mr-2"></span>Income exceeds expenses by <strong>{data.incomeExceedsPercent}%</strong>.</p>
              <p className="text-xs text-muted-foreground"><ArrowUp className="inline w-3 h-3 text-emerald-500 mr-1" />Income up {data.incomeChange}% vs last month.</p>
              <p className="text-xs text-muted-foreground"><ArrowDown className="inline w-3 h-3 text-rose-500 mr-1" />Expenses up {data.expenseChange}% vs last month.</p>
              <p className="text-xs text-muted-foreground"><span className="font-semibold">{data.leadingIncomeCategory}</span> leads income at {data.leadingIncomeCatPercent}%.</p>
              <p className="text-xs text-muted-foreground"><span className="font-semibold">{data.leadingExpenseCategory}</span> highest expenses at {data.leadingExpenseCatPercent}%.</p>
              <p className="text-xs text-muted-foreground"><span className="inline-block w-2 h-2 rounded-full bg-orange-500 mr-2"></span>Profit margin: {data.profitMargin}%</p>
            </div>
          </div>
        </div>

        {/* Monthly Bar Chart */}
        <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
          <h3 className="text-sm font-semibold mb-4 text-foreground">Income vs Expenses — Monthly</h3>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.monthlyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#6b7280" }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#6b7280" }} tickFormatter={(val) => val >= 1000 ? `${val/1000}k` : val} />
                <Tooltip formatter={(value) => `KSH ${Number(value).toLocaleString()}`} cursor={{ fill: 'transparent' }} />
                <Legend verticalAlign="top" align="right" iconType="circle" wrapperStyle={{ fontSize: '12px', paddingBottom: '10px' }} />
                <Bar dataKey="Income" fill="#3b82f6" radius={[2, 2, 0, 0]} maxBarSize={30} />
                <Bar dataKey="Expenses" fill="#ef4444" radius={[2, 2, 0, 0]} maxBarSize={30} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Bottom Row - Category Splits */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Income by Category */}
        <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
          <h3 className="text-sm font-semibold mb-4 text-foreground">Income by Department</h3>
          <div className="flex flex-col sm:flex-row items-center gap-6 h-[200px]">
             <div className="w-[180px] h-full flex-shrink-0">
               <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data.incomeByCategory.slice(0, 5)}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={70}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {data.incomeByCategory.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => `KSH ${Number(value).toLocaleString()}`} />
                </PieChart>
              </ResponsiveContainer>
             </div>
             <div className="flex-1 w-full space-y-4">
                {data.incomeByCategory.slice(0, 3).map((cat, index) => (
                  <div key={cat.name} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="font-semibold text-foreground">{cat.name}</span>
                      <span className="text-muted-foreground">{(data.totalIncome > 0 ? (cat.value / data.totalIncome * 100) : 0).toFixed(1)}%</span>
                    </div>
                    <Progress value={data.totalIncome > 0 ? (cat.value / data.totalIncome * 100) : 0} className="h-1.5" indicatorClassName={`bg-[${COLORS[index % COLORS.length]}]`} />
                    <p className="text-[10px] text-muted-foreground mt-0.5">KSH {cat.value.toLocaleString()}</p>
                  </div>
                ))}
             </div>
          </div>
        </div>

        {/* Expenses by Category */}
        <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
          <h3 className="text-sm font-semibold mb-4 text-foreground">Expenses by Department</h3>
          <div className="flex flex-col sm:flex-row items-center gap-6 h-[200px]">
             <div className="w-[180px] h-full flex-shrink-0">
               <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data.expensesByCategory.slice(0, 5)}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={70}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {data.expensesByCategory.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => `KSH ${Number(value).toLocaleString()}`} />
                </PieChart>
              </ResponsiveContainer>
             </div>
             <div className="flex-1 w-full space-y-4">
                {data.expensesByCategory.slice(0, 3).map((cat, index) => (
                  <div key={cat.name} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="font-semibold text-foreground">{cat.name}</span>
                      <span className="text-muted-foreground">{(data.totalExpenses > 0 ? (cat.value / data.totalExpenses * 100) : 0).toFixed(1)}%</span>
                    </div>
                    <Progress value={data.totalExpenses > 0 ? (cat.value / data.totalExpenses * 100) : 0} className="h-1.5" indicatorClassName={`bg-rose-500`} />
                    <p className="text-[10px] text-muted-foreground mt-0.5">KSH {cat.value.toLocaleString()}</p>
                  </div>
                ))}
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FarmerAnalyticsDashboard;
