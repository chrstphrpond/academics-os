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
              margin={{ top: 10, right: 20, left: 10, bottom: 20 }}
            >
              <CartesianGrid
                stroke="rgba(255,255,255,0.06)"
                strokeDasharray="3 3"
                vertical={false}
              />
              <XAxis
                dataKey="grade"
                tick={{ fontSize: 11, fill: "rgba(255,255,255,0.6)" }}
                tickLine={false}
                axisLine={false}
                height={40}
              />
              <YAxis
                allowDecimals={false}
                tick={{ fontSize: 11, fill: "rgba(255,255,255,0.5)" }}
                tickLine={false}
                axisLine={false}
                width={30}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "rgba(10,10,12,0.95)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: "8px",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.4)",
                  fontSize: "12px",
                  padding: "8px 12px",
                }}
                formatter={(value) => [Number(value), "Courses"]}
                cursor={{ fill: "rgba(255,255,255,0.03)" }}
              />
              <Bar
                dataKey="count"
                radius={[6, 6, 0, 0]}
                animationDuration={800}
                animationBegin={200}
              >
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
