import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

interface SpendingTrendsProps {
  data: { month: string; spent: number }[];
}

const SpendingTrends = ({ data }: SpendingTrendsProps) => (
  <div className="bg-card rounded-xl border border-border p-6 shadow-soft">
    <h3 className="font-display font-semibold text-foreground mb-4">Spending Trends</h3>
    {data.length === 0 ? (
      <p className="text-sm text-muted-foreground text-center py-8">No spending data yet.</p>
    ) : (
      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={data}>
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
            formatter={(value: number) => [`KES ${value.toLocaleString()}`, "Spent"]}
          />
          <Line type="monotone" dataKey="spent" stroke="hsl(38 72% 56%)" strokeWidth={2} dot={{ r: 4 }} />
        </LineChart>
      </ResponsiveContainer>
    )}
  </div>
);

export default SpendingTrends;
