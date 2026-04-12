"use client";

import { StaggerList, StaggerItem, FadeIn } from "@/components/ui/animated";

export function DashboardHeader() {
  return (
    <FadeIn>
      <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
      <p className="text-muted-foreground mt-1 text-sm">
        Your academic command center
      </p>
    </FadeIn>
  );
}

export function DashboardGrid({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <StaggerList className={className}>
      {children}
    </StaggerList>
  );
}

export function DashboardCard({ children }: { children: React.ReactNode }) {
  return <StaggerItem>{children}</StaggerItem>;
}
