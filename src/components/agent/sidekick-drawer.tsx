"use client";

import { useEffect, useState } from "react";
import { Sparkles, X } from "lucide-react";
import { SidekickChat } from "./sidekick-chat";

export function SidekickDrawer() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onOpen = () => setOpen(true);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
      }
    };
    window.addEventListener("open-sidekick", onOpen);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("open-sidekick", onOpen);
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex"
      role="dialog"
      aria-modal="true"
      aria-label="Sidekick"
    >
      <button
        type="button"
        aria-label="Close sidekick"
        className="flex-1 bg-black/40 backdrop-blur-sm"
        onClick={() => setOpen(false)}
      />
      <aside className="flex h-svh w-full max-w-md flex-col border-l border-border bg-background/95 shadow-2xl backdrop-blur-md">
        <header className="flex h-12 shrink-0 items-center justify-between border-b border-border px-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" aria-hidden />
            <h2 className="text-sm font-medium">Sidekick</h2>
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="rounded-md p-1 text-muted-foreground hover:bg-muted"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </header>
        <div className="flex-1 overflow-hidden">
          <SidekickChat />
        </div>
      </aside>
    </div>
  );
}
