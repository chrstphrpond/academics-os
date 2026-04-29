import { z } from "zod";
import { eq } from "drizzle-orm";
import { schema } from "@/lib/db";
import { withExplicitAuth } from "@/lib/db/auth";
import { registerTool } from "./registry";
import type { ToolDefinition, ToolRenderProps } from "./types";

const InputSchema = z.object({
  alertId: z.string().uuid(),
  reason: z.string().max(500).optional(),
});
type Input = z.infer<typeof InputSchema>;

interface Output {
  alertId: string;
  prevDismissed: boolean;
}

export const dismissAlertTool: ToolDefinition<Input, Output> = {
  name: "dismissAlert",
  description: "Dismiss an active alert by id, with an optional reason.",
  inputSchema: InputSchema,
  requiresConfirmation: false,
  readOnly: false,
  async execute(input, ctx) {
    return withExplicitAuth(ctx.clerkUserId, async (tx) => {
      const prev = await tx
        .select({ dismissed: schema.alerts.dismissed })
        .from(schema.alerts)
        .where(eq(schema.alerts.id, input.alertId))
        .limit(1);
      const prevDismissed = prev[0]?.dismissed ?? false;
      await tx
        .update(schema.alerts)
        .set({ dismissed: true })
        .where(eq(schema.alerts.id, input.alertId));
      return {
        output: { alertId: input.alertId, prevDismissed },
        undoInput: { alertId: input.alertId, prevDismissed },
        summary: `Dismissed alert ${input.alertId.slice(0, 8)}…`,
      };
    });
  },
  async undo(undoInput, ctx) {
    const { alertId, prevDismissed } = undoInput as {
      alertId: string;
      prevDismissed: boolean;
    };
    await withExplicitAuth(ctx.clerkUserId, async (tx) => {
      await tx
        .update(schema.alerts)
        .set({ dismissed: prevDismissed })
        .where(eq(schema.alerts.id, alertId));
    });
  },
  render({ input }: ToolRenderProps<Input, Output>) {
    return (
      <div className="space-y-1 text-sm">
        <div>
          Dismiss alert{" "}
          <span className="font-mono text-xs">{input.alertId.slice(0, 8)}…</span>
        </div>
        {input.reason && (
          <div className="text-xs text-muted-foreground">{input.reason}</div>
        )}
      </div>
    );
  },
};

registerTool(dismissAlertTool);
