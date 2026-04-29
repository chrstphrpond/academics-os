"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Map,
  GraduationCap,
  Bell,
  BookOpen,
  CheckSquare,
  Sparkles,
} from "lucide-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

const pages = [
  { label: "Dashboard", href: "/", icon: LayoutDashboard },
  { label: "Progress Tracker", href: "/progress", icon: Map },
  { label: "Grade Analyzer", href: "/grades", icon: GraduationCap },
  { label: "Smart Alerts", href: "/alerts", icon: Bell },
  { label: "Knowledge Base", href: "/knowledge", icon: BookOpen },
  { label: "Tasks", href: "/tasks", icon: CheckSquare },
];

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Search pages or ask a question..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        <CommandGroup heading="Actions">
          <CommandItem
            onSelect={() => {
              window.dispatchEvent(new CustomEvent("open-sidekick"));
              setOpen(false);
            }}
          >
            <Sparkles className="mr-2 h-4 w-4" />
            Open Sidekick
          </CommandItem>
        </CommandGroup>
        <CommandGroup heading="Pages">
          {pages.map((page) => (
            <CommandItem
              key={page.href}
              onSelect={() => {
                router.push(page.href);
                setOpen(false);
              }}
            >
              <page.icon className="mr-2 h-4 w-4" />
              {page.label}
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
