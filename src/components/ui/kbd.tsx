import { cn } from "@/lib/utils";

export function Kbd({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <kbd
      className={cn(
        "inline-flex h-5 items-center rounded border border-border bg-background px-1 font-mono text-[10px] text-muted-foreground",
        className
      )}
    >
      {children}
    </kbd>
  );
}
