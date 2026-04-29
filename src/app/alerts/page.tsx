import { Suspense } from "react";
import { db, schema } from "@/lib/db";
import { eq, desc } from "drizzle-orm";
import { AlertList } from "@/components/alerts/alert-list";
import { RefreshButton } from "@/components/alerts/refresh-button";
import { PageHeader } from "@/components/ui/animated";
import { AlertsSkeleton } from "@/components/ui/skeleton-cards";

async function AlertsContent() {
  const severityOrder = ["critical", "warning", "info"];

  const rows = await db
    .select({
      id: schema.alerts.id,
      title: schema.alerts.title,
      message: schema.alerts.message,
      severity: schema.alerts.severity,
      createdAt: schema.alerts.createdAt,
      dueDate: schema.alerts.dueDate,
    })
    .from(schema.alerts)
    .where(eq(schema.alerts.dismissed, false))
    .orderBy(desc(schema.alerts.createdAt));

  const alerts = rows.map((r) => ({
    id: r.id,
    title: r.title,
    message: r.message,
    severity: r.severity,
    created_at: r.createdAt ? r.createdAt.toISOString() : null,
    due_date: r.dueDate ?? null,
  }));

  const sortedAlerts = alerts.sort(
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
