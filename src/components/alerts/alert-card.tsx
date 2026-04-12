"use client";

import { AlertTriangle, AlertCircle, Info, X } from "lucide-react";
import { motion } from "framer-motion";
import { dismissAlert } from "@/actions/alerts";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";

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
    textClass: "text-red-500",
    bgClass: "bg-red-500/10",
    borderClass: "border-l-red-500",
    glowClass: "shadow-[inset_0_0_20px_rgba(239,68,68,0.05)]",
  },
  warning: {
    icon: AlertCircle,
    textClass: "text-amber-500",
    bgClass: "bg-amber-500/10",
    borderClass: "border-l-amber-500",
    glowClass: "shadow-[inset_0_0_20px_rgba(245,158,11,0.05)]",
  },
  info: {
    icon: Info,
    textClass: "text-sky-400",
    bgClass: "bg-sky-400/10",
    borderClass: "border-l-sky-400",
    glowClass: "",
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
      toast("Alert dismissed");
    });
  }

  return (
    <motion.div
      whileHover={{ scale: 1.01, transition: { duration: 0.15 } }}
      whileTap={{ scale: 0.98 }}
      className="group"
    >
      <div
        className={`bg-white/[0.02] backdrop-blur-sm border border-white/[0.06] border-l-[3px] ${config.borderClass} ${config.glowClass} rounded-xl px-4 py-4`}
      >
        <div className="flex items-start gap-3">
          <div
            className={`h-8 w-8 rounded-full ${config.bgClass} flex items-center justify-center shrink-0`}
          >
            <Icon className={`h-4 w-4 ${config.textClass}`} />
          </div>
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
              <p className="text-[10px] text-muted-foreground/40 mt-1.5 uppercase tracking-wider">
                {new Date(alert.created_at).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                })}
              </p>
            )}
          </div>
          <button
            className="h-7 w-7 shrink-0 flex items-center justify-center rounded-md text-muted-foreground/60 hover:text-foreground hover:bg-white/[0.05] opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-50"
            onClick={handleDismiss}
            disabled={isPending}
            aria-label="Dismiss alert"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}
