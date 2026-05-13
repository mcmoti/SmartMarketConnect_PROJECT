import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

interface RevenueChartProps {
  data: { month: string; revenue: number }[];
}

const RevenueChart = ({ data }: RevenueChartProps) => (
  <div className="bg-card rounded-xl border border-border p-6 shadow-soft">
    <h3 className="font-display font-semibold text-foreground mb-4">Monthly Revenue</h3>
    {data.length === 0 ? (
      <p className="text-sm text-muted-foreground text-center py-8">No revenue data yet.</p>
    ) : (
      <ResponsiveContainer width="100%" height={280}>
        <AreaChart data={data}>
          <defs>
            <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="hsl(152 45% 28%)" stopOpacity={0.3} />
              <stop offset="95%" stopColor="hsl(152 45% 28%)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(40 15% 88%)" />
          <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="hsl(150 10% 45%)" />
          <YAxis tick={{ fontSize: 12 }} stroke="hsl(150 10% 45%)" />
          <Tooltip
            contentStyle={{
              background: "hsl(0 0% 100%)",
              border: "1px solid hsl(40 15% 88%)",
              borderRadius: "8px",
              fontSize: "12px",
            }}
            formatter={(value: number) => [`KES ${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, "Revenue"]}
          />
          <Area type="monotone" dataKey="revenue" stroke="hsl(152 45% 28%)" fill="url(#revGrad)" strokeWidth={2} />
        </AreaChart>
      </ResponsiveContainer>
    )}
  </div>
);

export default RevenueChart;
