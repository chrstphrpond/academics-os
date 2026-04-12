"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { chartTheme } from "@/lib/chart-theme";

export interface GradeDistributionItem {
  grade: string;
  count: number;
}

interface GradeDistributionProps {
  data: GradeDistributionItem[];
}

function getBarColor(grade: string): string {
  const num = parseFloat(grade);
  if (isNaN(num)) return "hsl(var(--muted-foreground))";
  if (num <= 1.25) return "#10b981"; // emerald-500
  if (num <= 2.0) return "#3b82f6"; // blue-500
  if (num <= 2.75) return "#f59e0b"; // amber-500
  if (num <= 3.0) return "#f97316"; // orange-500
  return "#ef4444"; // red-500
}

export function GradeDistribution({ data }: GradeDistributionProps) {
  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Grade Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">No grades yet.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card aria-label="Grade distribution showing count of each grade earned">
      <CardHeader>
        <CardTitle>Grade Distribution</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
            >
              <CartesianGrid
                stroke={chartTheme.grid.stroke}
                strokeDasharray={chartTheme.grid.strokeDasharray}
              />
              <XAxis
                dataKey="grade"
                tick={{ fontSize: chartTheme.axis.fontSize, fill: chartTheme.axis.fill }}
                tickLine={chartTheme.axis.tickLine}
                axisLine={chartTheme.axis.axisLine}
              />
              <YAxis
                allowDecimals={false}
                tick={{ fontSize: chartTheme.axis.fontSize, fill: chartTheme.axis.fill }}
                tickLine={chartTheme.axis.tickLine}
                axisLine={chartTheme.axis.axisLine}
              />
              <Tooltip
                contentStyle={chartTheme.tooltip.contentStyle}
                formatter={(value) => [Number(value), "Courses"]}
              />
              <Bar dataKey="count" radius={[4, 4, 0, 0]} animationDuration={800}>
                {data.map((entry) => (
                  <Cell key={entry.grade} fill={getBarColor(entry.grade)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
