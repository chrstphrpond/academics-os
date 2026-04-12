import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { AlertList } from "@/components/alerts/alert-list";
import { RefreshButton } from "@/components/alerts/refresh-button";
import { PageHeader } from "@/components/ui/animated";
import { AlertsSkeleton } from "@/components/ui/skeleton-cards";

async function AlertsContent() {
  const supabase = await createClient();

  const severityOrder = ["critical", "warning", "info"];

  const { data: alerts } = await supabase
    .from("alerts")
    .select("id, title, message, severity, created_at, due_date")
    .eq("dismissed", false)
    .order("created_at", { ascending: false });

  const sortedAlerts = (alerts ?? []).sort(
    (a, b) =>
      severityOrder.indexOf(a.severity) - severityOrder.indexOf(b.severity)
  );

  return <AlertList alerts={sortedAlerts} />;
}

export default function AlertsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <PageHeader
          title="Smart Alerts"
          description="Smart notifications about deadlines and grade changes"
        />
        <RefreshButton />
      </div>

      <Suspense fallback={<AlertsSkeleton />}>
        <AlertsContent />
      </Suspense>
    </div>
  );
}
