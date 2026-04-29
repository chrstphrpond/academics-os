"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Map,
  GraduationCap,
  BookOpen,
  CheckSquare,
} from "lucide-react";

const tabs = [
  { label: "Home", href: "/", icon: LayoutDashboard },
  { label: "Progress", href: "/progress", icon: Map },
  { label: "Grades", href: "/grades", icon: GraduationCap },
  { label: "Knowledge", href: "/knowledge", icon: BookOpen },
  { label: "Tasks", href: "/tasks", icon: CheckSquare },
];

export function BottomNav() {
  const pathname = usePathname() ?? "";

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border/50 bg-background/80 backdrop-blur-md md:hidden"
         aria-label="Mobile navigation">
      <div className="flex h-14 items-center justify-around pb-[env(safe-area-inset-bottom,0px)]">
        {tabs.map((tab) => {
          const isActive =
            tab.href === "/" ? pathname === "/" : pathname.startsWith(tab.href);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex flex-col items-center justify-center gap-0.5 px-3 py-1.5 min-w-[44px] min-h-[44px] text-[10px] transition-colors ${
                isActive ? "text-primary" : "text-muted-foreground"
              }`}
            >
              <tab.icon className="h-5 w-5" />
              <span>{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
