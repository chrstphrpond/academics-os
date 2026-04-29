"use client";

import { useChat } from "@ai-sdk/react";
import { useState } from "react";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ToolRenderer } from "./tool-renderer";
import { isToolUIPart, getToolName, DefaultChatTransport } from "ai";

const READONLY_TOOLS = new Set([
  "searchKnowledge",
  "simulateGpa",
  "proposePlan",
]);

export function SidekickChat() {
  const [input, setInput] = useState("");
  const { messages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({ api: "/api/agent/chat" }),
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    sendMessage({ text: input });
    setInput("");
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 space-y-3 overflow-auto p-3">
        {messages.length === 0 && (
          <p className="text-xs text-muted-foreground">
            Ask anything about your academic state.
          </p>
        )}
        {messages.map((m) => (
          <div key={m.id} className="space-y-2">
            {m.parts.map((part, i) => {
              if (part.type === "text") {
                return (
                  <div
                    key={i}
                    className={`text-sm leading-relaxed ${
                      m.role === "user"
                        ? "text-foreground"
                        : "text-foreground/85"
                    }`}
                  >
                    {part.text}
                  </div>
                );
              }
              if (isToolUIPart(part)) {
                const toolName = getToolName(part);
                return (
                  <ToolRenderer
                    key={i}
                    tool={toolName}
                    toolLabel={toolName}
                    input={(part as { input?: unknown }).input ?? {}}
                    requiresConfirmation
                    readOnly={READONLY_TOOLS.has(toolName)}
                    renderBody={({ input: toolInput }) => (
                      <pre className="whitespace-pre-wrap break-words text-xs text-muted-foreground">
                        {JSON.stringify(toolInput, null, 2)}
                      </pre>
                    )}
                  />
                );
              }
              return null;
            })}
          </div>
        ))}
      </div>
      <form onSubmit={submit} className="border-t border-border p-2">
        <div className="flex gap-1.5">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask sidekick…"
            className="text-sm"
            disabled={status === "streaming"}
          />
          <Button
            type="submit"
            size="icon"
            disabled={!input.trim() || status === "streaming"}
          >
            <Send className="h-3.5 w-3.5" />
          </Button>
        </div>
      </form>
    </div>
  );
}
