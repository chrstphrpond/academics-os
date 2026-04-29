"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import * as Icons from "lucide-react";
import { NAV_ITEMS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { UserButton } from "@clerk/nextjs";
import type { LucideIcon } from "lucide-react";

export function AppSidebar() {
  const pathname = usePathname() ?? "";

  return (
    <aside className="hidden h-svh flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground md:flex md:w-12 lg:w-60">
      <div className="flex h-12 items-center border-b border-sidebar-border px-3 lg:px-4">
        <span className="hidden text-sm font-semibold tracking-tight text-sidebar-foreground lg:inline">
          academics
        </span>
        <span className="text-sm font-semibold tracking-tight text-sidebar-foreground lg:hidden">
          a
        </span>
      </div>

      <nav className="flex flex-1 flex-col gap-0.5 p-2">
        {NAV_ITEMS.map((item) => {
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);
          const Icon =
            (Icons as unknown as Record<string, LucideIcon>)[item.icon] ??
            Icons.Square;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "relative flex h-8 items-center gap-3 rounded-md px-2.5 text-sm font-medium transition-colors",
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground"
              )}
            >
              {isActive && (
                <span
                  aria-hidden
                  className="absolute left-0 top-1.5 h-5 w-0.5 rounded-r bg-sidebar-primary"
                />
              )}
              <Icon className="h-4 w-4 shrink-0" />
              <span className="hidden lg:inline">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="flex items-center gap-3 border-t border-sidebar-border px-3 py-3">
        <UserButton
          appearance={{
            elements: { userButtonAvatarBox: "h-7 w-7" },
          }}
        />
        <div className="hidden min-w-0 text-xs text-sidebar-foreground/70 lg:block">
          <div className="truncate font-medium text-sidebar-foreground">
            My Account
          </div>
          <div className="truncate">2024370558 · BSIT</div>
        </div>
      </div>
    </aside>
  );
}
