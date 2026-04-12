"use client";

import { AlertTriangle, AlertCircle, Info, X } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { InteractiveCard } from "@/components/ui/animated";
import { dismissAlert } from "@/actions/alerts";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

export interface AlertItem {
  id: string;
  title: string;
  message: string;
  severity: string;
  created_at: string | null;
  due_date: string | null;
}

const severityConfig = {
  critical: {
    icon: AlertTriangle,
    className: "text-red-500",
    bg: "border-red-500/25 bg-red-500/5",
  },
  warning: {
    icon: AlertCircle,
    className: "text-amber-500",
    bg: "border-amber-500/25 bg-amber-500/5",
  },
  info: {
    icon: Info,
    className: "text-sky-400",
    bg: "border-sky-500/25 bg-sky-500/5",
  },
} as const;

export function AlertCard({ alert }: { alert: AlertItem }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const config =
    severityConfig[alert.severity as keyof typeof severityConfig] ??
    severityConfig.info;
  const Icon = config.icon;

  function handleDismiss() {
    startTransition(async () => {
      await dismissAlert(alert.id);
      router.refresh();
    });
  }

  return (
    <InteractiveCard>
    <Card className={`${config.bg} border`}>
      <CardContent className="flex items-start gap-3 py-4">
        <Icon className={`h-5 w-5 mt-0.5 shrink-0 ${config.className}`} />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">{alert.title}</p>
          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-3">
            {alert.message}
          </p>
          {alert.due_date && (
            <p className="text-xs text-muted-foreground mt-1">
              Due:{" "}
              {new Date(alert.due_date).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </p>
          )}
          {alert.created_at && (
            <p className="text-xs text-muted-foreground/60 mt-1">
              {new Date(alert.created_at).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
              })}
            </p>
          )}
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 shrink-0"
          onClick={handleDismiss}
          disabled={isPending}
          aria-label="Dismiss alert"
        >
          <X className="h-4 w-4" />
        </Button>
      </CardContent>
    </Card>
    </InteractiveCard>
  );
}
