"use client";

import { useTransition } from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { revalidateBriefing } from "@/actions/briefing";

export function RefreshButton() {
  const [pending, startTransition] = useTransition();
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="gap-1.5 text-xs"
      disabled={pending}
      onClick={() => {
        startTransition(async () => {
          await revalidateBriefing();
        });
      }}
    >
      <RefreshCw
        className={`h-3.5 w-3.5 ${pending ? "animate-spin" : ""}`}
        aria-hidden
      />
      {pending ? "Refreshing…" : "Refresh"}
    </Button>
  );
}
