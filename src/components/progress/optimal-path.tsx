"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, Route } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { TermPlan } from "@/lib/path-calculator";

interface OptimalPathProps {
  termPlans: TermPlan[];
  totalRemainingUnits: number;
}

function getTermBorderColor(totalUnits: number): string {
  if (totalUnits > 18) return "border-red-500";
  if (totalUnits >= 16) return "border-amber-500";
  return "border-green-500";
}

export function OptimalPath({
  termPlans,
  totalRemainingUnits,
}: OptimalPathProps) {
  const [open, setOpen] = useState(false);

  if (termPlans.length === 0) return null;

  return (
    <Card>
      <Collapsible open={open} onOpenChange={setOpen}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Route className="size-5 text-muted-foreground" />
              <CardTitle>Optimal Path</CardTitle>
              <Badge variant="secondary">
                {termPlans.length} term{termPlans.length !== 1 ? "s" : ""} remaining
              </Badge>
              <Badge variant="outline">
                {totalRemainingUnits} units left
              </Badge>
            </div>
            <CollapsibleTrigger
              render={
                <Button variant="ghost" size="sm">
                  {open ? (
                    <ChevronDown className="size-4" />
                  ) : (
                    <ChevronRight className="size-4" />
                  )}
                </Button>
              }
            />
          </div>
        </CardHeader>

        <CollapsibleContent>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {termPlans.map((term) => (
                <div
                  key={term.termNumber}
                  className={`rounded-lg border-l-4 bg-muted/30 p-3 ${getTermBorderColor(term.totalUnits)}`}
                >
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-sm font-semibold">{term.label}</span>
                    <Badge variant="outline" className="text-xs">
                      {term.totalUnits} units
                    </Badge>
                  </div>
                  <ul className="space-y-1">
                    {term.courses.map((course) => (
                      <li
                        key={course.code}
                        className="text-xs text-muted-foreground"
                      >
                        <span className="font-medium text-foreground">
                          {course.code}
                        </span>{" "}
                        {course.title}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
