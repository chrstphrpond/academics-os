import { desc } from "drizzle-orm";
import { db, schema } from "@/lib/db";

export default async function AdminRunsPage() {
  const [runs, actions] = await Promise.all([
    db
      .select({
        id: schema.agentRuns.id,
        feature: schema.agentRuns.feature,
        model: schema.agentRuns.model,
        inputTokens: schema.agentRuns.inputTokens,
        outputTokens: schema.agentRuns.outputTokens,
        latencyMs: schema.agentRuns.latencyMs,
        createdAt: schema.agentRuns.createdAt,
      })
      .from(schema.agentRuns)
      .orderBy(desc(schema.agentRuns.createdAt))
      .limit(50),
    db
      .select({
        id: schema.agentActions.id,
        kind: schema.agentActions.kind,
        status: schema.agentActions.status,
        createdAt: schema.agentActions.createdAt,
        executedAt: schema.agentActions.executedAt,
        undoneAt: schema.agentActions.undoneAt,
      })
      .from(schema.agentActions)
      .orderBy(desc(schema.agentActions.createdAt))
      .limit(50),
  ]);

  const fmt = (d: Date | string | null) =>
    d ? new Date(d).toLocaleString() : "—";

  return (
    <div className="space-y-8 p-6">
      <header>
        <h1 className="text-lg font-semibold tracking-tight">Audit log</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Recent Vertex calls and agent mutations.
        </p>
      </header>

      <section>
        <h2 className="mb-3 text-sm font-medium text-foreground/80">
          Agent runs
        </h2>
        <div className="overflow-hidden rounded-md border border-border">
          <table className="w-full text-sm tabular-nums">
            <thead className="bg-muted/40 text-xs font-medium text-muted-foreground">
              <tr>
                <th className="px-3 py-2 text-left">When</th>
                <th className="px-3 py-2 text-left">Feature</th>
                <th className="px-3 py-2 text-left">Model</th>
                <th className="px-3 py-2 text-right">In tok</th>
                <th className="px-3 py-2 text-right">Out tok</th>
                <th className="px-3 py-2 text-right">Latency</th>
              </tr>
            </thead>
            <tbody>
              {runs.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-3 py-6 text-center text-muted-foreground"
                  >
                    No runs yet.
                  </td>
                </tr>
              ) : (
                runs.map((r) => (
                  <tr
                    key={r.id}
                    className="border-t border-border last:border-b-0"
                  >
                    <td className="px-3 py-1.5">{fmt(r.createdAt)}</td>
                    <td className="px-3 py-1.5">{r.feature}</td>
                    <td className="px-3 py-1.5 text-muted-foreground">
                      {r.model}
                    </td>
                    <td className="px-3 py-1.5 text-right">
                      {r.inputTokens ?? "—"}
                    </td>
                    <td className="px-3 py-1.5 text-right">
                      {r.outputTokens ?? "—"}
                    </td>
                    <td className="px-3 py-1.5 text-right">
                      {r.latencyMs != null ? `${r.latencyMs} ms` : "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-medium text-foreground/80">
          Agent actions
        </h2>
        <div className="overflow-hidden rounded-md border border-border">
          <table className="w-full text-sm tabular-nums">
            <thead className="bg-muted/40 text-xs font-medium text-muted-foreground">
              <tr>
                <th className="px-3 py-2 text-left">When</th>
                <th className="px-3 py-2 text-left">Kind</th>
                <th className="px-3 py-2 text-left">Status</th>
                <th className="px-3 py-2 text-left">Executed</th>
                <th className="px-3 py-2 text-left">Undone</th>
              </tr>
            </thead>
            <tbody>
              {actions.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-3 py-6 text-center text-muted-foreground"
                  >
                    No actions yet.
                  </td>
                </tr>
              ) : (
                actions.map((a) => (
                  <tr
                    key={a.id}
                    className="border-t border-border last:border-b-0"
                  >
                    <td className="px-3 py-1.5">{fmt(a.createdAt)}</td>
                    <td className="px-3 py-1.5">{a.kind}</td>
                    <td className="px-3 py-1.5 text-muted-foreground">
                      {a.status}
                    </td>
                    <td className="px-3 py-1.5">{fmt(a.executedAt)}</td>
                    <td className="px-3 py-1.5">{fmt(a.undoneAt)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
