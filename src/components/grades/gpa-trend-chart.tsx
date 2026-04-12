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
              margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
            >
              <defs>
                <linearGradient id="gpaGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="0%"
                    stopColor="hsl(var(--primary))"
                    stopOpacity={0.3}
                  />
                  <stop
                    offset="100%"
                    stopColor="hsl(var(--primary))"
                    stopOpacity={0}
                  />
                </linearGradient>
              </defs>
              <CartesianGrid
                stroke={chartTheme.grid.stroke}
                strokeDasharray={chartTheme.grid.strokeDasharray}
              />
              <XAxis
                dataKey="label"
                tick={{ fontSize: chartTheme.axis.fontSize, fill: chartTheme.axis.fill }}
                tickLine={chartTheme.axis.tickLine}
                axisLine={chartTheme.axis.axisLine}
              />
              <YAxis
                reversed
                domain={[1.0, 3.5]}
                tick={{ fontSize: chartTheme.axis.fontSize, fill: chartTheme.axis.fill }}
                tickLine={chartTheme.axis.tickLine}
                axisLine={chartTheme.axis.axisLine}
              />
              <Tooltip
                contentStyle={chartTheme.tooltip.contentStyle}
                formatter={(value) => [Number(value).toFixed(2), "GPA"]}
              />
              <Area
                type="monotone"
                dataKey="gpa"
                fill="url(#gpaGradient)"
                strokeWidth={0}
              />
              <Line
                type="monotone"
                dataKey="gpa"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                dot={{ r: 4, fill: "hsl(var(--primary))" }}
                activeDot={{ r: 6 }}
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
