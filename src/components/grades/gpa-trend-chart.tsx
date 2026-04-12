"use client";

import {
  LineChart,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { chartTheme } from "@/lib/chart-theme";
import type { TermGpa } from "@/lib/gpa";

interface GpaTrendChartProps {
  termGpas: TermGpa[];
}

export function GpaTrendChart({ termGpas }: GpaTrendChartProps) {
  if (termGpas.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>GPA Trend</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">
            No graded terms yet.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card aria-label="GPA trend chart showing performance across terms">
      <CardHeader>
        <CardTitle>GPA Trend</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={termGpas}
              margin={{ top: 10, right: 30, left: 10, bottom: 20 }}
            >
              <defs>
                <linearGradient id="gpaGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#6366f1" stopOpacity={0.2} />
                  <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid
                stroke="rgba(255,255,255,0.06)"
                strokeDasharray="3 3"
                vertical={false}
              />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 10, fill: "rgba(255,255,255,0.5)" }}
                tickLine={false}
                axisLine={false}
                angle={-20}
                textAnchor="end"
                height={50}
              />
              <YAxis
                reversed
                domain={[1.0, 3.0]}
                ticks={[1.0, 1.5, 2.0, 2.5, 3.0]}
                tick={{ fontSize: 10, fill: "rgba(255,255,255,0.5)" }}
                tickLine={false}
                axisLine={false}
                width={35}
                tickFormatter={(v: number) => v.toFixed(1)}
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
                labelStyle={{ color: "rgba(255,255,255,0.7)", marginBottom: "4px" }}
                formatter={(value) => [Number(value).toFixed(2), "GPA"]}
              />
              <Area
                type="monotone"
                dataKey="gpa"
                fill="url(#gpaGradient)"
                strokeWidth={0}
                tooltipType="none"
              />
              <Line
                type="monotone"
                dataKey="gpa"
                stroke="#6366f1"
                strokeWidth={2.5}
                dot={{ r: 5, fill: "#6366f1", stroke: "#0a0a0c", strokeWidth: 2 }}
                activeDot={{ r: 7, fill: "#6366f1", stroke: "rgba(99,102,241,0.3)", strokeWidth: 4 }}
                animationDuration={1000}
                animationEasing="ease-out"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
