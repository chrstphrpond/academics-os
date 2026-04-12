"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { StaggerList, StaggerItem } from "@/components/ui/animated";
import { AlertCard, type AlertItem } from "./alert-card";

const filters = ["all", "critical", "warning", "info"] as const;
type Filter = (typeof filters)[number];

const filterLabels: Record<Filter, string> = {
  all: "All",
  critical: "Critical",
  warning: "Warning",
  info: "Info",
};

export function AlertList({ alerts }: { alerts: AlertItem[] }) {
  const [filter, setFilter] = useState<Filter>("all");

  const counts: Record<Filter, number> = {
    all: alerts.length,
    critical: alerts.filter((a) => a.severity === "critical").length,
    warning: alerts.filter((a) => a.severity === "warning").length,
    info: alerts.filter((a) => a.severity === "info").length,
  };

  const filtered =
    filter === "all" ? alerts : alerts.filter((a) => a.severity === filter);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {filters.map((f) => (
          <Button
            key={f}
            variant={filter === f ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter(f)}
          >
            {filterLabels[f]} ({counts[f]})
          </Button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground py-8 text-center">
          No {filter === "all" ? "" : filter} alerts
        </p>
      ) : (
        <StaggerList className="space-y-3">
          {filtered.map((alert) => (
            <StaggerItem key={alert.id}>
              <AlertCard alert={alert} />
            </StaggerItem>
          ))}
        </StaggerList>
      )}
    </div>
  );
}
