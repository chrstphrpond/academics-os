import { createClient } from "@/lib/supabase/server";
import { refreshAlerts } from "@/actions/alerts";
import { AlertList } from "@/components/alerts/alert-list";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";

export default async function AlertsPage() {
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Smart Alerts</h1>
          <p className="text-muted-foreground mt-1">
            Smart notifications about deadlines and grade changes
          </p>
        </div>
        <form action={refreshAlerts}>
          <Button variant="outline" size="sm" type="submit">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </form>
      </div>

      <AlertList alerts={sortedAlerts} />
    </div>
  );
}
