export function BriefingSkeleton() {
  return (
    <div className="space-y-3 rounded-lg border border-border bg-card/40 p-5">
      <div className="h-5 w-2/3 animate-pulse rounded bg-muted" />
      <div className="space-y-2">
        <div className="h-3 w-full animate-pulse rounded bg-muted/70" />
        <div className="h-3 w-11/12 animate-pulse rounded bg-muted/70" />
        <div className="h-3 w-9/12 animate-pulse rounded bg-muted/70" />
      </div>
    </div>
  );
}
