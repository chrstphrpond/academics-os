export const chartTheme = {
  grid: { stroke: "hsl(var(--border))", strokeDasharray: "3 3" },
  axis: {
    fontSize: 11,
    fill: "hsl(var(--muted-foreground))",
    tickLine: false,
    axisLine: false,
  },
  tooltip: {
    contentStyle: {
      backgroundColor: "hsl(var(--card))",
      border: "1px solid hsl(var(--border))",
      borderRadius: "8px",
      boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
      fontSize: "12px",
    },
  },
};
