"use client";

import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { refreshAlerts } from "@/actions/alerts";
import { toast } from "sonner";
import { useTransition } from "react";

export function RefreshButton() {
  const [isPending, startTransition] = useTransition();
  return (
    <Button
      variant="outline"
      size="sm"
      disabled={isPending}
      onClick={() => {
        startTransition(async () => {
          await refreshAlerts();
          toast.success("Alerts refreshed");
        });
      }}
    >
      <RefreshCw className={`h-3 w-3 mr-2 ${isPending ? "animate-spin" : ""}`} />
      Refresh
    </Button>
  );
}
