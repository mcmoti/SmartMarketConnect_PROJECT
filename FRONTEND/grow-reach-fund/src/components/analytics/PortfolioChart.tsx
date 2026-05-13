import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";

interface PortfolioChartProps {
  data: { name: string; value: number; color: string }[];
}

const PortfolioChart = ({ data }: PortfolioChartProps) => (
  <div className="bg-card rounded-xl border border-border p-6 shadow-soft">
    <h3 className="font-display font-semibold text-foreground mb-4">Loan Portfolio</h3>
    {data.every((d) => d.value === 0) ? (
      <p className="text-sm text-muted-foreground text-center py-8">No portfolio data yet.</p>
    ) : (
      <ResponsiveContainer width="100%" height={280}>
        <PieChart>
          <Pie data={data} cx="50%" cy="50%" innerRadius={60} outerRadius={100} dataKey="value" paddingAngle={3}>
            {data.map((entry) => (
              <Cell key={entry.name} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              background: "hsl(0 0% 100%)",
              border: "1px solid hsl(40 15% 88%)",
              borderRadius: "8px",
              fontSize: "12px",
            }}
          />
          <Legend wrapperStyle={{ fontSize: "12px" }} />
        </PieChart>
      </ResponsiveContainer>
    )}
  </div>
);

export default PortfolioChart;
