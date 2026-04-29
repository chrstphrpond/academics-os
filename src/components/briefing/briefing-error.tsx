import { AlertCircle } from "lucide-react";

export function BriefingError({ message }: { message?: string }) {
  return (
    <div className="rounded-lg border border-amber-400/30 bg-amber-400/5 p-4 text-sm">
      <div className="flex items-center gap-2 font-medium text-amber-200">
        <AlertCircle className="h-4 w-4" aria-hidden />
        Briefing unavailable
      </div>
      <p className="mt-1 text-amber-200/80">
        {message ??
          "Couldn't reach the briefing service. Your dashboard is still here — try refreshing in a minute."}
      </p>
    </div>
  );
}
