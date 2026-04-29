import { z } from "zod";
import { sql } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { registerTool } from "./registry";
import type { ToolDefinition, ToolRenderProps } from "./types";

const InputSchema = z.object({
  query: z.string().min(1).max(500),
  k: z.number().int().min(1).max(10).optional(),
});
type Input = z.infer<typeof InputSchema>;

interface Hit {
  title: string;
  source: string;
  url: string | null;
  snippet: string;
}
interface Output {
  hits: Hit[];
}

export const searchKnowledgeTool: ToolDefinition<Input, Output> = {
  name: "searchKnowledge",
  description:
    "Search the MMDC FAQ + handbook for the user's query. Returns up to k=4 grounded snippets with citations.",
  inputSchema: InputSchema,
  requiresConfirmation: false,
  readOnly: true,
  async execute(input) {
    const k = input.k ?? 4;
    const fts = sql`to_tsvector('english', title || ' ' || content) @@ plainto_tsquery('english', ${input.query})`;
    const rows = await db
      .select({
        title: schema.knowledgeChunks.title,
        source: schema.knowledgeChunks.source,
        url: schema.knowledgeChunks.url,
        content: schema.knowledgeChunks.content,
      })
      .from(schema.knowledgeChunks)
      .where(fts)
      .limit(k);
    const hits: Hit[] = rows.map((r) => ({
      title: r.title,
      source: r.source,
      url: r.url,
      snippet:
        r.content.slice(0, 240) + (r.content.length > 240 ? "…" : ""),
    }));
    return {
      output: { hits },
      undoInput: null,
      summary: `Found ${hits.length} relevant ${
        hits.length === 1 ? "chunk" : "chunks"
      }.`,
    };
  },
  async undo() {
    throw new Error("searchKnowledge is read-only");
  },
  render({ input, output }: ToolRenderProps<Input, Output>) {
    return (
      <div className="space-y-2 text-sm">
        <div className="text-xs text-muted-foreground">Query: {input.query}</div>
        {output?.hits.map((h, i) => (
          <div
            key={i}
            className="rounded-md border border-border/60 bg-muted/30 px-2 py-1.5"
          >
            <div className="text-xs font-medium">{h.title}</div>
            <div className="text-xs text-muted-foreground">{h.snippet}</div>
            {h.url && (
              <a
                href={h.url}
                className="text-[10px] text-primary underline"
                target="_blank"
                rel="noreferrer"
              >
                Source [{h.source}]
              </a>
            )}
          </div>
        ))}
      </div>
    );
  },
};

registerTool(searchKnowledgeTool);
