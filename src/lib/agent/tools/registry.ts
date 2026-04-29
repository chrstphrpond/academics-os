import { tool } from "ai";
import type { ToolContext, ToolDefinition } from "./types";

const _registry = new Map<string, ToolDefinition>();

export function registerTool<I, O>(def: ToolDefinition<I, O>) {
  if (_registry.has(def.name)) {
    throw new Error(`Tool already registered: ${def.name}`);
  }
  _registry.set(def.name, def as unknown as ToolDefinition);
}

export function getTool(name: string): ToolDefinition | undefined {
  return _registry.get(name);
}

export function listTools(): ToolDefinition[] {
  return Array.from(_registry.values());
}

/**
 * Convert all registered tools into the AI SDK 6 `tools` map shape.
 *
 * Read-only tools auto-execute server-side so the model gets real data and can
 * answer in a single turn. Mutating tools return an `awaiting-approval`
 * placeholder; the actual mutation runs through the user-approved `runTool`
 * server action.
 */
export function aiSdkTools(ctx?: ToolContext) {
  const out: Record<string, unknown> = {};
  for (const def of _registry.values()) {
    out[def.name] = tool({
      description: def.description,
      inputSchema: def.inputSchema as never,
      execute: async (input: unknown) => {
        if (def.readOnly && ctx) {
          try {
            const diff = await def.execute(input as never, ctx);
            return diff.output;
          } catch (e) {
            return {
              error: e instanceof Error ? e.message : String(e),
              tool: def.name,
            };
          }
        }
        return {
          status: def.requiresConfirmation ? "awaiting-approval" : "auto-approved",
          name: def.name,
        };
      },
    });
  }
  return out as Parameters<typeof tool>[0] extends unknown
    ? Record<string, ReturnType<typeof tool>>
    : never;
}
