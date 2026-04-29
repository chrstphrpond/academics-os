"use client";

import { useChat } from "@ai-sdk/react";
import {
  DefaultChatTransport,
  isToolUIPart,
  getToolName,
} from "ai";
import { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ShiningText } from "@/components/ui/shining-text";
import { ToolRenderer } from "@/components/agent/tool-renderer";
import { Bot, Send, User, Sparkles } from "lucide-react";

const SUGGESTED_QUESTIONS = [
  "What's my current GWA and scholarship band?",
  "How do I complete my INC grade?",
  "What are the payment channels?",
  "How do I drop a course?",
  "What is the grading system?",
  "How do I request a transcript?",
];

const READONLY_TOOLS = new Set([
  "searchKnowledge",
  "simulateGpa",
  "proposePlan",
]);

export function ChatInterface() {
  const { messages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({ api: "/api/agent/chat" }),
  });
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const isLoading = status === "submitted" || status === "streaming";
  const canSend = input.trim().length > 0 && !isLoading;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function handleSend(text: string) {
    const trimmed = text.trim();
    if (!trimmed || isLoading) return;
    sendMessage({ text: trimmed });
    setInput("");
  }

  return (
    <div className="relative flex h-[calc(100dvh-22rem)] min-h-[480px] flex-col overflow-hidden rounded-2xl">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-24 -left-24 h-64 w-64 rounded-full bg-violet-500/[0.07] blur-3xl animate-pulse" />
        <div className="absolute -bottom-24 -right-24 h-64 w-64 rounded-full bg-indigo-500/[0.07] blur-3xl animate-pulse [animation-delay:1s]" />
      </div>

      <div className="relative flex h-full flex-col rounded-2xl border border-white/[0.05] bg-white/[0.02] backdrop-blur-2xl">
        <div className="h-[1px] w-full bg-gradient-to-r from-transparent via-primary/30 to-transparent" />

        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                className="rounded-full bg-primary/10 p-3"
                style={{ boxShadow: "0 0 24px 4px oklch(0.541 0.24 264.376 / 0.15)" }}
              >
                <Sparkles className="size-6 text-primary" />
              </motion.div>
              <motion.p
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.1 }}
                className="text-sm text-white/50"
              >
                Try one of these to start
              </motion.p>
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.2 }}
                className="flex flex-wrap justify-center gap-2 max-w-lg"
              >
                {SUGGESTED_QUESTIONS.map((q, i) => (
                  <motion.button
                    key={q}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: 0.25 + i * 0.05 }}
                    whileHover={{ scale: 1.03, borderColor: "rgba(255,255,255,0.2)" }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => handleSend(q)}
                    className="rounded-full border border-white/[0.08] bg-white/[0.03] px-3.5 py-1.5 text-xs text-white/70 backdrop-blur-sm transition-colors hover:bg-white/[0.06] hover:text-white/90"
                  >
                    {q}
                  </motion.button>
                ))}
              </motion.div>
            </div>
          ) : (
            <AnimatePresence initial={false}>
              {messages.map((message) => (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                  className={`flex gap-3 ${
                    message.role === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  {message.role !== "user" && (
                    <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 ring-1 ring-primary/20">
                      <Bot className="size-4 text-primary" />
                    </div>
                  )}
                  <div
                    className={`max-w-[75%] space-y-2 rounded-lg px-3 py-2 text-sm ${
                      message.role === "user"
                        ? "bg-white/[0.05] text-white/90 ring-1 ring-white/[0.08]"
                        : "border-l-2 border-primary/30 bg-white/[0.02] text-white/80"
                    }`}
                  >
                    {message.parts.map((part, i) => {
                      if (part.type === "text") {
                        return message.role === "user" ? (
                          <span key={i} className="whitespace-pre-wrap">
                            {part.text}
                          </span>
                        ) : (
                          <ReactMarkdown
                            key={i}
                            remarkPlugins={[remarkGfm]}
                            components={{
                              p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                              ul: ({ children }) => <ul className="list-disc pl-4 mb-2">{children}</ul>,
                              ol: ({ children }) => <ol className="list-decimal pl-4 mb-2">{children}</ol>,
                              li: ({ children }) => <li className="mb-0.5">{children}</li>,
                              strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                              code: ({ children }) => (
                                <code className="rounded bg-white/[0.06] px-1.5 py-0.5 text-xs font-mono">{children}</code>
                              ),
                              a: ({ href, children }) => (
                                <a href={href} target="_blank" rel="noopener noreferrer" className="text-primary underline underline-offset-2">
                                  {children}
                                </a>
                              ),
                            }}
                          >
                            {part.text}
                          </ReactMarkdown>
                        );
                      }
                      if (isToolUIPart(part)) {
                        const toolName = getToolName(part);
                        // Read-only tools auto-execute server-side; the model
                        // already inlined their results into the text answer,
                        // so we hide the card to keep the chat clean.
                        if (READONLY_TOOLS.has(toolName)) return null;
                        return (
                          <ToolRenderer
                            key={i}
                            tool={toolName}
                            toolLabel={toolName}
                            input={(part as { input?: unknown }).input ?? {}}
                            requiresConfirmation
                            readOnly={false}
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
                  {message.role === "user" && (
                    <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-white/[0.06] ring-1 ring-white/[0.08]">
                      <User className="size-4 text-white/60" />
                    </div>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
          )}
          {isLoading && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex gap-3"
            >
              <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 ring-1 ring-primary/20">
                <Bot className="size-4 text-primary" />
              </div>
              <div className="rounded-lg border-l-2 border-primary/30 bg-white/[0.02] px-3 py-2.5">
                <ShiningText text="Atlas is thinking…" />
              </div>
            </motion.div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="border-t border-white/[0.06] p-3">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend(input);
            }}
            className="flex items-center gap-2 rounded-xl bg-white/[0.03] px-3 py-1 ring-1 ring-white/[0.06] transition-all focus-within:ring-white/[0.12]"
          >
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend(input);
                }
              }}
              placeholder="Ask Atlas about courses, GPA, policies…"
              disabled={isLoading}
              rows={1}
              className="flex-1 resize-none bg-transparent py-2 text-sm text-white/90 placeholder:text-white/20 focus:outline-none disabled:opacity-40"
            />
            <motion.div whileHover={canSend ? { scale: 1.05 } : {}} whileTap={canSend ? { scale: 0.95 } : {}}>
              <Button
                type="submit"
                size="icon"
                disabled={!canSend}
                aria-label="Send message"
                className={`size-8 rounded-lg transition-all ${
                  canSend
                    ? "bg-white text-black hover:bg-white/90 shadow-[0_0_12px_2px_rgba(255,255,255,0.1)]"
                    : "bg-white/[0.06] text-white/30"
                }`}
              >
                <Send className="size-3.5" />
              </Button>
            </motion.div>
          </form>
        </div>
      </div>
    </div>
  );
}
