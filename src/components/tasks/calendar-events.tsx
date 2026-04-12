"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "lucide-react";
import { getUpcomingEvents, getDaysUntil, getTypeColor } from "@/lib/academic-calendar";

export function CalendarEvents() {
  const events = getUpcomingEvents(6);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground flex items-center gap-2">
          <Calendar className="h-3.5 w-3.5" />
          Upcoming Dates
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {events.map((event) => {
          const daysUntil = getDaysUntil(event.date);
          const isUrgent = daysUntil <= 7 && daysUntil >= 0;
          return (
            <div
              key={`${event.date}-${event.title}`}
              className={`flex items-start gap-3 text-sm ${isUrgent ? "opacity-100" : "opacity-70"}`}
            >
              <div className="flex flex-col items-center min-w-[40px]">
                <span className="text-[10px] text-muted-foreground uppercase">
                  {new Date(event.date).toLocaleDateString("en", { month: "short" })}
                </span>
                <span className="text-lg font-bold tabular-nums leading-tight">
                  {new Date(event.date).getDate()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium truncate ${isUrgent ? "text-red-400" : ""}`}>
                  {event.title}
                </p>
                <div className="flex items-center gap-2 mt-0.5">
                  <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${getTypeColor(event.type)}`}>
                    {event.type}
                  </Badge>
                  {daysUntil >= 0 && (
                    <span className="text-[10px] text-muted-foreground">
                      {daysUntil === 0 ? "Today" : daysUntil === 1 ? "Tomorrow" : `${daysUntil}d`}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        {events.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">No upcoming events</p>
        )}
      </CardContent>
    </Card>
  );
}
