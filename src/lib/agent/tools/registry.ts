import { tool } from "ai";
import type { ToolDefinition } from "./types";

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
 * Convert all registered tools into the AI SDK 6 `tools` map shape so we can
 * pass them to `streamText`/`generateText`.
 *
 * AI SDK execution intentionally returns just a placeholder — the actual
 * mutation happens via the user-approved server action `runTool`.
 */
export function aiSdkTools() {
  // AI SDK's `tool()` is strongly typed per-call; we erase the heterogeneous
  // tools into a Record so the shape matches `streamText`'s `tools:` parameter.
  const out: Record<string, unknown> = {};
  for (const def of _registry.values()) {
    out[def.name] = tool({
      description: def.description,
      inputSchema: def.inputSchema as never,
      execute: async () => ({
        status: def.requiresConfirmation ? "awaiting-approval" : "auto-approved",
        name: def.name,
      }),
    });
  }
  return out as Parameters<typeof tool>[0] extends unknown
    ? Record<string, ReturnType<typeof tool>>
    : never;
}
