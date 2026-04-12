"use client";

import { Bell, Plus, Sun, Moon } from "lucide-react";
import { useTheme } from "next-themes";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

export function TopBar() {
  const { theme, setTheme } = useTheme();

  return (
    <header className="flex h-12 items-center gap-2 border-b border-border/50 bg-background/80 backdrop-blur-md px-4">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="mr-2 h-4" />
      <span className="text-xs font-medium text-muted-foreground tracking-wide uppercase">
        Term 3 SY 2025-26
      </span>
      <div className="ml-auto flex items-center gap-1">
        <Button variant="ghost" size="icon" className="relative" aria-label="View notifications">
          <Bell className="h-4 w-4" />
          <Badge className="absolute -right-1 -top-1 h-4 w-4 rounded-full p-0 text-[10px] flex items-center justify-center">
            3
          </Badge>
        </Button>
        <Button variant="ghost" size="icon" aria-label="Quick add task">
          <Plus className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        >
          <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          <span className="sr-only">Toggle theme</span>
        </Button>
      </div>
    </header>
  );
}
