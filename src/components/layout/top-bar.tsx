"use client";

import { Search } from "lucide-react";
import { Kbd } from "@/components/ui/kbd";

export function TopBar() {
  return (
    <header className="sticky top-0 z-30 flex h-12 items-center gap-3 border-b border-border bg-background/80 px-4 backdrop-blur">
      <div className="text-xs text-muted-foreground">Term 3 · SY 2025–26</div>
      <div className="flex-1" />

      <button
        type="button"
        className="inline-flex h-8 w-72 items-center gap-2 rounded-md border border-border bg-muted/40 px-2 text-xs text-muted-foreground transition hover:bg-muted"
        onClick={() => {
          window.dispatchEvent(new CustomEvent("open-command-palette"));
        }}
      >
        <Search className="h-3.5 w-3.5" />
        <span>Search or ask…</span>
        <span className="ml-auto">
          <Kbd>⌘K</Kbd>
        </span>
      </button>
    </header>
  );
}
