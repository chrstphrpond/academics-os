import Link from "next/link";
import { AlertTriangle, AlertCircle, Info } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Alert {
  id: string;
  type: string;
  title: string;
  message: string;
  severity: string;
}

const severityConfig = {
  critical: { icon: AlertTriangle, className: "text-red-500" },
  warning: { icon: AlertCircle, className: "text-amber-500" },
  info: { icon: Info, className: "text-sky-400" },
} as const;

export function AlertFeed({ alerts }: { alerts: Alert[] }) {
  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-sm font-medium text-muted-foreground">Active Alerts</CardTitle>
        <Link href="/alerts" className="text-xs text-primary hover:underline">View all</Link>
      </CardHeader>
      <CardContent className="space-y-3">
        {alerts.length === 0 ? (
          <p className="text-sm text-muted-foreground">No active alerts</p>
        ) : (
          alerts.slice(0, 3).map((alert) => {
            const config = severityConfig[alert.severity as keyof typeof severityConfig] || severityConfig.info;
            const Icon = config.icon;
            return (
              <div key={alert.id} className="flex items-start gap-3">
                <Icon className={`h-4 w-4 mt-0.5 shrink-0 ${config.className}`} />
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{alert.title}</p>
                  <p className="text-xs text-muted-foreground line-clamp-2">{alert.message}</p>
                </div>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
